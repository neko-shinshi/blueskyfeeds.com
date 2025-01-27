import HeadExtended from "features/layout/HeadExtended";
import {useEffect, useState} from "react";
import Link from "next/link";
import {SiBuzzfeed} from "react-icons/si";
import PageHeader from "features/components/PageHeader";
import {localDelete} from "features/network/network";
import PopupConfirmation from "features/components/PopupConfirmation";
import {useRecaptcha} from "features/provider/RecaptchaProvider";
import FeedItem from "features/components/specific/FeedItem";
import {useRouter} from "next/router";
import {getLoggedInInfo} from "features/network/session";
import PopupLoading from "features/components/PopupLoading";
import BackAndForwardButtons from "features/components/BackAndForwardButtons";
import {removeUndefined} from "features/utils/validationUtils";
import PageFooter from "features/components/PageFooter";
import {extractLabels} from "features/utils/parseLabels";
import SearchBox from "features/components/SearchBox";
import {getDbClient, makeEveryFeedQuery, makeLocalFeedQuery} from "features/utils/db";
import {MainWrapper} from "features/layout/MainWrapper";
import {getPublicAgent} from "features/utils/bsky";
import {respondPageErrors} from "features/utils/page";
import {useUserData} from "features/provider/UserDataProvider";
import clsx from "clsx";
import TagCloud from "features/components/TagCloud";
import {tag} from "postcss-selector-parser";

export async function getServerSideProps({req, res, query}) {
    const [{ error, privateAgent}, dbUtils] = await Promise.all([
        getLoggedInInfo(req, res),
        getDbClient()
    ]);

    const redirect = respondPageErrors([{val:error, code:error}, {val:!dbUtils, code:500}]);
    if (redirect) { return redirect; }

    const {db, helpers} = dbUtils;

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

    const myDid = privateAgent?.did || "";
   // let popularMadeHereQuery:any = false, everyFeedQuery:any = false;
    const arr:any[] = [];
    const qTrim = q && q.trim();
    const lInt = parseInt(l);
    {
        const {query, values, def} = makeEveryFeedQuery(myDid, qTrim, lInt, PAGE_SIZE, offset);
        console.log("EVERY", helpers.concat([{query, values}]));
        arr.push({query, values});
        if (def && (!p || parseInt(p) === 1)) {
            // Default, show popular here
            arr.push(makeLocalFeedQuery (myDid, "", 0, PAGE_SIZE, 0));
            arr.push("SELECT tag, count(tag) AS count FROM every_feed_tag WHERE tag <> 'deprecated' GROUP BY tag");
        }
    }

    const publicAgent = getPublicAgent();
    let popularMadeHere:any[] = [];
    let feeds:any[] = [];

    let [mainIds, feedsHere, tags] = await db.multi(helpers.concat(arr));

    const feedIds = mainIds.map(x => x.id);
    if (feedsHere) {
        feedsHere.forEach(x => feedIds.push(x.id));
    }

    if (!tags) {
        tags = [];
    } else {
        tags = tags.sort((a, b) => {
            return a.tag.localeCompare(b.tag);
        });
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

        mainIds.forEach(({id, edit, tags}) => {
            const item = updatedFeeds.find(y => y.uri === id);
            if (item) { feeds.push({...item, edit, tags}); }
        });

        if (feedsHere) {
            feedsHere.forEach(({id, edit, tags}) => {
                const item = updatedFeeds.find(y => y.uri === id);
                if (item) { popularMadeHere.push({...item, edit, tags}); }
            });
        }
    }

    return {props: {feeds, popularMadeHere, tags}};
}
const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL;

export default function Home({feeds:_feeds, popularMadeHere, tags}) {
    const title = "Bluesky Social Feeds @ BlueskyFeeds.com";
    const description = "Find your perfect feed algorithm for Bluesky Social App, or build one yourself";
    const longDescription = "Search Bluesky feeds, browse the Bluesky feed directory, or use our no-code Bluesky feed builder to make your own custom feed for yourself or your community here."
    const [popupState, setPopupState] = useState<"delete"|false>(false);
    const [busy, setBusy] = useState<boolean>(false);
    const [feeds, setFeeds] = useState(_feeds);
    useEffect(() => {
        setFeeds(_feeds);
    }, [_feeds]);
    function refreshFeeds () { setFeeds([...feeds]); }

    const {user} = useUserData();

    const router = useRouter();
    return <MainWrapper>
            <HeadExtended title={title} description={longDescription}/>
            <PopupLoading isOpen={busy}/>

            <div className="bg-sky-200 w-full max-w-7xl rounded-xl overflow-hidden p-4 space-y-4">
                <PageHeader title={title} description={description} description2="*This site is not affiliated with Bluesky or the ATProtocol, both of which are still in Beta. Feeds here are not guaranteed to work 100% of the time as it is maintained by only 1 person, and may be impacted by changes in Bluesky." />

                <SearchBox path="/" title="Search All Feeds" busy={busy} setBusy={setBusy} />


                <Link href="/feed/my">
                    <button type="button"
                            className="mt-4 gap-4 w-full inline-flex justify-center items-center px-4 py-2 border border-transparent  rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500">
                        <SiBuzzfeed className="w-6 h-6"/>
                        <div className="text-lg font-medium">{user? "Manage your feeds" : "Login to create and manage your Feeds"}</div>
                        <SiBuzzfeed className="w-6 h-6"/>
                    </button>
                </Link>

                <TagCloud tags={tags}/>

                <div className={clsx("md:grid space-x-1", popularMadeHere.length > 0 && "md:grid-cols-2")}>
                    {
                        popularMadeHere.length > 0 &&
                        <div className="bg-lime-100 border-black border-2 p-4 rounded-xl space-y-2">
                            <div className="inline-flex justify-between w-full place-items-center">
                                <div className="text-lg font-medium">Highlights of Feeds made here</div>
                                <Link href="/feed/local">
                                    <button type="button"
                                            className="w-full inline-flex justify-center items-center p-2 border border-transparent  rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500">
                                        <div className="text-lg font-medium">See More</div>
                                    </button>
                                </Link>

                            </div>

                            {
                                popularMadeHere.map(x => <FeedItem key={x.uri} item={x} popupState={popupState} setPopupState={setPopupState} busy={busy} setBusy={setBusy} refreshFeeds={refreshFeeds}/>)
                            }
                        </div>
                    }


                    <div className="bg-white border-black border-2 p-4 rounded-xl space-y-2">
                        <div className="text-lg font-medium">Existing Feeds</div>
                        {
                            feeds.length > 0 && <BackAndForwardButtons basePath={`${BASE_URL}`} params={router.query}/>
                        }

                        {
                            feeds.map(x => <FeedItem key={x.uri} item={x} popupState={popupState} setPopupState={setPopupState} busy={busy} setBusy={setBusy} refreshFeeds={refreshFeeds}/>)
                        }

                        {
                            feeds.length > 0 && <BackAndForwardButtons basePath={`${BASE_URL}`} params={router.query}/>
                        }
                        {
                            feeds.length === 0 && <div className="text-center font-bold text-xl"> No More Relevant Feeds </div>
                        }
                    </div>
                </div>



                <PageFooter/>
            </div>
    </MainWrapper>

}
