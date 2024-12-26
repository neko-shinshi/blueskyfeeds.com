import {useEffect, useState} from "react";
import PopupAddPost from "features/components/input/elements/PopupAddPost";
import {HiPlus} from "react-icons/hi";
import ListControlButtons from "features/components/ListControlButtons";
import clsx from "clsx";
import DataManager from "features/components/input/DataManager";
import {swapOrder} from "features/utils/utils";

export default function ItemPosts ({busy, setBusy, className="", dataManager, path, minSize=0}:
{busy:boolean, setBusy:any, className?:string, dataManager:DataManager, path:string, minSize?:number}) {
    const [popupOpen, setPopupOpen] = useState(false);
    const valState = useState<{uri:string, text:string, url:string , author:any}[]>([]);
    const [val, setVal] = valState;

    useEffect(() => {
        console.log("REGISTERING Posts", path);
        dataManager.register(path, () => valState[0], v =>  valState[1](v),
            () =>  valState[0].length < minSize ? "fail" : "");
    }, [dataManager, valState]);

    return <div className={clsx(className, "p-2")}>
        <PopupAddPost
            isOpen={popupOpen}
            setOpen={setPopupOpen}
            title="Add Post"
            message="Copy whole or part of url from browser or share button. Use commas to add multiple posts e.g. A,B,C"
            setBusy={setBusy}
            busy={busy}
            limitOne={false}
            resultCallback={(posts, callback) => {
                if (posts.length > 0) {
                    const addPosts = posts.filter(x => !val.find(y => y.uri === x.uri));

                    if (addPosts.length === 0) {
                        callback("Duplicate posts, no new posts to add");
                    } else {
                        setVal(val.concat(addPosts));
                        callback();
                    }
                }
            }}/>
        <div className="space-y-4">
            <button
                type="button"
                className="relative -ml-px inline-flex items-center space-x-2 rounded-md border border-gray-300 bg-gray-50 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                onClick={() => setPopupOpen(true)}
            >
                <div className="flex gap-2 place-items-center"><HiPlus className="w-4 h-4"/>Add Single Post or Multiple Posts with Comma-Separated Array</div>
            </button>


            {
                val.length > 0 && <div className="bg-orange-300 p-2 space-y-2 rounded-xl">
                    {
                        val.map((x,i) => {
                            return <div key={x.uri} className="">
                                <div className="bg-gray-200 p-1">
                                    <div className="flex justify-between">
                                        <a href={x.url} target="_blank" rel="noopener noreferrer">
                                            <div className="hover:underline hover:text-blue-500"><span>{i + 1}: </span>{x.url}</div>
                                        </a>
                                        <ListControlButtons
                                            arrayIndex={i}
                                            canMoveUp={_ => i !== 0}
                                            canMoveDown={_ => i < val.length - 1}
                                            moveUp={_ => setVal(swapOrder(i - 1, i, val))}
                                            moveDown={_ => setVal(swapOrder(i, i + 1, val))}
                                            remove={_ => {
                                                setVal(val.filter(y => y.uri !== x.uri));
                                            }}/>
                                    </div>
                                    <a className="hover:underline hover:text-blue-500" href={`https://bsky.app/profile/${x.author.handle}`}><div>{[x.author.displayName, `@${x.author.handle}`].filter(x => !!x).join("  ")}</div></a>
                                </div>
                                <div className="bg-white p-1">{x.text}</div>
                            </div>
                        })
                    }
                </div>
            }
            {
                val.length < minSize && <div className="mt-2 text-sm text-red-600">
                    {`Please add at least ${minSize} post${minSize>1? 's':''}`}
                </div>
            }
        </div>
    </div>
}