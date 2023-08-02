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

export async function getServerSideProps({req, res, query}) {
    const {updateSession, session, agent, redirect, db} = await getLoggedInData(req, res);
    if (redirect) {return {redirect};}

    const {all} = query;
    const search = all === "yes"? {} : {highlight:'yes'};


    const feedsHere =  await db.feeds.find(search).project({_id:1}).toArray();
    const feeds = (await db.allFeeds.find({_id: {$in: feedsHere.map(x => x._id)}}).sort({likeCount:-1}).toArray())
        .map(x => {
        const found = feedsHere.find(y => y._id === x._id) || {};
        return {...x, ...found};
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
        {
            !session && <div className="flex flex-col place-items-center gap-4">
                <PageHeader title={title} description={description} />
                <FormSignIn/>
            </div>
        }

        {
            session && <div className="bg-sky-200 w-full max-w-8xl rounded-xl overflow-hidden p-4 space-y-4">
                <PageHeader title={title} description={description} />

                <div className="border border-2 border-black p-4 bg-white rounded-xl">
                    {
                        feeds && feeds.map(x =>
                            <FeedItem key={x.uri} item={x} setSelectedItem={setSelectedItem} setPopupState={setPopupState} />
                        )
                    }
                </div>
            </div>
        }
    </>
}
