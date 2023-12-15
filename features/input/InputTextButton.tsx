import clsx from "clsx";
import {HiOutlineExclamationCircle} from "react-icons/hi";
import {dotObjectStringPath} from "features/utils/objectUtils";
import {useEffect} from "react";

export default function InputTextButton(
    {
        fieldName,
        fieldReadableName,
        placeholder,
        options,
        useFormReturn,
        optional=false,
        specialType,
        hiddenOrInvisible,
        buttonText,
        buttonCallback,
        autoComplete="none",
        buttonDisabled=false,
        isButtonSubmit=false,
        maxLength=100,
        disabled=false,
        subtext="",
        classNameLabel="text-sm font-medium text-gray-700"
    }:{
        fieldName: string,
        fieldReadableName: string,
        options: any,
        useFormReturn: any,
        optional?: boolean,
        placeholder: string,
        specialType?: string,
        hiddenOrInvisible?: boolean,
        buttonText:string,
        buttonCallback:any,
        autoComplete?:string,
        buttonDisabled?:boolean,
        isButtonSubmit?:boolean
        maxLength?:number
        disabled?:boolean
        subtext?:string
        classNameLabel?:string
    }) {
    const {
        register,
        formState: { errors },
    } = useFormReturn;


    return (
        <div className={hiddenOrInvisible === undefined? "" : hiddenOrInvisible? "hidden" : "invisible"}>
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
                    <input
                        type={specialType || "text"}
                        className={clsx("block w-full focus:outline-none sm:text-sm rounded-l-md p-2",
                            disabled && "cursor-not-allowed bg-gray-200",
                            dotObjectStringPath(errors, fieldName)? "pr-10 focus:border-red-500 focus:ring-red-500 border-red-300 text-red-900 placeholder-red-300"
                                :"focus:border-gray-500 focus:ring-gray-500 border-gray-300 text-gray-900 placeholder-gray-300")}
                        aria-invalid="true"
                        maxLength={maxLength}
                        autoComplete={autoComplete}
                        placeholder={placeholder}
                        {...register(fieldName, options)}
                    />
                    {
                        dotObjectStringPath(errors, fieldName) &&
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
                    <span>{buttonText}</span>
                </button>
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