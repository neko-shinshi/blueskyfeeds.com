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
    FeedKeyword,
    KEYWORD_SETTING,
    KEYWORD_TYPES,
    KeywordType, KeywordTypeToShort, MAX_FEEDS_PER_USER, MAX_KEYWORDS_PER_FEED,
    PICS_SETTING,
    POST_LEVELS,
    SIGNATURE,
    SORT_ORDERS
} from "features/utils/constants";
import {SUPPORTED_LANGUAGES} from "features/utils/constants";
import SortableWordBubbles from "features/components/SortableWordBubbles";
import {getLoggedInData} from "features/network/session";
import {HiTrash} from "react-icons/hi";
import PopupConfirmation from "features/components/PopupConfirmation";
import {APP_SESSION} from "features/auth/authUtils";
import {isValidDomain} from "features/utils/validationUtils";
import {parseJwt} from "features/utils/jwtUtils";
import {isVIP} from "features/utils/bsky";
import PopupLoading from "features/components/PopupLoading";
import {compressedToJsonString} from "features/utils/textUtils";

export async function getServerSideProps({req, res, query}) {
    const {updateSession, session, agent, redirect, db, token} = await getLoggedInData(req, res);
    if (redirect) {return {redirect};}

    let feed = null;
    const VIP = agent && isVIP(agent);
    if (agent) {
        const {feed: _feed} = query;
        if (_feed) {
            const feedData: any = await getFeedDetails(agent, db, _feed);
            if (feedData) {
                let {allowList, blockList} = feedData;
                const actors = [...allowList, ...blockList];
                if (actors.length > 0) {
                    const {data: {profiles}} = await agent.api.app.bsky.actor.getProfiles({actors});
                    const findAndMatch = (acc, did) => {
                        const profile = profiles.find(x => x.did === did);
                        if (profile) {
                            const {did, handle, displayName} = profile;
                            acc.push({did, handle, displayName});
                        }
                        return acc;
                    };
                    allowList = allowList.reduce(findAndMatch, []);
                    blockList = blockList.reduce(findAndMatch, []);
                }

                feed = {...feedData, allowList, blockList};
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

    return {props: {updateSession, session, feed, token, VIP}};
}




export default function Home({feed, updateSession, token, VIP}) {
    useEffect(() => {
        if (token) {
            parseJwt(token);
        }
    }, [token])


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
    const [popupState, setPopupState] = useState<"delete"|false>(false);
    const [pics, setPics] = useState<string[]>([]);
    const [busy, setBusy] = useState(false);
    const [editTag, setEditTag] = useState<any>(null);

    const recaptcha = useRecaptcha();
    const imageRef = useRef(null);
    const formRef = useRef(null);

    const useFormReturn = useForm();
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


    useEffect(() => {
        if (session && status === "authenticated" && updateSession) {
            signIn(APP_SESSION, {redirect: false, id: session.user.sk}).then(r => {
                console.log(r);
            });
        }
    }, [status]);


    useEffect(() => {
        if (!feed) {
            reset({sort:"new", allowList:[], blockList:[], everyList:[], mustUrl:[], blockUrl:[]});
            setLanguages([]);
            setPostLevels(POST_LEVELS.map(x => x.id));
            setKeywordSetting(["text"]);
            setPics(["text", "pics"])
        } else {
            const {avatar, sort, uri, displayName, description, blockList, allowList, everyList, languages, postLevels, pics, mustUrl, blockUrl, keywordSetting, keywords} = feed;

            let o:any = {
                sort,displayName, description: description.replaceAll(SIGNATURE, ""),
                shortName: uri.split("/").at(-1), blockList, allowList, everyList, mustUrl: mustUrl || [], blockUrl: blockUrl || [],
            };

            if (avatar) {
                const type = `image/${avatar.split("@")[1]}`;
                o.file = {changed: false, url: avatar, type}
            }

            reset(o);
            setShortNameLocked(true);
            setLanguages(languages || []);
            setPostLevels(postLevels || POST_LEVELS.map(x => x.id));
            setKeywordSetting(keywordSetting || ["text"]);
            setPics(pics || ["text", "pics"]);
            setKeywords(keywords.map(x => {
                const {t, a} = x;
                let o = JSON.parse(compressedToJsonString(t));
                o.a = a;
                if ((o.t === "t" || o.t === "s") && !o.r) {
                    o.r = [];
                }
                return o;
            }) || []);
        }
    }, [feed]);


    const multiWordCallback = (fieldName:string) => {
        return async(val, callback) => {
            if (val.startsWith("@") || val.startsWith("did:plc:")) {
                const user = val.startsWith("@")? val.slice(1) : val;
                const everyList = getValues("everyList");
                const allowList = getValues("allowList");
                const blockList = getValues("blockList");
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
                            const result = await localGet("/user/check", {captcha, user});
                            if (result.status === 200) {
                                clearErrors(fieldName);
                                callback(result.data);
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
            } else {
                setError(fieldName, {type:'custom', message:"User must follow the format"});
            }
        }
    }

    const validateKeyword = (term, rejectWords) => {
        if (term.trim().length === 0) {
            return "Term is empty";
        }
        if (!VIP && keywords.length >= MAX_KEYWORDS_PER_FEED) {
            return `Too many keywords, max ${MAX_KEYWORDS_PER_FEED}`;
        }

        const modeShort = KeywordTypeToShort(newKeywordMode)
        if (keywords.find(y => y.w === term && y.t === modeShort)) {
            return "Term is already in keywords";
        }
        let set = new Set();
        for (const r of rejectWords) {
            const term = `${r.p||""}|${r.s||""}`;
            if (set.has(term)) {
                return "Duplicate Ignore Combination";
            }
            set.add(term);
        }
        return null;
    }


    return <>
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
                <RHForm
                    formRef={formRef}
                    recaptcha={recaptcha}
                    useFormReturn={useFormReturn}
                    cleanUpData={async (data) => {
                        setBusy(true);
                        const {file, sort, displayName, shortName, description, allowList:_allowList, blockList:_blockList, everyList:_everyList, mustUrl, blockUrl} = data;
                        const allowList = _allowList.map(x => x.did);
                        const blockList = _blockList.map(x => x.did);
                        const everyList = _everyList.map(x => x.did);
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

                        const result = {...imageObj, languages,  postLevels, pics, keywordSetting, keywords,
                            sort, displayName, shortName, description, allowList, blockList, everyList, mustUrl, blockUrl};
                        console.log(result);

                        return result;
                    }}
                    postUrl="/feed/submit" postCallback={async (result) => {
                        if (result.status === 200) {
                           await router.push("/my-feeds");
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
                            <button type="button"
                                    onClick={() => setPopupState("delete")}
                                    className="p-1 inline-flex items-center rounded-md shadow-sm text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500">
                                <HiTrash className="w-6 h-6"/>
                                <div className="text-lg font-medium">Delete this feed</div>
                            </button>
                        </div>
                        <div className="flex w-full place-items-center gap-4">
                            <div>
                                <div className="text-center">Feed Avatar</div>
                                <div className="w-40 h-40 aspect-square relative rounded-xl overflow-hidden">
                                    <InputFileDropzone
                                        fieldName="file"
                                        className="inset-0 absolute rounded-xl z-10"
                                        useFormReturn={useFormReturn}
                                        acceptedTypes={{'image/jpeg': ["*.jpg", "*.jpeg"], 'image/png':["*.png"]}}
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
                                    options={{}}
                                    useFormReturn={useFormReturn}
                                    placeholder="My Amazing Feed"
                                    optional={false}
                                    buttonDisabled={shortNameLocked}
                                    buttonText="Make Short Name"
                                    buttonCallback={() => {
                                    const name = getValues("displayName");
                                    setValue("shortName", name.toLowerCase().replaceAll(" ", "-").replaceAll(/[^a-z0-9-]/g, ""));
                                }} />
                                <InputTextButton
                                    maxLength={15} fieldName="shortName" disabled={shortNameLocked}
                                    fieldReadableName="Unique Short Name among all your feeds (CANNOT be changed once submitted)"
                                    subtext="(lowercase alphanumeric and dashes only max 15 characters) [0-9a-zA-z-]"
                                    options={{}} useFormReturn={useFormReturn} placeholder="my-amazing-feed"
                                    buttonText={`${15-(watchShortName?.length || 0)}`}
                                    buttonCallback={() => {}}
                                    buttonDisabled={true}
                                />
                                <InputTextAreaBasic fieldName="description" fieldReadableName="Description (Max 300 characters)" options={{}} useFormReturn={useFormReturn} placeholder="This is an amazing feed, please use it" />
                            </div>
                        </div>
                    </div>

                    <div className="bg-white p-2">
                        <div className="font-bold text-lg">Feed Settings</div>
                        <div className="bg-sky-100 p-2 space-y-2">
                            <InputRadio entriesPerRow={2} modifyText={_ => {
                                return "text-base font-semibold";
                            }} fieldName="sort" fieldReadableName="Sort Order" subtext="Determines which post is at top" useFormReturn={useFormReturn} items={SORT_ORDERS}/>
                            <a href="https://medium.com/hacking-and-gonzo/how-hacker-news-ranking-algorithm-works-1d9b0cf2c08d" target="_blank" rel="noreferrer">
                                <div className="p-2 hover:underline text-blue-500 hover:text-blue-800 inline-flex place-items-center text-sm gap-2">
                                    <BsFillInfoCircleFill className="h-4 w-4"/>
                                    <span>What is the Hacker News sorting algorithm?</span>
                                </div>
                            </a>
                        </div>
                        <div className="bg-lime-100 p-2 space-y-2">
                            <div className="font-semibold">Post Type Filter</div>
                            <div className="grid grid-cols-2 gap-2">
                                {
                                    POST_LEVELS.map(x =>
                                        <div key={x.id}
                                             className="flex place-items-center bg-yellow-400 hover:bg-yellow-200 gap-2 p-1"
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

                        <div className="bg-lime-100 p-2 space-y-2">
                            <div className="font-semibold">Picture Posts Filter</div>
                            <div className="grid grid-cols-2 gap-2">
                                {
                                    PICS_SETTING.map(x =>
                                        <div key={x.id}
                                             className="flex place-items-center bg-yellow-400 hover:bg-yellow-200 gap-2 p-1"
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
                            <div className="text-sm">Leave this empty to accept posts of all languages including those not listed</div>
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
                                               className={clsx("focus:ring-indigo-500 h-6 w-6 rounded-md")}
                                        />
                                        <div className={clsx("ml-3 text-gray-700")}>
                                            {
                                                SUPPORTED_LANG.every(x => languages.indexOf(x.id) >= 0)? <div className="flex place-items-center">
                                                    Deselect All
                                                    <RxCross2 className="w-6 h-6 text-red-600"/>
                                                </div>: <div className="flex place-items-center">
                                                    Select All
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
                                                       className={clsx("focus:ring-indigo-500 h-6 w-6 rounded-md")}
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
                            [
                                {id:"everyList", c:"bg-lime-100", t:"Every List: Show all posts from these users"},
                                {id:"allowList", c:"bg-yellow-100", t:"Allow List: Only search posts from these Users, if empty, will search all users for keywords"},
                                {id:"blockList", c:"bg-pink-100", t:"Block List: Block all posts from these Users"}].map(({id, t,c})=>
                                <InputMultiWord
                                    key={id}
                                    className={clsx("border border-2 border-black p-2 rounded-xl", c)}
                                    labelText={t}
                                    placeHolder="@handle.domain or did:plc:xxxxxxxxxxxxxxxxxxxxxxxx"
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
                    </div>

                    <div className="bg-white p-2 space-y-2">
                        <div className="text-lg font-bold">Keyword Filters {VIP? "" : `(max ${MAX_KEYWORDS_PER_FEED})`}</div>
                        <div>A post is blocked if it contains at least one blocked keyword, and is allowed only if it has no blocked keywords and at least one search keyword</div>
                        <div className="bg-sky-200 p-2">
                            <div className="font-semibold">Search location</div>
                            <div className="grid grid-cols-2 gap-2">
                                {
                                    KEYWORD_SETTING.map(x =>
                                        <div key={x.id}
                                             className="flex place-items-center bg-yellow-400 hover:bg-yellow-200 gap-2 p-1"
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
                        <div>
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
                                        validateKeyword={validateKeyword}
                                        submitKeyword={(w, r, a) => {
                                            setKeywords([...keywords, {t:"t", w:w.toLowerCase().trim(), a, r}]);
                                            setEditTag(null);
                                        }}>
                                        <ul className="list-disc pl-4">
                                            <li>Posts and search terms are split into individual words (tokens) by splitting them by non latin characters (i.e. spaces, symbols, 言,  ل) e.g. `this is ok` becomes `this` `is` `ok`</li>
                                            <li>Terms with spaces like `Quick Draw` will also find `#quickdraw`</li>
                                            <li>Works for terms with accents like `Bon Appétit`</li>
                                            <li>Might not work well if the searched term is combined with other terms, e.g. searching for `cat` will not find `caturday`</li>
                                            <li>Does not work for well for non-latin languages like Korean, Mandarin or Japanese</li>
                                        </ul>
                                    </KeywordParser>
                                }
                                {
                                    newKeywordMode === "segment" && <KeywordParser
                                        editTag={editTag}
                                        keyword="Segment"
                                        handleTokenization={(r, term) =>  [r.p, term, r.s].filter(x => x).join("")}
                                        validateKeyword={validateKeyword}
                                        submitKeyword={(w, r, a) => {
                                            setKeywords([...keywords, {t:"s", w:w.toLowerCase().trim(), a, r}]);
                                            setEditTag(null);
                                        }}>
                                        <ul className="list-disc pl-4">
                                            <li>Posts are searched character-by-character, but may accidentally find longer words that include the search terms</li>
                                            <li>For example: `act` is inside both `action` and `react`</li>
                                            <li>To prevent it, add the prefix and suffix of common terms to reject</li>
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
                                            if (!VIP && keywords.length >= MAX_KEYWORDS_PER_FEED) {
                                                return `Too many keywords, max ${MAX_KEYWORDS_PER_FEED}`;
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
                                <div className="mt-4 font-semibold">Keywords ({keywords.length}{!VIP && `/${MAX_KEYWORDS_PER_FEED}`})</div>
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

                    <div className="bg-white p-2 space-y-2 hidden">
                        <div className="text-lg font-bold">URL Filters</div>
                        <div>Use *.domain.tld to get all subdomains for domain.tld</div>

                        {
                            [
                                {id:"mustUrl", t:"Posts must have links from one of these domains", c:"bg-yellow-100"},
                                {id:"blockUrl", t:"Block all post with links from these domains", c:"bg-pink-100"}
                            ].map(({id, t, c}) => <InputMultiWord key={id}
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
                                        const mustUrls = getValues("mustUrl");
                                        const blockUrls = getValues("blockUrl");
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

                    <button type="button"
                            onClick={() => {formRef.current.requestSubmit();}}
                            className="mt-4 w-full inline-flex justify-center items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500">
                       Submit
                    </button>
                </RHForm>
            </div>
        }
    </>
}
