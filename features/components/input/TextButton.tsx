import clsx from "clsx";
import {HiOutlineExclamationCircle} from "react-icons/hi";
import {dotObjectStringPath} from "features/utils/objectUtils";
import {useEffect, useRef, useState} from "react";
import DataManager from "features/utils/DataManager";

export default function TextButton(
    {
        fieldReadableName,
        placeholder,
        optional=false,
        specialType,
        hiddenOrInvisible,
        buttonText="",
        buttonTextFunction,
        buttonCallback,
        autoComplete="none",
        buttonDisabled=false,
        isButtonSubmit=false,
        maxLength=100,
        disabled=false,
        subtext="",
        classNameLabel="text-sm font-medium text-gray-700",
        validate,
        path,
        dataManager
    }:{
        fieldReadableName: string,
        optional?: boolean,
        placeholder: string,
        specialType?: string,
        hiddenOrInvisible?: boolean,
        buttonText?:string,
        buttonTextFunction?:any,
        buttonCallback:any,
        autoComplete?:string,
        buttonDisabled?:boolean,
        isButtonSubmit?:boolean
        maxLength?:number
        disabled?:boolean
        subtext?:string
        classNameLabel?:string
        validate?:any,
        path:string
        dataManager:DataManager
    }) {
    const [error, setError] = useState<string>("");
    const [btnText, setBtnText] = useState(buttonText || "");
    const inputRef = useRef(null);
    useEffect(() => {
        dataManager.register(path, () => inputRef.current!.value, (val) => {
            inputRef.current!.value = val;
            if (validate) {validate(val, setError)}
            if (buttonTextFunction) { setBtnText(buttonTextFunction(val)) }
        }, () => {
            validate(inputRef.current!.value || "", setError); return error;
        });

        if (buttonTextFunction && inputRef.current) { setBtnText(buttonTextFunction(inputRef.current!.value)); }
    }, [dataManager, inputRef]);


    return <div className={hiddenOrInvisible === undefined? "" : hiddenOrInvisible? "hidden" : "invisible"}>
        <div className="flex justify-between">
            <label className={classNameLabel}>
                { fieldReadableName }
            </label>
            { optional && <span className="text-sm text-gray-500">Optional</span> }
        </div>
        {
            subtext && <div className="text-sm font-light text-gray-600">{subtext}</div>
        }
        <div className="mt-1 flex rounded-md shadow-sm">
            <div className="relative flex flex-grow items-stretch focus-within:z-10">
                <input ref={inputRef}
                    type={specialType || "text"}
                    className={clsx("block w-full focus:outline-none sm:text-sm rounded-l-md p-2",
                        disabled && "cursor-not-allowed bg-gray-200",
                        error? "pr-10 focus:border-red-500 focus:ring-red-500 border-red-300 text-red-900 placeholder-red-300"
                            :"focus:border-gray-500 focus:ring-gray-500 border-gray-300 text-gray-900 placeholder-gray-300")}
                    aria-invalid="true"
                    maxLength={maxLength}
                    autoComplete={autoComplete}
                    onChange={e => {
                        if (validate) {validate(e.target.value, setError)}
                        if (buttonTextFunction) { setBtnText(buttonTextFunction(e.target.value)) }
                    }}
                    placeholder={placeholder}
                />
                {
                    error &&
                    <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-3">
                        <HiOutlineExclamationCircle className="h-5 w-5 text-red-500" aria-hidden="true"/>
                    </div>
                }
            </div>
            <button
                type={isButtonSubmit? "submit":"button"}
                className={clsx(buttonDisabled && "cursor-not-allowed","relative -ml-px inline-flex items-center space-x-2 rounded-r-md border border-gray-300 bg-gray-50 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500")}
                onClick={buttonCallback}
            >
                <span>{ btnText }</span>
            </button>
        </div>
        {
            error &&
            <p className="mt-2 text-sm text-red-600" id={`${path}-error`}>
                {error}
            </p>
        }
    </div>

}