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
import {getDbClient} from "features/utils/db";
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

    const userDid = privateAgent?.session?.did || "";
    let feedsHereQuery:any = {
        query:"SELECT f.id AS id, (a.admin_id IS NOT NULL) AS edit FROM feed AS f "
            + "JOIN every_feed AS e ON f.id = e.id AND f.highlight = TRUE "
            + "LEFT JOIN feed_admin AS a ON a.feed_id = e.id AND admin_id = $1 "
            + "ORDER BY e.likes DESC, e.t_indexed ASC LIMIT $2 OFFSET $3",
        values: [userDid, PAGE_SIZE, offset]};
    const qTrim = q && q.trim();
    const lInt = parseInt(l);
    if (qTrim) {
        const searchConfig = getSearchConfig(qTrim, lInt);
        feedsHereQuery = {
            query:"SELECT f.id AS id, (a.admin_id IS NOT NULL) AS edit FROM feed AS f "
                + "JOIN every_feed AS e WHERE f.id = e.id AND f.highlight = TRUE "
                + "LEFT JOIN feed_admin AS a ON a.feed_id = e.id AND admin_id = $1 "
                + "WHERE e.id @@@ $2::JSONB ORDER BY likes DESC LIMIT $3 OFFSET $4",
            values: [userDid, searchConfig, PAGE_SIZE, offset]};
    } else if (lInt && !isNaN(lInt) && lInt > 0) {
        // Limit by likes
        feedsHereQuery = {
            query:"SELECT f.id AS id, (a.admin_id IS NOT NULL) AS edit FROM feed AS f "
                + "JOIN every_feed AS e WHERE f.id = e.id AND f.highlight = TRUE "
                + "LEFT JOIN feed_admin AS a ON a.feed_id = e.id AND admin_id = $1 "
                + "WHERE likes > $2 ORDER BY likes DESC, t_indexed ASC LIMIT $3 OFFSET $4",
            values: [userDid, lInt, PAGE_SIZE, offset]};
    }
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
        const {id, edit} = x;
        const temp = updatedFeeds.find(y => y.uri === id);
        if (temp) { acc.push({...temp, edit}); }
        return acc;
    }, []);

    return {props: {feeds}};
}
const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL;

export default function Home({feeds}) {
    const title = "Feeds made at BlueskyFeeds.com";
    const description = "Opt out of being listed here by setting `Highlight this feed` to `no`.";
    const [popupState, setPopupState] = useState<"delete"|false>(false);
    const [selectedItem, setSelectedItem] = useState<any>(null);
    const [busy, setBusy] = useState(false);
    const recaptcha = useRecaptcha();
    const router = useRouter();

    return <MainWrapper>
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
            <PageHeader title={title} description={description}/>
            <SearchBox path="/feed/local" title="Search Feeds made here" setBusy={setBusy} />

            <div className="bg-white border-black border-2 p-4 rounded-xl space-y-2">
                <div className="text-lg font-medium">Feeds Made Here</div>
                {
                    feeds.length > 0 &&
                    <BackAndForwardButtons basePath={`${BASE_URL}/feed/local`} params={router.query}/>
                }
                {
                    feeds && feeds.map(x =>
                        <FeedItem key={x.uri} item={x} setSelectedItem={setSelectedItem} setPopupState={setPopupState}/>
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
