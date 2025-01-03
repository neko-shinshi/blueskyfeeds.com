import HeadExtended from "features/layout/HeadExtended";
import {RiTestTubeLine} from "react-icons/ri";
import Link from "next/link";
import {useState} from "react";
import PageHeader from "features/components/PageHeader";
import {getMyFeeds} from "features/utils/feedUtils";
import PopupConfirmation from "features/components/PopupConfirmation";
import {localDelete} from "features/network/network"
import {useRecaptcha} from "features/provider/RecaptchaProvider";
import FeedItem from "features/components/specific/FeedItem";
import {useRouter} from "next/router";
import {isVIP} from "features/utils/bsky";
import {MAX_FEEDS_PER_USER} from "features/utils/constants";
import PageFooter from "features/components/PageFooter";
import {getLoggedInInfo} from "features/network/session";
import {MainWrapper} from "features/layout/MainWrapper";
import {getDbClient} from "features/utils/db";
import {respondPageErrors} from "features/utils/page";
import {useUserData} from "features/provider/UserDataProvider";
import OAuthSignIn from "features/login/OAuthSignIn";

export async function getServerSideProps({req, res}) {
    const [{ error, privateAgent}, dbUtils] = await Promise.all([
        getLoggedInInfo(req, res),
        getDbClient()
    ]);
    const redirect = respondPageErrors([{val:error, code:error}, {val:!dbUtils, code:500}]);
    if (redirect) { return redirect; }

    let myFeeds = [];
    let canCreate = "no";
    if (privateAgent) {
        const {db, helpers} = dbUtils;
        myFeeds = await getMyFeeds(privateAgent, db);
        if (!isVIP(privateAgent.did)) {
            const countCustomFeeds =  myFeeds.filter(x => x.creator.did === privateAgent.did).length;
            canCreate = countCustomFeeds < MAX_FEEDS_PER_USER? "yes" : "no";
        } else {
            canCreate = "vip";
        }
    }


    return {props: {myFeeds, canCreate}};
}


export default function Home({myFeeds, canCreate}) {
    const title = "My Bluesky Feeds";
    const description = "";
    const [popupState, setPopupState] = useState<"delete"|false>(false);
    const [selectedItem, setSelectedItem] = useState<any>(null);
    const [busy, setBusy] = useState(false);
    const {user} = useUserData();
    const recaptcha = useRecaptcha();
    const router = useRouter();

    return <MainWrapper>
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
            !user && <OAuthSignIn />
        }


        {
            user && <div className="bg-sky-200 w-full max-w-8xl rounded-xl overflow-hidden p-4 space-y-4">
                <PageHeader title={title} description={description} />

                {
                    canCreate !== "no" && <Link href="/feed/new">
                        <button type="button"
                                className="mt-4 w-full inline-flex justify-center items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500">
                            <RiTestTubeLine className="w-6 h-6"/> Make a new Feed {canCreate === "yes" && `(max ${MAX_FEEDS_PER_USER})`}
                        </button>
                    </Link>
                }
                {
                    canCreate === "no" && <div>You have reached the maximum number of feeds your account can create</div>
                }

                <div className="border-2 border-black p-4 bg-white rounded-xl">
                    <div>Feeds Editable here are in green</div>
                    {
                        myFeeds && myFeeds.map(x =>
                            <FeedItem key={x.uri} item={x} setSelectedItem={setSelectedItem} setPopupState={setPopupState} />
                        )
                    }
                </div>
                <PageFooter/>
            </div>
        }
    </MainWrapper>
}
