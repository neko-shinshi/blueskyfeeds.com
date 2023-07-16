import clsx from "clsx";
import {UseFormReturn, Controller} from "react-hook-form";
import {useRef} from "react";
import SortableWordBubbles from "features/components/SortableWordBubbles";
import {dotObjectStringPath} from "features/utils/objectUtils";

export default function InputMultiWord(
    {
        labelText,
        placeHolder,
        disabled = false,
        splitWithSpace = true,
        orderedList = true,
        fieldName,
        useFormReturn,
        autoCapitalize="sentences",
        prefix="",
        className="",
        check
    }:{
        labelText:string,
        placeHolder:string,
        disabled?:boolean,
        splitWithSpace:boolean,
        orderedList:boolean
        fieldName:string,
        useFormReturn:UseFormReturn<any>,
        autoCapitalize?:"none"|"words"|"sentences"|"characters",
        prefix?:string,
        className?:string
        check?: (string, any) => void
    }) {

    const {
        control,
        formState: { errors },
    } = useFormReturn;
    const inputRef = useRef(null);


    return (
        <div className={clsx("space-y-2", className)}>
            <label htmlFor="about" className="block text-sm font-medium text-gray-700">
                {labelText}
            </label>

            <Controller
                control={control}
                name={fieldName}
                render={({field:{onChange, onBlur, value}}) => {
                    const updateText = (text) => {
                        if (!text) {
                            return;
                        }
                        let newText = splitWithSpace? text.split(" ").map(x => x.trim()).filter(y => y.length > 0) : [text.trim()].filter(y => y.length > 0);
                        if (newText.length === 0) {return;}

                        let newTags:any = new Set(value);
                        newText.forEach(z => {
                            newTags.add(z);
                        })
                        newTags = Array.from(newTags);
                        if (!orderedList) {
                            newTags.sort((a, b) => {
                                return a.toLowerCase().localeCompare(b.toLowerCase());
                            });
                        }

                        onChange(newTags)
                    }
                    return (
                        <div className="mt-1 space-y-2">
                            <div className="mt-1 flex rounded-md shadow-sm">
                                <div className="relative flex flex-grow items-stretch focus-within:z-10">
                                    <input
                                        ref={inputRef}
                                        type="text"
                                        autoComplete="off"
                                        autoCapitalize={autoCapitalize}
                                        className={clsx(disabled && "cursor-not-allowed bg-gray-300",
                                            "focus:ring-indigo-500 focus:border-indigo-500 flex-1 block w-full rounded-l-md sm:text-sm border-gray-400 border-2 p-2")}
                                        placeholder={placeHolder}
                                        disabled={disabled}
                                        onChange={() => {}}
                                        onKeyDown={async (event) => {
                                            const key = event.key;
                                            if (key === "Enter" || (splitWithSpace && key === "Space" )) {
                                                const field = (event.target as HTMLInputElement);
                                                let text = field.value;
                                                event.preventDefault();
                                                event.stopPropagation();
                                                if (check) {
                                                    check(text, () => {
                                                        updateText(text);
                                                        field.value = "";}
                                                    )
                                                } else {
                                                    updateText(text);
                                                    field.value = "";
                                                }
                                            }
                                        }}/>
                                </div>
                                <button
                                    type="button"
                                    className="relative -ml-px inline-flex items-center space-x-2 rounded-r-md border border-gray-300 bg-gray-50 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                                    onClick={async () => {
                                        const field = inputRef.current;
                                        const text = field.value;
                                        if (check) {
                                            check(text, () => {
                                                updateText(text);
                                                field.value = "";}
                                            )
                                        } else {
                                            updateText(text);
                                            field.value = "";
                                        }
                                    }}
                                >
                                    <span>Add</span>
                                </button>
                            </div>
                            {
                                dotObjectStringPath(errors, fieldName) && <div className="text-red-700">{dotObjectStringPath(errors, fieldName).message as unknown as string}</div>
                            }
                            <SortableWordBubbles value={value} orderedList={orderedList} disabled={disabled} valueModifier={text => {return`${prefix}${text}`}} updateCallback={onChange}/>
                        </div>
                    )
                }}
            />
        </div>
    )
}