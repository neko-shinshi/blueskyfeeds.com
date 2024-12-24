import {useEffect, useState} from "react";
import PopupWithAddPost from "features/components/PopupWithAddPost";
import {HiPlus} from "react-icons/hi";
import ListControlButtons from "features/components/ListControlButtons";
import clsx from "clsx";
import DataManager from "features/utils/DataManager";
import {useRecaptcha} from "features/utils/RecaptchaProvider";

export default function ItemPost ({busy, setBusy, className="", dataManager, path, minSize=0}:
                                       {busy:boolean, setBusy:any, className?:string, dataManager:DataManager, path:string, minSize?:number}) {
    const [popupOpen, setPopupOpen] = useState(false);
    const valState = useState<{uri:string, text:string }[]>([]);
    const [val, setVal] = valState;
    const recaptcha = useRecaptcha();
    useEffect(() => {
        console.log("REGISTERING POSTS");
        dataManager.register(path, () => valState[0], v => {
            console.log("Setting as", v);
            valState[1](v);
        }, () => {
            const myVal = valState[0];
            console.log(myVal, myVal.length, minSize, myVal.length < minSize);
            return myVal.length < minSize ? "fail" : "";
        });
    }, [dataManager, valState]);

    return <div className={clsx(className, "p-2")}>
        <PopupWithAddPost
            isOpen={popupOpen}
            setOpen={setPopupOpen}
            title="Set Post"
            message="Copy whole or part of url from browser or share button. Use a comma-separated array to add multiple posts e.g. A,B,C"
            recaptcha={recaptcha}
            setBusy={setBusy}
            busy={busy}
            limitOne={true}
            resultCallback={(posts, callback) => {
                if (Object.keys(posts).length > 0) {
                    const addPosts = posts.filter(x => {
                        const {uri} = x;
                        return !val.find(y => y.uri === uri);
                    });

                    if (addPosts.length === 0) {
                        callback("Duplicate posts, no new posts to add");
                    } else {
                        val.push(...addPosts);
                        setVal(val);
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
                <div className="flex gap-2 place-items-center"><HiPlus className="w-4 h-4"/>Set Post</div>
            </button>


            {
                val.length > 0 && <div className="bg-orange-300 p-2 space-y-2 rounded-xl">
                    {
                        val.map((x,i) => {
                            const swapOrder = (x,y) => {
                                const temp = val[x];
                                val[x] = val[y];
                                val[y] = temp;
                                setVal(Array.from(val));
                            }

                            return <div key={x.uri} className="">
                                <div className="bg-gray-200 p-1 flex justify-between">
                                    <div><span>{i+1}: </span>{x.uri}</div>
                                    <ListControlButtons
                                        arrayIndex={i}
                                        canMoveUp={_ => i !== 0}
                                        canMoveDown={_ => i < val.length - 1}
                                        moveUp={_ => swapOrder(i - 1, i)}
                                        moveDown={_ => swapOrder(i, i + 1)}
                                        remove={_ => {
                                            setVal(val.filter(y => y.uri !== x.uri));
                                        }} />
                                </div>
                                <div className="bg-white p-1">{x.text}</div>
                            </div>
                        })
                    }
                </div>
            }
            {
                val.length < minSize && <div className="mt-2 text-sm text-red-600">
                    Please add at least one post
                </div>
            }
        </div>
    </div>
}