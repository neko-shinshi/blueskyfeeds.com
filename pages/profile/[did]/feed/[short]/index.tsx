import {useEffect, useState} from "react";
import HeadExtended from "features/layout/HeadExtended";
import PageHeader from "features/components/PageHeader";
import {timeText} from "features/utils/timeUtils";
import { BiMessage, BiRepost} from "react-icons/bi";
import {AiFillHeart, AiOutlineHeart} from "react-icons/ai";
import {BsPinFill} from "react-icons/bs";
import FormSignIn from "features/login/FormSignIn";
import {signIn, useSession} from "next-auth/react";
import BlueskyAvatar from "features/components/specific/BlueskyAvatar";
import {getLoggedInData} from "features/network/session";
import {APP_SESSION} from "features/auth/authUtils";
import Image from "next/image";
import {HiDownload, HiTrash} from "react-icons/hi";
import SortableWordBubbles from "features/components/SortableWordBubbles";
import {toJson} from "really-relaxed-json";
import {compressedToJsonString, unEscapeRelaxed} from "features/utils/textAndKeywords";
import {removeUndefined} from "features/utils/validationUtils";
import PageFooter from "features/components/PageFooter";
import {AtpAgent} from "@atproto/api";
import {getActorsInfo} from "features/utils/bsky";

export async function getServerSideProps({req, res, params}) {
    const {did:_did, short} = params;
    if (!_did || !short) {return { redirect: { destination: '/', permanent: false } };}

    const {updateSession, session, agent, redirect, db} = await getLoggedInData(req, res);
    if (redirect) {return {redirect};}
    const newAgent = new AtpAgent({service: "https://api.bsky.app/"});

    console.log(`preview: at://${_did}/app.bsky.feed.generator/${short}`);

    const result = await getActorsInfo(newAgent, [_did]);
    if (result.length === 0) { return { redirect: { destination: '/404', permanent: false } }; }
    const {did} = result[0];
    const feed = `at://${did}/app.bsky.feed.generator/${short}`;

    let localFeed:any = await db.feeds.findOne({_id: feed});
    if (localFeed) {
        let {keywords:storedKeywords, mode, subMode, keywordSetting,languages, pics,postLevels, sort, viewers} = localFeed;
        mode = mode === "user"? `${mode}-${subMode}` : mode;
        const keywords = storedKeywords?.map(x => {
            const {t, a} = x;
            let o:any;
            try {
                o = JSON.parse(unEscapeRelaxed(toJson(t)));
            } catch (e) {
                o = JSON.parse(compressedToJsonString(t));
            }

            o.a = a;
            if ((o.t === "t" || o.t === "s") && !o.r) {
                o.r = [];
            }
            return o;
        }) || [];

        if (Array.isArray(viewers) && viewers.length > 0) {
            if (viewers.includes(agent.session.did)) {
                localFeed = {keywords, storedKeywords, mode, keywordSetting, languages, pics, postLevels, sort};
            } else {
                // Private feeds don't show config data
                localFeed = {};
            }
        } else {
            localFeed = {keywords, storedKeywords, mode, keywordSetting, languages, pics, postLevels, sort};
        }
    } else {
        localFeed = {};
    }



    const {data} = await newAgent.api.app.bsky.feed.getFeed({feed, limit:10});
    // The return value is a non-serializable JSON for some reason
    const feedItems = data.feed.map(x =>  JSON.parse(JSON.stringify(x.post)));
    const feedDescription = (await newAgent.api.app.bsky.feed.getFeedGenerators({feeds:[feed]}))?.data?.feeds[0] || {};

    return {props: {feedItems, feedDescription: {...feedDescription, ...localFeed}, updateSession, session}};
}

export default function Home({feedItems:_feedItems, feedDescription, updateSession}) {
    const title = "Preview Feed";
    const description = "See what appears in this feed for you";
    const [feedItems, setFeedItems] = useState<any>();
    const { data: session, status} = useSession();

    useEffect(() => {
        setFeedItems(_feedItems);
    }, [_feedItems]);

    useEffect(() => {
        console.log("status", status);
        if (session && status === "authenticated" && updateSession) {
            signIn(APP_SESSION, {redirect: false, id: session.user.sk}).then(r => {
                console.log(r);
            });
        }
    }, [status]);

    return <>
        <HeadExtended title={title}
                      description={description}/>

        <div className="bg-sky-200 w-full max-w-8xl rounded-xl overflow-hidden p-4 space-y-4">
            <PageHeader title={title} description={description}/>

            <div className="bg-white border border-black border-2 p-4 inline-flex gap-1 rounded-xl">
                <div>
                    <BlueskyAvatar type="feed" avatar={feedDescription.avatar} uri={feedDescription.uri}/>
                    <div className="flex place-items-center">
                        <AiFillHeart className="w-4 h-4"/>
                        <span>{feedDescription.likeCount}</span>
                    </div>
                </div>
                <div>
                    {
                        !feedDescription.mode && <a href={`https://bsky.app/profile/${feedDescription.creator.handle}`}>
                            <div className="bg-red-200 border-2 font-semibold p-2 rounded-2xl">This feed is not managed here
                                at blueskyfeeds.com<br/><span>Contact the feed owner for more info</span>
                            </div>
                        </a>
                    }


                    <div className="inline-flex place-items-center gap-1">
                        {
                            feedDescription.pinned && <BsPinFill className="w-4 h-4" />
                        }
                        <a href={`https://bsky.app/profile/${feedDescription.uri?.slice(5).replace("app.bsky.feed.generator", "feed")}`}>
                            <div className="text-blue-500 hover:text-blue-800 underline hover:bg-orange-200 ">{feedDescription.displayName}</div>
                        </a>

                        <div>by</div>
                        <a href={`https://bsky.app/profile/${feedDescription.creator.handle}`}>
                            <div className="inline-flex place-items-center group hover:bg-orange-200">
                                <div className="aspect-square w-4 h-4">
                                    {
                                        feedDescription.creator.avatar? <Image
                                            width={20} height={20}
                                            src={feedDescription.creator.avatar}
                                            className="rounded-xl text-transparent"
                                            alt='Feed Image'
                                            onError={() => { /* DO NOTHING */}}
                                        />: <svg className="w-4 h-4 bg-[#0070FF] rounded-xl ml-2" viewBox="0 0 32 32">
                                            <path d="M13.5 7.25C13.5 6.55859 14.0586 6 14.75 6C20.9648 6 26 11.0352 26 17.25C26 17.9414 25.4414 18.5 24.75 18.5C24.0586 18.5 23.5 17.9414 23.5 17.25C23.5 12.418 19.582 8.5 14.75 8.5C14.0586 8.5 13.5 7.94141 13.5 7.25ZM8.36719 14.6172L12.4336 18.6836L13.543 17.5742C13.5156 17.4727 13.5 17.3633 13.5 17.25C13.5 16.5586 14.0586 16 14.75 16C15.4414 16 16 16.5586 16 17.25C16 17.9414 15.4414 18.5 14.75 18.5C14.6367 18.5 14.5312 18.4844 14.4258 18.457L13.3164 19.5664L17.3828 23.6328C17.9492 24.1992 17.8438 25.1484 17.0977 25.4414C16.1758 25.8008 15.1758 26 14.125 26C9.63672 26 6 22.3633 6 17.875C6 16.8242 6.19922 15.8242 6.5625 14.9023C6.85547 14.1602 7.80469 14.0508 8.37109 14.6172H8.36719ZM14.75 9.75C18.8906 9.75 22.25 13.1094 22.25 17.25C22.25 17.9414 21.6914 18.5 21 18.5C20.3086 18.5 19.75 17.9414 19.75 17.25C19.75 14.4883 17.5117 12.25 14.75 12.25C14.0586 12.25 13.5 11.6914 13.5 11C13.5 10.3086 14.0586 9.75 14.75 9.75Z" fill="white">
                                            </path>
                                        </svg>
                                    }
                                </div>
                                <span className="text-blue-500 group-hover:text-blue-800 underline">{feedDescription.creator.displayName} @{feedDescription.creator.handle} </span>
                            </div>
                        </a>
                    </div>
                    <div>{feedDescription.description}</div>
                    {
                        feedDescription.mode &&
                        <>
                            <div>Mode: {feedDescription.mode}</div>
                            {feedDescription.sort && <div>Sort by: {feedDescription.sort}</div>}
                            {feedDescription.keywordSetting && <div>Keyword Setting: {JSON.stringify(feedDescription.keywordSetting)}</div>}
                            {feedDescription.pics && <div>Picture Setting: {JSON.stringify(feedDescription.pics)}</div>}
                            {feedDescription.postLevels && <div>Post Levels: {JSON.stringify(feedDescription.postLevels)}</div>}
                            {feedDescription.languages && <div>Languages: {JSON.stringify(feedDescription.languages)}</div>}
                            {
                                Array.isArray(feedDescription.keywords) && feedDescription.keywords.length > 0 &&
                                <div className="bg-gray-100 p-4">
                                    <div>Keywords:</div>
                                    <SortableWordBubbles
                                        className="mt-2"
                                        value={feedDescription.keywords}
                                        selectable={true}
                                        valueModifier={(val) => {
                                            switch (val.t) {
                                                case "#":
                                                    return `#${val.w}`;
                                                case "s": {
                                                    const v = val.r.length === 0? "": ` -[${val.r.map(x =>  [x.p, val.w, x.s].filter(x => x).join("")).join(",")}]`;
                                                    return `[${val.w}]${v}`;

                                                }
                                                case "t": {
                                                    const v = val.r.length === 0? "": ` -[${val.r.map(x =>  [x.p, val.w, x.s].filter(x => x).join(" ")).join(",")}]`;
                                                    return `${val.w}${v}`;
                                                }
                                            }
                                            return `#${JSON.stringify(val)}`;
                                        }}
                                        classModifier={(val, index, original) => {
                                            if (val.a) {
                                                return original.replace("bg-white", "bg-lime-100 hover:bg-lime-300");
                                            } else {
                                                return original.replace("bg-white", "bg-red-300 hover:bg-red-500");
                                            }
                                        }}
                                        clickable={false}
                                        buttonCallback={(val, action) => {}}
                                    />
                                </div>
                            }

                            <button type="button"
                                    onClick={() => {
                                        const {mode,keywords, languages, postLevels, pics, keywordSetting, sort} = feedDescription;
                                        const result = {mode,keywords, languages, postLevels, pics, keywordSetting, sort};
                                        const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(result, null, 2));
                                        const dlAnchorElem = document.createElement('a');
                                        dlAnchorElem.setAttribute("href",     dataStr     );
                                        dlAnchorElem.setAttribute("download", `preview.json`);
                                        dlAnchorElem.click();
                                    }}
                                    className="p-1 inline-flex items-center rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500">
                                <HiDownload className="w-6 h-6"/>
                                <div className="text-lg font-medium">Download JSON</div>
                            </button>
                        </>
                    }
                </div>
            </div>


            <div className="p-4 space-y-2 bg-white border border-black border-2 rounded-xl">
                {
                    feedItems && feedItems.map(x =>
                        <div key={x.uri}
                             className="border border-gray-700 border-2 border-dashed w-full inline-flex p-1 gap-1">
                            <BlueskyAvatar type="user" avatar={x.author.avatar} uri={x.author.handle}/>

                            <div>
                                <div><a className="hover:bg-orange-200" href={`https://bsky.app/profile/${x.author.handle}`}><span className="font-semibold">{x.author.displayName}</span> <span>@{x.author.handle}</span></a> · <span>{timeText(x.indexedAt)}</span></div>
                                <div>{x.record.text}</div>
                                <div className="flex place-items-center"><BiMessage className="w-4 h-4" />{x.replyCount} <BiRepost className="w-4 h-4" />{x.repostCount}<AiOutlineHeart className="w-4 h-4"/>{x.likeCount} </div>
                            </div>
                        </div>)
                }
            </div>

            <PageFooter/>
        </div>


    </>
}
