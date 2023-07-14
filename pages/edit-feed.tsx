import {useEffect, useRef, useState} from "react";
import HeadExtended from "features/layout/HeadExtended";
import {useSession} from "next-auth/react";
import FormSignIn from "features/login/FormSignIn";
import {useForm} from "react-hook-form";
import InputTextBasic from "features/input/InputTextBasic";
import RHForm from "features/input/RHForm";
import clsx from "clsx";
import {HiMinus, HiOutlineExclamationCircle, HiPlus, HiTrash} from "react-icons/hi";
import InputRadio from "features/input/InputRadio";
import InputTextAreaBasic from "features/input/InputTextAreaBasic";
import InputFileDropzone from "features/input/InputFileDropzone";
import {useRouter} from "next/router";
import PageHeader from "features/components/PageHeader";
import {getSessionData} from "features/network/session";
import {rebuildAgentFromSession} from "features/utils/feedUtils";
import {BsFillInfoCircleFill} from "react-icons/bs";
import {RxCheck, RxCross2} from "react-icons/rx";
import {useRecaptcha} from "features/auth/RecaptchaProvider";
import {localGet} from "features/network/network";
import InputTextButton from "features/input/InputTextButton";
import Image from "next/image";
import {handleEnter} from "features/utils/keyboardUtils";
import InputMultiWord from "features/input/InputMultiWord";

export async function getServerSideProps({req, res, query}) {
    const session = await getSessionData(req, res);
    if (session) {
        const agent = await rebuildAgentFromSession(session);
        if (!agent) {return { redirect: { destination: '/signout', permanent: false } };}
    }
    const {feed:_feed} = query;
    const feed = _feed || null;

    return {props: {session, feed}};
}




export default function Home({feed}) {
    const router = useRouter();
    const languageNames = new Intl.DisplayNames([router.locale], {type: 'language'});
    const SUPPORTED_LANGUAGES = [
        {id:"", txt:"Blank (many users have not set their language)"},
        {id:"en", txt:`${languageNames.of("en")} (en)`},
        {id:"ja", txt: `${languageNames.of("ja")} (ja)`},
    ];
    const { data: session } = useSession();
    const [languages, setLanguages] = useState<string[]>([]);
    const [allowList, setAllowList] = useState<{did:string, handle:string, displayName:string}[]>([]);
    const [blockList, setBlockList] = useState<{did:string, handle:string, displayName:string}[]>([]);
    const allowListRef = useRef(null);
    const blockListRef = useRef(null);
    const [allowListError, setAllowListError] = useState("");
    const [blockListError, setBlockListError] = useState("");
    const [tokenSearch, setTokenSearch] = useState<string[]>([]);
    const [manualSearch, setManualSearch] = useState<{w:string, pre:string[], post:string[]}[]>([]);
    const [newKeywordMode, setNewKeywordMode] = useState<"token"|"manual">("token");

    const [manualKeyword, setManualKeyword] = useState("");
    const tokenInputRef = useRef(null);
    const [tokenInputError, setTokenInputError] = useState("");

    const [rejectWords, setRejectWords] = useState<{pre:string, suf:string}[]>([]);


    const validateTokenInput = (val) => {

    }


    const recaptcha = useRecaptcha();

    const useFormReturn = useForm();
    const {
        reset,
        watch,
        getValues,
        setValue,
        setError,
        clearErrors,
    } = useFormReturn;

    useEffect(() => {
        if (!feed) {
            reset({sort:"chronological"});
            setLanguages(SUPPORTED_LANGUAGES.map(x => x.id));
            setAllowList([]);
            setBlockList([]);
        } else {

        }
    }, [feed]);


    const title = "Make a Feed for Bluesky Social";
    const description = "";
    const watchFile = watch("file");

    const multiWordCallback = (fieldName:string) => {
        return async(val, callback) => {
            if (val.startsWith("@") || val.startsWith("did:plc:")) {
                const user = val.startsWith("@")? val.slice(1) : val;
                if (blockList.find(x => x.did === user || x.handle === user)) {
                    setError(fieldName, {type:'custom', message:`${user} is already in Block List`});
                } else if (allowList.find(x => x.did === user || x.handle === user)) {
                    setError(fieldName, {type:'custom', message:`${user} is already in Allow List`});
                } else {
                    if (typeof recaptcha !== 'undefined') {
                        console.log("checking captcha");
                        recaptcha.ready(async () => {
                            //@ts-ignore
                            const captcha = await recaptcha.execute(process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY, {action: 'submit'});
                            //@ts-ignore
                            const result = await localGet("/user/check", {
                                captcha,
                                user
                            });
                            if (result.status === 200) {
                                clearErrors(fieldName);
                                callback();
                            } else if (result.status === 400) {
                                setError(fieldName, {type:'custom', message:"Invalid user or user not found"});
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


    return <>
        <HeadExtended title={title} description={description}/>
        {
            !session && <FormSignIn/>
        }

        {
            session && <div className="bg-sky-200 w-full max-w-5xl rounded-xl overflow-hidden p-4 space-y-4">
                <PageHeader title={title} description={description} />

                <RHForm useFormReturn={useFormReturn} cleanUpData={data => data} postUrl="" postCallback={(data) => {}} className="space-y-4">
                    <div className="bg-white p-2">
                        <div>Feed Settings</div>
                        <div className="flex w-full place-items-center gap-4">
                            <div>
                                <div className="text-center">Avatar</div>
                                <div className="w-40 h-40 aspect-square relative rounded-xl overflow-hidden">

                                    <InputFileDropzone
                                        fieldName="file"
                                        className="inset-0 absolute rounded-xl z-10"
                                        useFormReturn={useFormReturn}
                                        acceptedTypes={{'image/jpeg': ["*.jpg", "*.jpeg"], 'image/png':[]}}
                                        acceptedTypesLabel="jpg or png"/>
                                    {
                                        watchFile && <Image className="object-cover hover:blur-sm" unoptimized fill src={watchFile.url} alt="animal-avatar" />
                                    }
                                </div>
                            </div>

                            <div className="grow">
                                <InputTextButton fieldName="name" fieldReadableName="Full Name" options={{}} useFormReturn={useFormReturn} placeholder="My Amazing Feed"  optional={false} buttonText="Make Short Name" buttonCallback={() => {
                                    const name = getValues("name");
                                    setValue("shortname", name.toLowerCase().replaceAll(" ", "-").replaceAll(/[^a-z0-9-]/g, ""));
                                }} />
                                <InputTextBasic fieldName="shortname" fieldReadableName="Short Name (lowercase alphanumeric with dashes only) [0-9a-zA-z-]" options={{}} useFormReturn={useFormReturn} placeholder="my-amazing-feed" />
                                <InputTextAreaBasic fieldName="description" fieldReadableName="Description" options={{}} useFormReturn={useFormReturn} placeholder="This is an amazing feed, please use it" />

                            </div>
                        </div>


                        <InputRadio fieldName="sort" fieldReadableName="Sort Order" useFormReturn={useFormReturn} items={[
                            {id:"chronological", txt:"Chronological - Most recent post at top"},
                            {id:"score", txt:"Hot - Use Hacker News sorting algorithm"}
                        ]}/>
                        <a href="https://medium.com/hacking-and-gonzo/how-hacker-news-ranking-algorithm-works-1d9b0cf2c08d" target="_blank" rel="noreferrer">
                            <div className="p-2 hover:underline text-blue-500 hover:text-blue-800 inline-flex place-items-center text-sm gap-2">
                                <BsFillInfoCircleFill className="h-4 w-4"/>
                                <span>What is the Hacker News sorting algorithm?</span>
                            </div>
                        </a>
                    </div>

                    <div className="bg-white p-2 space-y-2">
                        <div className="text-lg font-bold">User Filters</div>

                        <InputMultiWord
                            className="border border-2 border-green-700 p-2 rounded-xl bg-lime-100"
                            labelText="Allow List: Show all posts from these Users"
                            placeHolder="@handle.domain or did:plc:xxxxxxxxxxxxxxxxxxxxxxxx"
                            splitWithSpace={false} orderedList={false}
                            fieldName="allowList" useFormReturn={useFormReturn}
                            check={multiWordCallback("blockList")}/>

                        <InputMultiWord
                            className="border border-2 border-red-700 p-2 rounded-xl bg-pink-100"
                            labelText="Block List: Block all posts from these Users"
                            placeHolder="@handle.domain or did:plc:xxxxxxxxxxxxxxxxxxxxxxxx"
                            splitWithSpace={false} orderedList={false}
                            fieldName="blockList" useFormReturn={useFormReturn}
                            check={multiWordCallback("blockList")}/>
                    </div>

                    <div className="bg-white p-2">
                        <div>Language Filters</div>
                        <div>Note: These may not work well as language is self reported in the website/app</div>
                        <div className="grid grid-cols-2">
                            <div className={clsx("relative flex items-start items-center hover:bg-orange-200")}
                                 onClick={() => {
                                     if (SUPPORTED_LANGUAGES.every(x => languages.indexOf(x.id) >= 0)) {
                                         console.log("clear")
                                         setLanguages([]);
                                     } else {
                                         console.log("fill")
                                         setLanguages(SUPPORTED_LANGUAGES.map(x => x.id));
                                     }
                                 }}>
                                <div className="flex items-center p-2">
                                    <input type="checkbox"
                                           onChange={() => {}}
                                           onClick={() => {
                                               if (SUPPORTED_LANGUAGES.every(x => languages.indexOf(x.id) >= 0)) {
                                                   console.log("clear")
                                                   setLanguages([]);
                                               } else {
                                                   console.log("fill")
                                                   setLanguages(SUPPORTED_LANGUAGES.map(x => x.id));
                                               }
                                           }}
                                           checked={SUPPORTED_LANGUAGES.every(x => languages.indexOf(x.id) >= 0)}
                                           className={clsx("focus:ring-indigo-500 h-6 w-6 rounded-md")}
                                    />
                                    <div className={clsx("ml-3 text-gray-700")}>
                                        {
                                            SUPPORTED_LANGUAGES.every(x => languages.indexOf(x.id) >= 0)? <div className="flex place-items-center">
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
                                SUPPORTED_LANGUAGES.map(({txt, id}) => {
                                    const onClick = () => {
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

                    <div className="bg-white p-2">
                        <div>Keyword Filters</div>

                        <div className={clsx("grid grid-cols-2")}>
                            <div className="flex items-center bg-orange-100 hover:bg-gray-50 p-2 rounded-md"
                                 onClick={() => {
                                     setNewKeywordMode("token");
                                 }}>
                                <input
                                    id='keyword-filter-type'
                                    type="radio"
                                    value="token"
                                    checked={newKeywordMode === "token"}
                                    onChange={() => {}}
                                    onClick={() => {setNewKeywordMode("token")}}
                                    className="mr-2 focus:ring-indigo-500 h-4 w-4 text-indigo-600 border-gray-300"
                                />
                                Token Search
                            </div>
                            <div className="flex items-center bg-orange-100 hover:bg-gray-50 p-2 rounded-md"
                                 onClick={() => {
                                     setNewKeywordMode("manual");
                                 }}>
                                <input
                                    id='keyword-filter-type'
                                    type="radio"
                                    value="manual"
                                    checked={newKeywordMode === "manual"}
                                    onChange={() => {}}
                                    onClick={() => {setNewKeywordMode("manual")}}
                                    className="mr-2 focus:ring-indigo-500 h-4 w-4 text-indigo-600 border-gray-300"
                                />
                                Manual Search
                            </div>
                        </div>
                        {
                            <div>
                                <div>{`${newKeywordMode.slice(0,1).toUpperCase()}${newKeywordMode.slice(1)} Search`}</div>
                                {
                                    newKeywordMode === "token" && <>
                                        <ul className="list-disc pl-4">
                                            <li>Posts are split into individual words (tokens) by splitting them by non latin characters (e.g. spaces, symbols, 言,  ل) and searching them from left to right</li>
                                            <li>Terms with spaces like `Quick Draw` will also find `#quickdraw`</li>
                                            <li>Works for terms with accents slike `Bon Appétit`</li>
                                            <li>Might not work well for `1989`, e.g. `Summer1989` will fail</li>
                                            <li>Does not work for hyphenated terms like deep-fried (search for `deep fried` instead)</li>
                                            <li>Does not work for well for non-latin languages like Korean, Mandarin or Japanese</li>
                                        </ul>
                                        <div className="mt-1 flex rounded-md shadow-sm place-items-center">
                                            <div className="mr-2">Tokens</div>
                                            <div className="mt-1 flex rounded-md shadow-sm">
                                                <div className="relative flex flex-grow items-stretch focus-within:z-10">
                                                    <input
                                                        ref={tokenInputRef}
                                                        type="text"
                                                        className={clsx("block w-full focus:outline-none sm:text-sm rounded-l-md p-2",
                                                            allowListError? "pr-10 focus:border-red-500 focus:ring-red-500 border-red-300 text-red-900 placeholder-red-300"
                                                                :"focus:border-gray-500 focus:ring-gray-500 border-gray-300 text-gray-900 placeholder-gray-300")}
                                                        aria-invalid="true"
                                                        autoComplete="off"
                                                        onChange={() => {validateTokenInput(tokenInputRef.current.value)}}
                                                        placeholder="Enter tokens"
                                                    />
                                                    {
                                                        tokenInputError &&
                                                        <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-3">
                                                            <HiOutlineExclamationCircle className="h-5 w-5 text-red-500" aria-hidden="true"/>
                                                        </div>
                                                    }
                                                </div>
                                                <button
                                                    type="button"
                                                    className={clsx("relative -ml-px inline-flex items-center space-x-2 rounded-r-md border border-gray-300 bg-gray-50 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500")}
                                                    onClick={() => {
                                                    }}
                                                >
                                                    <span>Add</span>
                                                </button>
                                            </div>
                                        </div>
                                        {
                                            tokenInputError && <div>{tokenInputError}</div>
                                        }
                                    </>
                                }
                                {
                                    newKeywordMode === "manual" && <>
                                        <ul className="list-disc pl-4">
                                            <li>Posts are searched character-by-character, but may accidentally find longer words that include the search terms</li>
                                            <li>For example: `act` is inside both `action` and `react`</li>
                                            <li>To prevent it, add the prefix and suffix of common terms to reject</li>
                                            <li>This is the preferred way to search for non-latin words like アニメ</li>
                                        </ul>

                                        <div className="flex justify-between">
                                            <div className="grow">
                                                <div className="flex place-items-center space-x-2">
                                                    <div>Keyword</div>
                                                    <input
                                                        type="text"
                                                        className={clsx("block w-full focus:outline-none sm:text-sm rounded-l-md p-2",
                                                            "focus:border-gray-500 focus:ring-gray-500 border-gray-300 text-gray-900 placeholder-gray-300")}
                                                        aria-invalid="true"
                                                        autoComplete="off"
                                                        autoCapitalize="off"
                                                        placeholder="Keyword"
                                                        onChange={(e) => {
                                                            setManualKeyword(e.target.value);
                                                        }}
                                                    />
                                                </div>
                                                {
                                                    rejectWords.map((x,i) =>
                                                        <div key={i} className="flex rounded-md shadow-sm place-items-center">
                                                            <button type="button"
                                                                    className="w-12 inline-flex justify-center items-center px-4 py-2 rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                                                                    onClick={() => {
                                                                        rejectWords.splice(i,1);
                                                                        setRejectWords([...rejectWords]);
                                                                    }}>
                                                                <HiMinus className="w-6 h-6"/>
                                                            </button>
                                                            <input
                                                                type="text"
                                                                className={clsx("block w-full focus:outline-none sm:text-sm rounded-l-md p-2",
                                                                    "focus:border-gray-500 focus:ring-gray-500 border-gray-300 text-gray-900 placeholder-gray-300")}
                                                                aria-invalid="true"
                                                                autoComplete="off"
                                                                autoCapitalize="off"
                                                                placeholder="Prefix"
                                                            />
                                                            <input
                                                                type="text"
                                                                disabled={true}
                                                                value={manualKeyword}
                                                                className={clsx("block w-full focus:outline-none sm:text-sm rounded-l-md p-2",
                                                                    "bg-gray-300")}
                                                                placeholder="Keyword"
                                                            />
                                                            <input
                                                                type="text"
                                                                className={clsx("block w-full focus:outline-none sm:text-sm rounded-l-md p-2",
                                                                    "focus:border-gray-500 focus:ring-gray-500 border-gray-300 text-gray-900 placeholder-gray-300")}
                                                                aria-invalid="true"
                                                                autoComplete="off"
                                                                autoCapitalize="off"
                                                                placeholder="Suffix"
                                                            />

                                                            <input
                                                                type="text"
                                                                disabled={true}
                                                                className={clsx("block w-full focus:outline-none sm:text-sm rounded-l-md p-2",
                                                                    "bg-gray-100")}
                                                                placeholder="Rejected word"
                                                            />
                                                        </div>
                                                    )
                                                }
                                                <button type="button"
                                                        className="w-full inline-flex justify-center items-center px-4 py-2 rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                                                        onClick={() => {
                                                            rejectWords.push({pre:"", suf:""});
                                                            setRejectWords([...rejectWords]);
                                                        }}>
                                                    <HiPlus className="w-6 h-6"/> Add Rejected Word
                                                </button>
                                            </div>

                                            <button type="button" className="w-24  bg-orange-200">
                                                Add
                                            </button>
                                        </div>
                                     </>
                                }
                            </div>
                        }









                    </div>

                    <button type="submit"
                            className="mt-4 w-full inline-flex justify-center items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500">
                       Submit
                    </button>
                </RHForm>
            </div>
        }




    </>
}
