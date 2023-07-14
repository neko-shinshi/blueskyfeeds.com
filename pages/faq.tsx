import HeadExtended from "features/layout/HeadExtended";
import {connectToDatabase} from "features/utils/dbUtils";
import {FaInstagram, FaMastodon,FaTumblr, FaTwitter} from "react-icons/fa";
import {useEffect} from "react";
import Table from "features/components/table/Table";
import Link from "next/link";
import {SiBuzzfeed} from "react-icons/si";
import Image from "next/image";
import AppPasswordLink from "features/components/AppPasswordLink";
import PageHeader from "features/components/PageHeader";


export default function Home({feedsDefault}) {
    const title = "Bluesky Social App Password FAQ";
    const description = "Frequently asked questions about Bluesky Social App Passwords";


    return (
        <>
            <HeadExtended title={title} description={description}/>
            <div className="bg-sky-200 w-full max-w-8xl rounded-xl overflow-hidden p-4 space-y-4">
                <PageHeader title={title} description={description} />
                <div className="p-2 bg-white rounded-xl border-2 border-black space-y-1" id="what-is">
                    <div className="font-bold text-lg">What is a Bluesky App Password?</div>
                    <div className="block md:flex md:justify-center p-4">
                        <div className="w-80 h-64 relative aspect-[10/8]">
                            {/* 10 x 8 ratio*/}
                            <Image
                                unoptimized fill
                                src="/app-password/step-4.webp"
                                alt="Screenshot of app password page of app"
                            />
                        </div>
                        <ul className="grow pl-8 list-disc">
                            <li><span className="italic">From the App Password page <AppPasswordLink text="bsky.app/settings/app-passwords"/>, </span>
                                {'"use app passwords to login to other Bluesky clients without giving full access to your account or password."'}</li>
                            <li>App Passwords are 19 character alphanumeric passwords with dashes in between with the format xxxx-xxxx-xxxx-xxxx </li>
                            <li>App Passwords can be created and deleted on the page <AppPasswordLink text="bsky.app/settings/app-passwords"/> or in the official apps</li>
                        </ul>
                    </div>
                </div>

                <div className="p-2 bg-white rounded-xl border-2 border-black space-y-1" id="how-to">
                    <div className="font-bold text-lg">How to Generate a Bluesky App Password?</div>
                    <div>If you are accessing from the web, you can skip straight to <a href="#step-4" className="underline text-blue-600 hover:text-blue-800">Step 4</a> by going to <AppPasswordLink text="bsky.app/settings/app-passwords" /></div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                        <div className="p-1 border border-black border-dashed rounded-xl flex flex-col place-items-center">
                            <div className="font-semibold text-lg">Step 1</div>
                            <div className="w-70 h-56 relative aspect-[10/8]">
                                {/* 10 x 8 ratio*/}
                                <Image
                                    unoptimized fill
                                    src="/app-password/step-1.webp"
                                    alt="Screenshot of main page of Bluesky app"
                                />
                            </div>
                            <div className="p-2">Tap the menu icon on the top left of the Bluesky App to open the side panel</div>
                        </div>

                        <div className="p-1 border border-black border-dashed rounded-xl flex flex-col place-items-center">
                            <div className="font-semibold text-lg">Step 2</div>
                            <div className="w-70 h-56 relative aspect-[10/8]">
                                {/* 10 x 8 ratio*/}
                                <Image
                                    unoptimized fill
                                    src="/app-password/step-2.webp"
                                    alt="Screenshot of side panel of Bluesky app"
                                />
                            </div>
                            <div className="p-2">Tap the Settings button to go to the Settings page</div>
                        </div>
                        <div className="p-1 border border-black border-dashed rounded-xl flex flex-col place-items-center">
                            <div className="font-semibold text-lg">Step 3</div>
                            <div className="w-70 h-56 relative aspect-[10/8]">
                                {/* 10 x 8 ratio*/}
                                <Image
                                    unoptimized fill
                                    src="/app-password/step-3.webp"
                                    alt="Screenshot of settings page of Bluesky app"
                                />
                            </div>
                            <div className="p-2">Scroll down and tap the App Passwords button in the Settings Page</div>
                        </div>
                        <div className="bg-orange-100 p-1 border border-black border-dashed rounded-xl flex flex-col place-items-center"
                             id="step-4"
                        >
                            <div className="font-semibold text-lg">Step 4</div>
                            <div className="w-70 h-56 relative aspect-[10/8]">
                                {/* 10 x 8 ratio*/}
                                <Image
                                    unoptimized fill
                                    src="/app-password/step-4.webp"
                                    alt="Screenshot of App Passwords page of Bluesky app"
                                />
                            </div>
                            <div className="p-2">Tap Add Password button to open the password creation popup</div>
                        </div>
                        <div className="p-1 border border-black border-dashed rounded-xl flex flex-col place-items-center">
                            <div className="font-semibold text-lg">Step 5</div>
                            <div className="w-70 h-56 relative aspect-[10/8]">
                                {/* 10 x 8 ratio*/}
                                <Image
                                    unoptimized fill
                                    src="/app-password/step-5.webp"
                                    alt="Screenshot of naming a new App Password page of Bluesky app"
                                />
                            </div>
                            <div className="p-2">Create a name for this app password, preferably based on the app you want to sign into, like <span className="font-italic">blueskyfeeds</span></div>
                        </div>
                        <div className="p-1 border border-black border-dashed rounded-xl flex flex-col place-items-center">
                            <div className="font-semibold text-lg">Step 6</div>
                            <div className="w-70 h-56 relative aspect-[10/8]">
                                {/* 10 x 8 ratio*/}
                                <Image
                                    unoptimized fill
                                    src="/app-password/step-6.webp"
                                    alt="Screenshot of a new App Password in the Bluesky app"
                                />
                            </div>
                            <div className="p-2">
                                <div>A 19 character app password is created</div>
                                <div>Copy and paste this app password into the login page of the 3rd party app you are using</div>
                            </div>
                        </div>

                        <div className="bg-red-100 p-1 border border-black border-dashed rounded-xl flex flex-col place-items-center">
                            <div className="font-semibold text-lg">Deleting the App Password</div>
                                <div className="p-2">To Delete the app password, go back to <a href="#step-4" className="underline text-blue-600 hover:text-blue-800">Step 4</a> and tap the bin icon next to the password</div>
                                <div className="w-70 h-56 relative aspect-[10/8]">
                                    {/* 10 x 8 ratio*/}
                                <Image
                                    unoptimized fill
                                    src="/app-password/step-delete.webp"
                                    alt="Screenshot of App Passwords page of Bluesky app"
                                />
                            </div>
                        </div>
                    </div>
                </div>

                <div className="p-2 bg-white rounded-xl border-2 border-black space-y-1" id="what-access">
                    <div className="font-bold text-lg">What access an App Password provide? How can I keep myself safe?</div>
                    <div>App Passwords give almost full account access to a 3rd party provider, and can be used to, but are not limited to:</div>
                    <ul className="pl-8 list-disc">
                        <li>Create and Delete your Posts</li>
                        <li>Search feeds, posts and user profiles</li>
                        <li>And many more...</li>
                    </ul>
                    <div><span className="text-red-600 uppercase">Be careful</span> when providing your App Password to 3rd party providers, as they may use your app password for activities without your permission, and may even store your app password for future use!</div>
                    <div>You can trust us, as we have Open Sourced this website on <a className="underline text-blue-500 hover:text-blue-800" href="https://github.com/neko-shinshi/blueskyfeeds.com">GitHub</a></div>
                </div>


                <div className="p-2 bg-white rounded-xl border-2 border-black space-y-1" id="can-i-trust-you">
                    <div className="font-bold text-lg">Can I trust BlueskyFeeds.com with my App Password?</div>
                    <ul className="list-disc pl-4">
                        <li>BlueskyFeeds.com NEVER saves your App Passwords in its databases, it is ONLY stored in a session cookie shared from the browser and the website with each page access</li>
                        <li>Logging out or deleting Cookies in the browser also clears this cookie</li>
                        <li>This cookie is read by the application server to perform tasks that you request, nothing more</li>
                        <li>You can verify this by checking the Open Source Code of this website on <a className="underline text-blue-500 hover:text-blue-800" href="https://github.com/neko-shinshi/blueskyfeeds.com">GitHub</a></li>
                    </ul>
                </div>
            </div>
        </>
    )
}
