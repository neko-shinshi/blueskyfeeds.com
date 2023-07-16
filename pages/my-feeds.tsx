import HeadExtended from "features/layout/HeadExtended";
import {useSession} from "next-auth/react";
import FormSignIn from "features/login/FormSignIn";
import {RiTestTubeLine} from "react-icons/ri";
import Link from "next/link";
import {useEffect, useState} from "react";
import PageHeader from "features/components/PageHeader";
import {rebuildAgentFromSession, getMyFeeds} from "features/utils/feedUtils";
import {connectToDatabase} from "features/utils/dbUtils";
import PopupConfirmation from "features/components/PopupConfirmation";
import {localDelete} from "features/network/network"
import {getSessionData} from "features/network/session";
import {useRecaptcha} from "features/auth/RecaptchaProvider";
import FeedItem from "features/components/specific/FeedItem";
import {useRouter} from "next/router";

export async function getServerSideProps({req, res}) {
    const db = await connectToDatabase();
    if (!db) { return { redirect: { destination: '/500', permanent: false } } }
    let myFeeds = [];

    const session = await getSessionData(req, res);
    if (session) {
        const agent = await rebuildAgentFromSession(session);
        if (!agent) {return { redirect: { destination: '/signout', permanent: false } };}

        myFeeds = await getMyFeeds(agent, db);
    }

    return {props: {session, myFeeds}};
}


export default function Home({myFeeds}) {
    const title = "My BlueSky Custom Feeds";
    const description = "";
    const { data: session } = useSession();
    const [popupState, setPopupState] = useState<"delete"|false>(false);
    const [selectedItem, setSelectedItem] = useState<any>(null);
    const [busy, setBusy] = useState(false);
    const recaptcha = useRecaptcha();
    const router = useRouter();

    return <>
        <PopupConfirmation
            isOpen={popupState === "delete"}
            setOpen={setPopupState}
            title={`Confirm deletion of ${selectedItem?.displayName}`}
            message="This cannot be reversed"
            yesCallback={async() => {
                if (typeof recaptcha !== 'undefined' && !busy) {
                    recaptcha.ready(async () => {
                        setBusy(true);
                        //@ts-ignore
                        const captcha = await recaptcha.execute(process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY, {action: 'submit'});
                        const result = await localDelete("/feed/delete", {captcha, rkey: selectedItem.uri.split("/").slice(-1)[0]});
                        if (result.status === 200) {
                            router.reload();
                        } else {
                            console.log(result);
                        }
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
                            <FeedItem key={x.uri} item={x} setSelectedItem={setSelectedItem} setPopupState={setPopupState} />
                        )
                    }
                </div>
            </div>
        }
    </>
}
