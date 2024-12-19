import HeadExtended from "features/layout/HeadExtended";
import {RiTestTubeLine} from "react-icons/ri";
import Link from "next/link";
import {useEffect, useState} from "react";
import PageHeader from "features/components/PageHeader";
import {getMyFeeds} from "features/utils/feedUtils";
import PopupConfirmation from "features/components/PopupConfirmation";
import {localDelete} from "features/network/network"
import {useRecaptcha} from "features/auth/RecaptchaProvider";
import FeedItem from "features/components/specific/FeedItem";
import {useRouter} from "next/router";
import {isVIP} from "features/utils/bsky";
import {MAX_FEEDS_PER_USER} from "features/utils/constants";
import PageFooter from "features/components/PageFooter";
import {getLoggedInInfo} from "features/network/session";
import {MainWrapper} from "features/layout/MainWrapper";
import {getDbClient} from "features/utils/db";

export async function getServerSideProps({req, res}) {
    const [{ error, userData, privateAgent}, dbUtils] = await Promise.all([
        getLoggedInInfo(req, res),
        getDbClient()
    ]);
    if (error) { return {redirect: `/${error}`, permanent:false}; }
    if (!dbUtils) {return {redirect:"/500", permanent:false};}
    const {db, helpers} = dbUtils;

    let myFeeds = [];
    let canCreate = true;
    myFeeds = await getMyFeeds(privateAgent, db);
    if (!isVIP(privateAgent)) {
        const countCustomFeeds = myFeeds.reduce((acc, x) => {
            if (x.edit) {acc++;}
            return acc;
        }, 0);
        canCreate = countCustomFeeds < MAX_FEEDS_PER_USER;
    }


    return {props: {userData, myFeeds, canCreate}};
}


export default function Home({userData, myFeeds:_myFeeds, canCreate}) {
    const title = "My BlueSky Custom Feeds";
    const description = "";
    const [popupState, setPopupState] = useState<"delete"|false>(false);
    const [selectedItem, setSelectedItem] = useState<any>(null);
    const [busy, setBusy] = useState(false);
    const [myFeeds, setMyFeeds] = useState([]);
    const recaptcha = useRecaptcha();
    const router = useRouter();

    useEffect(() => {
        if (_myFeeds) {
            console.log(_myFeeds);

            setMyFeeds(_myFeeds.sort((x,y) => {
                if (x.pinned === y.pinned) {
                    if (x.my === y.my) {
                        return x.displayName.localeCompare(y.displayName);
                    }
                    return x.my? -1 : 1;
                }
                return x.pinned? -1 : 1;
            }));
        }
    }, [_myFeeds])



    return <MainWrapper userData={userData}>
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
            userData && <div className="bg-sky-200 w-full max-w-8xl rounded-xl overflow-hidden p-4 space-y-4">
                <PageHeader title={title} description={description} />

                {
                    canCreate && <Link href="/edit-feed">
                        <button type="button"
                                className="mt-4 w-full inline-flex justify-center items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500">
                            <RiTestTubeLine className="w-6 h-6"/> Make a new Feed {`(max ${MAX_FEEDS_PER_USER})`}
                        </button>
                    </Link>
                }
                {
                    !canCreate && <div>You have reached the maximum number of feeds your account can create</div>
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
