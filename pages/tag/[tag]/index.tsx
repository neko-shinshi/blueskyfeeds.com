import {getLoggedInInfo} from "features/network/session";
import {getDbClient, makeTagQuery} from "features/utils/db";
import {respondPageErrors} from "features/utils/page";
import {useEffect, useState} from "react";
import {useRouter} from "next/router";
import {MainWrapper} from "features/layout/MainWrapper";
import HeadExtended from "features/layout/HeadExtended";
import PopupLoading from "features/components/PopupLoading";
import TagCloud from "features/components/TagCloud";
import BackAndForwardButtons from "features/components/BackAndForwardButtons";
import FeedItem from "features/components/specific/FeedItem";
import {extractLabels} from "features/utils/parseLabels";
import {removeUndefined} from "features/utils/validationUtils";
import {getPublicAgent} from "features/utils/bsky";
import PageHeader from "features/components/PageHeader";

export async function getServerSideProps({req, res, query}) {
    const [{ error, privateAgent}, dbUtils] = await Promise.all([
        getLoggedInInfo(req, res),
        getDbClient()
    ]);


    const redirect = respondPageErrors([{val:error, code:error}, {val:!dbUtils, code:500}]);
    if (redirect) { return redirect; }

    const {db, helpers} = dbUtils;

    const PAGE_SIZE = 20;
    let {p, tag} = query;

    let offset = 0;
    if (p) {
        offset = Math.max(0,parseInt(p)-1) * PAGE_SIZE;
        if (isNaN(offset)) {
            return { redirect: { destination: '/400', permanent: false } };
        }
    }

    const myDid = privateAgent?.did || "";
    const arr:any[] = [
        makeTagQuery(myDid, tag, PAGE_SIZE, offset),
        "SELECT tag, count(tag) AS count FROM every_feed_tag WHERE tag <> 'deprecated' GROUP BY tag",
    ];
    const publicAgent = getPublicAgent();

    const [ feedData, tags] = await db.multi(helpers.concat(arr));
    const feeds:any[] = [];

    if (feedData.length > 0) {
        // MAX IS 150
        const {data} = await publicAgent.app.bsky.feed.getFeedGenerators({feeds: feedData.map(x => x.id)});
        const updatedFeeds = data.feeds.map(x => {
            const {uri, did, creator, avatar,
                displayName, description, likeCount, indexedAt, labels:_labels} = x;
            const labels = Array.isArray(_labels)? extractLabels(_labels) : [];
            return removeUndefined({uri, did, creator, avatar: avatar || null,
                displayName, description, likeCount, indexedAt, labels}, true);
        });

        feedData.forEach(({id, edit, tags}) => {
            const item = updatedFeeds.find(y => y.uri === id);
            if (item) { feeds.push({...item, edit, tags}); }
        });
    }

    return {props: {feeds, tags, tag}};
}

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL;

export default function Home({feeds:_feeds, tags, tag}) {
    const title = `Feeds with tag [${tag}]`;
    const [popupState, setPopupState] = useState<"delete" | false>(false);
    const [busy, setBusy] = useState<boolean>(false);
    const [feeds, setFeeds] = useState(_feeds);
    useEffect(() => {
        setFeeds(_feeds);
    }, [_feeds]);

    function refreshFeeds() {
        setFeeds([...feeds]);
    }
    const router = useRouter();

    return <MainWrapper>
        <HeadExtended title={title} description=""/>
        <PopupLoading isOpen={busy}/>
        <div className="bg-sky-200 w-full max-w-7xl rounded-xl overflow-hidden p-4 space-y-4">
            <PageHeader title={title} description={""}
                        description2="*This site is not affiliated with Bluesky or the ATProtocol, both of which are still in Beta. Feeds here are not guaranteed to work 100% of the time as it is maintained by only 1 person, and may be impacted by changes in Bluesky."/>

            <TagCloud tags={tags}/>


            <div className="bg-white border-black border-2 p-4 rounded-xl space-y-2">
                <div className="text-lg font-medium">Existing Feeds</div>
                {
                    feeds.length > 0 && <BackAndForwardButtons basePath={`${BASE_URL}`} params={router.query}/>
                }

                {
                    feeds.map(x => <FeedItem key={x.uri} item={x} popupState={popupState} setPopupState={setPopupState}
                                             busy={busy} setBusy={setBusy} refreshFeeds={refreshFeeds}/>)
                }

                {
                    feeds.length > 0 && <BackAndForwardButtons basePath={`${BASE_URL}`} params={router.query}/>
                }
                {
                    feeds.length === 0 && <div className="text-center font-bold text-xl"> No More Relevant Feeds </div>
                }
            </div>
        </div>

    </MainWrapper>
}