import HeadExtended from "features/layout/HeadExtended";
import {connectToDatabase} from "features/utils/dbUtils";
import {useEffect} from "react";
import Table from "features/components/table/Table";
import Link from "next/link";
import {SiBuzzfeed} from "react-icons/si";
import PageHeader from "features/components/PageHeader";
import {rebuildAgentFromSession, getMyFeedIds, feedUriToUrl} from "features/utils/feedUtils";
import {getSessionData} from "features/network/session";

export async function getServerSideProps({req, res}) {
    const db = await connectToDatabase();
    if (!db) { return { redirect: { destination: '/500', permanent: false } } }
    const feedsDefault = (await db.allFeeds.find({}).sort({likeCount:-1, indexedAt:1}).limit(10).toArray()).map(x => {
        const {_id:uri, ...y} = x;
        return {...y, uri};
    });
    let myFeeds = [];

    let session = await getSessionData(req, res);
    if (session) {
        const agent = await rebuildAgentFromSession(session);
        if (!agent) {return { redirect: { destination: '/signout', permanent: false } };}

        myFeeds = await getMyFeedIds(agent);
    }


    return {props: {session, myFeeds, feedsDefault}};
}

const columns = [
    {
        Header: "Feed",
        columns: [
            {Header: "Image", disableFilters:true, Cell: tableProps => {
                    const url = tableProps.row.original.avatar;
                    return <>{
                        url?<img
                            src={url}
                            className="w-8 h-8 rounded-xl"
                            alt='Feed Image'
                        />:<svg className="w-8 h-8 bg-[#0070FF] rounded-xl" viewBox="0 0 32 32">
                            <path d="M13.5 7.25C13.5 6.55859 14.0586 6 14.75 6C20.9648 6 26 11.0352 26 17.25C26 17.9414 25.4414 18.5 24.75 18.5C24.0586 18.5 23.5 17.9414 23.5 17.25C23.5 12.418 19.582 8.5 14.75 8.5C14.0586 8.5 13.5 7.94141 13.5 7.25ZM8.36719 14.6172L12.4336 18.6836L13.543 17.5742C13.5156 17.4727 13.5 17.3633 13.5 17.25C13.5 16.5586 14.0586 16 14.75 16C15.4414 16 16 16.5586 16 17.25C16 17.9414 15.4414 18.5 14.75 18.5C14.6367 18.5 14.5312 18.4844 14.4258 18.457L13.3164 19.5664L17.3828 23.6328C17.9492 24.1992 17.8438 25.1484 17.0977 25.4414C16.1758 25.8008 15.1758 26 14.125 26C9.63672 26 6 22.3633 6 17.875C6 16.8242 6.19922 15.8242 6.5625 14.9023C6.85547 14.1602 7.80469 14.0508 8.37109 14.6172H8.36719ZM14.75 9.75C18.8906 9.75 22.25 13.1094 22.25 17.25C22.25 17.9414 21.6914 18.5 21 18.5C20.3086 18.5 19.75 17.9414 19.75 17.25C19.75 14.4883 17.5117 12.25 14.75 12.25C14.0586 12.25 13.5 11.6914 13.5 11C13.5 10.3086 14.0586 9.75 14.75 9.75Z" fill="white">
                            </path>
                        </svg>
                    }</>
                }},
            {Header: "Feed Name", accessor: "displayName", Cell: tableProps => {
                    const {displayName, uri} = tableProps.row.original;
                    const feedUrl = `https://bsky.app/profile/${feedUriToUrl(uri)}`;

                    return <a href={feedUrl} className="text-blue-500 hover:underline hover:text-blue-700">
                        {displayName}
                    </a>
                }},
            {Header: "Description", accessor: "description"},
            {Header: "Likes", accessor: "likeCount"},
        ]
    },
    {
        Header: "Owner",
        columns: [
            {Header: "Avatar", disableFilters:true, Cell: tableProps => {
                    const url = tableProps.row.original.creator.avatar;
                    return <a href={`https://bsky.app/profile/${tableProps.row.original.creator.handle}`}>{
                        url?<img
                            src={url}
                            className="w-8 h-8 rounded-xl"
                            alt='User Image'
                        />:<svg className="w-8 h-8 bg-[#0070FF] rounded-xl" viewBox="0 0 32 32">
                            <path d="M13.5 7.25C13.5 6.55859 14.0586 6 14.75 6C20.9648 6 26 11.0352 26 17.25C26 17.9414 25.4414 18.5 24.75 18.5C24.0586 18.5 23.5 17.9414 23.5 17.25C23.5 12.418 19.582 8.5 14.75 8.5C14.0586 8.5 13.5 7.94141 13.5 7.25ZM8.36719 14.6172L12.4336 18.6836L13.543 17.5742C13.5156 17.4727 13.5 17.3633 13.5 17.25C13.5 16.5586 14.0586 16 14.75 16C15.4414 16 16 16.5586 16 17.25C16 17.9414 15.4414 18.5 14.75 18.5C14.6367 18.5 14.5312 18.4844 14.4258 18.457L13.3164 19.5664L17.3828 23.6328C17.9492 24.1992 17.8438 25.1484 17.0977 25.4414C16.1758 25.8008 15.1758 26 14.125 26C9.63672 26 6 22.3633 6 17.875C6 16.8242 6.19922 15.8242 6.5625 14.9023C6.85547 14.1602 7.80469 14.0508 8.37109 14.6172H8.36719ZM14.75 9.75C18.8906 9.75 22.25 13.1094 22.25 17.25C22.25 17.9414 21.6914 18.5 21 18.5C20.3086 18.5 19.75 17.9414 19.75 17.25C19.75 14.4883 17.5117 12.25 14.75 12.25C14.0586 12.25 13.5 11.6914 13.5 11C13.5 10.3086 14.0586 9.75 14.75 9.75Z" fill="white">
                            </path>
                        </svg>
                    }</a>
                }},
            {Header: "Name", accessor: "creator.displayName", Cell: tableProps => {
                    const name = tableProps.row.original.creator.displayName;
                    return <a href={`https://bsky.app/profile/${tableProps.row.original.creator.handle}`} className="text-blue-500 hover:underline hover:text-blue-700">
                        {name}
                    </a>
                }}
        ]
    }

];


export default function Home({feedsDefault, myFeeds}) {
    const title = "BlueskyFeeds.com";
    const description = "Find your perfect feed algorithm for Bluesky Social App, or build one yourself";

    useEffect(() => {
        console.log("feeds", feedsDefault);
    }, [feedsDefault]);
    useEffect(() => {
        console.log("myFeeds", myFeeds);
    }, [myFeeds])
    return (
        <>
            <HeadExtended title={title}
                          description={description}/>
            <div className="bg-sky-200 w-full max-w-8xl rounded-xl overflow-hidden p-4 space-y-4">
                <PageHeader title={title} description={description} />

                <Link href="/my-feeds">
                    <button type="button"
                            className="mt-4 gap-4 w-full inline-flex justify-center items-center px-4 py-2 border border-transparent  rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500">
                        <SiBuzzfeed className="w-6 h-6"/> <div className="text-lg font-medium">Login to create and manage your Feeds</div> <SiBuzzfeed className="w-6 h-6"/>
                    </button>
                </Link>

                <div className="bg-white border border-black border-2 p-1 rounded-xl">
                    <div className="text-lg font-medium">Search Existing Feeds</div>

                    <Table columns={columns} data={feedsDefault} getCellProps={(row, cell, j, className) => {
                        const i = row.index; // The i retrieved this way is the data's i
                        /*if (j === columns.findIndex(x => x.Header === "Feed Name")) {
                            return {
                                className: clsx(className, "hover:bg-blue-700")
                            }
                        }*/
                        return { className };
                    }} rowProps={(row) => {
                        return {
                            className: "hover:bg-gray-100"
                        }
                    }} />
                </div>


            </div>
        </>
    )
}
