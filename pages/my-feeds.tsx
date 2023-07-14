import HeadExtended from "features/layout/HeadExtended";
import {useSession} from "next-auth/react";
import FormSignIn from "features/login/FormSignIn";
import {RiTestTubeLine} from "react-icons/ri";
import Link from "next/link";
import {useEffect, useState} from "react";
import PageHeader from "features/components/PageHeader";
import {AiFillHeart} from "react-icons/ai";
import {rebuildAgentFromSession, getMyFeeds, feedUriToUrl} from "features/utils/feedUtils";
import clsx from "clsx";
import {BsPinFill} from "react-icons/bs";
import {HiPencil, HiTrash} from "react-icons/hi";
import {connectToDatabase} from "features/utils/dbUtils";
import PopupConfirmation from "features/components/PopupConfirmation";
import {localDelete} from "features/network/network"
import {getSessionData} from "features/network/session";
import {useRecaptcha} from "features/auth/RecaptchaProvider";
import {HiMagnifyingGlass} from "react-icons/hi2";

export async function getServerSideProps({req, res}) {
    const db = await connectToDatabase();
    if (!db) { return { redirect: { destination: '/500', permanent: false } } }
    let myFeeds = [];

    const session = await getSessionData(req, res);
    if (session) {
        const agent = await rebuildAgentFromSession(session);
        if (!agent) {return { redirect: { destination: '/signout', permanent: false } };}

        myFeeds = await getMyFeeds(agent);
    }

    return {props: {session, myFeeds}};
}


export default function Home({myFeeds}) {
    const title = "My BlueSky Custom Feeds";
    const description = "";
    const { data: session } = useSession();
    const [popupState, setPopupState] = useState<"confirm"|false>(false);
    const [selectedItem, setSelectedItem] = useState<any>(null);
    const [busy, setBusy] = useState(false);
    const recaptcha = useRecaptcha();

    useEffect(() => {
        console.log("feeds", myFeeds);

    }, [myFeeds])
    return <>
        <PopupConfirmation
            isOpen={popupState === "confirm"} setOpen={setPopupState}
            title={`Confirm deletion of ${selectedItem?.displayName}`}
            message="This cannot be reversed"
            yesCallback={async() => {
                if (typeof recaptcha !== 'undefined') {
                    console.log("checking captcha");
                    recaptcha.ready(async () => {
                        setBusy(true);
                        //@ts-ignore
                        const captcha = await recaptcha.execute(process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY, {action: 'submit'});
                        const result = await localDelete("/feed/delete", {captcha, rkey: selectedItem.uri.split("/").slice(-1)[0]});
                        console.log(result);
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

                <Link href="/edit-feed">
                    <button type="button"
                            className="mt-4 w-full inline-flex justify-center items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500">
                        <RiTestTubeLine className="w-6 h-6"/> Make a new Feed
                    </button>
                </Link>
                <div className="border border-2 border-black p-4 bg-white rounded-xl">
                    <div>Feeds Editable in BlueskyFeeds.com are in green</div>
                    {
                        myFeeds && myFeeds.map(x =>
                            <div key={x.uri} className={clsx("w-full bg-white border border-black border-2 flex gap-2 p-1 -mt-0.5",
                              //  x.my && "bg-green-200 border-green-600"
                            )}>
                                <div>
                                    {
                                        x.avatar? <img
                                            src={x.avatar}
                                            className="w-14 h-14 rounded-xl"
                                            alt='Feed Image'
                                        />: <svg className="w-14 h-14 bg-[#0070FF] rounded-xl" viewBox="0 0 32 32">
                                            <path d="M13.5 7.25C13.5 6.55859 14.0586 6 14.75 6C20.9648 6 26 11.0352 26 17.25C26 17.9414 25.4414 18.5 24.75 18.5C24.0586 18.5 23.5 17.9414 23.5 17.25C23.5 12.418 19.582 8.5 14.75 8.5C14.0586 8.5 13.5 7.94141 13.5 7.25ZM8.36719 14.6172L12.4336 18.6836L13.543 17.5742C13.5156 17.4727 13.5 17.3633 13.5 17.25C13.5 16.5586 14.0586 16 14.75 16C15.4414 16 16 16.5586 16 17.25C16 17.9414 15.4414 18.5 14.75 18.5C14.6367 18.5 14.5312 18.4844 14.4258 18.457L13.3164 19.5664L17.3828 23.6328C17.9492 24.1992 17.8438 25.1484 17.0977 25.4414C16.1758 25.8008 15.1758 26 14.125 26C9.63672 26 6 22.3633 6 17.875C6 16.8242 6.19922 15.8242 6.5625 14.9023C6.85547 14.1602 7.80469 14.0508 8.37109 14.6172H8.36719ZM14.75 9.75C18.8906 9.75 22.25 13.1094 22.25 17.25C22.25 17.9414 21.6914 18.5 21 18.5C20.3086 18.5 19.75 17.9414 19.75 17.25C19.75 14.4883 17.5117 12.25 14.75 12.25C14.0586 12.25 13.5 11.6914 13.5 11C13.5 10.3086 14.0586 9.75 14.75 9.75Z" fill="white">
                                            </path>
                                        </svg>
                                    }
                                    <div className="flex place-items-center">
                                        <AiFillHeart className="w-4 h-4"/>
                                        <span>{x.likeCount}</span>
                                    </div>
                                </div>
                                <div className="grow">
                                    <div className="flex place-items-center gap-1">
                                        {
                                            x.pinned && <BsPinFill className="w-4 h-4" />
                                        }
                                        <a href={`https://bsky.app/profile/${x.uri.slice(5).replace("app.bsky.feed.generator", "feed")}`}>
                                            <div className="text-blue-500 hover:text-blue-800 underline hover:bg-orange-200 ">{x.displayName}</div>
                                        </a>

                                        <div>by</div>
                                        <a href={`https://bsky.app/profile/${x.creator.handle}`}>
                                            <div className="flex place-items-center group hover:bg-orange-200">
                                                {
                                                    x.creator.avatar? <img
                                                        src={x.creator.avatar}
                                                        className="w-4 h-4 rounded-xl"
                                                        alt='Feed Image'
                                                    />: <svg className="w-4 h-4 bg-[#0070FF] rounded-xl ml-2" viewBox="0 0 32 32">
                                                        <path d="M13.5 7.25C13.5 6.55859 14.0586 6 14.75 6C20.9648 6 26 11.0352 26 17.25C26 17.9414 25.4414 18.5 24.75 18.5C24.0586 18.5 23.5 17.9414 23.5 17.25C23.5 12.418 19.582 8.5 14.75 8.5C14.0586 8.5 13.5 7.94141 13.5 7.25ZM8.36719 14.6172L12.4336 18.6836L13.543 17.5742C13.5156 17.4727 13.5 17.3633 13.5 17.25C13.5 16.5586 14.0586 16 14.75 16C15.4414 16 16 16.5586 16 17.25C16 17.9414 15.4414 18.5 14.75 18.5C14.6367 18.5 14.5312 18.4844 14.4258 18.457L13.3164 19.5664L17.3828 23.6328C17.9492 24.1992 17.8438 25.1484 17.0977 25.4414C16.1758 25.8008 15.1758 26 14.125 26C9.63672 26 6 22.3633 6 17.875C6 16.8242 6.19922 15.8242 6.5625 14.9023C6.85547 14.1602 7.80469 14.0508 8.37109 14.6172H8.36719ZM14.75 9.75C18.8906 9.75 22.25 13.1094 22.25 17.25C22.25 17.9414 21.6914 18.5 21 18.5C20.3086 18.5 19.75 17.9414 19.75 17.25C19.75 14.4883 17.5117 12.25 14.75 12.25C14.0586 12.25 13.5 11.6914 13.5 11C13.5 10.3086 14.0586 9.75 14.75 9.75Z" fill="white">
                                                        </path>
                                                    </svg>
                                                }
                                                <span className="text-blue-500 group-hover:text-blue-800 underline">{x.creator.displayName} @{x.creator.handle}</span>
                                            </div>
                                        </a>
                                    </div>
                                    <div>{x.description}</div>
                                </div>
                                {
                                    <div className="space-x-2">
                                        {
                                            x.my && <button type="button"
                                                            className="text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 rounded-xl p-1"
                                                            onClick={() => {
                                                                setSelectedItem(x);
                                                                setPopupState("confirm");
                                                            }}>
                                                <HiTrash className="w-6 h-6" title="Delete"/>
                                            </button>
                                        }
                                        {
                                            x.site && <button type="button"
                                                    className="text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 rounded-xl p-1">
                                                <HiPencil className="w-6 h-6" title="Edit"/>
                                            </button>
                                        }
                                        <Link href={`/preview?feed=${x.uri}`}>
                                            <button type="button"
                                                    className="text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 rounded-xl p-1"
                                            >
                                                <HiMagnifyingGlass className="w-6 h-6" title="Preview"/>
                                            </button>
                                        </Link>
                                    </div>
                                }
                            </div>
                        )
                    }
                </div>
            </div>
        }
    </>
}
