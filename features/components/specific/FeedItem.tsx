import clsx from "clsx";
import Link from "next/link";
import Image from "next/image";
import BlueskyAvatar from "features/components/specific/BlueskyAvatar";
import {AiFillHeart} from "react-icons/ai";
import {BsPinFill} from "react-icons/bs";
import {HiPencil, HiTrash} from "react-icons/hi";
import {HiMagnifyingGlass} from "react-icons/hi2";
import {FaUserGear} from "react-icons/fa6";
import {FaRegCopy} from "react-icons/fa";

export default function FeedItem ({item, setSelectedItem, setPopupState}) {
    return <div className={clsx("w-full border-2 flex gap-2 p-1 -mt-0.5",
          item.edit? "bg-green-200 border-green-600" : "bg-white border-black"
    )}>
        <div>
            <BlueskyAvatar type="feed" avatar={item.avatar} uri={item.uri}/>

            <div className="flex place-items-center">
                <AiFillHeart className="w-4 h-4"/>
                <span>{item.likeCount}</span>
            </div>
        </div>
        <div className="grow">
            <div className="flex place-items-center gap-1">
                {
                    item.pinned && <BsPinFill className="w-4 h-4"/>
                }
                <a href={`https://bsky.app/profile/${item.uri.slice(5).replace("app.bsky.feed.generator", "feed")}`}>
                    <div
                        className="text-blue-500 hover:text-blue-800 underline hover:bg-orange-200 ">{item.displayName}</div>
                </a>

                <div>by</div>
                <a href={`https://bsky.app/profile/${item.creator.handle}`}>
                    <div className="flex place-items-center group hover:bg-orange-200">
                        <div className="aspect-square w-4 h-4">
                            {
                                item.creator.avatar ? <Image
                                    width={20} height={20}
                                    src={item.creator.avatar}
                                    className="rounded-xl text-transparent"
                                    alt='Feed Image'
                                    onError={() => { /* DO NOTHING */
                                    }}
                                /> : <svg className="w-4 h-4 bg-[#0070FF] rounded-xl ml-2" viewBox="0 0 32 32">
                                    <path
                                        d="M13.5 7.25C13.5 6.55859 14.0586 6 14.75 6C20.9648 6 26 11.0352 26 17.25C26 17.9414 25.4414 18.5 24.75 18.5C24.0586 18.5 23.5 17.9414 23.5 17.25C23.5 12.418 19.582 8.5 14.75 8.5C14.0586 8.5 13.5 7.94141 13.5 7.25ZM8.36719 14.6172L12.4336 18.6836L13.543 17.5742C13.5156 17.4727 13.5 17.3633 13.5 17.25C13.5 16.5586 14.0586 16 14.75 16C15.4414 16 16 16.5586 16 17.25C16 17.9414 15.4414 18.5 14.75 18.5C14.6367 18.5 14.5312 18.4844 14.4258 18.457L13.3164 19.5664L17.3828 23.6328C17.9492 24.1992 17.8438 25.1484 17.0977 25.4414C16.1758 25.8008 15.1758 26 14.125 26C9.63672 26 6 22.3633 6 17.875C6 16.8242 6.19922 15.8242 6.5625 14.9023C6.85547 14.1602 7.80469 14.0508 8.37109 14.6172H8.36719ZM14.75 9.75C18.8906 9.75 22.25 13.1094 22.25 17.25C22.25 17.9414 21.6914 18.5 21 18.5C20.3086 18.5 19.75 17.9414 19.75 17.25C19.75 14.4883 17.5117 12.25 14.75 12.25C14.0586 12.25 13.5 11.6914 13.5 11C13.5 10.3086 14.0586 9.75 14.75 9.75Z"
                                        fill="white">
                                    </path>
                                </svg>
                            }
                        </div>
                        <div
                            className="text-blue-500 group-hover:text-blue-800 underline">{item.creator.displayName} @{item.creator.handle}</div>

                    </div>

                </a>
            </div>
            <div>{item.description}</div>
            {
                item.my && item.views &&
                <div>
                    <div className="">Unique viewers last whole day: {item.views.day}</div>
                    <div className="">Unique viewers last whole week: {item.views.week}</div>
                </div>
            }

            <div className="inline-flex gap-2">
                <Link href={`/preview?feed=${item.uri}`}>
                    <button type="button"
                            className="text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 rounded-xl p-1"
                    >
                        <HiMagnifyingGlass className="w-6 h-6" title="Preview Feed"/>
                    </button>
                </Link>
                <button type="button"
                        className="text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 rounded-xl p-1"
                        onClick={() => {
                            const feedUrl = `https://bsky.app/profile/${item.uri.slice(5).replace("app.bsky.feed.generator", "feed")}`
                            navigator.clipboard.writeText(feedUrl).then(r => {
                                alert(`Url copied to clipboard\n${feedUrl}`);
                            });
                        }}
                >
                    <FaRegCopy className="w-6 h-6 p-0.5" title="Copy Feed URL"/>
                </button>

                {
                    item.edit && <Link href={`/edit-feed?feed=${item.uri}`}>
                        <button type="button"
                                className="text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 rounded-xl p-1">
                            <HiPencil className="w-6 h-6" title="Edit My Feed"/>
                        </button>
                    </Link>
                }
                {
                    item.my && <div>
                        <button type="button"
                                className="text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 rounded-xl p-1"
                                onClick={() => {
                                    setSelectedItem(item);
                                    setPopupState("delete");
                                }}>
                            <HiTrash className="w-6 h-6" title="Delete Feed"/>
                        </button>
                    </div>
                }
            </div>
        </div>
    </div>
}