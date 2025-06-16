import {FaInstagram, FaMastodon, FaTumblr, FaTwitter} from "react-icons/fa";
import Image from "next/image";
import {useEffect, useState} from "react";
import {getAlertCookie, setAlertCookie} from "features/utils/cookieUtils";
import Popup from "features/components/Popup";

export default function PageHeader({title, description, description2=""}) {
    const [open, setOpen] = useState(false);
    const [ready, setReady] = useState(false);
    useEffect(() => {
        setTimeout(() => {
            const noCookie = !getAlertCookie();
            setReady(true);
            setOpen(noCookie);
        }, 300);
    }, [])

    function closePopup () {
        if (ready) {
            setAlertCookie();
            setOpen(false);
        }
    }

    return <div className="p-2 bg-white rounded-xl border-2 border-black space-y-1">
        <h1 className="text-center text-2xl font-bold">{title}</h1>
        <h2 className="text-center text-lg">{description}</h2>
        {description2 &&
            <h3 className="text-center text-sm">{description2}</h3>
        }
        <a href="https://bsky.app/profile/blueskyfeeds.com/post/3lrlakfnpuc2b" target="_blank" rel="noopener noreferrer">
            <div className="text-3xl font-bold text-red-600 text-center hover:underline">Warning: This feed builder service is ending in
                early July 2025, please start switching to another provider. Click to read about this
             </div>
        </a>

{
    <Popup isOpen={open} setOpen={closePopup}>
    <div className="bg-white p-8 rounded-xl space-y-2">
                <div className="text-xl">Thank you for using blueskyfeeds.com. I am sorry, but I can no longer keep it running.</div>
                <div>The rising costs and the stress of dealing with updates, outages, and attacks was getting too much for me.</div>
                <div>The site and feed tool will be taken down in <span className="font-bold">Early July 2025</span>. All data will be deleted.</div>
                <div>If you have a feed here, please switch to another provider. You can download the json in the editor for safe keeping in the meantime.</div>

                <button type="button" onClick={closePopup}
                        className="mt-3 inline-flex justify-center rounded-md border-2 border-black shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-black hover:text-white focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-black sm:mt-0 sm:col-start-1 sm:text-sm"
                >
                    Ok
                </button>
            </div></Popup>
        }
    </div>
}