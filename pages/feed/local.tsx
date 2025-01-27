import HeadExtended from "features/layout/HeadExtended";
import {useEffect, useState} from "react";
import PageHeader from "features/components/PageHeader";
import PopupConfirmation from "features/components/PopupConfirmation";
import {localDelete} from "features/network/network"
import {useRecaptcha} from "features/provider/RecaptchaProvider";
import FeedItem from "features/components/specific/FeedItem";
import {useRouter} from "next/router";
import {getLoggedInInfo} from "features/network/session";
import PageFooter from "features/components/PageFooter";
import SearchBox from "features/components/SearchBox";
import {getSearchConfig} from "features/utils/getSearchConfig";
import BackAndForwardButtons from "features/components/BackAndForwardButtons";
import {getDbClient, makeLocalFeedQuery} from "features/utils/db";
import {MainWrapper} from "features/layout/MainWrapper";
import {getPublicAgent} from "features/utils/bsky";
import {respondPageErrors} from "features/utils/page";

export async function getServerSideProps({req, res, query}) {
    const [{ error, privateAgent}, dbUtils] = await Promise.all([
        getLoggedInInfo(req, res),
        getDbClient()
    ]);
    const redirect = respondPageErrors([{val:error, code:error}, {val:!dbUtils, code:500}]);
    if (redirect) { return redirect; }

    const {db, helpers} = dbUtils;

    const PAGE_SIZE = 50;
    let {q, p, l} = query;
    let offset = 0;
    if (p) {
        offset = Math.max(0,parseInt(p)-1) * PAGE_SIZE;
        if (isNaN(offset)) {
            return { redirect: { destination: '/400', permanent: false } };
        }
    }
    const myDid = privateAgent?.did || "";
    const qTrim = q && q.trim();
    const lInt = parseInt(l);

    const feedsHereQuery = makeLocalFeedQuery (myDid, qTrim, lInt, PAGE_SIZE, offset);
    const feedsHere = await db.manyOrNone(helpers.concat([feedsHereQuery]));

    const publicAgent = getPublicAgent();
    const {data} = await publicAgent.app.bsky.feed.getFeedGenerators({feeds: feedsHere.map(x => x.id)});
    const updatedFeeds = data.feeds.map(x => {
        const {uri, did, creator, avatar,
            displayName, description, likeCount, indexedAt} = x;
        return {uri, did, creator, avatar: avatar || null,
            displayName, description, likeCount, indexedAt};
    });

    const feeds = feedsHere.reduce((acc,x) => {
        const {id, edit, tags} = x;
        const temp = updatedFeeds.find(y => y.uri === id);
        if (temp) { acc.push({...temp, edit, tags}); }
        return acc;
    }, []);

    return {props: {feeds}};
}
const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL;

export default function Home({feeds:_feeds}) {
    const title = "Feeds made at BlueskyFeeds.com";
    const description = "Opt out of being listed here by setting `Highlight this feed` to `no`.";
    const [popupState, setPopupState] = useState<"delete"|false>(false);
    const [busy, setBusy] = useState(false);
    const [feeds, setFeeds] = useState(_feeds);
    function refreshFeeds () { setFeeds([...feeds]); }
    useEffect(() => setFeeds(_feeds), [_feeds]);
    const router = useRouter();

    return <MainWrapper>
        <HeadExtended title={title} description={description}/>

        <div className="bg-sky-200 w-full max-w-8xl rounded-xl overflow-hidden p-4 space-y-4">
            <PageHeader title={title} description={description}/>
            <SearchBox path="/feed/local" title="Search Feeds made here" busy={busy} setBusy={setBusy} />

            <div className="bg-white border-black border-2 p-4 rounded-xl space-y-2">
                <div className="text-lg font-medium">Feeds Made Here</div>
                {
                    feeds.length > 0 &&
                    <BackAndForwardButtons basePath={`${BASE_URL}/feed/local`} params={router.query}/>
                }
                {
                    feeds && feeds.map(x =>
                        <FeedItem key={x.uri} item={x} popupState={popupState} setPopupState={setPopupState} busy={busy} setBusy={setBusy} refreshFeeds={refreshFeeds}/>
                    )
                }
                {
                    feeds.length > 0 &&
                    <BackAndForwardButtons basePath={`${BASE_URL}/feed/local`} params={router.query}/>
                }
            </div>
            <PageFooter/>
        </div>

    </MainWrapper>
}
