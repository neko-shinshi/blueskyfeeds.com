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
            <div className="flex justify-center place-items-center gap-4 sm:gap-6">
                <a href="https://bsky.app/profile/blueskyfeeds.com" target="_blank" rel="noopener noreferrer">
                    <div className="h-8 w-8 relative" title="BlueskyFeeds">
                        <svg width="1024" height="1024" viewBox="0 0 1024 1024" xmlns="http://www.w3.org/2000/svg"
                             className="absolute w-full h-full">
                            <path
                                d="M351.121 315.106C416.241 363.994 486.281 463.123 512 516.315C537.719 463.123 607.759 363.994 672.879 315.106C719.866 279.83 796 252.536 796 339.388C796 356.734 786.055 485.101 780.222 505.943C759.947 578.396 686.067 596.876 620.347 585.691C735.222 605.242 764.444 670.002 701.333 734.762C581.473 857.754 529.061 703.903 515.631 664.481C513.169 657.254 512.017 653.873 512 656.748C511.983 653.873 510.831 657.254 508.369 664.481C494.939 703.903 442.527 857.754 322.667 734.762C259.556 670.002 288.778 605.242 403.653 585.691C337.933 596.876 264.053 578.396 243.778 505.943C237.945 485.101 228 356.734 228 339.388C228 252.536 304.134 279.83 351.121 315.106Z"
                                fill="#1185FE"/>
                        </svg>
                        <div className="absolute text-black left-0.5 -bottom-0.5 text-2xs font-bold">Feeds</div>
                    </div>
                </a>

                <a href="https://bsky.app/profile/anianimals.moe" target="_blank" rel="noopener noreferrer">
                    <div className="h-8 w-8 relative" title="Bluesky (English)">
                        <svg width="1024" height="1024" viewBox="0 0 1024 1024" xmlns="http://www.w3.org/2000/svg"
                             className="absolute w-full h-full">
                            <path
                                d="M351.121 315.106C416.241 363.994 486.281 463.123 512 516.315C537.719 463.123 607.759 363.994 672.879 315.106C719.866 279.83 796 252.536 796 339.388C796 356.734 786.055 485.101 780.222 505.943C759.947 578.396 686.067 596.876 620.347 585.691C735.222 605.242 764.444 670.002 701.333 734.762C581.473 857.754 529.061 703.903 515.631 664.481C513.169 657.254 512.017 653.873 512 656.748C511.983 653.873 510.831 657.254 508.369 664.481C494.939 703.903 442.527 857.754 322.667 734.762C259.556 670.002 288.778 605.242 403.653 585.691C337.933 596.876 264.053 578.396 243.778 505.943C237.945 485.101 228 356.734 228 339.388C228 252.536 304.134 279.83 351.121 315.106Z"
                                fill="#1185FE"/>
                        </svg>
                        <div className="absolute text-black -right-0.5 -bottom-0.5 text-2xs font-bold">EN</div>
                    </div>
                </a>

                <a href="https://bsky.app/profile/jp.anianimals.moe" target="_blank" rel="noopener noreferrer">
                    <div className="h-8 w-8 relative" title="Bluesky (Japanese)">
                        <svg width="1024" height="1024" viewBox="0 0 1024 1024" xmlns="http://www.w3.org/2000/svg"
                             className="absolute w-full h-full">
                            <path
                                d="M351.121 315.106C416.241 363.994 486.281 463.123 512 516.315C537.719 463.123 607.759 363.994 672.879 315.106C719.866 279.83 796 252.536 796 339.388C796 356.734 786.055 485.101 780.222 505.943C759.947 578.396 686.067 596.876 620.347 585.691C735.222 605.242 764.444 670.002 701.333 734.762C581.473 857.754 529.061 703.903 515.631 664.481C513.169 657.254 512.017 653.873 512 656.748C511.983 653.873 510.831 657.254 508.369 664.481C494.939 703.903 442.527 857.754 322.667 734.762C259.556 670.002 288.778 605.242 403.653 585.691C337.933 596.876 264.053 578.396 243.778 505.943C237.945 485.101 228 356.734 228 339.388C228 252.536 304.134 279.83 351.121 315.106Z"
                                fill="#1185FE"/>
                        </svg>
                        <div className="absolute text-black -right-0.5 bottom-0 text-2xs font-bold">JP</div>
                    </div>
                </a>


                <a href="https://sakurajima.moe/@anianimalsmoe">
                    <FaMastodon className="h-6 w-6 text-[#ffb7c5]" title="Mastdodon"/>
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