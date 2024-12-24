import {
    FeedKeyword,
    KeywordType,
    MAX_KEYWORDS_PER_LIVE_FEED
} from "features/utils/constants";
import SortableWordBubbles from "features/components/SortableWordBubbles";
import {useEffect, useState} from "react";
import DataManager from "features/utils/DataManager";
import {HiPlus} from "react-icons/hi";
import PopupAddKeyword from "features/components/input/elements/PopupAddKeyword";
import clsx from "clsx";

export default function Keywords({VIP, className="bg-sky-100", blockOnly=false, path, dataManager, minSize=0, title, description=<></>, busy, setBusy}:
                                     {VIP:boolean, className?:string, blockOnly?:boolean, path:string, dataManager:DataManager, minSize?:number, title:string, description?:any, busy:boolean, setBusy:any}) {
    const data = useState<FeedKeyword[]>([]);
    const [keywords, setKeywords] = data;
    const [editTag, setEditTag] = useState<any>(null);
    const [popupOpen, setPopupOpen] = useState(false);

    useEffect(() => {
        dataManager.register(path, () => {
            const v = data[0];
            return v;
        }, (val) => {
            console.log("Setting as", val);
            data[1](val);
        }, () => {
            const myVal = data[0];
            console.log(myVal, myVal.length, minSize, myVal.length < minSize);
            return myVal.length < minSize ? "fail" : "";
        });
    }, [dataManager, data]);


    return <div className={clsx("p-3 rounded-xl border-2 border-black", className)}>
        <PopupAddKeyword isOpen={popupOpen} setOpen={setPopupOpen} keywords={keywords} busy={busy} setBusy={setBusy}/>

        <div className="font-bold text-lg">{minSize === 0 && "[Optional] "}{title} Keywords ({keywords.length}{!VIP && `/${MAX_KEYWORDS_PER_LIVE_FEED}`})</div>
        { description }
        <button
            type="button"
            className="relative -ml-px my-2 inline-flex items-center space-x-2 rounded-md border border-gray-300 bg-gray-50 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            onClick={() => setPopupOpen(true)}
        >
            <div className="flex gap-2 place-items-center"><HiPlus className="w-4 h-4"/><span>Add a keyword</span></div>
        </button>

        <SortableWordBubbles
            className="mt-2"
            value={keywords}
            selectable={true}
            valueModifier={(val) => {
                switch (val.t) {
                    case "#":
                        return `#${val.w}`;
                    case "s": {
                        const v = val.r.length === 0 ? "" : ` -[${val.r.map(x => [x.p, val.w, x.s].filter(x => x).join("")).join(", ")}]`;
                        return `[${val.w}]${v}`;

                    }
                    case "t": {
                        const v = val.r.length === 0 ? "" : ` -[${val.r.map(x => [x.p, val.w, x.s].filter(x => x).join(" ")).join(", ")}]`;
                        return `${val.w}${v}`;
                    }
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
                        /*switch (val.t) {
                            case "t": {setNewKeywordMode('token'); break;}
                            case "s": {setNewKeywordMode('segment'); break;}
                            case "#": {setNewKeywordMode('hashtag'); break;}
                        }*/
                        setEditTag(val);
                    }
                }
            }
            }/>
        {
            !!minSize && keywords.length < minSize && <div className="mt-4 font-semibold text-md text-red-600">
                {`Please add at least ${minSize} ${title} Keyword${minSize > 1 ? 's' : ''}`}
            </div>
        }
    </div>
}