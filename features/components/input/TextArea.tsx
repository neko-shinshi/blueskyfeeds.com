import clsx from "clsx";
import {HiExclamationCircle} from "react-icons/hi";
import {useEffect, useRef, useState} from "react";
import DataManager from "features/utils/DataManager";

export default function TextArea (
    {
        fieldReadableName,
        placeholder,
        optional=false,
        hiddenOrInvisible,
        disabled=false,
        maxLength=undefined,
        validate,
        path,
        dataManager
    }:{
        fieldReadableName: string,
        optional?: boolean,
        placeholder: string,
        hiddenOrInvisible?: boolean,
        disabled?:boolean,
        maxLength?:number,
        validate?:any,
        path:string
        dataManager:DataManager
    }) {
    const [error, setError] = useState<string>("");
    const inputRef = useRef(null);
    useEffect(() => {
        dataManager.register(path, () => inputRef.current!.value, (val) => {
            inputRef.current!.value = val;
            validate(val, setError);
        }, () => {validate(inputRef.current!.val, setError); return error});
    }, [dataManager]);

    return <div className={hiddenOrInvisible === undefined? "" : hiddenOrInvisible? "hidden" : "invisible"}>
        <div className="flex justify-between">
            <label className="block text-sm font-medium text-gray-700">
                { fieldReadableName }
            </label>
            { optional && <span className="text-sm text-gray-500">Optional</span> }
        </div>
        <div className="mt-1 relative rounded-md shadow-sm">
            <textarea
                ref={inputRef}
                className={clsx(
                    disabled && "cursor-not-allowed bg-gray-200",
                    "border-2 border-black p-2 min-h-[5rem]",
                    "block w-full focus:outline-none sm:text-sm rounded-md",
                    error? "pr-10 focus:border-red-500 focus:ring-red-500 border-red-300 text-red-900 placeholder-red-300"
                        :"focus:border-gray-500 focus:ring-gray-500 border-gray-300 text-gray-900 placeholder-gray-300")}
                aria-invalid="true"
                placeholder={placeholder}
                disabled={disabled}
                onChange={e => {
                    if (validate) { validate(e.target.value, setError); }
                }}
                maxLength={maxLength}
            />
            {
                error &&
                <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                    <HiExclamationCircle className="h-5 w-5 text-red-500" aria-hidden="true"/>
                </div>
            }
            {
                maxLength && inputRef.current?.value && <div className="absolute bottom-0 right-4 text-gray-600 text-sm">{inputRef.current?.value.length}/200</div>
            }
        </div>

        {
            error &&
            <p className="mt-2 text-sm text-red-600" >
                {error}
            </p>
        }
    </div>

}