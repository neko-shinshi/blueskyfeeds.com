import {useEffect, useRef, useState} from "react";
import HeadExtended from "features/layout/HeadExtended";
import {useSession} from "next-auth/react";
import FormSignIn from "features/login/FormSignIn";
import {useForm} from "react-hook-form";
import InputTextBasic from "features/input/InputTextBasic";
import RHForm from "features/input/RHForm";
import clsx from "clsx";
import InputRadio from "features/input/InputRadio";
import InputTextAreaBasic from "features/input/InputTextAreaBasic";
import InputFileDropzone from "features/input/InputFileDropzone";
import {useRouter} from "next/router";
import PageHeader from "features/components/PageHeader";
import {getSessionData} from "features/network/session";
import {getFeedDetails, rebuildAgentFromSession} from "features/utils/feedUtils";
import {BsFillInfoCircleFill} from "react-icons/bs";
import {RxCheck, RxCross2} from "react-icons/rx";
import {useRecaptcha} from "features/auth/RecaptchaProvider";
import {localGet} from "features/network/network";
import InputTextButton from "features/input/InputTextButton";
import Image from "next/image";
import InputMultiWord from "features/input/InputMultiWord";
import ModalManualSearch from "features/components/specific/ModeManualSearch";
import {connectToDatabase} from "features/utils/dbUtils";
import {serializeFile} from "features/utils/fileUtils";
import {SIGNATURE} from "features/utils/constants";

export async function getServerSideProps({req, res, query}) {
    const db = await connectToDatabase();
    if (!db) { return { redirect: { destination: '/500', permanent: false } } }
    const session = await getSessionData(req, res);
    let feed = null;
    if (session) {
        const agent = await rebuildAgentFromSession(session);
        if (!agent) {return { redirect: { destination: '/signout', permanent: false } };}

        const {feed:_feed} = query;
        if (_feed) {
            const result = await getFeedDetails(agent, db, _feed);
            if (result) {
                feed = result;
            } else {
                return { redirect: { destination: '/404', permanent: false } }
            }
        }
    }

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
    const [tokenSearch, setTokenSearch] = useState<string[]>([]);
    const [manualSearch, setManualSearch] = useState<{w:string, pre:string[], suf:string[]}[]>([]);
    const [newKeywordMode, setNewKeywordMode] = useState<"token"|"character">("token");
    const [shortNameLocked, setShortNameLocked] = useState(false);

    const recaptcha = useRecaptcha();
    const imageRef = useRef(null);

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
            const {avatar, sort, uri, displayName, description} = feed;
            let o:any = {
                sort,displayName, description: description.replaceAll(SIGNATURE, ""),
                shortName: uri.split("/").at(-1),
            };

            if (avatar) {
                const type = `image/${avatar.split("@")[1]}`;
                o.file = {changed: false, url: avatar, type}
            }

            reset(o);
            setShortNameLocked(true);

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
                <RHForm
                    recaptcha={recaptcha}
                    useFormReturn={useFormReturn}
                    cleanUpData={async (data) => {
                        console.log(data);
                        const {sort, file, displayName, shortName, description} = data;
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
                        const result = {...imageObj, displayName, shortName, description, allowList, blockList, languages, sort}
                        console.log(result);

                        return result;
                    }}
                    postUrl="/feed/submit" postCallback={async (result) => {
                        console.log(result);
                        if (result.status === 200) {
                           await router.push("/my-feeds");
                        }
                    }}
                    className="space-y-4">
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
                                    fieldReadableName="Full Name (Max 24 characters)"
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
                                <InputTextBasic maxLength={15} fieldName="shortName" disabled={shortNameLocked} fieldReadableName="Unique Short Name among all your feeds (CANNOT be changed once submitted)" subtext="(lowercase alphanumeric and dashes only max 15 characters) [0-9a-zA-z-]" options={{}} useFormReturn={useFormReturn} placeholder="my-amazing-feed" />
                                <InputTextAreaBasic fieldName="description" fieldReadableName="Description" options={{}} useFormReturn={useFormReturn} placeholder="This is an amazing feed, please use it" />
                            </div>
                        </div>



                    </div>

                    <div className="bg-white p-2 space-y-2">
                        <InputRadio entriesPerRow={2} modifyText={_ => {
                            return "text-lg font-bold";
                        }} fieldName="sort" fieldReadableName="Sort Order" useFormReturn={useFormReturn} items={[
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
                            check={multiWordCallback("allowList")}/>

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
                                         setLanguages([]);
                                     } else {
                                         setLanguages(SUPPORTED_LANGUAGES.map(x => x.id));
                                     }
                                 }}>
                                <div className="flex items-center p-2">
                                    <input type="checkbox"
                                           onChange={() => {}}
                                           onClick={() => {
                                               if (SUPPORTED_LANGUAGES.every(x => languages.indexOf(x.id) >= 0)) {
                                                   setLanguages([]);
                                               } else {
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
                            <div className="flex items-center bg-blue-100 hover:bg-blue-200 p-2 rounded-tl-md border border-t-2 border-l-2 border-b-0 border-black"
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
                                Tokenized Term Filter
                            </div>
                            <div className="flex items-center bg-yellow-100 hover:bg-yellow-200 p-2 rounded-tr-md border border-t-2 border-r-2 border-b-0 border-black"
                                 onClick={() => {
                                     setNewKeywordMode("character");
                                 }}>
                                <input
                                    id='keyword-filter-type'
                                    type="radio"
                                    value="manual"
                                    checked={newKeywordMode === "character"}
                                    onChange={() => {}}
                                    onClick={() => {setNewKeywordMode("character")}}
                                    className="mr-2 focus:ring-indigo-500 h-4 w-4 text-indigo-600 border-gray-300"
                                />
                                Character-by-Character Term Filter
                            </div>
                        </div>
                        <div className={clsx("p-2 border border-l-2 border-r-2 border-y-0 border-black", newKeywordMode === "token"? "bg-blue-100" : "bg-yellow-100")}>
                            <div className="font-semibold">{`${newKeywordMode.slice(0,1).toUpperCase()}${newKeywordMode.slice(1)} Search`}</div>
                            {
                                newKeywordMode === "token" &&
                                <ModalManualSearch
                                    keyword="Token"
                                    handleTokenization={(rejectWords, term) => {
                                        let word = "";
                                        if (rejectWords.pre) {
                                            word += rejectWords.pre + " ";
                                        }
                                        word += term;
                                        if (rejectWords.suf) {
                                            word += " " + rejectWords.suf;
                                        }
                                        return word;
                                    }}
                                    validateKeyword={term => {
                                        return true;
                                    }}
                                    submitKeyword={undefined}>
                                    <ul className="list-disc pl-4">
                                        <li>Posts and search terms are split into individual words (tokens) by splitting them by non latin characters (i.e. spaces, symbols, 言,  ل) e.g. `this is ok` becomes `this` `is` `ok`</li>
                                        <li>Terms with spaces like `Quick Draw` will also find `#quickdraw`</li>
                                        <li>Works for terms with accents slike `Bon Appétit`</li>
                                        <li>Might not work well if the searched term is combined with other terms, e.g. searching for `cat` will not find `caturday`</li>
                                        <li>Does not work for well for non-latin languages like Korean, Mandarin or Japanese</li>
                                    </ul>
                                </ModalManualSearch>
                            }
                            {
                                newKeywordMode === "character" && <ModalManualSearch
                                    keyword="Term"
                                    handleTokenization={(rejectWords, term) => `${rejectWords.pre || ""}${term}${rejectWords.suf || ""}`}
                                    validateKeyword={term => {
                                        return true;
                                    }} submitKeyword={undefined}
                                >

                                    <ul className="list-disc pl-4">
                                        <li>Posts are searched character-by-character, but may accidentally find longer words that include the search terms</li>
                                        <li>For example: `act` is inside both `action` and `react`</li>
                                        <li>To prevent it, add the prefix and suffix of common terms to reject</li>
                                        <li>This is the preferred way to search for non-latin words like アニメ</li>
                                    </ul>
                                </ModalManualSearch>
                            }
                        </div>

                        {
                            //                        <SortableWordBubbles value={undefined} orderedList={undefined} disabled={undefined} valueModifier={undefined} updateCallback={undefined} />
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
