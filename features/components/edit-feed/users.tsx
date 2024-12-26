import DataManager from "features/components/input/DataManager";
import {useEffect, useState} from "react";
import {HiMinus, HiPlus} from "react-icons/hi";
import clsx from "clsx";
import PopupAddUsers from "features/components/input/elements/PopupAddUsers";
import PopupAddList from "features/components/input/elements/PopupAddList";

const MAX_LISTS = 2;

type UserData = { displayName?:string, handle:string, did:string, uri?:string };
type ListData = { creator:{did:string, handle:string, displayName?:string}, name:string, description?:string, url:string, uri:string, users:UserData[] }

export default function ItemUsers ({busy, setBusy, className="", dataManager, basePath, title, required=false}:
{busy:boolean, setBusy:any, className?:string, dataManager:DataManager, basePath:string, title:string, required?:boolean}) {
    const listData = useState<ListData[]>([]);
    const [lists, setLists] = listData;

    const userData = useState<UserData[]>([]);
    const [users, setUsers] = userData;

    const [popup, setPopup] = useState<false|"manual"|"sync">(false);
    const [mode, setMode] = useState<"manual"|"sync">("manual");

    useEffect(() => {
        console.log("REGISTERING Users", basePath);
        dataManager.register(basePath, () => userData[0], v => userData[1](v),
            () => userData[0].length === 0 && required ? "fail" : "");
        dataManager.register(`${basePath}Sync`, () => listData[0], v => listData[1](v));
    }, [dataManager, listData, userData]);

    function setModeWithWarning(newMode:"manual"|"sync") {
        if (newMode === mode) { return; }
        if (mode === "manual") {
            if (users.length === 0) {
                setMode(newMode);
            } else if (confirm("Switch to using Bluesky Lists? This will remove all users entered")) {
                setMode(newMode);
                setUsers([]);
            }
        } else {
            if (lists.length === 0) {
                setMode(newMode);
            } else if (confirm("Switch to manually entering users? This will remove all lists entered")) {
                setMode(newMode);
                setLists([]);
                setUsers([]);
            }
        }
    }

    function updateUsersFromNewLists(newLists:ListData[]) {
        const newUsers = newLists.map(x => x.users).flat()
            .filter((x, i, arr) => !arr.some((y,j) => j !== i && x.uri === y.uri));
        setUsers(newUsers);
        setLists(newLists);
    }



    return <>
        <PopupAddUsers isOpen={popup === "manual"} setOpen={setPopup} title="Add Users" message="Copy whole or part of url from browser or share button. Use commas to add multiple posts e.g. A,B,C" busy={busy} setBusy={setBusy} resultCallback={(newUsers, callback) => {
            if (newUsers.length > 0) {
                const addUsers = newUsers.filter(x =>  !users.find(y => y.did === x.did));
                if (addUsers.length === 0) {
                    callback("Duplicate users, no new users to add");
                } else {
                    setUsers(users.concat(addUsers));
                    callback();
                }
            }
        }}/>
        <PopupAddList isOpen={popup === "sync"} setOpen={setPopup} title="Add List" message="Copy whole or part of url from browser or share button" busy={busy} setBusy={setBusy} resultCallback={(list, callback) => {
            const duplicateList = lists.some(x => x.uri === list.uri);
            if (duplicateList) {
                callback("Duplicate list, no new list to add");
            } else if (lists.length + 1 >= MAX_LISTS) {
                callback(`Already at maximum number of lists (${MAX_LISTS}), unable to add more`);
            } else {
                updateUsersFromNewLists([...lists, list]);
                callback();
            }
        }}/>
        <div className={clsx("bg-sky-100 p-2 space-y-2 border-2 border-black rounded-2xl", className)}>
            <div >
                <div className="font-bold">{title}</div>
                <div className="grid md:grid-cols-2 w-full items-center gap-2">
                    <div className="flex place-items-center bg-orange-100 hover:bg-gray-50 gap-2 p-1 h-full"
                         onClick={() => setModeWithWarning("manual")}>
                        <input type="radio"
                               onChange={() => {
                               }}
                               onClick={(e) => {
                                   e.stopPropagation();
                                   setModeWithWarning("manual");
                               }}
                               checked={mode === "manual"}
                               className={clsx("focus:ring-indigo-500")}
                        />
                        <div className="font-semibold">Manually Manage Users</div>
                    </div>
                    <div className="flex place-items-center bg-orange-100 hover:bg-gray-50 gap-2 p-1 h-full"
                         onClick={() => setModeWithWarning("sync")}>
                        <input type="radio"
                               onChange={() => {
                               }}
                               onClick={(e) => {
                                   e.stopPropagation();
                                   setModeWithWarning("sync");
                               }}
                               checked={mode === "sync"}
                               className={clsx("focus:ring-indigo-500")}
                        />
                        <div className="font-semibold">Sync with Bluesky Lists (Max {MAX_LISTS})</div>
                    </div>
                </div>
            </div>

            <button
                type="button"
                disabled={lists.length >= MAX_LISTS}
                className={clsx("relative -ml-px inline-flex items-center space-x-2 rounded-md border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700  focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500",
                    "bg-gray-50 hover:bg-gray-100", "disabled:bg-gray-400 disabled:hover:bg-gray-400 disabled:cursor-not-allowed")}
                onClick={() => setPopup(mode)}
            >
                {
                    mode === "manual" &&
                    <div className="flex gap-2 place-items-center"><HiPlus className="w-4 h-4"/>Add User</div>
                }

                {
                    mode === "sync" &&
                    <div className="flex gap-2 place-items-center"><HiPlus className="w-4 h-4"/>Add Bluesky List</div>
                }
            </button>

            {
                mode === "sync" && <div className="bg-gray-200 p-2 rounded-xl">
                    <div className="font-bold">Bluesky Lists (Max {MAX_LISTS})</div>
                    <div className={clsx("mt-1 border-dashed border-2 border-black rounded-xl space-y-1 p-1 ")}>
                        {
                            lists.length === 0 && <div className="select-none">&nbsp;</div>
                        }
                        {
                            lists.map(x => {
                                return <div key={x.uri} className="p-1 border border-black rounded-xl hover:bg-lime-200 bg-white">
                                    <div className="border-b-2 border-gray-400 flex justify-between">
                                        <div>{x.name} by {[x.creator.displayName, `@${x.creator.handle}`].filter(x => !!x).join(" ")}</div>
                                        <button
                                            type="button"
                                            className="-ml-px relative inline-flex items-center p-1 rounded-md border border-gray-300 bg-white disabled:bg-gray-300 text-sm font-medium  hover:text-white hover:bg-gray-900 focus:z-10 focus:outline-none focus:ring-1 focus:ring-gray-900 focus:border-gray-900 focus:ring-offset-2"
                                            onClick={() => updateUsersFromNewLists(lists.filter(y => y.uri !== x.uri))}
                                        >
                                            <span className="sr-only">Remove</span>
                                            <HiMinus className="h-3 w-3 md:h-4 md:w-4" aria-hidden="true"/>
                                        </button>
                                    </div>
                                    {x.description && <div>Description: {x.description}</div>}
                                </div>
                            })
                        }
                    </div>
                </div>
            }

            <div className="bg-gray-200 p-2 rounded-xl">
                <div className="font-bold">Users {mode === "sync" && "Preview"}</div>
                <div className={clsx("mt-1 border-dashed border-2 border-black rounded-xl space-y-1 p-1")}>
                    {
                        users.length === 0 && <div className="select-none">&nbsp;</div>
                    }
                    {
                        users.map(x => {
                            return <div key={x.did} className="flex justify-between bg-white hover:bg-lime-200 p-1 border border-black rounded-xl">
                                <div>
                                    {[x.displayName, `@${x.handle}`].filter(x => !!x).join(" ")}
                                </div>
                                {
                                    mode === "manual" && <button
                                        type="button"
                                        className="-ml-px relative inline-flex items-center p-1 rounded-md border border-gray-300 bg-white disabled:bg-gray-300 text-sm font-medium hover:text-white hover:bg-gray-900 focus:z-10 focus:outline-none focus:ring-1 focus:ring-gray-900 focus:border-gray-900 focus:ring-offset-2"
                                        onClick={() => setUsers(users.filter(y => y.did !== x.did))}
                                    >
                                        <span className="sr-only">Remove</span>
                                        <HiMinus className="h-3 w-3 md:h-4 md:w-4" aria-hidden="true"/>
                                    </button>
                                }
                            </div>
                        })
                    }
                </div>
                {
                    required && users.length === 0 && <div className="mt-2 text-sm text-red-600">Please add at least one user manually or with a list</div>
                }
            </div>
        </div>
    </>
}