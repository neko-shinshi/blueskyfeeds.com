import {HiArrowLongLeft, HiArrowLongRight} from "react-icons/hi2";
import PostsEdit from "features/components/specific/PostsEdit";
import KeywordsEdit from "features/components/specific/KeywordsEdit";
import InputMultiWord from "features/input/InputMultiWord";
import clsx from "clsx";
import {PICS_SETTING, POST_LEVELS} from "features/utils/constants";
import BlueskyForm from "features/components/specific/BlueskyForm";
import {useSession} from "next-auth/react";

export default function EditFeedWizard({modal, setModal, setMode, setSubMode, setPostLevels, useFormReturn, recaptcha, setBusy, setKeywords, keywords, VIP, setPopupState, multiWordCallback, shortNameLocked, setPics, watchEveryListSync, setLiveAllowList}) {
    const {
        setValue,
        getValues
    } = useFormReturn;
    const { data: session, status } = useSession();


    const showInstructionAlert = () => {
        alert("Review the feed and tap submit at the bottom to complete your new feed.\nYou can further customize the feed by filtering it with keywords or setting sticky post.");
    }


    return  <div className="bg-white p-4 space-y-4">
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
                                setLiveAllowList(true);
                            }}>
                        <span className="font-bold">My Posts:</span> I want to create feed to show MY posts, with some filtering
                    </button>
                    <button type="button" className="w-full bg-violet-100 p-8 hover:bg-violet-400 p-8 hover:font-bold border border-black"
                            onClick={() => {
                                setModal("wizard-posts");
                                setMode("posts");
                                setLiveAllowList(false);
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
                            setModal("wizard-bsky");
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
                    className={clsx("border-2 border-black p-2 rounded-xl bg-lime-100")}
                    labelText={`Every List: Show all posts from these users (${getValues("everyList")?.length || 0})`}
                    placeHolder="handle.domain or did:plc:xxxxxxxxxxxxxxxxxxxxxxxx or list bsky.app/profile/.../lists/..."
                    fieldName="everyList"
                    inputHidden={watchEveryListSync}
                    disabled={watchEveryListSync}
                    handleItem={(item, value, onChange) => {
                        if (Array.isArray(item)) {
                            for (const itm of item) {
                                let add = true;
                                for (const l of ["everyList", "allowList", "blockList"]) {
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
                            value.sort((a, b) => {
                                return a.handle.localeCompare(b.handle);
                            });
                        }
                        onChange(value);
                    }}
                    valueModifier={item => {
                        return `${item.displayName} @${item.handle}`
                    }}
                    useFormReturn={useFormReturn}
                    check={multiWordCallback("everyList", ["everyList", "allowList", "blockList"], true)}>
                    <button
                        type="button"
                        className="bg-gray-100 border border-black p-1 rounded-xl flex place-items-center gap-2 text-sm"
                        onClick={() => setPopupState("sync_everyList")}>
                        <div className="font-semibold">Sync with List { !watchEveryListSync && "Instead" }</div>
                        {
                            watchEveryListSync && <div className="ml-2">
                                {`https://bsky.app/profile/${watchEveryListSync}`}
                            </div>
                        }
                    </button>
                </InputMultiWord>
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