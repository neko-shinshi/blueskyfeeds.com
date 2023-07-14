import clsx from "clsx";
import {UseFormReturn} from "react-hook-form";
import {useEffect, useState} from "react";
import {dotObjectStringPath} from "features/utils/objectUtils";
import $ from 'jquery'

export default function InputRadio(
    {
        fieldName,
        fieldReadableName,
        cleanName,
        useFormReturn,
        items,
        hiddenOrInvisible,
        disabled=false,
        unregistered=false,
        entriesPerRow=4,
    }:{
        fieldName: string,
        fieldReadableName: string,
        cleanName?:string,
        useFormReturn: UseFormReturn<any>
        items: Array<{id:string, txt:string}>
        hiddenOrInvisible?: boolean,
        disabled?:boolean,
        unregistered?:boolean,
        entriesPerRow?:number
    }) {
    const {
        register,
        setValue,
        formState: { errors },
    } = useFormReturn;

    const [cleanReadableName, setCleanReadableName] = useState("");
    useEffect(() => {
        if (cleanName) {
            setCleanReadableName(cleanName);
        } else {
            setCleanReadableName(fieldReadableName);
        }
    }, [cleanName]);

    const [entries, setEntries] = useState("");

    useEffect(() => {
        setEntries(`grid-cols-${entriesPerRow}`);
    }, [entriesPerRow])

    return (
        <div className={hiddenOrInvisible === undefined? "" : hiddenOrInvisible? "hidden" : "invisible"}>
            <label htmlFor={fieldName} className="block text-sm font-medium text-gray-700">
                { fieldReadableName }
            </label>

            <div className={clsx("sm:space-y-0 space-y-4 sm:grid sm:items-center sm:gap-2 mt-2", entries)}>
                {
                    items.map((item, i) => {
                        const idComponent = item.id;
                        return (
                            <div key={idComponent}
                                 className="flex items-center bg-orange-100 hover:bg-gray-50 p-2 rounded-md"
                                 onClick={() => {
                                     setValue(fieldName, idComponent,{ shouldDirty: true });
                                     $(`#r-${fieldName}-${idComponent}`).click();
                                 }}>
                                {
                                    unregistered? <input
                                        type="radio"
                                        disabled={true}
                                        className="cursor-not-allowed bg-gray-400 focus:ring-indigo-500 h-4 w-4 text-indigo-600 border-gray-300"
                                        value={idComponent}
                                    /> : <input
                                        id={`r-${fieldName}-${idComponent}`}
                                        type="radio"
                                        className={clsx(disabled && "cursor-not-allowed bg-gray-300", "focus:ring-indigo-500 h-4 w-4 text-indigo-600 border-gray-300")}
                                        value={idComponent}
                                        disabled={disabled}
                                        {...register(fieldName, {required: `${fieldReadableName} is required`})}
                                    />
                                }
                                <label
                                    className={clsx(dotObjectStringPath(errors, fieldName) ? "text-red-700" : "text-gray-700", "ml-3 block text-sm font-medium")}>
                                    {item.txt}
                                </label>
                            </div>
                        )
                    })
                }
            </div>
            {
                dotObjectStringPath(errors, fieldName) &&
                <p className="mt-2 text-sm text-red-600" id={`${fieldName}-error`}>
                    {dotObjectStringPath(errors, fieldName).message as unknown as string}
                </p>
            }
        </div>
    )
}