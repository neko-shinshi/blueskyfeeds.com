import {useEffect, useRef, useState} from "react";
import HeadExtended from "features/layout/HeadExtended";
import {signIn, useSession} from "next-auth/react";
import FormSignIn from "features/login/FormSignIn";
import {useForm} from "react-hook-form";
import RHForm from "features/input/RHForm";
import clsx from "clsx";
import InputRadio from "features/input/InputRadio";
import {useRouter} from "next/router";
import PageHeader from "features/components/PageHeader";
import {getFeedDetails, getMyCustomFeedIds} from "features/utils/feedUtils";
import {BsFillInfoCircleFill} from "react-icons/bs";
import {RxCheck, RxCross2} from "react-icons/rx";
import {getCaptcha, useRecaptcha} from "features/auth/RecaptchaProvider";
import {localDelete, localGet} from "features/network/network";
import {toJson} from 'really-relaxed-json'
import Image from "next/image";
import InputMultiWord from "features/input/InputMultiWord";
import {serializeFile} from "features/utils/fileUtils";
import {
    FEED_MODES,
    FeedKeyword,
    KEYWORD_SETTING, MAX_FEEDS_PER_USER, MAX_KEYWORDS_PER_LIVE_FEED, MAX_KEYWORDS_PER_USER_FEED,
    PICS_SETTING,
    POST_LEVELS,
    SORT_ORDERS, SUPPORTED_CW_LABELS,
    SUPPORTED_LANGUAGES, USER_FEED_MODE, PRIVACY_MODES
} from "features/utils/constants";
import {OLD_SIGNATURES, SIGNATURE} from "features/utils/signature";
import {getLoggedInData} from "features/network/session";
import PopupConfirmation from "features/components/PopupConfirmation";
import {APP_SESSION} from "features/auth/authUtils";
import {isValidDomain} from "features/utils/validationUtils";
import {getActorsInfo, getPostInfo, isVIP} from "features/utils/bsky";
import PopupLoading from "features/components/PopupLoading";
import Link from "next/link";
import {IoArrowBackSharp} from "react-icons/io5";
import {compressKeyword,} from "features/utils/objectUtils";
import InputTextBasic from "features/input/InputTextBasic";
import PopupWithInputText from "features/components/PopupWithInputText";
import {BiCopy} from "react-icons/bi";
import {HiArrowLongLeft, HiArrowLongRight} from "react-icons/hi2";
import KeywordsEdit from "features/components/specific/KeywordsEdit";
import BlueskyForm from "features/components/specific/BlueskyForm";
import {compressedToJsonString} from "features/utils/textAndKeywords";
import PostsEdit from "features/components/specific/PostsEdit";
import PopupWithAddPost from "features/components/PopupWithAddPost";

export async function getServerSideProps({req, res, query}) {
    const {updateSession, session, agent, redirect, db} = await getLoggedInData(req, res);
    if (redirect) {return {redirect};}

    let feed = null;
    const VIP = agent && isVIP(agent);
    if (agent) {
        const {feed: _feed} = query;
        if (_feed) {
            const feedData: any = await getFeedDetails(agent, db, _feed);
            if (feedData) {
                let {allowList, blockList, everyList, viewers, sticky, posts:_posts, mode} = feedData;
                if (mode === "posts") {
                    if (Array.isArray(_posts)) {
                        const posts = (await getPostInfo(agent, _posts)).map(post => {
                            const {text, uri} = post;
                            return {text, uri};
                        });
                        feed = {...feedData, posts};

                        if (Array.isArray(viewers) && viewers.length > 0) {
                            const profiles = await getActorsInfo(agent, viewers);
                            viewers = profiles.filter(x =>  viewers.find(y => y === x.did));
                            feed = {...feed, viewers};
                        }

                    } else {
                        console.log("posts not formatted correctly");
                        res.status(401).send("error");
                        return;
                    }
                } else {
                    allowList = allowList || [];
                    blockList = blockList || [];
                    everyList = everyList || [];
                    viewers = viewers || [];
                    const actors = [...new Set([...allowList, ...blockList, ...everyList, ...viewers])];
                    if (actors.length > 0) {
                        const profiles = await getActorsInfo(agent, actors);
                        allowList = profiles.filter(x =>  allowList.find(y => y === x.did));
                        blockList = profiles.filter(x =>  blockList.find(y => y === x.did));
                        everyList = profiles.filter(x =>  everyList.find(y => y === x.did));
                        viewers = profiles.filter(x =>  viewers.find(y => y === x.did));
                    }
                    if (sticky) {
                        [sticky] = await getPostInfo(agent, [sticky]) || [""];
                    } else {
                        sticky = "";
                    }

                    feed = {...feedData, allowList, blockList, everyList, viewers, sticky};
                }
            } else {
                return {redirect: {destination: '/404', permanent: false}}
            }
        } else {
            const feedIds = (await getMyCustomFeedIds(agent, db)).map(x => x.split("/").at(-1));
            if (feedIds.indexOf(_feed) < 0 && feedIds.length >= MAX_FEEDS_PER_USER && !isVIP(agent)) {
                res.status(400).send("too many feeds"); return;
            }
        }
    }
    /*
    <div>
        Minimum likes
        Max age of search
        Search children for keywords and upload parent
        Create public Feed Description Page to show internal workings of feed
    </div>
     */
    return {props: {updateSession, session, feed, VIP}};
}




export default function Home({feed, updateSession, VIP}) {
    const title = "Make a Feed for Bluesky Social";
    const description = "";
    const router = useRouter();
    const languageNames = new Intl.DisplayNames([router.locale], {type: 'language'});
    const SUPPORTED_LANG = SUPPORTED_LANGUAGES.map(id => {
        let txt;
        if (id === "") {
            txt = "Blank (when language detection failed)";
        } else {
            txt = `${languageNames.of(id)} (${id})`;
        }
        return {
            id, txt
        }
    }).sort((a, b) => {
        return a.txt.localeCompare(b.txt);
    });
    const { data: session, status } = useSession();
    const [languages, setLanguages] = useState<string[]>([]);
    const [shortNameLocked, setShortNameLocked] = useState(false);
    const [postLevels, setPostLevels] = useState<string[]>([]);
    const [keywordSetting, setKeywordSetting] = useState<string[]>([]);
    const [keywords, setKeywords] = useState<FeedKeyword[]>([]);
    const [popupState, setPopupState] = useState<"delete"|"edit_sticky"|"edit_user"|false>(false);
    const [pics, setPics] = useState<string[]>([]);
    const [busy, setBusy] = useState(false);

    const [userDid, setUserDid] = useState("");
    const [mode, setMode] = useState<"live"|"user"|"posts"|"responses">("live");
    const [privacy, setPrivacy] = useState("public");
    const [subMode, setSubMode] = useState<""|"posts"|"likes">("");
    const [stickyText, setStickyText] = useState("");
    const [modal, setModal] = useState<"wizard"|"wizard-everyList"|"wizard-keywords"|"wizard-bsky"|"wizard-posts"|"edit"|"done">(feed? "edit" : "wizard");
    const [specialQuote, setSpecialQuote] = useState(false);
    const [keywordsQuote, setKeywordsQuote] = useState<string[]>([]);

    const recaptcha = useRecaptcha();

    const formRef = useRef(null);

    const useFormReturn = useForm({mode: "onChange"});
    const {
        reset,
        watch,
        getValues,
        setValue,
        setError,
        clearErrors,
    } = useFormReturn;

    const watchSticky = watch("sticky");
    const watchAllow = watch("allowList");
    const watchAllowLabels = watch("allowLabels");
    const watchMustLabels = watch("mustLabels");

    const showInstructionAlert = () => {
        alert("Review the feed and tap submit at the bottom to complete your new feed.\nYou can further customize the feed by filtering it with keywords or setting sticky post.");
    }

    useEffect(() => {
        if (session && status === "authenticated" && updateSession) {
            signIn(APP_SESSION, {redirect: false, id: session.user.sk}).then(r => {
                console.log(r);
            });
        }
    }, [status]);


    useEffect(() => {
        if (!feed) {
            reset({sticky:"", sort:"new", allowList:[], blockList:[], everyList:[], mustUrl:[], blockUrl:[], copy:[], highlight: "yes", posts:[], allowLabels:SUPPORTED_CW_LABELS, mustLabels:[], viewers:[]});
            setMode("live");
            setLanguages([]);
            setPrivacy("public");
            setPostLevels(POST_LEVELS.map(x => x.id));
            setKeywordSetting(["text"]);
            setPics(["text", "pics"]);
        } else {
            console.log("feed", feed);
            let {avatar, sort, uri, displayName, description, blockList, allowList, everyList, languages, postLevels, pics, mustUrl, blockUrl, keywordSetting, keywords, copy, highlight, mode, sticky, posts, allowLabels, mustLabels, keywordsQuote, viewers} = feed;

            let stickyUri;
            if (sticky) {
                console.log("sticky", sticky);
                const {uri:_stickyUri, text} = sticky;
                if (_stickyUri) {
                    stickyUri = _stickyUri;
                    setStickyText(text);
                }
            }
            if (Array.isArray(viewers) && viewers.length > 0) {
                if (viewers.length === 1 && viewers[0].did === session.user.did) {
                    setPrivacy("private")
                } else {
                    setPrivacy("shared");
                }
            } else {
                viewers = [];
            }


            for (const signature of [...OLD_SIGNATURES, SIGNATURE]) {
                description = description.replaceAll(signature, "");
            }

            let o:any = {
                sticky:stickyUri || "", allowLabels: allowLabels || SUPPORTED_CW_LABELS, mustLabels: mustLabels || [],
                sort,displayName, description, copy: copy || [], highlight: highlight || "yes", viewers,
                shortName: uri.split("/").at(-1), blockList, allowList, everyList, mustUrl: mustUrl || [], blockUrl: blockUrl || [], posts: posts || [],
            };

            if (avatar) {
                const type = `image/${avatar.split("@")[1]}`;
                o.file = {changed: false, url: avatar, type}
            }

            keywords = keywords?.map(x => {
                const {t, a} = x;
                let o = JSON.parse(toJson(t));
                o.a = a;
                if ((o.t === "t" || o.t === "s") && !o.r) {
                    o.r = [];
                }
                return o;
            }) || [];

            keywordsQuote = keywordsQuote?.map(x => {
                const {t, a} = x;
                let o = JSON.parse(toJson(t));
                o.a = a;
                if ((o.t === "t" || o.t === "s") && !o.r) {
                    o.r = [];
                }
                return o;
            }) || [];


            reset(o);

            console.log("mode", mode);
            if (mode.startsWith("user")) {
                setMode("user");
                setSubMode(mode.slice(5));
            } else {
                setMode(mode);
            }
            setShortNameLocked(true);
            setLanguages(languages || []);
            setPostLevels(postLevels || POST_LEVELS.map(x => x.id));
            setKeywordSetting(keywordSetting || ["text"]);
            setPics(pics || ["text", "pics"]);
            setKeywords(keywords);
            if (keywordsQuote.length > 0) {
                setSpecialQuote(true);
                setKeywordsQuote(keywordsQuote);
            }
        }
    }, [feed]);


    const multiWordCallback = (fieldName:string, lists:string[] = ["everyList", "allowList", "blockList"]) => {
        return async(val, callback) => {
            setBusy(true);
            let user = val;
            if (user.startsWith("@")) {
                user = user.slice(1);
            } else if (user.startsWith("bsky.app/profile/")) {
                user = user.slice(17).split("/")[0];
            } else if (user.startsWith("https://bsky.app/profile/")) {
                user = user.slice(25).split("/")[0];
            }
            console.log("user", user);

            for (const l of lists) {
                const ll = getValues(l) || [];
                if (ll.find(x => x.did === user || x.handle === user)) {
                    setError(fieldName, {type:'custom', message:`${user} is already in ${l}`});
                    setBusy(false);
                    return;
                }
            }

            if (typeof recaptcha !== 'undefined') {
                const captcha = await getCaptcha(recaptcha);
                const result = await localGet("/check/user", {captcha, actors:[user]});
                if (result.status === 200 && Array.isArray(result.data) && result.data.length === 1) {
                    clearErrors(fieldName);
                    console.log(result.data[0]);
                    callback(result.data[0]);
                } else if (result.status === 400) {
                    setError(fieldName, {type:'custom', message:"Invalid user or user not found"});
                } else if (result.status === 401) {
                    await router.reload();
                } else {
                    setError(fieldName, {type:'custom', message:"Error"});
                }
            }
            setBusy(false);

        }
    }




    // @ts-ignore
    return <>
        <PopupWithInputText
            isOpen={popupState === "edit_user"}
            setOpen={setPopupState}
            title="Set User"
            message=""
            placeholder="handle.domain or did:plc:xxxxxxxxxxxxxxxxxxxxxxxx"
            validateCallback={(v) => {
                return (v.startsWith("did:plc:") || v.startsWith("@") || isValidDomain(v)) ? "" : "Invalid User";
            }}
            yesCallback={async (v:string, callback) => {
                if (typeof recaptcha !== 'undefined') {
                    const captcha = await getCaptcha(recaptcha);
                    //@ts-ignore
                    const result = await localGet("/check/user", {captcha, actors:[v]});
                    if (result.status === 200 && Array.isArray(result.data) && result.data.length === 1) {
                        console.log(result.data[0]);
                        setValue("allowList", result.data);
                        callback();
                    } else if (result.status === 400) {
                        callback("Invalid user or user not found");
                    } else {
                        callback("Unknown error");
                    }
                }
            }}/>
        <PopupWithAddPost
            isOpen={popupState === "edit_sticky"}
            setOpen={setPopupState}
            title="Set Sticky Post"
            message="Copy whole or part of url from browser or share button. Submit blank to remove sticky"
            recaptcha={recaptcha}
            setBusy={setBusy}
            limitOne={true}
            resultCallback={result => {
                const {uri, text} = result;
                console.log("result",result);
                if (!uri) {
                    setValue("sticky", "");
                    setStickyText("");
                } else {
                    setStickyText(text);
                    setValue("sticky", uri);
                }
            }}/>

        <PopupLoading isOpen={busy} setOpen={setBusy}/>
        <PopupConfirmation
            isOpen={popupState === "delete"}
            setOpen={setPopupState}
            title={`Confirm deletion of ${feed?.displayName}`}
            message="This cannot be reversed"
            yesCallback={async() => {
                if (typeof recaptcha !== 'undefined' && !busy) {
                    setBusy(true);
                    const captcha = await getCaptcha(recaptcha);
                    const result = await localDelete("/feed/delete", {captcha, rkey: feed.uri.split("/").slice(-1)[0]});
                    if (result.status === 200) {
                        await router.push("/my-feeds");
                    } else {
                        console.log(result);
                    }
                    setBusy(false);
                }
            }
            }/>
        <HeadExtended title={title} description={description}/>
        {
            !session && <FormSignIn/>
        }

        {
            session && <div className="bg-sky-200 w-full max-w-5xl rounded-xl overflow-hidden p-4 space-y-4">
                <PageHeader title={title} description={description} />
                {
                    modal.startsWith("wizard") &&
                    <div className="bg-white p-4 space-y-4">
                        {
                            modal === "wizard" &&
                            <>
                                <div className="font-bold text-xl">What kind of feed do you want to make?</div>
                                <div>
                                    <button type="button" className="w-full bg-blue-100 hover:bg-blue-400 hover:font-bold p-8 border border-black" onClick={() => {setModal("wizard-keywords")}}>
                                        <span className="font-bold">Latest Posts with Keywords:</span> I want to create a feed to show the latest posts of a community or fandom
                                    </button>
                                    <button type="button" className="w-full bg-yellow-100 hover:bg-yellow-400 hover:font-bold p-8 border border-black" onClick={() => {setModal("wizard-everyList")}}>
                                        <span className="font-bold">Users` Latest Posts:</span> I want to create a feed showing the latest posts of specific users
                                    </button>
                                    <button type="button" className="w-full bg-lime-100 p-8 hover:bg-lime-400 p-8 hover:font-bold border border-black"
                                            onClick={async () => {
                                                setMode("user");
                                                setSubMode("posts");
                                                setPostLevels(["top"]);
                                                setValue("allowList", [{
                                                    did: session.user.did,
                                                    handle: session.user.handle,
                                                    displayName: session.user.name
                                                }]);
                                                setModal("wizard-keywords");
                                            }}>
                                        <span className="font-bold">My Posts:</span> I want to create feed to show MY posts, with some filtering
                                    </button>
                                    <button type="button" className="w-full bg-violet-100 p-8 hover:bg-violet-400 p-8 hover:font-bold border border-black"
                                            onClick={() => {
                                                setModal("wizard-posts");
                                                setMode("posts");
                                            }}>
                                        <span className="font-bold">List of Posts:</span> I want to create feed to show a list of specific posts
                                    </button>

                                    <button type="button" className="w-full bg-red-100 p-8 hover:bg-red-400 p-8 hover:font-bold border border-black" onClick={() => {setModal("edit")}}>
                                        <span className="font-bold">Other:</span> I want to create some other type of feed (sorry, more templates will be added in the future).
                                    </button>
                                </div>
                            </>

                        }
                        {
                            modal === "wizard-posts" &&
                            <>
                                <button
                                    type="button"
                                    className="bg-sky-100 rounded-xl inline-flex items-center border-2 border-transparent p-3 pl-1 text-sm font-medium text-gray-500 hover:border-gray-300 hover:text-gray-700"
                                    onClick={() => {
                                        setModal("wizard");
                                        setValue("posts", []);
                                    }}
                                >
                                    <HiArrowLongLeft className="mr-3 h-5 w-5 text-gray-400" />
                                    Back
                                </button>
                                <div className="font-bold text-xl">Which posts do you want to show into the feed?</div>
                                <PostsEdit useFormReturn={useFormReturn} recaptcha={recaptcha} setBusy={setBusy}/>

                                <div className="flex justify-end">
                                    <button
                                        type="button"
                                        className="bg-sky-100 rounded-xl inline-flex items-center border-2 border-transparent p-3 pl-1 text-sm font-medium text-gray-500 hover:border-gray-300 hover:text-gray-700"
                                        onClick={() => {
                                            if (getValues("posts").length === 0) {
                                                alert("Add at least 1 post to continue");
                                            } else {
                                                setModal("wizard-bsky");
                                            }
                                        }}
                                    >
                                        Next
                                        <HiArrowLongRight className="ml-3 h-5 w-5 text-gray-400" />
                                    </button>
                                </div>

                            </>
                        }

                        {
                            modal === "wizard-keywords" &&
                            <>
                                <button
                                    type="button"
                                    className="bg-sky-100 rounded-xl inline-flex items-center border-2 border-transparent p-3 pl-1 text-sm font-medium text-gray-500 hover:border-gray-300 hover:text-gray-700"
                                    onClick={() => {
                                        setModal("wizard");
                                        setKeywords([]);
                                    }}
                                >
                                    <HiArrowLongLeft className="mr-3 h-5 w-5 text-gray-400" />
                                    Back
                                </button>
                                <div className="font-bold text-xl">Which keywords do you want to look for in posts to show into the feed?</div>
                                <KeywordsEdit keywords={keywords} setKeywords={setKeywords} VIP={VIP} />

                                <div className="flex justify-end">
                                    <button
                                        type="button"
                                        className="bg-sky-100 rounded-xl inline-flex items-center border-2 border-transparent p-3 pl-1 text-sm font-medium text-gray-500 hover:border-gray-300 hover:text-gray-700"
                                        onClick={() => {
                                            if (keywords.length === 0) {
                                                alert("Add at least 1 keyword to continue");
                                            } else {
                                                setModal("wizard-bsky");
                                            }
                                        }}
                                    >
                                        Next
                                        <HiArrowLongRight className="ml-3 h-5 w-5 text-gray-400" />
                                    </button>
                                </div>

                            </>
                        }

                        {
                            modal === "wizard-everyList" &&
                            <>
                                <button
                                    type="button"
                                    className="bg-sky-100 rounded-xl inline-flex items-center border-2 border-transparent p-3 pl-1 text-sm font-medium text-gray-500 hover:border-gray-300 hover:text-gray-700"
                                    onClick={() => {
                                        setModal("wizard");
                                        setValue("everyList", []);
                                    }}
                                >
                                    <HiArrowLongLeft className="mr-3 h-5 w-5 text-gray-400" />
                                    Back
                                </button>
                                <div className="font-bold text-xl">Which users` posts do you want to show?</div>
                                <InputMultiWord
                                    className={clsx("border border-2 border-black p-2 rounded-xl bg-lime-100")}
                                    labelText="Every List: Show all posts from these users"
                                    placeHolder="handle.domain or did:plc:xxxxxxxxxxxxxxxxxxxxxxxx"
                                    fieldName="everyList"
                                    handleItem={(item, value, onChange) => {
                                        value.push(item);
                                        value.sort((a, b) => {
                                            return a.handle.localeCompare(b.handle);
                                        })
                                        onChange(value);
                                    }}
                                    valueModifier={item => {
                                        return `${item.displayName} @${item.handle}`
                                    }}
                                    useFormReturn={useFormReturn}
                                    check={multiWordCallback("everyList")}/>
                                <div className="flex justify-end">
                                    <button
                                        type="button"
                                        className="bg-sky-100 rounded-xl inline-flex items-center border-2 border-transparent p-3 pl-1 text-sm font-medium text-gray-500 hover:border-gray-300 hover:text-gray-700"
                                        onClick={() => {
                                            if (getValues("everyList").length === 0) {
                                                alert("Add at least 1 user to the Every List to continue");
                                            } else {
                                                setModal("wizard-bsky");
                                                console.log("modal set");
                                            }
                                        }}
                                    >
                                        Next
                                        <HiArrowLongRight className="ml-3 h-5 w-5 text-gray-400" />
                                    </button>
                                </div>
                            </>
                        }
                        {
                            modal === "wizard-bsky" && <>
                                <button
                                    type="button"
                                    className="bg-sky-100 rounded-xl inline-flex items-center border-2 border-transparent p-3 pl-1 text-sm font-medium text-gray-500 hover:border-gray-300 hover:text-gray-700"
                                    onClick={() => {
                                        setMode("live");
                                        setPics(PICS_SETTING.map(x => x.id));
                                        setPostLevels(POST_LEVELS.map(x => x.id));
                                        setValue("allowList", []);
                                        setValue("posts", []);
                                        setModal("wizard");
                                    }}
                                >
                                    <HiArrowLongLeft className="mr-3 h-5 w-5 text-gray-400" />
                                    Back
                                </button>
                                <div className="font-bold text-xl">Fill in your new feed`s description</div>
                                <BlueskyForm useFormReturn={useFormReturn} setPopupState={setPopupState} shortNameLocked={shortNameLocked} />
                                <div className="flex justify-end">
                                    <button
                                        type="button"
                                        className="bg-sky-100 rounded-xl inline-flex items-center border-2 border-transparent p-3 pl-1 text-sm font-medium text-gray-500 hover:border-gray-300 hover:text-gray-700"
                                        onClick={() => {
                                            if (getValues("displayName").trim() !== "" && getValues("shortName").trim() !== "") {
                                                setModal("edit");
                                                showInstructionAlert();
                                            } else {
                                                alert("Fill in the form");
                                            }
                                        }}
                                    >
                                        Next
                                        <HiArrowLongRight className="ml-3 h-5 w-5 text-gray-400" />
                                    </button>
                                </div>
                            </>
                        }
                    </div>
                }

                {
                    modal === "done" &&
                    <div className="bg-white p-4">
                        <div className="font-bold">Your Feed has been saved.</div>
                        <ul className="list-disc pl-4 py-4">
                            {
                                mode === "live" &&
                                <li>It may <span className="-m-0.5 px-0.5 font-semibold bg-yellow-200">take a while (at most 20 min)</span> for posts to populate the feed as post data is not stored in the servers, only metadata. It only process <span className="font-semibold">NEW</span> posts as they arrive via the firehose API. If you do not see any test posts by then, <a className="underline text-blue-500 hover:text-blue-800" href="https://bsky.app/profile/blueskyfeeds.com" target="_blank" rel="noreferrer">let me know</a> and {"I'll"} look into it. </li>
                            }
                            {
                                mode === "user" &&
                                <li>User feeds fetch data directly from Bluesky, and trigger when the feed is first opened, and can be re-triggered about ten minutes after the last trigger.</li>
                            }
                            <li><div className="flex place-items-center">Your feed is accessible
                                <a className="ml-1 inline-flex underline text-blue-500 hover:text-blue-800" href={`https://bsky.app/profile/${userDid}/feed/${getValues("shortName")}`} target="_blank" rel="noreferrer">here</a>.
                                Or copy it to clipboard
                                <BiCopy onClick={() => { navigator.clipboard.writeText(`https://bsky.app/profile/${userDid}/feed/${getValues("shortName")}`); alert("Url copied to clipboard")}} className="ml-1 h-4 w-4 text-blue-500 hover:text-blue-800"/></div></li>
                            <li>
                                <div className="">It costs money to operate BlueskyFeeds.com servers, if you would like to contribute, please visit my
                                    <a className="ml-1 inline-flex underline text-blue-500 hover:text-blue-800" href="https://ko-fi.com/anianimalsmoe" target="_blank" rel="noreferrer">
                                        Ko-Fi
                                        <div className="h-6 w-6">
                                            <Image width={25} height={25} alt="ko-fi icon" src="/ko-fi.png"/>
                                        </div>
                                    </a>
                                </div>
                            </li>
                            <li>
                                {"I'm currently running the server as cheaply as I possibly can, but it's still about US$40/mo and I don't have many contributions for it yet"}
                            </li>
                        </ul>

                        <Link href={"/my-feeds"}>
                            <button type="button"
                                    className="mt-4 inline-flex justify-center items-center px-4 py-2 border border-transparent  rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500">
                                <IoArrowBackSharp className="w-6 h-6"/>
                                <div className="text-lg font-medium">Return to My Feeds</div>
                            </button>
                        </Link>

                    </div>
                }
                {
                    modal === "edit" &&
                    <RHForm
                        formRef={formRef}
                        recaptcha={recaptcha}
                        useFormReturn={useFormReturn}
                        cleanUpData={async (data) => {
                            if (mode === "live" && keywords.length + keywordsQuote.length === 0 && (getValues("everyList") || []).length === 0) {
                                alert("Your live data feed has no keywords and no everyList. Please remember to tap 'Add' after typing the desired keyword")
                                return false;
                            }

                            setBusy(true);
                            const {file, sort, displayName, shortName, description, allowList:_allowList, blockList:_blockList, everyList:_everyList, mustUrl, blockUrl, copy, highlight, sticky, posts, allowLabels, mustLabels, viewers:_viewers} = data;
                            const allowList = (_allowList || []).map(x => x.did);
                            const blockList = (_blockList || []).map(x => x.did);
                            const everyList = (_everyList || []).map(x => x.did);
                            const viewers = (_viewers || []).map(x => x.did);
                            let imageObj:any = {};
                            if (file) {
                                const {type:encoding, changed, url} = file;
                                if (changed) {
                                    const image = await serializeFile(url);
                                    imageObj = {image, encoding};
                                } else {
                                    imageObj = {encoding, imageUrl:url};
                                }
                            }
                            const modeText = mode === "user"? `${mode}-${subMode}` : mode;
                            const result = {...imageObj, languages, postLevels, pics, keywordSetting, keywords, keywordsQuote, copy, highlight, sticky, posts:posts? posts.map(x => x.uri) : [],
                                sort, displayName, shortName, description, allowList, blockList, everyList, mustUrl, blockUrl, mode:modeText, allowLabels, mustLabels, viewers};
                            console.log(result);

                            return result;
                        }}
                        postUrl="/feed/submit" postCallback={async (result) => {
                        if (result.status === 200) {
                            setUserDid(result.data.did);
                            setModal("done");
                        }
                        setBusy(false);
                    }}
                        className="space-y-4">
                        <BlueskyForm useFormReturn={useFormReturn} setPopupState={setPopupState} shortNameLocked={shortNameLocked} />

                        <div className="bg-white p-2">
                            <div className="font-bold text-lg">Feed Settings</div>
                            <div className="bg-sky-100 p-2 space-y-2">
                                <div className="font-bold">Feed Privacy</div>
                                <div className="grid md:grid-cols-2 w-full items-center gap-2">
                                    {
                                        PRIVACY_MODES.map(({id, txt}) => {
                                            const updatePrivacy = (id) => {
                                                setPrivacy(id);
                                                switch (id) {
                                                    case "public": {
                                                        setValue("viewers", []);
                                                        break;
                                                    }
                                                    case "shared":
                                                    case "private": {
                                                        setValue("viewers", [{
                                                            did: session.user.did,
                                                            handle: session.user.handle,
                                                            displayName: session.user.name
                                                        }]);
                                                        break;
                                                    }
                                                }

                                            }
                                            return <div key={id}
                                                        className="flex place-items-center bg-orange-100 hover:bg-gray-50 gap-2 p-1 h-full"
                                                        onClick={() => updatePrivacy(id)}>
                                                <input type="radio"
                                                       onChange={() => {}}
                                                       onClick={(e) => {
                                                           e.stopPropagation();
                                                           updatePrivacy(id);
                                                       }}
                                                       checked={privacy === id}
                                                       className={clsx("focus:ring-indigo-500")}
                                                />
                                                <div><span className="font-semibold">{`${id.slice(0,1).toUpperCase()}${id.slice(1)}`}</span>{`: ${txt}`}</div>
                                            </div>
                                        })
                                    }
                                </div>
                                {
                                    privacy === "shared" &&
                                    <InputMultiWord
                                        className={clsx("border border-2 border-black p-2 rounded-xl bg-lime-100")}
                                        labelText="Viewers: Show feed ONLY to these users"
                                        placeHolder="handle.domain or did:plc:xxxxxxxxxxxxxxxxxxxxxxxx"
                                        fieldName="viewers"
                                        handleItem={(item, value, onChange) => {
                                            value.push(item);
                                            value.sort((a, b) => {
                                                return a.handle.localeCompare(b.handle);
                                            })
                                            onChange(value);
                                        }}
                                        valueModifier={item => {
                                            return `${item.displayName} @${item.handle}`
                                        }}
                                        useFormReturn={useFormReturn}
                                        check={multiWordCallback("viewers", ["viewers"])}/>
                                }
                            </div>
                            <div className="bg-lime-100 p-2">
                                <div className="font-bold">Mode</div>
                                <div className="grid md:grid-cols-2 w-full items-center gap-2">
                                    {
                                        FEED_MODES.map(({id, txt}) => {
                                            const updateMode = (id) => {
                                                setMode(id);
                                                setValue("posts", []);
                                                setValue("allowList", []);
                                                setValue("blockList", []);
                                                setValue("everyList", []);
                                                setValue("mustLabels", []);
                                                setValue("allowLabels", SUPPORTED_CW_LABELS);
                                                setSubMode("posts")
                                                switch (id) {
                                                    case "responses":
                                                    case "user": {
                                                        setValue("sort", "new");
                                                        break;
                                                    }
                                                    case "post": {
                                                        setKeywords([]);
                                                        setLanguages([]);
                                                        break;
                                                    }
                                                }
                                            }
                                            return <div key={id}
                                                        className="flex place-items-center bg-orange-100 hover:bg-gray-50 gap-2 p-1 h-full"
                                                        onClick={() => {
                                                            updateMode(id);
                                                        }}>
                                                <input type="radio"
                                                       onChange={() => {}}
                                                       onClick={(e) => {
                                                           e.stopPropagation();
                                                           updateMode(id);
                                                       }}
                                                       checked={mode === id}
                                                       className={clsx("focus:ring-indigo-500")}
                                                />
                                                <div><span className="font-semibold">{`${id.slice(0,1).toUpperCase()}${id.slice(1)}`}</span>{`: ${txt}`}</div>
                                            </div>
                                        })
                                    }
                                </div>
                                {
                                    mode === "user" &&
                                    <div className="mt-2">
                                        <div className="font-bold">Sub-Mode</div>
                                        <div className="grid grid-cols-2 w-full items-center gap-2">
                                            {
                                                USER_FEED_MODE.map(({id, txt}) => {
                                                    const updateSubMode = (id) => {
                                                        setSubMode(id);
                                                    }
                                                    return <div key={id}
                                                                className="flex place-items-center bg-orange-100 hover:bg-gray-50 gap-2 p-1 h-full"
                                                                onClick={() => {
                                                                    updateSubMode(id);
                                                                }}>
                                                        <input type="radio"
                                                               onChange={() => {}}
                                                               onClick={(e) => {
                                                                   e.stopPropagation();
                                                                   updateSubMode(id);
                                                               }}
                                                               checked={subMode === id}
                                                               className={clsx("focus:ring-indigo-500")}
                                                        />
                                                        <div><span className="font-semibold">{`${id.slice(0,1).toUpperCase()}${id.slice(1)}`}</span>{`: ${txt}`}</div>
                                                    </div>
                                                })
                                            }
                                        </div>
                                    </div>
                                }
                            </div>
                            <div className="bg-sky-100 p-2 space-y-2">
                                <InputRadio entriesPerRow={2} modifyText={_ => {
                                    return "text-base font-semibold";
                                }} fieldName="highlight" fieldReadableName="Show in Highlights on BlueskyFeeds.com?" subtext="Your feed will still publicly available in other feed directories" useFormReturn={useFormReturn} items={[{id:"yes", txt:"Yes"}, {id:"no", txt:"No"}]}/>
                            </div>

                            {
                                mode !== "posts" && <>
                                    <div className="bg-lime-100 p-2 space-y-2">
                                        <div className="">
                                            <label className="block font-semibold text-gray-700">
                                                Sticky Post URI or URL (This shows up at the 1st or 2nd position of your feed)
                                            </label>
                                        </div>

                                        <button
                                            type="button"
                                            className={clsx("relative -ml-px inline-flex items-center space-x-2 rounded-xl border border-gray-300 bg-gray-50 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-indigo-200 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500")}
                                            onClick={() => {
                                                setPopupState("edit_sticky");
                                            }}
                                        >
                                            <span>{watchSticky? "Change Sticky Post": "Set Sticky Post"}</span>
                                        </button>

                                        {
                                            watchSticky &&
                                            <a href={`https://bsky.app/profile/${watchSticky.slice(5).replace("app.bsky.feed.post", "post")}`} target="_blank" rel="noreferrer">
                                                <div className="mt-2 p-2 border border-2 border-transparent hover:bg-yellow-100 hover:border-black rounded-xl">
                                                    <div className="text-sm">Preview</div>
                                                    <InputTextBasic fieldName="sticky" disabled={true} fieldReadableName="" useFormReturn={useFormReturn} options={{}}/>
                                                    <div className="bg-gray-50 p-2">{stickyText}</div>
                                                </div>
                                            </a>
                                        }
                                    </div>


                                    <div className="bg-sky-100 p-2 space-y-2">
                                        <InputRadio
                                                    modifyText={_ => {return "text-base font-semibold";}}
                                                    fieldName="sort"
                                                    fieldReadableName="Sort Order"
                                                    subtext="Determines which post is on top"
                                                    useFormReturn={useFormReturn}
                                                    items={SORT_ORDERS.filter(x => x.mode.indexOf(mode) >= 0)}/>
                                        {
                                            mode === "live" &&
                                            <a href="https://medium.com/hacking-and-gonzo/how-hacker-news-ranking-algorithm-works-1d9b0cf2c08d" target="_blank" rel="noreferrer">
                                                <div className="p-2 hover:underline text-blue-500 hover:text-blue-800 inline-flex place-items-center text-sm gap-2">
                                                    <BsFillInfoCircleFill className="h-4 w-4"/>
                                                    <span>What is the Hacker News ranking algorithm?</span>
                                                </div>
                                            </a>
                                        }
                                    </div>
                                    {
                                        !(mode === "user" && subMode === "likes") && <>
                                            <div className="bg-lime-100 p-2 space-y-2">
                                                <div className="font-semibold">Post Type Filter</div>
                                                <div className="grid md:grid-cols-2 gap-2">
                                                    {
                                                        POST_LEVELS.map(x =>
                                                            <div key={x.id}
                                                                 className="flex place-items-center bg-orange-100 hover:bg-gray-50 gap-2 p-1"
                                                                 onClick={() => {
                                                                     if (postLevels.indexOf(x.id) >= 0) {
                                                                         setPostLevels([...postLevels.filter(y => y !== x.id)]);
                                                                     } else {
                                                                         postLevels.push(x.id);
                                                                         setPostLevels([...postLevels]);
                                                                     }
                                                                 }}>
                                                                <input type="checkbox"
                                                                       onChange={() => {}}
                                                                       onClick={(e) => {
                                                                           e.stopPropagation();
                                                                           if (postLevels.indexOf(x.id) >= 0) {
                                                                               setPostLevels([...postLevels.filter(y => y !== x.id)]);
                                                                           } else {
                                                                               postLevels.push(x.id);
                                                                               setPostLevels([...postLevels]);
                                                                           }
                                                                       }}
                                                                       checked={postLevels.indexOf(x.id) >= 0}
                                                                       className={clsx("focus:ring-indigo-500 h-6 w-6 rounded-lg")}
                                                                />
                                                                <div>{x.txt}</div>
                                                            </div>)
                                                    }
                                                </div>
                                                {
                                                    postLevels.length === 0 && <div className="text-red-700">Please select at least one post type above</div>
                                                }
                                            </div>

                                            <div className="bg-sky-100 p-2 space-y-2">
                                                <div className="font-semibold">Picture Posts Filter</div>
                                                <div className="grid md:grid-cols-2 gap-2">
                                                    {
                                                        PICS_SETTING.map(x =>
                                                            <div key={x.id}
                                                                 className="flex place-items-center bg-orange-100 hover:bg-gray-50 gap-2 p-1"
                                                                 onClick={() => {
                                                                     let newValue;
                                                                     if (pics.indexOf(x.id) >= 0) {
                                                                         newValue =[...pics.filter(y => y !== x.id)];
                                                                     } else {
                                                                         newValue = [...pics, x.id];
                                                                     }
                                                                     setPics(newValue);
                                                                     if (newValue.indexOf("text") < 0) {
                                                                         setValue("mustLabels", []);
                                                                     }
                                                                 }}>
                                                                <input type="checkbox"
                                                                       onChange={() => {}}
                                                                       onClick={(e) => {
                                                                           e.stopPropagation();
                                                                           if (pics.indexOf(x.id) >= 0) {
                                                                               setPics([...pics.filter(y => y !== x.id)]);
                                                                           } else {
                                                                               setPics([...pics, x.id]);
                                                                           }
                                                                       }}
                                                                       checked={pics.indexOf(x.id) >= 0}
                                                                       className={clsx("focus:ring-indigo-500 h-6 w-6 rounded-lg")}
                                                                />
                                                                <div>{x.txt}</div>
                                                            </div>)
                                                    }
                                                </div>
                                                {
                                                    pics.length === 0 && <div className="text-red-700">Please select at least one post type above</div>
                                                }
                                                {
                                                    pics.indexOf("pics") >= 0 && mode === "live" && <div className="flex place-items-center gap-2">
                                                        <div className="font-semibold text-sm">Pic Content Warnings <span className="underline">Allowed</span></div>
                                                        {
                                                            SUPPORTED_CW_LABELS.map(label => {
                                                                const onClick = (e) => {
                                                                    e.stopPropagation();
                                                                    let newAllowed;
                                                                    if (watchAllowLabels.indexOf(label) < 0) {
                                                                        const temp = new Set([...watchAllowLabels, label]);
                                                                        newAllowed = [...temp];
                                                                    } else {
                                                                        newAllowed = watchAllowLabels.filter(x => x !== label);
                                                                    }
                                                                    setValue("allowLabels", newAllowed);
                                                                    setValue("mustLabels", watchMustLabels.filter(x => newAllowed.indexOf(x) >= 0));
                                                                }
                                                                return <div key={label}
                                                                            className={clsx("relative flex items-start items-center hover:bg-orange-200")}
                                                                            onClick={onClick}>
                                                                    <div className="flex items-center p-2">
                                                                        <input type="checkbox"
                                                                               checked={watchAllowLabels.indexOf(label) >= 0}
                                                                               onClick={onClick}
                                                                               onChange={()=>{}}
                                                                               className={clsx("focus:ring-orange-500 h-6 w-6 rounded-md")}
                                                                        />
                                                                        <div className={clsx("ml-3 text-gray-700")}>
                                                                            {label.slice(0,1).toUpperCase()}{label.slice(1)}
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                            })
                                                        }
                                                    </div>
                                                }
                                                {
                                                    pics.length === 1 && pics.indexOf("pics") === 0 && <div className="flex place-items-center gap-2">
                                                        <div className="font-semibold text-sm">Pic Content Warnings <span className="underline">Required</span></div>
                                                        {
                                                            SUPPORTED_CW_LABELS.map(label => {
                                                                const onClick = (e) => {
                                                                    e.stopPropagation();
                                                                    let newRequired;
                                                                    if (watchMustLabels.indexOf(label) < 0) {
                                                                        const temp = new Set([...watchMustLabels, label]);
                                                                        newRequired = [...temp];
                                                                    } else {
                                                                        newRequired = watchMustLabels.filter(x => x !== label);
                                                                    }
                                                                    setValue("mustLabels", newRequired);

                                                                    const newAllowed = new Set([...watchAllowLabels, ...newRequired]);
                                                                    setValue("allowLabels", [...newAllowed]);
                                                                }
                                                                return <div key={label}
                                                                            className={clsx("relative flex items-start items-center hover:bg-orange-200")}
                                                                            onClick={onClick}>
                                                                    <div className="flex items-center p-2">
                                                                        <input type="checkbox"
                                                                               checked={watchMustLabels.indexOf(label) >= 0}
                                                                               onClick={onClick}
                                                                               onChange={()=>{}}
                                                                               className={clsx("focus:ring-orange-500 h-6 w-6 rounded-md")}
                                                                        />
                                                                        <div className={clsx("ml-3 text-gray-700")}>
                                                                            {label.slice(0,1).toUpperCase()}{label.slice(1)}
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                            })
                                                        }
                                                    </div>
                                                }
                                            </div>
                                        </>
                                    }

                                    {
                                        mode === "live" &&
                                        <div className="bg-lime-100 p-2">
                                            <div className="font-semibold">Language Filters</div>
                                            <div className="text-sm">Note: This relies on user input</div>
                                            <div className="text-sm">Leave this completely empty to accept posts of all languages including those not listed</div>
                                            <div className="grid grid-cols-2">
                                                <div className={clsx("relative flex items-start items-center hover:bg-orange-200")}
                                                     onClick={() => {
                                                         if (SUPPORTED_LANG.every(x => languages.indexOf(x.id) >= 0)) {
                                                             setLanguages([]);
                                                         } else {
                                                             setLanguages(SUPPORTED_LANG.map(x => x.id));
                                                         }
                                                     }}>
                                                    <div className="flex items-center p-2">
                                                        <input type="checkbox"
                                                               onChange={() => {}}
                                                               onClick={(e) => {
                                                                   e.stopPropagation();
                                                                   if (SUPPORTED_LANG.every(x => languages.indexOf(x.id) >= 0)) {
                                                                       setLanguages([]);
                                                                   } else {
                                                                       setLanguages(SUPPORTED_LANG.map(x => x.id));
                                                                   }
                                                               }}
                                                               checked={SUPPORTED_LANG.every(x => languages.indexOf(x.id) >= 0)}
                                                               className={clsx("focus:ring-orange-500 h-6 w-6 rounded-md")}
                                                        />
                                                        <div className={clsx("ml-3 text-gray-700")}>
                                                            {
                                                                SUPPORTED_LANG.every(x => languages.indexOf(x.id) >= 0)? <div className="flex place-items-center">
                                                                    Deselect All (all posts no matter the language)
                                                                    <RxCross2 className="w-6 h-6 text-red-600"/>
                                                                </div>: <div className="flex place-items-center">
                                                                    Select All listed here (some languages are not listed)
                                                                    <RxCheck className="w-6 h-6 text-green-600"/>
                                                                </div>
                                                            }
                                                        </div>
                                                    </div>
                                                </div>
                                                {
                                                    SUPPORTED_LANG.map(({txt, id}) => {
                                                        const onClick = (e) => {
                                                            e.stopPropagation();
                                                            if (languages.indexOf(id) < 0) {
                                                                const lang = [...languages];
                                                                lang.push(id)
                                                                setLanguages(lang);
                                                            } else {
                                                                setLanguages(languages.filter(x => x !== id));
                                                            }
                                                        }
                                                        return <div key={id}
                                                                    className={clsx("relative flex items-start items-center hover:bg-orange-200")}
                                                                    onClick={onClick}>
                                                            <div className="flex items-center p-2">
                                                                <input type="checkbox"
                                                                       checked={languages.indexOf(id) >= 0}
                                                                       onClick={onClick}
                                                                       onChange={()=>{}}
                                                                       className={clsx("focus:ring-orange-500 h-6 w-6 rounded-md")}
                                                                />
                                                                <div className={clsx("ml-3 text-gray-700")}>
                                                                    {txt}
                                                                </div>
                                                            </div>
                                                        </div>
                                                    })
                                                }
                                            </div>
                                        </div>
                                    }

                                </>
                            }

                        </div>

                        {
                            mode !== "posts" &&
                            <div className="bg-white p-2 space-y-2">
                                <div className="text-lg font-bold">User Filters</div>
                                {
                                    (mode === "live" || mode === "responses") &&
                                    [
                                        {
                                            id: "everyList",
                                            c: "bg-lime-100",
                                            t: mode === "live"?
                                                "Every List: Show all posts from these users" :
                                                "Get responses to posts from these users"
                                        },
                                        mode === "live"? {
                                            id: "allowList",
                                            c: "bg-yellow-100",
                                            t: "Only List: Only search posts from these Users, if empty, will search all users for keywords"
                                        } : false,
                                        {
                                            id: "blockList",
                                            c: "bg-pink-100",
                                            t: "Block List: Block all posts from these Users"
                                        }]
                                        .filter(x => x)
                                        //@ts-ignore
                                        .map(({id, t, c}) =>
                                            <InputMultiWord
                                                key={id}
                                                className={clsx("border border-2 border-black p-2 rounded-xl", c)}
                                                labelText={t}
                                                placeHolder="handle.domain or did:plc:xxxxxxxxxxxxxxxxxxxxxxxx"
                                                fieldName={id}
                                                handleItem={(item, value, onChange) => {
                                                    value.push(item);
                                                    value.sort((a, b) => {
                                                        return a.handle.localeCompare(b.handle);
                                                    })
                                                    onChange(value);
                                                }}
                                                valueModifier={item => {
                                                    return `${item.displayName} @${item.handle}`
                                                }}
                                                useFormReturn={useFormReturn}
                                                check={multiWordCallback(id)}/>
                                        )
                                }
                                {
                                    mode === "user" &&
                                    <div className="bg-sky-100 p-2 space-y-2">
                                        <div className="">
                                            <label className="block font-semibold text-gray-700">
                                                User to Observe
                                            </label>
                                        </div>

                                        <div className="mt-1 flex rounded-md shadow-sm gap-2">
                                            <button
                                                type="button"
                                                className={clsx("relative -ml-px inline-flex items-center space-x-2 rounded-xl border border-gray-300 bg-gray-50 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-indigo-200 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500")}
                                                onClick={async () => {
                                                    setValue("allowList",[{
                                                        did: session.user.did,
                                                        handle: session.user.handle,
                                                        displayName: session.user.name
                                                    }]);
                                                }}
                                            >
                                                <span>Set to Self</span>
                                            </button>
                                            <button
                                                type="button"
                                                className={clsx("relative -ml-px inline-flex items-center space-x-2 rounded-xl border border-gray-300 bg-gray-50 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-indigo-200 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500")}
                                                onClick={() => {
                                                    setPopupState("edit_user");
                                                }}
                                            >
                                                <span>Set to Another User</span>
                                            </button>
                                        </div>

                                        {
                                            Array.isArray(watchAllow) && watchAllow.length === 1 &&
                                            <a href={`https://bsky.app/profile/${watchAllow[0].did}`}>
                                                <div className="p-2">
                                                    <div>Observing:</div>
                                                    <div
                                                        className="bg-gray-50 p-2">{`${watchAllow[0].displayName} @${watchAllow[0].handle}`}</div>
                                                </div>
                                            </a>

                                        }
                                    </div>
                                }
                            </div>
                        }

                        {
                            mode !== "responses" && mode !== "posts" && !(mode === "user" && subMode === "likes") &&
                            <div className="bg-white p-2 space-y-2">
                                <div className="text-lg font-bold">Keyword Filters {VIP ? "" : `(max ${mode === "live" ? MAX_KEYWORDS_PER_LIVE_FEED : MAX_KEYWORDS_PER_USER_FEED})`}</div>
                                <div>A post is blocked if it contains at least one blocked keyword, and is allowed only
                                    if it has no blocked keywords and at least one search keyword
                                </div>
                                <div className="bg-sky-200 p-2">
                                    <div className="font-semibold">Search location</div>
                                    <div className="grid grid-cols-2 gap-2">
                                        {
                                            KEYWORD_SETTING.map(x =>
                                                <div key={x.id}
                                                     className="flex place-items-center bg-orange-100 hover:bg-gray-50 gap-2 p-1"
                                                     onClick={() => {
                                                         if (keywordSetting.indexOf(x.id) >= 0) {
                                                             setKeywordSetting([...keywordSetting.filter(y => y !== x.id)]);
                                                         } else {
                                                             setKeywordSetting([...keywordSetting, x.id]);
                                                         }
                                                         console.log(keywordSetting);
                                                     }}>
                                                    <input type="checkbox"
                                                           onChange={() => {
                                                           }}
                                                           onClick={(e) => {
                                                               e.stopPropagation();
                                                               if (keywordSetting.indexOf(x.id) >= 0) {
                                                                   setKeywordSetting([...keywordSetting.filter(y => y !== x.id)]);
                                                               } else {
                                                                   keywordSetting.push(x.id);
                                                                   setKeywordSetting([...keywordSetting]);
                                                               }
                                                           }}
                                                           checked={keywordSetting.indexOf(x.id) >= 0}
                                                           className={clsx("focus:ring-indigo-500 h-6 w-6 rounded-lg")}
                                                    />
                                                    <div>{x.txt}</div>
                                                </div>)
                                        }
                                    </div>
                                    {
                                        keywordSetting.length === 0 &&
                                        <div className="text-red-700">Please select at least one keyword search
                                            method</div>
                                    }
                                </div>

                                <KeywordsEdit keywords={keywords} setKeywords={setKeywords} VIP={VIP}/>


                                {
                                    mode === "live" &&
                                    <div>
                                        <div className="p-2 bg-blue-100 flex gap-2 place-items-center hover:bg-blue-200"
                                             onClick={ () => {
                                                 const newV = !specialQuote;
                                                 setSpecialQuote(!specialQuote);
                                                 if (!newV) {
                                                     setKeywordsQuote([]);
                                                 }
                                             }}>
                                            <input type="checkbox"
                                                   onChange={()=>{}}
                                                   checked={specialQuote}
                                                   onClick={()=> {
                                                       const newV = !specialQuote;
                                                       setSpecialQuote(!specialQuote);
                                                       if (!newV) {
                                                           setKeywordsQuote([]);
                                                       }
                                                   }} />
                                            <div className="font-bold">Add Quoted Post to Feed [Beta]</div>
                                        </div>
                                        {
                                            specialQuote && <KeywordsEdit bg="bg-blue-100" keywords={keywordsQuote} setKeywords={setKeywordsQuote} VIP={VIP}/>
                                        }

                                    </div>
                                }

                            </div>
                        }


                        {
                            mode === "posts" && <div className="bg-white p-2">
                                <div className="text-lg font-bold">Post List</div>
                                <PostsEdit useFormReturn={useFormReturn} recaptcha={recaptcha} setBusy={setBusy}/>
                            </div>
                        }

                        {
                            /*
                               <div className="bg-white p-2 space-y-2 hidden">
                            <div className="text-lg font-bold">URL Filters</div>
                            <div>Use *.domain.tld to get all subdomains for domain.tld</div>
                            {
                                [
                                    {id:"mustUrl", t:"Posts must have links from one of these domains", c:"bg-yellow-100"},
                                    {id:"blockUrl", t:"Block all post with links from these domains", c:"bg-pink-100"}
                                ].map(({id, t, c}) =>
                                    <InputMultiWord
                                        key={id}
                                        className={clsx("border border-2 border-yellow-700 p-2 rounded-xl", c)}
                                        labelText={t}
                                        placeHolder="skip http://... or https://..."
                                        fieldName={id}
                                        handleItem={(item, value, onChange) => {
                                            value.push(item);
                                            value.sort(); // sorting algo
                                            onChange(value);
                                        }}
                                        useFormReturn={useFormReturn}
                                        check={(val, callback) => {
                                            if (val.startsWith("https://") || val.startsWith("http://")) {
                                                setError(id, {type:'custom', message:`${val} must not start with https:// or http://`});
                                            } else if (!isValidDomain(val)) {
                                                setError(id, {type:'custom', message:`Invalid domain`});
                                            } else {
                                                const mustUrls = getValues("mustUrl") || [];
                                                const blockUrls = getValues("blockUrl") || [];
                                                if (mustUrls.indexOf(val) >= 0) {
                                                    setError(id, {type:'custom', message:`${val} is already in required url list`});
                                                } else if (blockUrls.indexOf(val) >= 0) {
                                                    setError(id, {type:'custom', message:`${val} is already in blocked url list`});
                                                } else {
                                                    callback(val);
                                                }
                                            }
                                        }}/>)
                            }
                        </div>
                             */
                        }

                        <div className="p-2 bg-white">
                            <div className="font-bold text-lg">File Backup</div>
                            <div className="italic">Feed image is not included, please handle that yourself</div>
                            <div className="w-full lg:flex justify-between gap-4">
                                <button type="button"
                                        onClick={() => {
                                            const {sort, displayName, shortName, description, allowList:_allowList, blockList:_blockList, everyList:_everyList, mustUrl, blockUrl, copy, highlight, sticky, posts, viewers:_viewers} = getValues();
                                            const allowList = (_allowList || []).map(x => x.did);
                                            const blockList = (_blockList || []).map(x => x.did);
                                            const everyList = (_everyList || []).map(x => x.did);
                                            const viewers = (_viewers || []).map(x => x.did);

                                            const modeText = mode === "user"? `${mode}-${subMode}` : mode;

                                            const result = {languages, postLevels, pics, keywordSetting, keywords: keywords.map(x => compressKeyword(x)), keywordsQuote: keywordsQuote.map(x => compressKeyword(x)), copy, highlight, sticky, posts: posts? posts.map(x => x.uri) : [],
                                                sort, displayName, shortName, description, allowList, blockList, everyList, mustUrl, blockUrl, mode: modeText, viewers};
                                            const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(result, null, 2));
                                            const dlAnchorElem = document.createElement('a');
                                            dlAnchorElem.setAttribute("href",     dataStr     );
                                            dlAnchorElem.setAttribute("download", `${shortName}.json`);
                                            dlAnchorElem.click();
                                        }}
                                        className="mt-4 w-full inline-flex justify-center items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500">
                                    Download JSON file backup
                                </button>

                                <button
                                    type="button"
                                    onClick={() => {
                                        const input = document.createElement('input');
                                        input.type = 'file';
                                        input.accept = "application/json"
                                        input.onchange = () => {
                                            if (typeof recaptcha === 'undefined') {
                                                return;
                                            }

                                            // getting a hold of the file reference
                                            let file = input.files[0];

                                            // setting up the reader
                                            let reader = new FileReader();
                                            reader.readAsText(file,'UTF-8');

                                            // here we tell the reader what to do when it's done reading...
                                            reader.onload = async (readerEvent) => {
                                                setBusy(true);
                                                try {
                                                    let content = readerEvent.target.result as string; // this is the content!
                                                    console.log( content );

                                                    let {sort, shortName, displayName, description, blockList, allowList, everyList, languages, postLevels, pics, mustUrl, blockUrl, keywordSetting, keywords, keywordsQuote, copy, highlight, sticky, mode:_mode, posts:_posts, mustLabels, allowLabels, viewers} = JSON.parse(content);
                                                    allowLabels = allowLabels || SUPPORTED_CW_LABELS;
                                                    mustLabels = mustLabels || [];
                                                    blockList = blockList || [];
                                                    everyList = everyList || [];
                                                    allowList = allowList || [];
                                                    viewers = viewers || [];

                                                    let mode = _mode;
                                                    let subMode = "";
                                                    if (_mode.startsWith("user")) {
                                                        mode = "user";
                                                        subMode = _mode.slice(5);

                                                        if (blockList.length +everyList.length > 0 || allowList.length > 1) {
                                                            alert("Error recovering data, too many items in users for user mode");
                                                            return;
                                                        }
                                                        if (keywords.length > MAX_KEYWORDS_PER_USER_FEED) {
                                                            alert("Error recovering data, too many keywords for user mode");
                                                            return;
                                                        }
                                                    }
                                                    if (!mode || !FEED_MODES.find(x => x.id === mode)) {
                                                        mode = "live";
                                                    }

                                                    if (mode == "posts" && (!_posts || !Array.isArray(_posts))) {
                                                        alert("Invalid posts or no posts");
                                                        return;
                                                    }


                                                    let result, skip = true;
                                                    const actors = [... new Set([...blockList, ...allowList, ...everyList, ...viewers])];
                                                    if (actors.length > 0) {
                                                        skip = false;
                                                        const captcha = await getCaptcha(recaptcha);
                                                        result = await localGet("/check/user", {captcha, actors});
                                                        console.log("RESULT GET ", result);
                                                    }
                                                    if (!skip && result && (result.status !== 200 || !Array.isArray(result.data))) {
                                                        // fail
                                                        console.log(result);
                                                        alert("error recovering data");
                                                        setBusy(false);
                                                        return;
                                                    } else {
                                                        if (result) {
                                                            allowList = result.data.filter(x => allowList.find(y => y === x.did));
                                                            blockList = result.data.filter(x => blockList.find(y => y === x.did));
                                                            everyList = result.data.filter(x => everyList.find(y => y === x.did));
                                                            viewers = result.data.filter(x => viewers.find(y => y === x.did));
                                                        }
                                                    }

                                                    if (mode === "posts") {
                                                        let posts = [];
                                                        if (_posts.length > 0) {
                                                            const captcha = await getCaptcha(recaptcha);
                                                            const result = await localGet("/check/posts", {captcha, posts:_posts});
                                                            if (result.status === 200 && result.data.posts.length > 0) {
                                                                posts = result.data.posts;
                                                            }
                                                        }

                                                        let o:any = {
                                                            sort, displayName, description, copy: copy || [], highlight: highlight || "yes", posts, mustLabels, allowLabels,
                                                            shortName,  mustUrl: mustUrl || [], blockUrl: blockUrl || []
                                                        };
                                                        setMode(mode);

                                                        setLanguages([]);
                                                        setPostLevels(POST_LEVELS.map(x => x.id));
                                                        setKeywordSetting(["text"]);
                                                        setPics(["text", "pics"]);
                                                        setKeywords([]);
                                                        setKeywordsQuote([]);
                                                        setSpecialQuote(false);

                                                        reset(o);
                                                        setBusy(false);
                                                    } else {
                                                        console.log("others")

                                                        keywords = keywords?.map(x => {
                                                            const {t, a} = x;
                                                            let o:any;
                                                            try {
                                                                o = JSON.parse(toJson(t));
                                                            } catch (e) {
                                                                o = JSON.parse(compressedToJsonString(t));
                                                            }

                                                            o.a = a;
                                                            if ((o.t === "t" || o.t === "s") && !o.r) {
                                                                o.r = [];
                                                            }
                                                            return o;
                                                        }) || [];

                                                        keywordsQuote = keywordsQuote?.map(x => {
                                                            const {t, a} = x;
                                                            let o:any;
                                                            try {
                                                                o = JSON.parse(toJson(t));
                                                            } catch (e) {
                                                                o = JSON.parse(compressedToJsonString(t));
                                                            }

                                                            o.a = a;
                                                            if ((o.t === "t" || o.t === "s") && !o.r) {
                                                                o.r = [];
                                                            }
                                                            return o;
                                                        }) || [];



                                                        if (sticky) {
                                                            const captcha = await getCaptcha(recaptcha);
                                                            const result = await localGet("/check/posts", {captcha, posts:[sticky]});
                                                            if (result.status === 200 && result.data.posts.length > 0) {
                                                                const [post] = result.data.posts;
                                                                if (post) {
                                                                    const {uri, text} = post;
                                                                    sticky = uri;
                                                                    setStickyText(text);
                                                                }
                                                            }
                                                        }

                                                        let o:any = {
                                                            sort,displayName, description, copy: copy || [], highlight: highlight || "yes", mustLabels, allowLabels,
                                                            allowList:allowList|| [], blockList:blockList||[], everyList:everyList||[],
                                                            shortName,  mustUrl: mustUrl || [], blockUrl: blockUrl || [], sticky, posts:[]
                                                        };
                                                        setMode(mode);
                                                        if (subMode) {
                                                            // @ts-ignore
                                                            setSubMode(subMode);
                                                        }

                                                        setLanguages(languages || []);
                                                        setPostLevels(postLevels || POST_LEVELS.map(x => x.id));
                                                        setKeywordSetting(keywordSetting || ["text"]);
                                                        setPics(pics || ["text", "pics"]);
                                                        setKeywords(keywords);
                                                        if (keywordsQuote.length > 0) {
                                                            setSpecialQuote(true);
                                                            setKeywordsQuote(keywordsQuote);
                                                        } else {
                                                            setSpecialQuote(false);
                                                            setKeywordsQuote([]);
                                                        }

                                                        reset(o);
                                                        console.log(o);
                                                        setBusy(false);
                                                    }
                                                    setTimeout(() => {
                                                        input.remove();
                                                    }, 100);
                                                } catch (e) {
                                                    console.log(e);
                                                    alert("error recovering data");
                                                }
                                            }
                                        }
                                        input.click();
                                    }}
                                    className="mt-4 w-full inline-flex justify-center items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-lime-600 hover:bg-lime-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-lime-500">
                                    Recover from JSON backup
                                </button>
                            </div>
                        </div>

                        <button type="button"
                                onClick={() => {formRef.current.requestSubmit();}}
                                className="mt-4 w-full inline-flex justify-center items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500">
                            Submit
                        </button>
                    </RHForm>
                }
            </div>
        }
    </>
}
