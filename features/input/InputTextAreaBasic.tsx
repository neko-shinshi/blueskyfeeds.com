import clsx from "clsx";
import {dotObjectStringPath} from "features/utils/objectUtils";
import {HiExclamationCircle} from "react-icons/hi";

export default function InputTextAreaBasic(
    {
        fieldName,
        fieldReadableName,
        placeholder,
        options={},
        useFormReturn,
        optional=false,
        hiddenOrInvisible,
        disabled=false,
        maxLength=undefined,
        parentFieldName="",
    }:{
        fieldName: string,
        fieldReadableName: string,
        options?: Object,
        useFormReturn: any,
        optional?: boolean,
        placeholder: string,
        hiddenOrInvisible?: boolean,
        disabled?:boolean,
        maxLength?:number
        parentFieldName?:string
    }) {
    const {
        register,
        watch,
        setValue,
        formState: { errors },
    } = useFormReturn;

    const watchField = watch(fieldName);

    return (
        <div className={hiddenOrInvisible === undefined? "" : hiddenOrInvisible? "hidden" : "invisible"}>
            <div className="flex justify-between">
                <label className="block text-sm font-medium text-gray-700">
                    { fieldReadableName }
                </label>
                { optional && <span className="text-sm text-gray-500">Optional</span> }
            </div>
            <div className="mt-1 relative rounded-md shadow-sm">
                <textarea
                    className={clsx(
                        disabled && "cursor-not-allowed bg-gray-200",
                        "border-2 border-black p-2 min-h-[5rem]",
                        "block w-full focus:outline-none sm:text-sm rounded-md",
                        dotObjectStringPath(errors, fieldName)? "pr-10 focus:border-red-500 focus:ring-red-500 border-red-300 text-red-900 placeholder-red-300"
                            :"focus:border-gray-500 focus:ring-gray-500 border-gray-300 text-gray-900 placeholder-gray-300")}
                    aria-invalid="true"
                    placeholder={placeholder}
                    disabled={disabled}
                    maxLength={maxLength}
                    {...register(fieldName, options)}
                />
                {
                    dotObjectStringPath(errors, fieldName) &&
                    <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                        <HiExclamationCircle className="h-5 w-5 text-red-500" aria-hidden="true"/>
                    </div>
                }
                {
                    maxLength && watchField && <div className="absolute bottom-0 right-4 text-gray-600 text-sm">{watchField.length}/200</div>
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