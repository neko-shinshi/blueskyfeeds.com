import {useEffect, useState} from "react";
import HeadExtended from "features/layout/HeadExtended";
import PageHeader from "features/components/PageHeader";
import {getSessionData} from "features/network/session";
import {rebuildAgentFromSession} from "features/utils/feedUtils";
import {timeText} from "features/utils/timeUtils";
import { BiMessage, BiRepost} from "react-icons/bi";
import {AiFillHeart, AiOutlineHeart} from "react-icons/ai";
import {BsPinFill} from "react-icons/bs";

export async function getServerSideProps({req, res, query}) {
    const {feed} = query;
    if (!feed) {return { redirect: { destination: '/', permanent: false } };}

    let feedItems = [];
    const session = await getSessionData(req, res);
    if (!session) {return { redirect: { destination: '/', permanent: false } };}

    const agent = await rebuildAgentFromSession(session);
    if (!agent) {return { redirect: { destination: '/signout', permanent: false } };}

    const {data} = await agent.api.app.bsky.feed.getFeed({feed, limit:10});

    // The return value is a non-serializable JSON for some reason
    feedItems = data.feed.map(x =>  JSON.parse(JSON.stringify(x.post)));

    const feedDescription = (await agent.api.app.bsky.feed.getFeedGenerators({feeds:[feed]}))?.data?.feeds[0] || {};
    console.log(JSON.stringify(feedDescription, null, 2));


    return {props: {session, feedItems, feedDescription}};
}

export default function Home({feedItems:_feedItems, feedDescription}) {
    const title = "Preview Feed";
    const description = "See what appears in this feed for you";
    const [feedItems, setFeedItems] = useState<any>();

    useEffect(() => {
        setFeedItems(_feedItems);
    }, [_feedItems])

    return <>
        <HeadExtended title={title}
                      description={description}/>
        <div className="bg-sky-200 w-full max-w-8xl rounded-xl overflow-hidden p-4 space-y-4">
            <PageHeader title={title} description={description}/>

            <div className="bg-white border border-black border-2 p-4 flex">
                <div>
                    {
                        feedDescription.avatar? <img
                            src={feedDescription.avatar}
                            className="w-14 h-14 rounded-xl"
                            alt='Feed Image'
                        />: <svg className="w-14 h-14 bg-[#0070FF] rounded-xl" viewBox="0 0 32 32">
                            <path d="M13.5 7.25C13.5 6.55859 14.0586 6 14.75 6C20.9648 6 26 11.0352 26 17.25C26 17.9414 25.4414 18.5 24.75 18.5C24.0586 18.5 23.5 17.9414 23.5 17.25C23.5 12.418 19.582 8.5 14.75 8.5C14.0586 8.5 13.5 7.94141 13.5 7.25ZM8.36719 14.6172L12.4336 18.6836L13.543 17.5742C13.5156 17.4727 13.5 17.3633 13.5 17.25C13.5 16.5586 14.0586 16 14.75 16C15.4414 16 16 16.5586 16 17.25C16 17.9414 15.4414 18.5 14.75 18.5C14.6367 18.5 14.5312 18.4844 14.4258 18.457L13.3164 19.5664L17.3828 23.6328C17.9492 24.1992 17.8438 25.1484 17.0977 25.4414C16.1758 25.8008 15.1758 26 14.125 26C9.63672 26 6 22.3633 6 17.875C6 16.8242 6.19922 15.8242 6.5625 14.9023C6.85547 14.1602 7.80469 14.0508 8.37109 14.6172H8.36719ZM14.75 9.75C18.8906 9.75 22.25 13.1094 22.25 17.25C22.25 17.9414 21.6914 18.5 21 18.5C20.3086 18.5 19.75 17.9414 19.75 17.25C19.75 14.4883 17.5117 12.25 14.75 12.25C14.0586 12.25 13.5 11.6914 13.5 11C13.5 10.3086 14.0586 9.75 14.75 9.75Z" fill="white">
                            </path>
                        </svg>
                    }
                    <div className="flex place-items-center">
                        <AiFillHeart className="w-4 h-4"/>
                        <span>{feedDescription.likeCount}</span>
                    </div>
                </div>
                <div>
                    <div className="flex place-items-center gap-1">
                        {
                            feedDescription.pinned && <BsPinFill className="w-4 h-4" />
                        }
                        <a href={`https://bsky.app/profile/${feedDescription.uri.slice(5).replace("app.bsky.feed.generator", "feed")}`}>
                            <div className="text-blue-500 hover:text-blue-800 underline hover:bg-orange-200 ">{feedDescription.displayName}</div>
                        </a>

                        <div>by</div>
                        <a href={`https://bsky.app/profile/${feedDescription.creator.handle}`}>
                            <div className="flex place-items-center group hover:bg-orange-200">
                                {
                                    feedDescription.creator.avatar? <img
                                        src={feedDescription.creator.avatar}
                                        className="w-4 h-4 rounded-xl"
                                        alt='Feed Image'
                                    />: <svg className="w-4 h-4 bg-[#0070FF] rounded-xl ml-2" viewBox="0 0 32 32">
                                        <path d="M13.5 7.25C13.5 6.55859 14.0586 6 14.75 6C20.9648 6 26 11.0352 26 17.25C26 17.9414 25.4414 18.5 24.75 18.5C24.0586 18.5 23.5 17.9414 23.5 17.25C23.5 12.418 19.582 8.5 14.75 8.5C14.0586 8.5 13.5 7.94141 13.5 7.25ZM8.36719 14.6172L12.4336 18.6836L13.543 17.5742C13.5156 17.4727 13.5 17.3633 13.5 17.25C13.5 16.5586 14.0586 16 14.75 16C15.4414 16 16 16.5586 16 17.25C16 17.9414 15.4414 18.5 14.75 18.5C14.6367 18.5 14.5312 18.4844 14.4258 18.457L13.3164 19.5664L17.3828 23.6328C17.9492 24.1992 17.8438 25.1484 17.0977 25.4414C16.1758 25.8008 15.1758 26 14.125 26C9.63672 26 6 22.3633 6 17.875C6 16.8242 6.19922 15.8242 6.5625 14.9023C6.85547 14.1602 7.80469 14.0508 8.37109 14.6172H8.36719ZM14.75 9.75C18.8906 9.75 22.25 13.1094 22.25 17.25C22.25 17.9414 21.6914 18.5 21 18.5C20.3086 18.5 19.75 17.9414 19.75 17.25C19.75 14.4883 17.5117 12.25 14.75 12.25C14.0586 12.25 13.5 11.6914 13.5 11C13.5 10.3086 14.0586 9.75 14.75 9.75Z" fill="white">
                                        </path>
                                    </svg>
                                }
                                <span className="text-blue-500 group-hover:text-blue-800 underline">{feedDescription.creator.displayName} @{feedDescription.creator.handle} </span>
                            </div>
                        </a>
                    </div>
                    <div>{feedDescription.description}</div>
                </div>
            </div>

            {
                feedItems && feedItems.map(x =>
                    <div key={x.uri}
                         className="border border-black border-2 w-full flex">
                        <img
                            src={x.author.avatar}
                            className="w-12 h-12 rounded-full"
                            alt='User Image'
                        />
                        <div>
                            <div><span><span className="font-semibold">{x.author.displayName}</span> <span>@{x.author.handle}</span></span> · <span>{timeText(x.indexedAt)}</span></div>
                            <div>{x.record.text}</div>
                            <div className="flex place-items-center"><BiMessage className="w-4 h-4" />{x.replyCount} <BiRepost className="w-4 h-4" />{x.repostCount}<AiOutlineHeart className="w-4 h-4"/>{x.likeCount} </div>
                        </div>
                    </div>)
            }
        </div>
    </>
}
