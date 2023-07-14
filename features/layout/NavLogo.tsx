import Image from "next/image";
import {SiBuzzfeed} from "react-icons/si";

export default function NavLogo({href}) {
    return (
        <a href={href}>
            <button className="flex">
                <span className="sr-only">Logo</span>
                <div className="px-4 h-8 text-2xl flex place-items-center text-white font-bold gap-4 hover:bg-white hover:text-black rounded-md">
                    <div>BlueskyFeeds.com </div> <SiBuzzfeed className="w-6 h-6"/>
                </div>
            </button>
        </a>
    )
}