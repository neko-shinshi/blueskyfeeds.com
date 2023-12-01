import {FaInstagram, FaMastodon, FaTumblr, FaTwitter} from "react-icons/fa";
import Image from "next/image";

export default function PageHeader({title, description, description2=""}) {
    return <div className="p-2 bg-white rounded-xl border-2 border-black space-y-1">
        <h1 className="text-center text-2xl font-bold">{title}</h1>
        <h2 className="text-center text-lg" onClick={() => {
            console.log(1);
        }}>{description}</h2>
        {description2 &&
            <h3 className="text-center text-sm">{description2}</h3>
        }


        <div className="md:hidden block w-full text-center pb-2">Powered by <a href="https://www.anianimals.moe" className="text-blue-500 underline">AniAnimals.moe</a></div>

        <div className="w-full flex place-items-center justify-center">
            <div className="hidden md:block text-sm lg:text-base pr-5">Powered by <a href="https://www.anianimals.moe" className="text-blue-500 underline">AniAnimals.moe</a></div>
            <div className="flex justify-center place-items-center gap-6">
                <a href="https://sakurajima.moe/@anianimalsmoe">
                    <FaMastodon className="h-6 w-6 text-[#ffb7c5]" title="Mastdodon"/>
                </a>
                <a href="https://www.instagram.com/anianimals.moe/">
                    <FaInstagram className="h-6 w-6 " title="Instagram"/>
                </a>
                <a href="https://twitter.com/AniAnimalsMoe">
                    <div className="relative h-6 w-6">
                        <FaTwitter className="absolute -left-1 h-6 w-6 text-[#1DA1F2]" title="Twitter (English)"/>
                        <span className="absolute -right-1 -bottom-1 text-2xs font-bold">EN</span>
                    </div>
                </a>
                <a href="https://twitter.com/AniAnimalsMoeJP">
                    <div className="relative h-6 w-6">
                        <FaTwitter className="absolute -left-0.5 h-6 w-6 text-[#1DA1F2]" title="Twitter (Japanese)"/>
                        <span className="absolute -right-1 -bottom-1 text-2xs font-bold">JP</span>
                    </div>
                </a>
                <a href="https://bsky.app/profile/anianimals.moe">
                    <div className="h-6 w-6 relative">
                        <div className="absolute w-full h-full bg-gradient-to-b from-[#0066fe] to-[#0092fe] rounded-lg" title="Bluesky (English)">
                            <svg xmlns="http://www.w3.org/2000/svg" width="256" height="256"
                                 viewBox="0 0 512 512" className="w-full h-full">
                                <path fill="white" d="M323,149l101,69c-19.258-6.153-94.991-49.079-104-38l-45,39-3-3-52-42-70,14,78-38,45,28ZM95,255l37,24,43-18,47,37-47-15c-60.012,29.651-38.1,24.5-83-10l-41,3Zm319,45,35,21v1l-37-5-20,16-19-15-45,18,2-3,41-31,19,13Zm-88,36h0Z"/>
                            </svg>
                        </div>
                        <div className="absolute text-white right-0.5 bottom-0 text-2xs">EN</div>
                    </div>
                </a>
                <a href="https://bsky.app/profile/jp.anianimals.moe">
                    <div className="h-6 w-6 relative">
                        <div className="absolute w-full h-full bg-gradient-to-b from-[#0066fe] to-[#0092fe] rounded-lg" title="Bluesky (Japanese)">
                            <svg xmlns="http://www.w3.org/2000/svg" width="256" height="256"
                                 viewBox="0 0 512 512" className="w-full h-full">
                                <path fill="white" d="M323,149l101,69c-19.258-6.153-94.991-49.079-104-38l-45,39-3-3-52-42-70,14,78-38,45,28ZM95,255l37,24,43-18,47,37-47-15c-60.012,29.651-38.1,24.5-83-10l-41,3Zm319,45,35,21v1l-37-5-20,16-19-15-45,18,2-3,41-31,19,13Zm-88,36h0Z"/>
                            </svg>
                        </div>
                        <div className="absolute text-white right-0.5 bottom-0 text-2xs">JP</div>
                    </div>
                </a>
                <a href="https://anianimals-moe.tumblr.com/">
                    <FaTumblr className="h-6 w-6 p-1 text-white bg-[#34526f] rounded-lg" title="Tumblr"/>
                </a>

                <a className="h-7 w-7 rounded-lg hover:bg-gray-400 relative"
                   href="https://ko-fi.com/anianimalsmoe"
                   target="_blank" rel="noreferrer">
                    <Image unoptimized fill alt="ko-fi icon" src="/ko-fi.png" className="absolute"/>
                </a>
            </div>
        </div>
    </div>
}