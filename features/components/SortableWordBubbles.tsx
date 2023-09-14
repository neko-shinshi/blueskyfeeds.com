import clsx from "clsx";
import {HiChevronDoubleLeft, HiX} from "react-icons/hi";

export default function SortableWordBubbles({value, orderedList=undefined, disabled=false, valueModifier , className="", buttonCallback, classModifier=(val, index, original)=>original, selectable=false, clickable=true}) {
    return <div className={clsx(className,"-m-1 flex flex-wrap items-center border-dashed border-2 border-black rounded-xl gap-2")}>
        {
            (!value || value.length == 0) &&
                <span className="h-8"><span className="select-none">&nbsp;</span></span>
        }
        {
            value && value.length > 0 &&
            (value as Array<any>).map((tag, index) => {
                const stringValue = valueModifier(tag);
                return <span key={stringValue}
                             onClick={() => {
                                 if (clickable && selectable) {
                                     buttonCallback(tag, "o");
                                 }
                             }}
                             className={classModifier(tag, index, clsx( "border-black",
                                 disabled && "cursor-not-allowed bg-gray-300",
                                 "inline-flex rounded-full border items-center py-1.5 pl-3 pr-2 text-sm font-medium bg-white text-gray-900"))}>
                    <span>{stringValue}</span>
                    {
                        clickable && orderedList && (value as Array<any>).length > 1 && index > 0 && (
                            <button type="button"
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        buttonCallback(tag, "<");
                                    }}
                                    disabled={disabled}
                                    className={clsx(
                                        disabled? "cursor-not-allowed":"hover:bg-gray-200 hover:text-gray-500",
                                        "flex-shrink-0 ml-1 rounded-full inline-flex text-gray-400")}>
                                <span className="sr-only">Bring {stringValue} to front </span>
                                <HiChevronDoubleLeft className="h-6 w-6 text-black"/>
                            </button>
                        )
                    }
                    {
                        clickable &&
                        <button type="button"
                                onClick={(e) => {
                                    e.stopPropagation();
                                    buttonCallback(tag, "x");
                                }}
                                disabled={disabled}
                                className={clsx(
                                    disabled? "cursor-not-allowed":"hover:bg-gray-200 hover:text-gray-500",
                                    "flex-shrink-0 ml-1 rounded-full inline-flex text-gray-400")}>
                            <HiX className="h-6 w-6 text-black" title={`Remove ${stringValue}`}/>
                        </button>
                    }

                </span>
            })
        }
    </div>
}