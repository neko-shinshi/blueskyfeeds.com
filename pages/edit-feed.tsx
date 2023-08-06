import {useEffect, useRef, useState} from "react";
import HeadExtended from "features/layout/HeadExtended";
import {signIn, useSession} from "next-auth/react";
import FormSignIn from "features/login/FormSignIn";
import {useForm} from "react-hook-form";
import RHForm from "features/input/RHForm";
import clsx from "clsx";
import InputRadio from "features/input/InputRadio";
import InputTextAreaBasic from "features/input/InputTextAreaBasic";
import InputFileDropzone from "features/input/InputFileDropzone";
import {useRouter} from "next/router";
import PageHeader from "features/components/PageHeader";
import {getFeedDetails, getMyCustomFeedIds} from "features/utils/feedUtils";
import {BsFillInfoCircleFill} from "react-icons/bs";
import {RxCheck, RxCross2} from "react-icons/rx";
import {useRecaptcha} from "features/auth/RecaptchaProvider";
import {localDelete, localGet} from "features/network/network";
import InputTextButton from "features/input/InputTextButton";
import Image from "next/image";
import InputMultiWord from "features/input/InputMultiWord";
import KeywordParser from "features/components/specific/KeywordParser";
import {serializeFile} from "features/utils/fileUtils";
import {
    FEED_MODES,
    FeedKeyword,
    KEYWORD_SETTING,
    KEYWORD_TYPES,
    KeywordType, KeywordTypeToShort, MAX_FEEDS_PER_USER, MAX_KEYWORDS_PER_LIVE_FEED, MAX_KEYWORDS_PER_USER_FEED,
    PICS_SETTING,
    POST_LEVELS,
    SORT_ORDERS,
    SUPPORTED_LANGUAGES, USER_FEED_MODE
} from "features/utils/constants";
import {SIGNATURE} from "features/utils/signature";
import SortableWordBubbles from "features/components/SortableWordBubbles";
import {getLoggedInData} from "features/network/session";
import { HiTrash} from "react-icons/hi";
import PopupConfirmation from "features/components/PopupConfirmation";
import {APP_SESSION} from "features/auth/authUtils";
import {isValidDomain, isValidToken} from "features/utils/validationUtils";
import {getActorsInfo, getPostInfo, isVIP} from "features/utils/bsky";
import PopupLoading from "features/components/PopupLoading";
import {compressedToJsonString} from "features/utils/textUtils";
import Link from "next/link";
import {IoArrowBackSharp} from "react-icons/io5";
import {compressKeyword,} from "features/utils/objectUtils";
import InputTextBasic from "features/input/InputTextBasic";
import PopupWithInputText from "features/components/PopupWithInputText";
import {all} from "axios";

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
                let {allowList, blockList, everyList, sticky} = feedData;
                allowList = allowList || [];
                blockList = blockList || [];
                everyList = everyList || [];
                const actors = [...allowList, ...blockList, ...everyList];
                if (actors.length > 0) {
                    const profiles = await getActorsInfo(agent, actors);
                    allowList = profiles.filter(x =>  allowList.find(y => y === x.did));
                    blockList = profiles.filter(x =>  blockList.find(y => y === x.did));
                    everyList = profiles.filter(x =>  everyList.find(y => y === x.did));
                }
                if (sticky) {
                    sticky = await getPostInfo(agent, sticky);
                } else {
                    sticky = "";
                }

                feed = {...feedData, allowList, blockList, everyList, sticky};
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
    const [newKeywordMode, setNewKeywordMode] = useState<KeywordType>("token");
    const [shortNameLocked, setShortNameLocked] = useState(false);
    const [postLevels, setPostLevels] = useState<string[]>([]);
    const [keywordSetting, setKeywordSetting] = useState<string[]>([]);
    const [keywords, setKeywords] = useState<FeedKeyword[]>([]);
    const [popupState, setPopupState] = useState<"delete"|"edit_sticky"|"edit_user"|false>(false);
    const [pics, setPics] = useState<string[]>([]);
    const [busy, setBusy] = useState(false);
    const [editTag, setEditTag] = useState<any>(null);
    const [done, setDone] = useState(false);
    const [mode, setMode] = useState("keyword");
    const [subMode, setSubMode] = useState("");
    const [stickyText, setStickyText] = useState("");

    const recaptcha = useRecaptcha();
    const imageRef = useRef(null);
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
    const watchFile = watch("file");
    const watchShortName = watch("shortName");
    const watchSticky = watch("sticky");
    const watchAllow = watch("allowList");

    useEffect(() => {
        if (session && status === "authenticated" && updateSession) {
            signIn(APP_SESSION, {redirect: false, id: session.user.sk}).then(r => {
                console.log(r);
            });
        }
    }, [status]);


    useEffect(() => {
        if (!feed) {
            reset({sticky:"", sort:"new", allowList:[], blockList:[], everyList:[], mustUrl:[], blockUrl:[], copy:[], highlight: "yes"});
            setMode("live");
            setLanguages([]);
            setPostLevels(POST_LEVELS.map(x => x.id));
            setKeywordSetting(["text"]);
            setPics(["text", "pics"])
        } else {
            let {avatar, sort, uri, displayName, description, blockList, allowList, everyList, languages, postLevels, pics, mustUrl, blockUrl, keywordSetting, keywords, copy, highlight, mode, sticky} = feed;
           console.log("sticky", sticky);
            const {uri:stickyUri, text} = sticky;
            if (stickyUri) {
                setStickyText(text);
            }

            let o:any = {
                sticky:stickyUri || "",
                sort,displayName, description: description.replaceAll(SIGNATURE, ""), copy: copy || [], highlight: highlight || "yes",
                shortName: uri.split("/").at(-1), blockList, allowList, everyList, mustUrl: mustUrl || [], blockUrl: blockUrl || [],
            };

            if (avatar) {
                const type = `image/${avatar.split("@")[1]}`;
                o.file = {changed: false, url: avatar, type}
            }

            keywords = keywords?.map(x => {
                const {t, a} = x;
                let o = JSON.parse(compressedToJsonString(t));
                o.a = a;
                if ((o.t === "t" || o.t === "s") && !o.r) {
                    o.r = [];
                }
                return o;
            }) || [];

            reset(o);

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
        }
    }, [feed]);




    const multiWordCallback = (fieldName:string) => {
        return async(val, callback) => {
            const user = val.startsWith("@")? val.slice(1) : val;
            const everyList = getValues("everyList") || [];
            const allowList = getValues("allowList") || [];
            const blockList = getValues("blockList") || [];
            if (everyList.find(x => x.did === user || x.handle === user)) {
                setError(fieldName, {type:'custom', message:`${user} is already in Every List`});
            } else if (blockList.find(x => x.did === user || x.handle === user)) {
                setError(fieldName, {type:'custom', message:`${user} is already in Block List`});
            } else if (allowList.find(x => x.did === user || x.handle === user)) {
                setError(fieldName, {type:'custom', message:`${user} is already in Allow List`});
            } else {
                if (typeof recaptcha !== 'undefined') {
                    recaptcha.ready(async () => {
                        //@ts-ignore
                        const captcha = await recaptcha.execute(process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY, {action: 'submit'});
                        //@ts-ignore
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
                    });
                }
            }
        }
    }

    const validateKeyword = (term, rejectWords, transform) => {
        if (term.length === 0) {
            return "Term is empty";
        }
        if (!VIP && keywords.length >= MAX_KEYWORDS_PER_LIVE_FEED) {
            return `Too many keywords, max ${MAX_KEYWORDS_PER_LIVE_FEED}`;
        }

        const modeShort = KeywordTypeToShort(newKeywordMode)
        if (keywords.find(y => y.w === term && y.t === modeShort)) {
            return "Term is already in keywords";
        }
        let set = new Set();
        set.add(term);
        console.log(set);
        for (const [i,r] of rejectWords.entries()) {
            const combined = transform(r, term);
            if (set.has(combined)) {
                return `Duplicate or empty Ignore Combination at #${i+1}: ${combined}`;
            }
            set.add(combined);
        }
        return null;
    }


    return <>
        {
            /*
            const user = val.startsWith("@")? val.slice(1) : val;
            const everyList = getValues("everyList") || [];
            const allowList = getValues("allowList") || [];
            const blockList = getValues("blockList") || [];
            if (everyList.find(x => x.did === user || x.handle === user)) {
                setError(fieldName, {type:'custom', message:`${user} is already in Every List`});
            } else if (blockList.find(x => x.did === user || x.handle === user)) {
                setError(fieldName, {type:'custom', message:`${user} is already in Block List`});
            } else if (allowList.find(x => x.did === user || x.handle === user)) {
                setError(fieldName, {type:'custom', message:`${user} is already in Allow List`});
            } else {
                if (typeof recaptcha !== 'undefined') {
                    recaptcha.ready(async () => {
                        //@ts-ignore
                        const captcha = await recaptcha.execute(process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY, {action: 'submit'});
                        //@ts-ignore
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
                    });
                }
            }
             */
        }
        <PopupWithInputText
            isOpen={popupState === "edit_user"}
            setOpen={setPopupState}
            title="Set User"
            message=""
            placeholder="handle.domain or did:plc:xxxxxxxxxxxxxxxxxxxxxxxx"
            validateCallback={(v) => {
                return (v.startsWith("did:plc:") || v.startsWith("@") || isValidDomain(v)) ? "" : "Invalid User";
            }}
            yesCallback={(v:string, callback) => {
                if (typeof recaptcha !== 'undefined') {
                    recaptcha.ready(async () => {
                        //@ts-ignore
                        const captcha = await recaptcha.execute(process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY, {action: 'submit'});
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
                    });
                }
            }}/>
        <PopupWithInputText
            isOpen={popupState === "edit_sticky"}
            setOpen={setPopupState}
            title="Set Sticky"
            message="Copy whole or part of url from browser or share button. Submit empty text to remove sticky"
            placeholder="[user]/post/[post-id]"
            validateCallback={(v) => {
                return (v.startsWith("at://did:plc:") || v.startsWith("https://bsky.app/profile/")) ? "" : "Invalid Sticky";
            }}
            yesCallback={(v:string, callback) => {
                if (v.trim() === "") {
                    setValue("sticky", "");
                    setStickyText("");
                    callback();
                } else {
                    if (typeof recaptcha !== 'undefined') {
                        setBusy(true);
                        recaptcha.ready(async () => {
                            //@ts-ignore
                            const captcha = await recaptcha.execute(process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY, {action: 'submit'});
                            //@ts-ignore
                            const result = await localGet("/check/post", {captcha, post:v});
                            setBusy(false);
                            if (result.status === 200) {
                                const {uri, text} = result.data;
                                setStickyText(text);
                                setValue("sticky", uri);
                                callback();
                            } else if (result.status === 400) {
                                callback("Invalid post or post not found");
                            } else if (result.status === 401) {
                                callback("Bluesky account error, please logout and login again");
                            } else {
                                callback("Unknown error");
                            }
                        });
                    }
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
                    recaptcha.ready(async () => {
                        setBusy(true);
                        //@ts-ignore
                        const captcha = await recaptcha.execute(process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY, {action: 'submit'});
                        const result = await localDelete("/feed/delete", {captcha, rkey: feed.uri.split("/").slice(-1)[0]});
                        if (result.status === 200) {
                            await router.push("/my-feeds");
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
            !session && <FormSignIn/>
        }

        {
            session && <div className="bg-sky-200 w-full max-w-5xl rounded-xl overflow-hidden p-4 space-y-4">
                <PageHeader title={title} description={description} />
                {
                    done &&
                    <div className="bg-white p-4">
                        <div className="font-bold">Your Feed has been saved.</div>
                        <ul className="list-disc pl-4 py-4">
                            <li>It will take a while for posts to populate a new feed as we do not store any post text in our servers.<br/>We only process new posts as they arrive via the API. </li>
                            <li>
                                <div className="">It costs money to operate BlueskyFeeds.com, if you would like to contribute, please visit my
                                    <a className="ml-1 inline-flex underline text-blue-500 hover:text-blue-800" href="https://ko-fi.com/anianimalsmoe">
                                        Ko-Fi
                                        <div className="h-6 w-6">
                                            <Image width={25} height={25} alt="ko-fi icon" src="/ko-fi.png"/>
                                        </div>
                                    </a>
                                </div>
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
                    !done &&
                    <RHForm
                        formRef={formRef}
                        recaptcha={recaptcha}
                        useFormReturn={useFormReturn}
                        cleanUpData={async (data) => {
                            setBusy(true);
                            const {file, sort, displayName, shortName, description, allowList:_allowList, blockList:_blockList, everyList:_everyList, mustUrl, blockUrl, copy, highlight, sticky} = data;
                            const allowList = (_allowList || []).map(x => x.did);
                            const blockList = (_blockList || []).map(x => x.did);
                            const everyList = (_everyList || []).map(x => x.did);
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
                            const result = {...imageObj, languages, postLevels, pics, keywordSetting, keywords, copy, highlight, sticky,
                                sort, displayName, shortName, description, allowList, blockList, everyList, mustUrl, blockUrl, mode:modeText};
                            console.log(result);

                            return result;
                        }}
                        postUrl="/feed/submit" postCallback={async (result) => {
                        if (result.status === 200) {
                            setDone(true);
                        }
                        setBusy(false);
                    }}
                        className="space-y-4">
                        <div className="bg-white p-2">
                            <div className="flex justify-between">
                                <div className="flex place-items-center gap-2">
                                    <div className="font-bold text-lg">Bluesky Feed Settings</div>
                                    <div>(This info is submitted to Bluesky)</div>
                                </div>
                                {
                                    shortNameLocked &&
                                    <button type="button"
                                            onClick={() => {if (shortNameLocked) {setPopupState("delete")}}}
                                            className="p-1 inline-flex items-center rounded-md shadow-sm text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500">
                                        <HiTrash className="w-6 h-6"/>
                                        <div className="text-lg font-medium">Delete this feed</div>
                                    </button>
                                }

                            </div>
                            <div className="flex w-full place-items-center gap-4">
                                <div>
                                    <div className="text-center">Feed Avatar</div>
                                    <div className="w-40 h-40 aspect-square relative rounded-xl overflow-hidden">
                                        <InputFileDropzone
                                            fieldName="file"
                                            className="inset-0 absolute rounded-xl z-10"
                                            useFormReturn={useFormReturn}
                                            acceptedTypes={{'image/jpeg': [".jpg", ".jpeg"], 'image/png':[".png"]}}
                                            acceptedTypesLabel="jpg or png"/>
                                        {
                                            watchFile && <Image ref={imageRef} className="object-cover hover:blur-sm" unoptimized fill src={watchFile.url} alt="feed-avatar" />
                                        }
                                    </div>
                                </div>

                                <div className="grow">
                                    <InputTextButton
                                        maxLength={24}
                                        fieldName="displayName"
                                        fieldReadableName="Feed Full Name (Max 24 characters)"
                                        options={{required: "This is required"}}
                                        useFormReturn={useFormReturn}
                                        placeholder="My Amazing Feed"
                                        optional={false}
                                        buttonDisabled={shortNameLocked}
                                        buttonText="Make Short Name"
                                        buttonCallback={() => {
                                            if (!shortNameLocked) {
                                                const name = getValues("displayName");
                                                setValue("shortName", name.toLowerCase().replaceAll(" ", "-").replaceAll(/[^a-z0-9-_]/g, "").slice(0,15));
                                            }
                                        }} />
                                    <InputTextButton
                                        maxLength={15} fieldName="shortName" disabled={shortNameLocked}
                                        fieldReadableName="Unique Short Name among all your feeds (CANNOT be changed once submitted)"
                                        subtext="(alphanumeric and dashes only, max 15 characters) [0-9a-zA-z-]"
                                        options={
                                        {
                                            required: "This is required",
                                            pattern: {
                                                value: /^[a-zA-Z0-9_-]+$/,
                                                message: 'Only alphanumeric and dashes allowed',
                                            }
                                        }} useFormReturn={useFormReturn} placeholder="my-amazing-feed"
                                        buttonText={`${15-(watchShortName?.length || 0)} left`}
                                        buttonCallback={() => {}}
                                        buttonDisabled={true}
                                    />
                                    <InputTextAreaBasic fieldName="description" fieldReadableName="Description (Max 200 characters)" maxLength={200} options={{}} useFormReturn={useFormReturn} placeholder="This is an amazing feed, please use it" />
                                </div>
                            </div>
                        </div>

                        <div className="bg-white p-2">
                            <div className="font-bold text-lg">Feed Settings</div>
                            <div className="bg-lime-100 p-2">
                                <div className="font-bold">Mode</div>
                                <div className="grid grid-cols-2 w-full items-center gap-2">
                                    {
                                        FEED_MODES.map(({id, txt}) => {
                                            const updateMode = (id) => {
                                                setMode(id);
                                                if (mode === "user") {
                                                    setValue("sort", "new");
                                                    setKeywords([]);
                                                    setValue("allowList", []);
                                                    setValue("blockList", []);
                                                    setValue("everyList", []);
                                                    setSubMode("posts")
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
                            <div className="bg-lime-100 p-2 space-y-2">
                                <InputRadio entriesPerRow={2} modifyText={_ => {
                                    return "text-base font-semibold";
                                }} fieldName="highlight" fieldReadableName="Show in Highlights on BlueskyFeeds.com?" subtext="Your feed will still publicly available in other feed directories" useFormReturn={useFormReturn} items={[{id:"yes", txt:"Yes"}, {id:"no", txt:"No"}]}/>
                            </div>

                            <div className="bg-sky-100 p-2 space-y-2">
                                <InputRadio entriesPerRow={2} modifyText={_ => {
                                    return "text-base font-semibold";
                                }} fieldName="sort" fieldReadableName="Sort Order" subtext="Determines which post is on top" useFormReturn={useFormReturn} items={SORT_ORDERS.filter(x => x.mode.indexOf(mode) >= 0)}/>
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
                            <div className="bg-lime-100 p-2 space-y-2">
                                <div className="font-semibold">Post Type Filter</div>
                                <div className="grid grid-cols-2 gap-2">
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
                                <div className="grid grid-cols-2 gap-2">
                                    {
                                        PICS_SETTING.map(x =>
                                            <div key={x.id}
                                                 className="flex place-items-center bg-orange-100 hover:bg-gray-50 gap-2 p-1"
                                                 onClick={() => {
                                                     if (pics.indexOf(x.id) >= 0) {
                                                         setPics([...pics.filter(y => y !== x.id)]);
                                                     } else {
                                                         setPics([...pics, x.id]);
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
                            </div>

                            <div className="bg-lime-100 p-2">
                                <div className="font-semibold">Language Filters</div>
                                <div className="text-sm">Note: This is calculated using cld2, which is not perfect and may be unable to process short posts</div>
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
                        </div>



                        <div className="bg-white p-2 space-y-2">
                            <div className="text-lg font-bold">User Filters</div>
                            {
                                mode === "live" &&
                                [
                                    {id:"everyList", c:"bg-lime-100", t:"Every List: Show all posts from these users"},
                                    {id:"allowList", c:"bg-yellow-100", t:"Allow List: Only search posts from these Users, if empty, will search all users for keywords"},
                                    {id:"blockList", c:"bg-pink-100", t:"Block List: Block all posts from these Users"}].map(({id, t,c})=>
                                    <InputMultiWord
                                        key={id}
                                        className={clsx("border border-2 border-black p-2 rounded-xl", c)}
                                        labelText={t}
                                        placeHolder="handle.domain or did:plc:xxxxxxxxxxxxxxxxxxxxxxxx"
                                        fieldName={id}
                                        handleItem={(item, value, onChange) => {
                                            value.push(item);
                                            value.sort((a,b) => {
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
                                                setBusy(true);
                                                const {handle} = session.user;
                                                if (typeof recaptcha !== 'undefined') {
                                                    recaptcha.ready(async () => {
                                                        //@ts-ignore
                                                        const captcha = await recaptcha.execute(process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY, {action: 'submit'});
                                                        //@ts-ignore
                                                        const result = await localGet("/check/user", {captcha, actors:[handle]});
                                                        if (result.status === 200 && Array.isArray(result.data) && result.data.length === 1) {
                                                            console.log(result.data[0]);
                                                            setValue("allowList", result.data);
                                                        } else if (result.status === 400) {
                                                            alert("Error setting to self");
                                                        }
                                                        setBusy(false);
                                                    });
                                                }
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
                                                <div className="bg-gray-50 p-2">{`${watchAllow[0].displayName} @${watchAllow[0].handle}`}</div>
                                            </div>
                                        </a>

                                    }
                                </div>
                            }
                        </div>

                        <div className="bg-white p-2 space-y-2">
                            <div className="text-lg font-bold">Keyword Filters {VIP? "" : `(max ${mode === "live"? MAX_KEYWORDS_PER_LIVE_FEED : MAX_KEYWORDS_PER_USER_FEED})`}</div>
                            <div>A post is blocked if it contains at least one blocked keyword, and is allowed only if it has no blocked keywords and at least one search keyword</div>
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
                                                       onChange={() => {}}
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
                                    keywordSetting.length === 0 && <div className="text-red-700">Please select at least one keyword search method</div>
                                }
                            </div>
                            {
                                process.env.NEXT_PUBLIC_DEV === "1" &&
                                <div>
                                    <div>Copy keywords from: </div>
                                    <InputMultiWord
                                        key="feed id"
                                        className={clsx("border border-2 border-yellow-700 p-2 rounded-xl")}
                                        labelText="Feed Id (Copy this from the browser URL)"
                                        placeHolder="bsky.app/profile/did:plc:<user>/feed/<id>"
                                        orderedList={false}
                                        fieldName="copy"
                                        handleItem={(item, value, onChange) => {
                                            value.push(item);
                                            value.sort(); // sorting algo
                                            onChange(value);
                                        }}
                                        useFormReturn={useFormReturn}
                                        check={(val, callback) => {
                                            const v = val.startsWith("https://")? val.slice(8) : val;
                                            if (!v.startsWith("bsky.app/profile/did:plc:") || !v.includes("/feed/")) {
                                                setError("copy", {type:'custom', message:`${val} is not following the feed url format`});
                                            } else if (getValues("copy").indexOf(v) >= 0){
                                                setError("copy", {type:'custom', message:`${val} is already in the list`});
                                            } else {
                                                // Check feed


                                                callback(v);
                                            }
                                        }}/>
                                </div>
                            }


                            <div>
                                <div className="font-semibold text-lg bg-lime-100 p-2">There are three ways keywords are filtered, tap the <span className="text-pink-600">different</span> <span className="text-yellow-600">colored</span> <span className="text-sky-600">tabs</span> below to see their differences</div>
                                <div className={clsx("grid grid-cols-3")}>
                                    {
                                        KEYWORD_TYPES.map((x, i) =>
                                            <div key={x} className={clsx(
                                                ["bg-pink-100 hover:bg-pink-200", "bg-yellow-100 hover:bg-yellow-200", "bg-sky-100 hover:bg-sky-200"][i],
                                                "flex items-center p-2 border border-x-2 border-t-2 border-b-0 border-black")}
                                                 onClick={() => {
                                                     setNewKeywordMode(x);
                                                 }}>
                                                <input
                                                    id='keyword-filter-type'
                                                    type="radio"
                                                    value={x}
                                                    checked={newKeywordMode === x}
                                                    onChange={() => {}}
                                                    onClick={() => {setNewKeywordMode(x)}}
                                                    className="mr-2 focus:ring-indigo-500 h-4 w-4 text-indigo-600 border-gray-300"
                                                />
                                                {x.slice(0,1).toUpperCase()+x.slice(1)}
                                            </div>)
                                    }
                                </div>


                                <div className={clsx("p-2 border border-l-2 border-r-2 border-y-0 border-black",
                                    newKeywordMode === "token" && "bg-pink-100",
                                    newKeywordMode === "segment" && "bg-yellow-100",
                                    newKeywordMode === "hashtag" && "bg-sky-100"
                                )}>
                                    <div className="font-semibold">{`${newKeywordMode.slice(0,1).toUpperCase()}${newKeywordMode.slice(1)} Search`}</div>
                                    {
                                        newKeywordMode === "token" &&
                                        <KeywordParser
                                            editTag={editTag}
                                            keyword="Token"
                                            handleTokenization={(r, term) =>  [r.p, term, r.s].filter(x => x).join(" ")}
                                            validateKeyword={(word, reject) => {
                                                const trimmed = word.trim();
                                                if (!isValidToken(trimmed)) {
                                                    return `Invalid keyword: Alphanumeric with accents and spaces only a-zA-ZÀ-ÖØ-öø-ÿ0-9`;
                                                }
                                                return validateKeyword(trimmed, reject, (r, term) =>  [r.p, term, r.s].filter(x => x).join(" "));
                                            }}
                                            submitKeyword={(w, r, a) => {
                                                setKeywords([...keywords, {t:"t", w:w.toLowerCase().trim(), a, r}]);
                                                setEditTag(null);
                                            }}>
                                            <ul className="list-disc pl-4">
                                                <li ><span className="font-bold">Does not work for non-latin languages</span> like Korean, Mandarin or Japanese, use <span className="font-bold underline">Segment</span> Mode</li>
                                                <li>In token mode, posts and search terms are set to lowercase, then split into individual words (tokens) by splitting them by non latin characters (i.e. spaces, symbols, 言,  ل) e.g. `this is un-funny.jpg` becomes `this` `is` `un `funny` `jpg`</li>
                                                <li>The search term is searched both separately e.g. `quickdraw` and `quick draw` will also find `#quickdraw`</li>
                                                <li>Works for terms with accents like `bon appétit`</li>
                                                <li>Might not work well if the term is combined with other terms, e.g. searching for `cat` will not find `caturday`, search for `caturday` separately or use Segment mode</li>
                                                <li>A desired token might often appear with undesired terms, like `one piece swimsuit` when looking for the anime `one piece`</li>
                                                <li>To prevent this, use an ignore combination to add `swimsuit` to reject `one piece swimsuit` if it appears but accept `one piece`</li>
                                            </ul>
                                        </KeywordParser>
                                    }
                                    {
                                        newKeywordMode === "segment" && <KeywordParser
                                            editTag={editTag}
                                            keyword="Segment"
                                            handleTokenization={(r, term) =>  [r.p, term, r.s].filter(x => x).join("")}
                                            validateKeyword={(word, reject) => {
                                                const trimmed = word.trim();
                                                return validateKeyword(trimmed, reject, (r, term) =>  [r.p, term, r.s].filter(x => x).join(""));
                                            }}
                                            submitKeyword={(w, r, a) => {
                                                setKeywords([...keywords, {t:"s", w:w.toLowerCase().trim(), a, r}]);
                                                setEditTag(null);
                                            }}>
                                            <ul className="list-disc pl-4">
                                                <li>Posts are searched character-by-character, but may accidentally find longer words that include the search terms</li>
                                                <li>For example: `cat` is inside both `concatenation` and `cataclysm`</li>
                                                <li>To prevent this, add the prefix and suffix of common terms to reject</li>
                                                <li>This is the preferred way to search for non-latin words like アニメ</li>
                                            </ul>
                                        </KeywordParser>
                                    }

                                    {
                                        newKeywordMode === "hashtag" && <KeywordParser
                                            editTag={editTag}
                                            keyword="Hashtag"
                                            prefix="#"
                                            handleTokenization={null}
                                            validateKeyword={term => {
                                                if (!VIP && keywords.length >= MAX_KEYWORDS_PER_LIVE_FEED) {
                                                    return `Too many keywords, max ${MAX_KEYWORDS_PER_LIVE_FEED}`;
                                                }
                                                if (term.startsWith("#")) {
                                                    return "Hashtag does not need to start with #, already handled by server";
                                                }
                                                if (keywords.find(x => x.t === "#" && x.w === term)) {
                                                    return "Hashtag already in list";
                                                }
                                                return null;
                                            }} submitKeyword={(w, rejectWords, a) => {
                                            setKeywords([...keywords, {t:"#", w:w.toLowerCase(), a}]);
                                            setEditTag(null);
                                        }}
                                        >
                                            <ul className="list-disc pl-4">
                                                <li>Posts are searched for hashtags</li>
                                            </ul>
                                        </KeywordParser>
                                    }
                                    <div className="mt-4 font-semibold">Keywords ({keywords.length}{!VIP && `/${MAX_KEYWORDS_PER_LIVE_FEED}`})</div>
                                    <SortableWordBubbles
                                        className="mt-2"
                                        value={keywords}
                                        selectable={true}
                                        valueModifier={(val) => {
                                            switch (val.t) {
                                                case "#":
                                                    return `#${val.w}`;
                                                case "s":
                                                    return `[${val.w}] [${val.r.map(x =>  [x.p, val.w, x.s].filter(x => x).join("")).join(",")}]`;
                                                case "t":
                                                    return `${val.w} [${val.r.map(x => [x.p, val.w, x.s].filter(x => x).join(" ")).join(",")}]`;
                                            }
                                            return `#${JSON.stringify(val)}`;
                                        }}
                                        classModifier={(val, index, original) => {
                                            if (editTag && editTag.w === val.w) {
                                                return original.replace("bg-white", "bg-gray-200 hover:bg-gray-300");
                                            } else if (val.a) {
                                                return original.replace("bg-white", "bg-lime-100 hover:bg-lime-300");
                                            } else {
                                                return original.replace("bg-white", "bg-red-300 hover:bg-red-500");
                                            }
                                        }}
                                        buttonCallback={(val, action) => {
                                            if (action === "x") {
                                                setKeywords([...keywords.filter(x => !(x.t === val.t && x.w === val.w))]);
                                            } else if (action === "o") {
                                                if (editTag && editTag.w === val.w) {
                                                    setEditTag(null)
                                                } else {
                                                    switch (val.t) {
                                                        case "t": {setNewKeywordMode('token'); break;}
                                                        case "s": {setNewKeywordMode('segment'); break;}
                                                        case "#": {setNewKeywordMode('hashtag'); break;}
                                                    }
                                                    setEditTag(val);
                                                }

                                                // change type to match tag, fill up form, remove from list
                                            }
                                        }} />
                                </div>
                            </div>

                        </div>

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
                                            const {sort, displayName, shortName, description, allowList:_allowList, blockList:_blockList, everyList:_everyList, mustUrl, blockUrl, copy, highlight, sticky} = getValues();
                                            const allowList = (_allowList || []).map(x => x.did);
                                            const blockList = (_blockList || []).map(x => x.did);
                                            const everyList = (_everyList || []).map(x => x.did);

                                            const modeText = mode === "user"? `${mode}-${subMode}` : mode;

                                            const result = {languages, postLevels, pics, keywordSetting, keywords: keywords.map(x => compressKeyword(x)), copy, highlight, sticky,
                                                sort, displayName, shortName, description, allowList, blockList, everyList, mustUrl, blockUrl, mode: modeText};
                                            const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(result, null, 2));
                                            const dlAnchorElem = document.createElement('a');
                                            dlAnchorElem.setAttribute("href",     dataStr     );
                                            dlAnchorElem.setAttribute("download", `${shortName}.json`);
                                            dlAnchorElem.click();
                                        }}
                                        className="mt-4 w-full inline-flex justify-center items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500">
                                    Download JSON file backup
                                </button>

                                <button type="button"
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
                                                reader.onload = (readerEvent) => {
                                                    setBusy(true);
                                                    try {
                                                        let content = readerEvent.target.result as string; // this is the content!
                                                        console.log( content );

                                                        let {sort, shortName, displayName, description, blockList, allowList, everyList, languages, postLevels, pics, mustUrl, blockUrl, keywordSetting, keywords, copy, highlight, sticky, mode:_mode} = JSON.parse(content);
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

                                                        const actors = [...blockList, ...allowList, ...everyList];

                                                        if (typeof recaptcha !== 'undefined') {
                                                            recaptcha.ready(async () => {
                                                                let result, skip = true;
                                                                if (actors.length > 0) {
                                                                    skip = false;
                                                                    //@ts-ignore
                                                                    const captcha = await recaptcha.execute(process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY, {action: 'submit'});
                                                                    //@ts-ignore
                                                                    result = await localGet("/check/user", {captcha, actors});
                                                                }
                                                                if (!skip && result && (result.status !== 200 || !Array.isArray(result.data))) {
                                                                    // fail
                                                                    console.log(result);
                                                                    alert("error recovering data");
                                                                } else {
                                                                    if (result && (result.status !== 200 || !Array.isArray(result.data))) {
                                                                        allowList = result.data.filter(x => allowList.find(y => y === x.did));
                                                                        blockList = result.data.filter(x => blockList.find(y => y === x.did));
                                                                        everyList = result.data.filter(x => everyList.find(y => y === x.did));
                                                                    }

                                                                    keywords = keywords?.map(x => {
                                                                        const {t, a} = x;
                                                                        let o = JSON.parse(compressedToJsonString(t));
                                                                        o.a = a;
                                                                        if ((o.t === "t" || o.t === "s") && !o.r) {
                                                                            o.r = [];
                                                                        }
                                                                        return o;
                                                                    }) || [];

                                                                    recaptcha.ready(async () => {
                                                                        if (sticky) {
                                                                            //@ts-ignore
                                                                            const captcha = await recaptcha.execute(process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY, {action: 'submit'});
                                                                            //@ts-ignore
                                                                            const result = await localGet("/check/post", {captcha, post:sticky});
                                                                            if (result.status === 200) {
                                                                                const {uri:stickyUri, text} = result.data;
                                                                                if (stickyUri) {
                                                                                    sticky = stickyUri;
                                                                                    setStickyText(text);
                                                                                }
                                                                            }
                                                                        }

                                                                        let o:any = {
                                                                            sort,displayName, description, copy: copy || [], highlight: highlight || "yes",
                                                                            shortName,  mustUrl: mustUrl || [], blockUrl: blockUrl || [], sticky
                                                                        };
                                                                        setMode(mode);
                                                                        if (subMode) {
                                                                            setSubMode(subMode);
                                                                        }

                                                                        setShortNameLocked(true);
                                                                        setLanguages(languages || []);
                                                                        setPostLevels(postLevels || POST_LEVELS.map(x => x.id));
                                                                        setKeywordSetting(keywordSetting || ["text"]);
                                                                        setPics(pics || ["text", "pics"]);
                                                                        setKeywords(keywords);

                                                                        reset(o);
                                                                        setBusy(false);
                                                                    });
                                                                }

                                                                setTimeout(() => {
                                                                    input.remove();
                                                                }, 100);
                                                            });
                                                        }
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
