import HeadExtended from "features/layout/HeadExtended";
import {useEffect, useRef, useState} from "react";
import Link from "next/link";
import {SiBuzzfeed} from "react-icons/si";
import PageHeader from "features/components/PageHeader";
import {localDelete, urlWithParams} from "features/network/network";
import PopupConfirmation from "features/components/PopupConfirmation";
import {useRecaptcha} from "features/auth/RecaptchaProvider";
import FeedItem from "features/components/specific/FeedItem";
import {useRouter} from "next/router";
import {signIn, useSession} from "next-auth/react";
import {getLoggedInData, getLoggedInInfo} from "features/network/session";
import {APP_SESSION} from "features/auth/authUtils";
import PopupLoading from "features/components/PopupLoading";
import BackAndForwardButtons from "features/components/BackAndForwardButtons";
import {removeUndefined} from "features/utils/validationUtils";
import PageFooter from "features/components/PageFooter";
import {buildRegExp, choiceOf} from "ts-regex-builder";
import {getSearchConfig} from "features/utils/getSearchConfig";
import {AtpAgent} from "@atproto/api";
import {extractLabels} from "features/utils/parseLabels";
import SearchBox from "features/components/SearchBox";

export async function getServerSideProps({req, res, query}) {
    // TODO if no query, show most popular feeds made here
    const {updateSession, session, privateAgent, redirect, db:{db, helpers}} = await getLoggedInInfo(req, res);
    if (redirect) {return {redirect};}

    const PAGE_SIZE = 20;
    let {q, p, feed, l} = query;
    if (feed) {
        const feedParts = feed.split("|");
        if (feedParts[0] === "feedgen") {
            const isValid = await db.one("SELECT EXISTS (SELECT 1 FROM feed WHERE id = $1)", feedParts[1]);
            if (isValid) {
                const parts = feedParts[1].split("/");
                return {redirect: {destination: `/profile/${parts[2]}/feed/${parts[4]}`, permanent: false} };
            } else {return { redirect: { destination: '/', permanent: false } };}
        } else if (feedParts.length === 1) {
            const isValid = await db.one("SELECT EXISTS (SELECT 1 FROM feed WHERE id = $1)", feedParts[0]);
            if (isValid) {
                const parts = feedParts[0].split("/");
                return {redirect: {destination: `/profile/${parts[2]}/feed/${parts[4]}`, permanent: false} };
            } else {return { redirect: { destination: '/', permanent: false } };}
        }
    }

    let offset = 0;
    if (p) {
        offset = Math.max(0,parseInt(p)-1) * PAGE_SIZE;
        if (isNaN(offset)) {
            return { redirect: { destination: '/400', permanent: false } };
        }
    }


    let everyFeedQuery:any = {query:"SELECT id FROM every_feed ORDER BY likes DESC, t_indexed ASC LIMIT $1 OFFSET $2", values: [PAGE_SIZE, offset]};
    let popularMadeHereQuery:any = false;
    const qTrim = q && q.trim();
    const lInt = parseInt(l);
    if (qTrim) {
        const searchConfig = getSearchConfig(qTrim, lInt);
        everyFeedQuery = {query:"SELECT id FROM every_feed WHERE id @@@ $1::JSONB ORDER BY likes DESC LIMIT $2 OFFSET $3", values:[searchConfig, PAGE_SIZE, offset]};
    } else if (lInt && !isNaN(lInt) && lInt > 0) {
        // Limit by likes
        everyFeedQuery = {query:"SELECT id FROM every_feed WHERE likes > $1 ORDER BY likes DESC, t_indexed ASC LIMIT $2 OFFSET $3", values: [lInt, PAGE_SIZE, offset]};
    } else if (!p || parseInt(p) === 1) {
        // Default, show popular here
        popularMadeHereQuery= "SELECT feed.id AS id FROM feed, every_feed WHERE feed.id = every_feed.id AND highlight = TRUE ORDER BY likes DESC LIMIT 6";
    }

    const publicAgent = new AtpAgent({service: "https://api.bsky.app/"});
    let popularMadeHere:any[] = [];
    let feeds:any[] = [];
    console.log(helpers.concat([everyFeedQuery]));
    const [mainIds, feedsHere] = await Promise.all([
        db.manyOrNone(helpers.concat([everyFeedQuery])),
        popularMadeHereQuery && db.manyOrNone(helpers.concat([popularMadeHereQuery]))
    ]);

    const feedIds = mainIds.map(x => x.id);
    if (feedsHere) {
        feedsHere.forEach(x => feedIds.push(x.id));
    }

    if (feedIds.length > 0) {
        // MAX IS 150
        const {data} = await publicAgent.app.bsky.feed.getFeedGenerators({feeds: feedIds});
        const updatedFeeds = data.feeds.map(x => {
            const {uri, did, creator, avatar,
                displayName, description, likeCount, indexedAt, labels:_labels} = x;
            const labels = Array.isArray(_labels)? extractLabels(_labels) : [];
            return removeUndefined({uri, did, creator, avatar: avatar || null,
                displayName, description, likeCount, indexedAt, labels}, true);
        });

        mainIds.forEach(x => {
            const item = updatedFeeds.find(y => y.uri === x.id);
            if (item) { feeds.push(item); }
        });

        if (feedsHere) {
            feedsHere.forEach(x => {
                const item = updatedFeeds.find(y => y.uri === x.id);
                if (item) { popularMadeHere.push(item); }
            });
        }

    }

    return {props: {updateSession, session, feeds, popularMadeHere}};
}
const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL;

export default function Home({updateSession, feeds, popularMadeHere}) {
    const title = "Bluesky Social Feeds @ BlueskyFeeds.com";
    const description = "Find your perfect feed algorithm for Bluesky Social App, or build one yourself";
    const longDescription = "Search Bluesky feeds, browse the Bluesky feed directory, or use our no-code Bluesky feed builder to make your own custom feed for yourself or your community here."
    const [popupState, setPopupState] = useState<"delete"|false>(false);
    const [selectedItem, setSelectedItem] = useState<any>(null);
    const [busy, setBusy] = useState(false);
    const recaptcha = useRecaptcha();
    const router = useRouter();
    const {data:session, status} = useSession();


    useEffect(() => {
        if (session && status === "authenticated" && updateSession) {
            signIn(APP_SESSION, {redirect: false, id: session.user.sk}).then(r => {
                console.log(r);
            });
        }
    }, [status]);

    return (
        <>
            <HeadExtended title={title}
                          description={longDescription}/>
            <PopupLoading isOpen={busy} setOpen={setBusy}/>
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
            <div className="bg-sky-200 w-full max-w-7xl rounded-xl overflow-hidden p-4 space-y-4">
                <PageHeader title={title} description={description} description2="*This site is not affiliated with Bluesky or the ATProtocol, both of which are still in Beta. Feeds here are not guaranteed to work 100% of the time as it is maintained by only 1 person, and may be impacted by changes in Bluesky." />

                <SearchBox path="/" title="Search All Feeds" setBusy={setBusy} />


                <Link href="/my-feeds">
                    <button type="button"
                            className="mt-4 gap-4 w-full inline-flex justify-center items-center px-4 py-2 border border-transparent  rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500">
                        <SiBuzzfeed className="w-6 h-6"/>
                        <div className="text-lg font-medium">{session? "Manage your feeds" : "Login to create and manage your Feeds"}</div>
                        <SiBuzzfeed className="w-6 h-6"/>
                    </button>
                </Link>

                {
                    popularMadeHere && popularMadeHere.length > 0 &&
                    <div className="bg-lime-100 border-black border-2 p-4 rounded-xl space-y-2">
                        <div className="inline-flex justify-between w-full place-items-center">
                            <div className="text-lg font-medium">Highlights of Feeds made here</div>
                            <Link href="/local-feeds">
                                <button type="button"
                                        className="w-full inline-flex justify-center items-center p-2 border border-transparent  rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500">
                                    <div className="text-lg font-medium">See More</div>
                                </button>
                            </Link>

                        </div>

                        {
                            popularMadeHere.map(x =>
                                <FeedItem key={x.uri} item={x} setSelectedItem={setSelectedItem} setPopupState={setPopupState} />
                            )
                        }
                    </div>
                }


                <div className="bg-white border-black border-2 p-4 rounded-xl space-y-2">
                    <div className="text-lg font-medium">Existing Feeds</div>
                    {
                        feeds.length > 0 && <BackAndForwardButtons basePath={`${BASE_URL}`} params={router.query}/>
                    }

                    {
                        feeds.map(x =>
                            <FeedItem key={x.uri} item={x} setSelectedItem={setSelectedItem}
                                      setPopupState={setPopupState}/>
                        )
                    }

                    {
                        feeds.length > 0 && <BackAndForwardButtons basePath={`${BASE_URL}`} params={router.query}/>
                    }
                    {
                        feeds.length === 0 && <div className="text-center font-bold text-xl"> No More Relevant Feeds </div>
                    }
                </div>

                <PageFooter/>
            </div>
        </>
    )
}
