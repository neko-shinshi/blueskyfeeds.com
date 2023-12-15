import HeadExtended from "features/layout/HeadExtended";
import {signIn, useSession} from "next-auth/react";
import FormSignIn from "features/login/FormSignIn";
import {useEffect, useState} from "react";
import PageHeader from "features/components/PageHeader";
import PopupConfirmation from "features/components/PopupConfirmation";
import {localDelete} from "features/network/network"
import {useRecaptcha} from "features/auth/RecaptchaProvider";
import FeedItem from "features/components/specific/FeedItem";
import {useRouter} from "next/router";
import {getLoggedInData} from "features/network/session";
import {APP_SESSION} from "features/auth/authUtils";
import {removeUndefined} from "features/utils/validationUtils";
import PageFooter from "features/components/PageFooter";

export async function getServerSideProps({req, res, query}) {
    const {updateSession, session, agent, redirect, db} = await getLoggedInData(req, res);
    if (redirect) {return {redirect};}

    const {all} = query;
    const search = all === "yes"? {} : {highlight:'yes'};

    const feedsHere =  await db.feeds.find(search).toArray();
    let feeds = [];

    if (agent) {
        const MAX_QUERY = 150;
        const ts = Math.floor(new Date().getTime()/1000);
        for (let i = 0; i < feedsHere.length; i += MAX_QUERY) {
            const chunk = feedsHere.slice(i, i + MAX_QUERY).map(x => x._id);
            const {data} = await agent.api.app.bsky.feed.getFeedGenerators({feeds: chunk});
            data.feeds.forEach(x => feeds.push(x));
        }

        db.allFeeds.bulkWrite(feeds.map(x => {
            const {uri: _id, ...o} = x;
            return {
                replaceOne: {
                    filter: {_id},
                    replacement: {...o, ts},
                    upsert: true
                }
            }
        }));

        const updatedFeeds = feeds.map(x => {
            const {uri, did, creator, avatar,
                displayName, description, likeCount, indexedAt} = x;
            return {uri, did, creator, avatar: avatar || null,
                displayName, description, likeCount, indexedAt};
        });
        feeds = feedsHere.reduce((acc,x) => {
            const {_id:uri, y} = x;
            const temp = updatedFeeds.find(y => y.uri === uri);
            if (temp) {
                acc.push(temp);
            }
            return acc;
        }, []);
    } else {
        feeds = await db.allFeeds.find({_id: {$in: feedsHere.map(x => x._id)}}).toArray();
        feeds = feeds.map(x => {
            const {_id:uri, did, creator, avatar,
                displayName, description, likeCount, indexedAt} = x;
            return removeUndefined({uri, did, creator, avatar: avatar || null,
                displayName, description, likeCount, indexedAt}, true);
        });
    }

    feeds.sort((a,b) => {
        if (b.likeCount === a.likeCount) {
            return b.indexedAt > a.indexedAt? 1 : -1;
        }
        return b.likeCount - a.likeCount;
    });

    return {props: {updateSession, session, feeds}};
}


export default function Home({updateSession, feeds:_feeds}) {
    const title = "Feeds made at BlueskyFeeds.com";
    const description = "Opt out of being listed here by setting `Highlight this feed` to `no`.";
    const { data: session, status } = useSession();
    const [popupState, setPopupState] = useState<"delete"|false>(false);
    const [selectedItem, setSelectedItem] = useState<any>(null);
    const [busy, setBusy] = useState(false);
    const [feeds, setFeeds] = useState([]);
    const recaptcha = useRecaptcha();
    const router = useRouter();

    useEffect(() => {
        if (_feeds) {
            console.log(_feeds);

            setFeeds(_feeds.map(x => {
                const {_id} = x;
                return {uri:_id, ...x};
            }));
        }
    }, [_feeds])

    useEffect(() => {
        console.log("status", status);
        if (session && status === "authenticated" && updateSession) {
            signIn(APP_SESSION, {redirect: false, id: session.user.sk}).then(r => {
                console.log(r);
            });
        }
    }, [status]);

    return <>
        <PopupConfirmation
            isOpen={popupState === "delete"}
            setOpen={setPopupState}
            title={`Confirm deletion of ${selectedItem?.displayName}`}
            message="This cannot be reversed"
            yesCallback={async() => {
                if (typeof recaptcha !== 'undefined' && !busy) {
                    recaptcha.ready(async () => {
                        setBusy(true);
                        //@ts-ignore
                        const captcha = await recaptcha.execute(process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY, {action: 'submit'});
                        const result = await localDelete("/feed/delete", {captcha, rkey: selectedItem.uri.split("/").slice(-1)[0]});
                        if (result.status === 200) {
                            router.reload();
                        } else {
                            console.log(result);
                        }
                        setBusy(false);
                    });
                }
            }
        }/>
        <HeadExtended title={title} description={description}/>

       <div className="bg-sky-200 w-full max-w-8xl rounded-xl overflow-hidden p-4 space-y-4">
            <PageHeader title={title} description={description} />

            <div className="border-2 border-black p-4 bg-white rounded-xl">
                {
                    feeds && feeds.map(x =>
                        <FeedItem key={x.uri} item={x} setSelectedItem={setSelectedItem} setPopupState={setPopupState} />
                    )
                }
            </div>
            <PageFooter/>
        </div>

    </>
}
