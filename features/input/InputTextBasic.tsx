import clsx from "clsx";
import {HiOutlineExclamationCircle} from "react-icons/hi";
import {dotObjectStringPath} from "features/utils/objectUtils";

export default function InputTextBasic(
    {
        fieldName,
        fieldReadableName,
        placeholder="",
        initialValue,
        options={},
        useFormReturn,
        optional=false,
        specialType,
        hiddenOrInvisible,
        disabled=false,
        minLength=0,
        maxLength=100,
        autoComplete,
        autoCapitalize="sentences"
    }:{
        fieldName: string,
        fieldReadableName: string,
        options?: Object,
        useFormReturn: any,
        optional?: boolean,
        placeholder?: string,
        initialValue?: string,
        specialType?: string,
        hiddenOrInvisible?: boolean,
        disabled?:boolean,
        minLength?:number
        maxLength?:number
        autoComplete?:string
        autoCapitalize?:"none"|"sentences"|"words"|"characters"
    }) {
    const {
        register,
        formState: { errors },
    } = useFormReturn;


    return (
        <div className={hiddenOrInvisible === undefined? "" : hiddenOrInvisible? "hidden" : "invisible"}>
            <div className="flex justify-between">
                <label className="block text-sm font-medium text-gray-700">
                    { fieldReadableName }
                </label>
                { optional && <span className="text-sm text-gray-500">Optional</span> }
            </div>
            <div className="mt-1 relative rounded-md shadow-sm">
                <input
                    type={specialType || "text"}
                    className={clsx(
                        disabled && "cursor-not-allowed bg-gray-200",
                        "block w-full focus:outline-none sm:text-sm rounded-md appearance-none block px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400",
                        dotObjectStringPath(errors, fieldName)? "pr-10 focus:border-red-500 focus:ring-red-500 border-red-300 text-red-900 placeholder-red-300"
                            :"text-gray-900 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm")}
                    aria-invalid="true"
                    placeholder={placeholder}
                    defaultValue={initialValue}
                    disabled={disabled}
                    autoComplete={autoComplete}
                    autoCapitalize={autoCapitalize}
                    minLength={minLength}
                    maxLength={maxLength}
                    {...register(fieldName, options || (!optional && {required: `${fieldReadableName} is required}`}))}
                />
                {
                    dotObjectStringPath(errors, fieldName) &&
                    <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                        <HiOutlineExclamationCircle className="h-5 w-5 text-red-500" aria-hidden="true"/>
                    </div>
                }
            </div>
            {
                dotObjectStringPath(errors,fieldName) &&
                <p className="mt-2 text-sm text-red-600" >
                    {dotObjectStringPath(errors, fieldName).message as unknown as string}
                </p>
            }
        </div>
    )
}