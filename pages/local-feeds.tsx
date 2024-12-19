import HeadExtended from "features/layout/HeadExtended";
import {useEffect, useState} from "react";
import PageHeader from "features/components/PageHeader";
import PopupConfirmation from "features/components/PopupConfirmation";
import {localDelete} from "features/network/network"
import {useRecaptcha} from "features/auth/RecaptchaProvider";
import FeedItem from "features/components/specific/FeedItem";
import {useRouter} from "next/router";
import {getLoggedInInfo} from "features/network/session";
import {APP_SESSION} from "features/auth/authUtils";
import PageFooter from "features/components/PageFooter";
import {AtpAgent} from "@atproto/api";
import SearchBox from "features/components/SearchBox";
import {getSearchConfig} from "features/utils/getSearchConfig";
import BackAndForwardButtons from "features/components/BackAndForwardButtons";
import {getDbClient} from "features/utils/db";
import {MainWrapper} from "features/layout/MainWrapper";

export async function getServerSideProps({req, res, query}) {
    const [{ error, userData}, dbUtils] = await Promise.all([
        getLoggedInInfo(req, res),
        getDbClient()
    ]);
    if (error) { return {redirect: `/${error}`, permanent:false}; }
    if (!dbUtils) {return {redirect:"/500", permanent:false};}
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

    let feedsHereQuery:any = {query:"SELECT feed.id AS id FROM feed, every_feed WHERE feed.id = every_feed.id AND highlight = TRUE ORDER BY likes DESC, t_indexed ASC LIMIT $1 OFFSET $2", values: [PAGE_SIZE, offset]};
    const qTrim = q && q.trim();
    const lInt = parseInt(l);
    if (qTrim) {
        const searchConfig = getSearchConfig(qTrim, lInt);
        feedsHereQuery = {query:"SELECT feed.id AS id FROM feed, every_feed WHERE feed.id = every_feed.id AND highlight = TRUE AND every_feed.id @@@ $1::JSONB ORDER BY likes DESC LIMIT $2 OFFSET $3", values:[searchConfig, PAGE_SIZE, offset]};
    } else if (lInt && !isNaN(lInt) && lInt > 0) {
        // Limit by likes
        feedsHereQuery = {query:"SELECT feed.id AS id FROM feed, every_feed WHERE feed.id = every_feed.id AND highlight = TRUE AND likes > $1 ORDER BY likes DESC, t_indexed ASC LIMIT $2 OFFSET $3", values: [lInt, PAGE_SIZE, offset]};
    }
    console.log(helpers.concat([feedsHereQuery]));
    const feedsHere = await db.manyOrNone(helpers.concat([feedsHereQuery]));

    console.log("TOTAL FEEDS", feedsHere.length)
    let feeds:any[] = [];
    const publicAgent = new AtpAgent({service: "https://api.bsky.app/"});

    const {data} = await publicAgent.app.bsky.feed.getFeedGenerators({feeds: feedsHere.map(x => x.id)});
    const updatedFeeds = data.feeds.map(x => {
        const {uri, did, creator, avatar,
            displayName, description, likeCount, indexedAt} = x;
        return {uri, did, creator, avatar: avatar || null,
            displayName, description, likeCount, indexedAt};
    });

    feeds = feedsHere.reduce((acc,x) => {
        const {id} = x;
        const temp = updatedFeeds.find(y => y.uri === id);
        if (temp) { acc.push(temp); }
        return acc;
    }, []);

    return {props: {feeds, userData}};
}
const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL;

export default function Home({userData, feeds}) {
    const title = "Feeds made at BlueskyFeeds.com";
    const description = "Opt out of being listed here by setting `Highlight this feed` to `no`.";
    const [popupState, setPopupState] = useState<"delete"|false>(false);
    const [selectedItem, setSelectedItem] = useState<any>(null);
    const [busy, setBusy] = useState(false);
    const recaptcha = useRecaptcha();
    const router = useRouter();

    return <MainWrapper userData={userData}>
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
            <SearchBox path="/local-feeds" title="Search Feeds made here" setBusy={setBusy} />

            <div className="bg-white border-black border-2 p-4 rounded-xl space-y-2">
                <div className="text-lg font-medium">Feeds Made Here</div>
                {
                    feeds.length > 0 &&
                    <BackAndForwardButtons basePath={`${BASE_URL}/local-feeds`} params={router.query}/>
                }
                {
                    feeds && feeds.map(x =>
                        <FeedItem key={x.uri} item={x} setSelectedItem={setSelectedItem} setPopupState={setPopupState}/>
                    )
                }
                {
                    feeds.length > 0 &&
                    <BackAndForwardButtons basePath={`${BASE_URL}/local-feeds`} params={router.query}/>
                }
            </div>
            <PageFooter/>
        </div>

    </MainWrapper>
}
