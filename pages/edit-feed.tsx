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
import {localDelete, localGet, localPost} from "features/network/network";
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
import {expandUserLists, getPostInfo, isSuperAdmin, isVIP} from "features/utils/bsky";
import PopupLoading from "features/components/PopupLoading";
import Link from "next/link";
import {IoArrowBackSharp} from "react-icons/io5";
import {compressKeyword,} from "features/utils/objectUtils";
import InputTextBasic from "features/input/InputTextBasic";
import PopupWithInputText from "features/components/PopupWithInputText";
import {BiCopy} from "react-icons/bi";
import KeywordsEdit from "features/components/specific/KeywordsEdit";
import BlueskyForm from "features/components/specific/BlueskyForm";
import {compressedToJsonString, unEscapeRelaxed} from "features/utils/textAndKeywords";
import PostsEdit from "features/components/specific/PostsEdit";
import PopupWithAddPost from "features/components/PopupWithAddPost";
import EditFeedWizard from "features/components/specific/EditFeedWizard";
import InputUserFilter from "features/input/InputUserFilter";
import PageFooter from "features/components/PageFooter";

export async function getServerSideProps({req, res, query}) {
    const {updateSession, session, agent, redirect, db} = await getLoggedInData(req, res);
    if (redirect) {return {redirect};}

    let feed = null;
    const VIP = agent && isVIP(agent);
    if (agent) {
        const {feed: _feed} = query;
        if (_feed) {
            let feedData: any = await getFeedDetails(agent, db, _feed);
            if (feedData) {
                feedData = await expandUserLists(feedData, agent);
                let {sticky, posts:_posts, mode} = feedData;

                if (mode === "posts") {
                    if (Array.isArray(_posts)) {
                        const posts = (await getPostInfo(agent, _posts)).map(post => {
                            const {text, uri} = post;
                            return {text, uri};
                        });
                        feed = {...feedData, posts};
                    } else {
                        console.log("posts not formatted correctly");
                        res.status(401).send("error");
                        return;
                    }
                } else {

                    if (sticky) {
                        let posts = await getPostInfo(agent, [sticky]);
                        if (posts.length === 0) {
                            sticky = "";
                        } else {
                            const {uri, text} = posts[0];
                            sticky = {uri, text};
                        }
                    } else {
                        sticky = "";
                    }

                    feed = {...feedData, sticky};
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
    const [keywordsEdited, setKeywordsEdited] = useState(false);
    const [keywordsQuoteEdited, setKeywordsQuoteEdited] = useState(false);

    const [popupState, setPopupState] = useState<"delete"|"edit_sticky"|"edit_user"|"sync_everyList"|"sync_blockList"|"sync_mentionList"|"sync_allowList"|"sync_viewers"|false>(false);
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
    const [everyListBlockKeyword, setEveryListBlockKeyword] = useState<FeedKeyword[]>([])
    const [everyListBlockKeywordSetting, setEveryListBlockKeywordSetting] = useState<string[]>([])

    const [liveMentionList, setLiveMentionList] = useState(false);
    const [liveAllowList, setLiveAllowList] = useState(false);


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
    const watchMention = watch("mentionList");
    const watchAllowLabels = watch("allowLabels");
    const watchMustLabels = watch("mustLabels");
    const watchEveryListSync = watch("everyListSync");
    const watchAllowListSync = watch("allowListSync");
    const watchMentionListSync = watch("mentionListSync");
    const watchBlockListSync = watch("blockListSync");
    const watchViewersSync = watch("viewersSync");

    useEffect(() => {
        if (session && status === "authenticated" && updateSession) {
            signIn(APP_SESSION, {redirect: false, id: session.user.sk}).then(r => {
                console.log(r);
            });
        }
    }, [status]);


    useEffect(() => {
        if (!feed) {
            reset({sticky:"", sort:"new", allowList:[], blockList:[], mentionList: [], everyList:[], mustUrl:[], blockUrl:[], copy:[], highlight: "yes", posts:[], allowLabels:SUPPORTED_CW_LABELS, mustLabels:[], viewers:[]});
            setMode("live");
            setLanguages([]);
            setPrivacy("public");
            setPostLevels(POST_LEVELS.map(x => x.id));
            setKeywordSetting(["text"]);
            setEveryListBlockKeywordSetting(["text"]);
            setEveryListBlockKeyword([]);
            setPics(["text", "pics"]);
        } else {
            console.log("feed", feed);
            let {avatar, sort, uri, displayName, description,
                blockList, blockListSync,
                allowList, allowListSync,
                mentionList, mentionListSync,
                everyList, everyListSync,
                languages, postLevels, pics, mustUrl, blockUrl, keywordSetting, keywords,
                copy, highlight, mode, sticky, posts, allowLabels, mustLabels, keywordsQuote, everyListBlockKeyword, everyListBlockKeywordSetting,
                viewers, viewersSync,
            } = feed;

            if (allowList.length > 0 || allowListSync) {
                setLiveAllowList(true);
            }
            if (mentionList.length > 0 || mentionListSync) {
                setLiveMentionList(true);
            }

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
                sort,displayName, description, copy: copy || [], highlight: highlight || "yes", viewers, viewersSync,
                shortName: uri.split("/").at(-1),
                blockList, blockListSync,
                allowList, allowListSync,
                mentionList, mentionListSync,
                everyList, everyListSync,
                mustUrl: mustUrl || [], blockUrl: blockUrl || [], posts: posts || [],
            };

            if (avatar) {
                const type = `image/${avatar.split("@")[1]}`;
                o.file = {changed: false, url: avatar, type}
            }

            keywords = keywords?.map(x => {
                const {t, a} = x;
                let o = JSON.parse(unEscapeRelaxed(toJson(t)));
                o.a = a;
                if ((o.t === "t" || o.t === "s") && !o.r) {
                    o.r = [];
                }
                return o;
            }) || [];

            keywordsQuote = keywordsQuote?.map(x => {
                const {t, a} = x;
                let o = JSON.parse(unEscapeRelaxed(toJson(t)));
                o.a = a;
                if ((o.t === "t" || o.t === "s") && !o.r) {
                    o.r = [];
                }
                return o;
            }) || [];

            everyListBlockKeyword = everyListBlockKeyword?.map(x => {
                const {t, a} = x;
                let o = JSON.parse(unEscapeRelaxed(toJson(t)));
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
            setEveryListBlockKeywordSetting(everyListBlockKeywordSetting || ["text"]);
            setPics(pics || ["text", "pics"]);
            setKeywords(keywords);
            if (keywordsQuote.length > 0) {
                setSpecialQuote(true);
                setKeywordsQuote(keywordsQuote);
            }
            setEveryListBlockKeyword(everyListBlockKeyword);
        }
    }, [feed]);


    const multiWordCallback = (fieldName:string, lists:string[], allowList:boolean=false) => {
        return async(val, callback) => {
            setBusy(true);
            let user = val;
            let isList = false;
            if (user.startsWith("@")) {
                user = user.slice(1);
            } else if (user.startsWith("bsky.app/profile/")) {
                user = user.slice(17);
                const userParts = user.split("/");
                console.log(allowList, userParts);
                if (allowList && userParts[1] === "lists") {
                    isList = true;
                } else {
                    user = userParts[0];
                }
            } else if (user.startsWith("https://bsky.app/profile/")) {
                user = user.slice(25);
                const userParts = user.split("/");
                console.log(allowList, userParts);
                if (allowList && userParts[1] === "lists") {
                    isList = true;
                } else {
                    user = userParts[0];
                }
            }

            if (isList) {

                const result = await localGet("/check/list", {list:user});
                console.log(result);
                if (result.status === 200 && Array.isArray(result.data.v)) {
                    clearErrors(fieldName);
                    console.log(result.data);
                    callback(result.data.v);
                } else if (result.status === 400) {
                    setError(fieldName, {type:'custom', message:"Invalid user or user not found"});
                } else if (result.status === 401) {
                    await router.reload();
                } else {
                    setError(fieldName, {type:'custom', message:"Error"});
                }

            } else {
                console.log("user", user);
                for (const l of lists) {
                    const ll = getValues(l) || [];
                    if (ll.find(x => x.did === user || x.handle === user)) {
                        setError(fieldName, {type:'custom', message:`${user} is already in ${l}`});
                        setBusy(false);
                        return;
                    }
                }


                const result = await localGet("/check/user", {actors:[user]});
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

                    const result = await localGet("/check/user", {actors:[v]});
                    if (result.status === 200 && Array.isArray(result.data) && result.data.length === 1) {
                        console.log(result.data[0]);
                        setValue("allowList", result.data);
                        setLiveAllowList(true);
                        callback();
                    } else if (result.status === 400) {
                        callback("Invalid user or user not found");
                    } else {
                        callback("Unknown error");
                    }

            }}/>

        <PopupWithInputText
            isOpen={popupState === "sync_allowList" ||
                popupState === "sync_blockList" ||
                popupState === "sync_mentionList" ||
                popupState === "sync_everyList" ||
                popupState === "sync_viewers"}
            setOpen={setPopupState}
            title="Set List"
            message="Leave blank to remove"
            inputClass="text-xs"
            popupClass="min-w-[340px]"
            placeholder="did:plc:xxxxxxxxxxxxxxxxxxxxxxxx/list/yyyyyy"
            validateCallback={(v) => ""}
            yesCallback={async (list:string, callback) => {
                if (list === "") {
                    const v = (popupState as string).split("_")[1];
                    setValue(`${v}Sync`, "");
                    callback();
                }
                    const fieldName = (popupState as string).split("_")[1];
                    const result = await localGet("/check/list", {list});
                    if (result.status === 200 && Array.isArray(result.data.v)) {
                        clearErrors(fieldName);
                        console.log(result.data);
                        const v = (popupState as string).split("_")[1];
                        setValue(v, result.data.v);
                        setValue(`${v}Sync`, result.data.id);
                        callback();
                    } else if (result.status === 400) {
                        setError(fieldName, {type:'custom', message:"Invalid user or user not found"});
                    } else if (result.status === 401) {
                        await router.reload();
                    } else {
                        setError(fieldName, {type:'custom', message:"Error"});
                    }

            }}/>
        <PopupWithAddPost
            isOpen={popupState === "edit_sticky"}
            setOpen={setPopupState}
            title="Set Sticky Post"
            message="Copy whole or part of url from browser or share button. Submit blank to remove sticky"
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

                setBusy(true);
                const result = await localDelete("/feed/delete", {rkey: feed.uri.split("/").slice(-1)[0]});
                if (result.status === 200) {
                    await router.push("/my-feeds");
                } else {
                    console.log(result);
                }
                setBusy(false);
            }}
        />
        <HeadExtended title={title} description={description}/>
        {
            !session && <FormSignIn/>
        }

        {
            session && <div className="bg-sky-200 w-full max-w-5xl rounded-xl overflow-hidden p-4 space-y-4">
                <PageHeader title={title} description={description} />
                {
                    modal.startsWith("wizard") &&
                   <EditFeedWizard
                       modal={modal}
                       setModal={setModal}
                       setMode={setMode}
                       setSubMode={setSubMode}
                       setPostLevels={setPostLevels}
                       useFormReturn={useFormReturn}
                       setBusy={setBusy}
                       setKeywords={setKeywords}
                       keywords={keywords}
                       VIP={VIP}
                       setPopupState={setPopupState}
                       multiWordCallback={multiWordCallback}
                       shortNameLocked={shortNameLocked}
                       setPics={setPics}
                       setLiveAllowList={setLiveAllowList}
                       watchEveryListSync={watchEveryListSync}/>
                }

                {
                    modal === "done" &&
                    <div className="bg-white p-4">
                        <div className="font-bold">Your Feed has been saved.</div>
                        <ul className="list-disc pl-4 py-4">
                            {
                                mode === "live" && <>
                                    <li>It may <span className="-m-0.5 px-0.5 font-semibold bg-yellow-200">take a while (at most 20 min)</span> for
                                        posts to populate the feed as post data is not stored in the servers, only metadata.
                                        It only process <span className="font-semibold">NEW</span> posts as they arrive via
                                        the firehose API. If you do not see any test posts by then, <a
                                            className="underline text-blue-500 hover:text-blue-800"
                                            href="https://bsky.app/profile/blueskyfeeds.com" target="_blank"
                                            rel="noreferrer">let me know</a> and {"I'll"} look into it.
                                    </li>
                                    <li>Posts are stored for 4 days and expire after</li>
                                </>

                            }
                            {
                                mode === "user" &&
                                <li>User feeds fetch data directly from Bluesky, and trigger when the feed is first
                                    opened, and can be re-triggered about ten minutes after the last trigger.</li>
                            }
                            <li>
                                <div className="flex place-items-center">Your feed is accessible
                                    <a className="ml-1 inline-flex underline text-blue-500 hover:text-blue-800" href={(feed?._id && `https://bsky.app/profile/${feed?._id.split("/")[2]}/feed/${feed?._id.split("/").at(-1)}`) || `https://bsky.app/profile/${userDid}/feed/${getValues("shortName")}`} target="_blank" rel="noreferrer">here</a>.
                                Or copy it to clipboard
                                <BiCopy onClick={() => { navigator.clipboard.writeText((feed?._id && `https://bsky.app/profile/${feed?._id.split("/")[2]}/feed/${feed?._id.split("/").at(-1)}`) || `https://bsky.app/profile/${userDid}/feed/${getValues("shortName")}`); alert("Url copied to clipboard")}} className="ml-1 h-4 w-4 text-blue-500 hover:text-blue-800"/></div></li>
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
                        useFormReturn={useFormReturn}
                        cleanUpData={async (data) => {
                            if (mode === "live" && keywords.length + keywordsQuote.length === 0 && (getValues("everyList") || []).length === 0 && getValues("mentionList").length === 0) {
                                alert("Your live data feed has no keywords and no everyList. Please remember to tap 'Add' after typing the desired keyword")
                                return false;
                            }

                            setBusy(true);
                            let {file, sort, displayName, shortName, description,
                                allowList:_allowList, allowListSync,
                                blockList:_blockList, blockListSync,
                                mentionList: _mentionList, mentionListSync,
                                everyList:_everyList, everyListSync,
                                viewers:_viewers, viewersSync,
                                mustUrl, blockUrl, copy, highlight, sticky, posts, allowLabels, mustLabels, } = data;

                            const blockList = (_blockList || []).map(x => x.did);
                            const everyList = (_everyList || []).map(x => x.did);
                            const viewers = (_viewers || []).map(x => x.did);

                            let mentionList = (_mentionList || []).map(x => x.did);
                            let allowList = (_allowList || []).map(x => x.did);

                            if (!liveAllowList) {
                                allowList = [];
                                allowListSync = "";
                            }
                            if (!liveMentionList) {
                                mentionList = [];
                                mentionListSync = "";
                            }

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
                            let result = {...imageObj, languages, postLevels, pics, keywordSetting,
                                keywords, keywordsQuote,
                                everyListBlockKeyword, everyListBlockKeywordSetting,
                                copy, highlight, sticky, posts:posts? posts.map(x => x.uri) : [],
                                sort, displayName, shortName, description,
                                allowList, allowListSync,
                                blockList, blockListSync,
                                mentionList, mentionListSync,
                                everyList, everyListSync,
                                viewers, viewersSync,
                                mustUrl, blockUrl, mode:modeText, allowLabels, mustLabels, keywordsEdited, keywordsQuoteEdited, _id: feed?._id};

                            console.log(result);

                            return result;
                        }}
                        postUrl="/feed/submit" postCallback={async (result) => {
                        if (result.status === 200) {
                            setUserDid(result.data.did);
                            setModal("done");
                            if (!feed) {
                                const shortName = getValues("shortName");
                                console.log("no feed", shortName);
                                await router.push({pathname: router.pathname, query: { feed: shortName }}, undefined, { shallow: true });
                            }
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
                                                        setValue("viewersSync", "");
                                                        break;
                                                    }
                                                    case "shared":
                                                    case "private": {
                                                        setValue("viewers", [{
                                                            did: session.user.did,
                                                            handle: session.user.handle,
                                                            displayName: session.user.name
                                                        }]);
                                                        setValue("viewersSync", "");
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
                                        placeHolder="handle.domain or did:plc:xxxxxxxxxxxxxxxxxxxxxxxx or list bsky.app/profile/.../lists/..."
                                        fieldName="viewers"
                                        inputHidden={watchViewersSync}
                                        disabled={watchViewersSync}
                                        handleItem={(item, value, onChange) => {
                                            if (Array.isArray(item)) {
                                                for (const itm of item) {
                                                    let add = true;
                                                    for (const l of ["viewers"]) {
                                                        const ll = getValues(l) || [];
                                                        if (ll.find(x => x.did === itm.did)) {
                                                            add = false;
                                                            break;
                                                        }
                                                    }
                                                    if (add) {
                                                        value.push(itm);
                                                    }
                                                }
                                            } else {
                                                value.push(item);
                                            }
                                            value.sort((a, b) => {
                                                return a.handle.localeCompare(b.handle);
                                            });

                                            onChange(value);
                                        }}
                                        valueModifier={item => {
                                            return `${item.displayName} @${item.handle}`
                                        }}
                                        useFormReturn={useFormReturn}

                                        check={multiWordCallback("viewers", ["viewers"], true)}>
                                        <button
                                            type="button"
                                            className="bg-gray-100 border border-black p-1 rounded-xl flex place-items-center gap-2 text-sm"
                                            onClick={() => setPopupState("sync_viewers")}>
                                            <div className="font-semibold">Sync with List { !watchViewersSync && "Instead" }</div>
                                            {
                                                watchViewersSync && <div>
                                                    {`https://bsky.app/profile/${watchViewersSync}`}
                                                </div>
                                            }
                                        </button>
                                    </InputMultiWord>
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
                                                setValue("allowListSync", "");
                                                setValue("blockList", []);
                                                setValue("blockListSync", "");
                                                setValue("mentionList", []);
                                                setValue("mentionListSync", "");
                                                setValue("everyList", []);
                                                setValue("everyListSync", "");
                                                setValue("mustLabels", []);
                                                setValue("allowLabels", SUPPORTED_CW_LABELS);
                                                setSubMode("posts");
                                                setLiveAllowList(false);
                                                setLiveMentionList(false);
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
                                            {
                                                mode !== "responses" &&
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
                                                                           onChange={() => {
                                                                           }}
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
                                                        postLevels.length === 0 &&
                                                        <div className="text-red-700">Please select at least one post type
                                                            above</div>
                                                    }
                                                </div>
                                            }


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
                                                                         newValue = [...pics.filter(y => y !== x.id)];
                                                                     } else {
                                                                         newValue = [...pics, x.id];
                                                                     }
                                                                     setPics(newValue);
                                                                     if (newValue.indexOf("text") < 0) {
                                                                         setValue("mustLabels", []);
                                                                     }
                                                                 }}>
                                                                <input type="checkbox"
                                                                       onChange={() => {
                                                                       }}
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

                                </>
                            }

                        </div>

                        {
                            mode !== "posts" &&
                            <div className="bg-white p-2 space-y-2">
                                <div className="text-lg font-bold">User Filters</div>
                                {
                                    (mode === "live" || mode === "responses") && <>
                                    <div className="space-y-1">
                                        {
                                            [
                                                {
                                                    id: "everyList",
                                                    c: "bg-lime-100",
                                                    sync: "sync_everyList",
                                                    watch: watchEveryListSync,
                                                    t: mode === "live"?
                                                        `Every List: Show all posts from these users without further filtering (${getValues("everyList")?.length || 0})` :
                                                        `Get responses to posts from these users (${getValues("everyList")?.length || 0})`
                                                },
                                                {
                                                    id: "blockList",
                                                    c: "bg-pink-100",
                                                    sync: "sync_blockList",
                                                    watch: watchBlockListSync,
                                                    t: `Block List: Block all posts from these Users (${getValues("blockList")?.length || 0})`
                                                }
                                            ].map(({id, t, c, sync, watch:watchSync}) => <div key={id}>
                                                <InputMultiWord
                                                    className={clsx("border border-2 border-black p-2 rounded-xl", c)}
                                                    labelText={t}
                                                    placeHolder="handle.domain or did:plc:xxxxxxxxxxxxxxxxxxxxxxxx or list bsky.app/profile/.../lists/..."
                                                    fieldName={id}
                                                    inputHidden={watchSync}
                                                    disabled={watchSync}
                                                    handleItem={(item, value, onChange) => {
                                                        if (Array.isArray(item)) {
                                                            for (const itm of item) {
                                                                let add = true;
                                                                for (const l of ["everyList", "blockList"]) {
                                                                    const ll = getValues(l) || [];
                                                                    if (ll.find(x => x.did === itm.did)) {
                                                                        add = false;
                                                                        break;
                                                                    }
                                                                }
                                                                if (add) {
                                                                    value.push(itm);
                                                                }
                                                            }
                                                        } else {
                                                            value.push(item);
                                                        }

                                                        value.sort((a, b) => {
                                                            return a.handle.localeCompare(b.handle);
                                                        });
                                                        onChange(value);
                                                    }}
                                                    valueModifier={item => {
                                                        return `${item.displayName} @${item.handle}`
                                                    }}
                                                    useFormReturn={useFormReturn}
                                                    check={multiWordCallback(id, ["everyList", "blockList"], true)}>
                                                    <button
                                                        type="button"
                                                        className="bg-gray-100 border border-black p-1 rounded-xl flex place-items-center gap-2 text-sm"
                                                        onClick={() => {
                                                            // @ts-ignore
                                                            setPopupState(sync)
                                                        }}>
                                                        <div className="font-semibold">Sync with List { !watchSync && "Instead" }</div>
                                                        {
                                                            watchSync && <div className="ml-2">
                                                                {`https://bsky.app/profile/${watchSync}`}
                                                            </div>
                                                        }
                                                    </button>
                                                </InputMultiWord>
                                                {
                                                    id === "everyList" && getValues("everyList")?.length > 0 && <div className="p-2 bg-gray-200 rounded-xl">
                                                        <div className="font-bold text-lg">Block keywords from posts in Every List</div>
                                                        <div className="bg-sky-200 p-2">
                                                            <div className="font-semibold">Search location</div>
                                                            <div className="grid grid-cols-2 gap-2">
                                                                {
                                                                    KEYWORD_SETTING.map(x =>
                                                                        <div key={x.id}
                                                                             className="flex place-items-center bg-orange-100 hover:bg-gray-50 gap-2 p-1"
                                                                             onClick={() => {
                                                                                 if (everyListBlockKeywordSetting.indexOf(x.id) >= 0) {
                                                                                     setEveryListBlockKeywordSetting([...everyListBlockKeywordSetting.filter(y => y !== x.id)]);
                                                                                 } else {
                                                                                     setEveryListBlockKeywordSetting([...everyListBlockKeywordSetting, x.id]);
                                                                                 }
                                                                                 console.log(everyListBlockKeywordSetting);
                                                                             }}>
                                                                            <input type="checkbox"
                                                                                   onChange={() => {
                                                                                   }}
                                                                                   onClick={(e) => {
                                                                                       e.stopPropagation();
                                                                                       if (everyListBlockKeywordSetting.indexOf(x.id) >= 0) {
                                                                                           setEveryListBlockKeywordSetting([...everyListBlockKeywordSetting.filter(y => y !== x.id)]);
                                                                                       } else {
                                                                                           everyListBlockKeywordSetting.push(x.id);
                                                                                           setEveryListBlockKeywordSetting([...everyListBlockKeywordSetting]);
                                                                                       }
                                                                                   }}
                                                                                   checked={everyListBlockKeywordSetting.indexOf(x.id) >= 0}
                                                                                   className={clsx("focus:ring-indigo-500 h-6 w-6 rounded-lg")}
                                                                            />
                                                                            <div>{x.txt}</div>
                                                                        </div>)
                                                                }
                                                            </div>
                                                            {
                                                                everyListBlockKeywordSetting.length === 0 &&
                                                                <div className="text-red-700">Please select at least one keyword search
                                                                    method</div>
                                                            }
                                                        </div>

                                                        <KeywordsEdit keywords={everyListBlockKeyword} setKeywords={setEveryListBlockKeyword} VIP={VIP} blockOnly={true}/>
                                                    </div>
                                                }
                                                </div>
                                            )
                                        }

                                    </div>

                                    </>
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
                                                    setLiveAllowList(true);
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
                            mode === "live" && <div className="bg-white p-2 space-y-2">
                                <div className="bg-lime-100 p-2">
                                    <div className="font-semibold">Language Filters</div>
                                    <div className="text-sm">Note: This relies on user configured language on post, some apps
                                        default to EN
                                    </div>

                                    <div className="text-sm">Deselect everything to accept posts of all languages
                                        including those not listed
                                    </div>
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
                                                       onChange={() => {
                                                       }}
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
                                                        SUPPORTED_LANG.every(x => languages.indexOf(x.id) >= 0) ?
                                                            <div className="flex place-items-center">
                                                                Deselect All (all posts no matter the language)
                                                                <RxCross2 className="w-6 h-6 text-red-600"/>
                                                            </div> : <div className="flex place-items-center">
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
                                                               onChange={() => {
                                                               }}
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


                                <div className="text-lg font-bold">Other User Filters</div>
                                <div className="flex place-items-center">
                                    <div className="flex place-items-center gap-1 hover:bg-gray-300 p-1"
                                         onClick={() => {
                                             if (liveAllowList || liveMentionList) {
                                                 setLiveAllowList(false);
                                                 setLiveMentionList(false);
                                             } else {
                                                 setLiveAllowList(true);
                                                 setLiveMentionList(true);
                                             }
                                         }}
                                    >
                                        <input type="checkbox"
                                               className={clsx("focus:ring-indigo-500 h-6 w-6 rounded-lg")}
                                               onChange={() => {
                                               }}
                                               onClick={(e) => {
                                                   e.stopPropagation();
                                                   if (liveAllowList || liveMentionList) {
                                                       setLiveAllowList(false);
                                                       setLiveMentionList(false);
                                                   } else {
                                                       setLiveAllowList(true);
                                                       setLiveMentionList(true);
                                                   }
                                               }}
                                               checked={!liveAllowList && !liveMentionList}
                                        />
                                        All Posts
                                    </div>
                                    <div className="flex place-items-center gap-1 hover:bg-gray-300 p-1"
                                         onClick={() => {
                                             setLiveMentionList(!liveMentionList);
                                         }}
                                    >
                                        <input type="checkbox"
                                               className={clsx("focus:ring-indigo-500 h-6 w-6 rounded-lg")}
                                               onChange={() => {
                                               }}
                                               onClick={(e) => {
                                                   e.stopPropagation();
                                                   setLiveMentionList(!liveMentionList);
                                               }}
                                               checked={liveMentionList}
                                        />
                                        Posts with @Mention
                                    </div>
                                    <div className="flex place-items-center gap-1 hover:bg-gray-300 p-1"
                                         onClick={() => {
                                             setLiveAllowList(!liveAllowList);
                                         }}
                                    >
                                        <input type="checkbox"
                                               className={clsx("focus:ring-indigo-500 h-6 w-6 rounded-lg")}
                                               onChange={() => {
                                               }}
                                               onClick={(e) => {
                                                   e.stopPropagation();
                                                   setLiveAllowList(!liveAllowList);
                                               }}
                                               checked={liveAllowList}
                                        />
                                        Posts from list of Allowed Users
                                    </div>
                                </div>

                                {
                                    liveMentionList &&
                                    <InputUserFilter
                                        labelText={`Mention List: Search only posts that @mention Users in this list (${getValues("mentionList")?.length || 0})`}
                                        className="bg-indigo-100"
                                        fieldName="mentionList"
                                        watchSync={watchMentionListSync}
                                        deduplicateArr={["mentionList"]}
                                        useFormReturn={useFormReturn}
                                        check={multiWordCallback}
                                        syncClick={() => setPopupState("sync_mentionList")}
                                    />
                                }

                                {
                                    liveAllowList &&
                                    <InputUserFilter
                                        labelText={`Only List: Search posts from these Users, leave empty to search all users for keywords (${getValues("allowList")?.length || 0})`}
                                        className="bg-yellow-100"
                                        fieldName="allowList"
                                        watchSync={watchAllowListSync}
                                        deduplicateArr={["allowList"]}
                                        useFormReturn={useFormReturn}
                                        check={multiWordCallback}
                                        syncClick={() => setPopupState("sync_allowList")}
                                    />
                                }
                            </div>
                        }

                        {
                            mode !== "responses" && mode !== "posts" && !(mode === "user" && subMode === "likes") &&
                            <div className="bg-white p-2 space-y-2">
                                <div className="text-lg font-bold">Keyword
                                    Filters {!liveAllowList && !liveMentionList && (getValues("everyList")?.length > 0 ? "of Other Posts not in EveryList" : "of All Posts not in EveryList")}{liveAllowList && liveMentionList ? "from both Mention List and Only List" : liveAllowList ? "from Only List" : liveMentionList && "from Mention List"}{VIP ? "" : ` (max ${mode === "live" ? MAX_KEYWORDS_PER_LIVE_FEED : MAX_KEYWORDS_PER_USER_FEED})`}</div>
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

                                <KeywordsEdit keywords={keywords} setKeywords={setKeywords} VIP={VIP}
                                              setDirty={setKeywordsEdited}/>


                                {
                                    mode === "live" &&
                                    <div>
                                        <div className="p-2 bg-blue-100 flex gap-2 place-items-center hover:bg-blue-200"
                                             onClick={() => {
                                                 const newV = !specialQuote;
                                                 setSpecialQuote(!specialQuote);
                                                 if (!newV) {
                                                     setKeywordsQuote([]);
                                                 }
                                             }}>
                                            <input type="checkbox"
                                                   onChange={() => {
                                                   }}
                                                   checked={specialQuote}
                                                   onClick={() => {
                                                       const newV = !specialQuote;
                                                       setSpecialQuote(!specialQuote);
                                                       if (!newV) {
                                                           setKeywordsQuote([]);
                                                       }
                                                   }}/>
                                            <div className="font-bold">Add Posts with Quoted Keywords to Feed [Beta]
                                            </div>
                                        </div>
                                        {
                                            specialQuote && <>
                                                <div className="bg-blue-100 p-2 font-bold text-xl">Quoted Keywords</div>
                                                <KeywordsEdit bg="bg-blue-100" keywords={keywordsQuote}
                                                              setKeywords={setKeywordsQuote} VIP={VIP}
                                                              setDirty={setKeywordsQuoteEdited}/>
                                            </>
                                        }
                                    </div>
                                }
                            </div>
                        }


                        {
                            mode === "posts" && <div className="bg-white p-2">
                                <div className="text-lg font-bold">Post List</div>
                                <PostsEdit useFormReturn={useFormReturn} setBusy={setBusy}/>
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
                                            let {
                                                sort, displayName, shortName, description,
                                                allowList, allowListSync,
                                                mentionList, mentionListSync,
                                                blockList, blockListSync,
                                                everyList, everyListSync,
                                                viewers, viewersSync,
                                                mustUrl, blockUrl, copy, highlight, sticky, posts,
                                            } = getValues();

                                            allowList = (allowList || []).map(x => x.did);
                                            mentionList = (mentionList || []).map(x => x.did);
                                            blockList = (blockList || []).map(x => x.did);
                                            everyList = (everyList || []).map(x => x.did);
                                            viewers = (viewers || []).map(x => x.did);

                                            if (!liveAllowList) {
                                                allowList = [];
                                                allowListSync = "";
                                            }
                                            if (!liveMentionList) {
                                                mentionList = [];
                                                mentionListSync = "";
                                            }

                                            const modeText = mode === "user"? `${mode}-${subMode}` : mode;

                                            const result = {
                                                languages, postLevels, pics, keywordSetting, everyListBlockKeywordSetting,
                                                keywords: keywords.map(x => compressKeyword(x)),
                                                keywordsQuote: keywordsQuote.map(x => compressKeyword(x)),
                                                everyListBlockKeyword: everyListBlockKeyword.map(x => compressKeyword(x)),
                                                copy, highlight, sticky, posts: posts? posts.map(x => x.uri) : [],
                                                sort, displayName, shortName, description,
                                                allowList, allowListSync: allowListSync || "",
                                                mentionList, mentionListSync: mentionListSync || "",
                                                blockList, blockListSync: blockListSync || "",
                                                everyList, everyListSync: everyListSync || "",
                                                viewers, viewersSync: viewersSync || "",
                                                mustUrl, blockUrl, mode: modeText,
                                            };
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

                                                    let parsed = JSON.parse(content);

                                                    let {
                                                        sort, shortName, displayName, description,
                                                        languages, postLevels, pics, mustUrl, blockUrl, keywordSetting, everyListBlockKeywordSetting,
                                                        keywords, keywordsQuote, everyListBlockKeyword,
                                                        copy, highlight, sticky,
                                                        mode:_mode, posts:_posts, mustLabels, allowLabels,
                                                    } = parsed

                                                    allowLabels = allowLabels || SUPPORTED_CW_LABELS;
                                                    mustLabels = mustLabels || [];

                                                    console.log("parsed", JSON.stringify(parsed, null, 2));
                                                    let {
                                                        data:{
                                                            blockList, blockListSync,
                                                            allowList, allowListSync,
                                                            mentionList, mentionListSync,
                                                            everyList, everyListSync,
                                                            viewers, viewersSync
                                                        }
                                                    } = await localPost("/check/lists_users", {data:parsed});





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

                                                    setLiveMentionList(mentionListSync || mentionList.length > 0);
                                                    setLiveAllowList(allowListSync || allowList.length > 0);

                                                    if (mode === "posts") {
                                                        let posts = [];
                                                        if (_posts.length > 0) {
                                                            const result = await localGet("/check/posts", {posts:_posts});
                                                            if (result.status === 200 && result.data.posts.length > 0) {
                                                                posts = result.data.posts;
                                                            }
                                                        }

                                                        let o:any = {
                                                            sort, displayName, description, copy: copy || [], highlight: highlight || "yes", posts, mustLabels, allowLabels, viewers, viewersSync,
                                                            shortName,  mustUrl: mustUrl || [], blockUrl: blockUrl || []
                                                        };
                                                        setMode(mode);

                                                        setLanguages([]);
                                                        setPostLevels(POST_LEVELS.map(x => x.id));
                                                        setKeywordSetting(["text"]);
                                                        setEveryListBlockKeywordSetting(["text"]);
                                                        setPics(["text", "pics"]);
                                                        setKeywords([]);
                                                        setKeywordsQuote([]);
                                                        setSpecialQuote(false);
                                                        setEveryListBlockKeyword([]);

                                                        reset(o);
                                                        setBusy(false);
                                                    } else {
                                                        console.log("others")

                                                        keywords = keywords?.map(x => {
                                                            const {t, a} = x;
                                                            let o:any;
                                                            try {
                                                                o = JSON.parse(unEscapeRelaxed(toJson(t)));
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
                                                                o = JSON.parse(unEscapeRelaxed(toJson(t)));
                                                            } catch (e) {
                                                                o = JSON.parse(compressedToJsonString(t));
                                                            }

                                                            o.a = a;
                                                            if ((o.t === "t" || o.t === "s") && !o.r) {
                                                                o.r = [];
                                                            }
                                                            return o;
                                                        }) || [];

                                                        everyListBlockKeyword = everyListBlockKeyword?.map(x => {
                                                            console.log(x);
                                                            const {t, a} = x;
                                                            let o:any;
                                                            try {
                                                                o = JSON.parse(unEscapeRelaxed(toJson(t)));
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
                                                            const result = await localGet("/check/posts", {posts:[sticky]});
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
                                                            allowList, allowListSync,
                                                            blockList, blockListSync,
                                                            mentionList, mentionListSync,
                                                            everyList, everyListSync,
                                                            shortName,  mustUrl: mustUrl || [], blockUrl: blockUrl || [], sticky, posts:[], viewers, viewersSync,
                                                        };
                                                        setMode(mode);

                                                        if (subMode) {
                                                            // @ts-ignore
                                                            setSubMode(subMode);
                                                        }
                                                        
                                                        setLiveAllowList(allowList.length > 0);
                                                        setLiveMentionList(mentionList.length > 0);

                                                        setLanguages(languages || []);
                                                        setPostLevels(postLevels || POST_LEVELS.map(x => x.id));
                                                        setKeywordSetting(keywordSetting || ["text"]);
                                                        setEveryListBlockKeywordSetting(everyListBlockKeywordSetting || ["text"]);
                                                        setPics(pics || ["text", "pics"]);
                                                        setKeywords(keywords);
                                                        setEveryListBlockKeyword(everyListBlockKeyword);
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

                                                    setKeywordsEdited(true);
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
                <PageFooter/>
            </div>
        }
    </>
}
