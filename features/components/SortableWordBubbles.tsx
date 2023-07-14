import clsx from "clsx";
import {HiChevronDoubleLeft, HiX} from "react-icons/hi";

export default function SortableWordBubbles({value, orderedList, disabled, valueModifier , updateCallback, classModifier=(val,index, original)=>original}) {
    return <div className="-m-1 flex flex-wrap items-center border-dashed border-2 border-black rounded-xl gap-2">
        {
            (!value || value.length == 0) &&
                <span className="h-8"><span className="select-none">&nbsp;</span></span>
        }
        {
            value && value.length > 0 &&
            (value as Array<any>).map((tag, index) => (
                <span key={tag}
                      className={classModifier(tag, index, clsx((orderedList && index === 0)? "border-red-500" : "border-black",
                          disabled && "cursor-not-allowed bg-gray-300",
                          "inline-flex rounded-full border items-center py-1.5 pl-3 pr-2 text-sm font-medium bg-white text-gray-900"))}>
                    <span>{valueModifier(tag)}</span>
                    {
                        orderedList && (value as Array<any>).length > 1 && index > 0 && (
                            <button type="button"
                                    onClick={() => {
                                        updateCallback([tag].concat(value.filter(x => x !== tag)));
                                    }}
                                    disabled={disabled}
                                    className={clsx(
                                        disabled? "cursor-not-allowed":"hover:bg-gray-200 hover:text-gray-500",
                                        "flex-shrink-0 ml-1 rounded-full inline-flex text-gray-400")}>
                                <span className="sr-only">Bring {tag} to front </span>
                                <HiChevronDoubleLeft className="h-6 w-6"/>
                            </button>
                        )
                    }
                    <button type="button"
                            onClick={() => {
                                updateCallback(value.filter(x => x !== tag));
                            }}
                            disabled={disabled}
                            className={clsx(
                                disabled? "cursor-not-allowed":"hover:bg-gray-200 hover:text-gray-500",
                                "flex-shrink-0 ml-1 rounded-full inline-flex text-gray-400")}>
                        <span className="sr-only">Remove {tag}</span>
                        <HiX className="h-6 w-6"/>
                    </button>
                </span>
            ))
        }
    </div>
}