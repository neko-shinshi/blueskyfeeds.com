import {useEffect, useState} from "react";
import PopupAddPost from "features/components/input/elements/PopupAddPost";
import {HiPlus} from "react-icons/hi";
import clsx from "clsx";
import DataManager from "features/components/input/DataManager";

export default function ItemPost ({busy, setBusy, className="", dataManager, path, required=false}:
{busy:boolean, setBusy:any, className?:string, dataManager:DataManager, path:string, required?:boolean}) {
    const [popupOpen, setPopupOpen] = useState(false);
    const valState = useState<{uri:string, text:string, url:string } | false>(false);
    const [val, setVal] = valState;

    useEffect(() => {
        console.log("REGISTERING Post", path);
        dataManager.register(path, () => valState[0], v => valState[1](v),
            () => !valState[0] && required ? "fail" : "");
    }, [dataManager, valState]);

    return <div className={clsx(className, "p-2")}>
        <PopupAddPost
            isOpen={popupOpen}
            setOpen={setPopupOpen}
            title="Set Post"
            message="Copy whole or part of url from browser or share button"
            setBusy={setBusy}
            busy={busy}
            limitOne={true}
            resultCallback={(posts, callback) => {
                if (posts.length === 1) {
                    setVal(posts[0]);
                    callback();
                }
            }}/>
        <div className="space-y-4">
            <button
                type="button"
                className="relative -ml-px inline-flex items-center space-x-2 rounded-md border border-gray-300 bg-gray-50 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                onClick={() => setPopupOpen(true)}
            >
                <div className="flex gap-2 place-items-center"><HiPlus className="w-4 h-4"/>Set Post</div>
            </button>


            {
               val && <div className="bg-gray-200 p-1">
                    <a href={val.url} target = "_blank" rel = "noopener noreferrer"><div>{val.url}</div></a>
                    <div className="bg-white p-1">{val.text}</div>
                </div>
            }
            {
                !val && required && <div className="mt-2 text-sm text-red-600">
                    Please select a post
                </div>
            }
        </div>
    </div>
}