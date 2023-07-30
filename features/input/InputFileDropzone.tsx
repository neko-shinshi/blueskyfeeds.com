import {useDropzone} from "react-dropzone";
import clsx from "clsx";
import {Controller} from "react-hook-form";

export default function InputFileDropzone ({fieldName, acceptedTypes, acceptedTypesLabel, useFormReturn, className=""}) {
    const {
        control,
        watch
    } = useFormReturn;

    const watchFile = watch(`${fieldName}`);

    const DropZone = ({ onChange }) => {
        const {
            getRootProps,
            getInputProps,
            isDragActive,
            isDragReject,
        } = useDropzone({
            accept: acceptedTypes,
            minSize: 0,
            maxSize: 200000,
            maxFiles: 1,
            onDrop: (acceptedFiles, rejectedFiles) => {
                if (acceptedFiles.length === 1) {
                    let file = acceptedFiles[0];
                    onChange({
                        changed: true,
                        url: URL.createObjectURL(file),
                        type: file.type
                    });
                } else if (rejectedFiles.length > 0 && rejectedFiles[0].errors.length > 0) {
                    alert(rejectedFiles[0].errors[0].message);
                }
            }
        });
        return  (
            <div className={clsx(className, "w-full h-full flex justify-center border-2 border-gray-300 border-dashed ")}>
                <div  {...getRootProps({className: "dropzone space-y-1 grid place-items-center p-4 w-full h-full"})}>
                    <div>
                        {
                            !watchFile &&
                            <>
                                <svg
                                    className="mx-auto h-12 w-12 text-gray-400"
                                    stroke="currentColor"
                                    fill="none"
                                    viewBox="0 0 48 48"
                                    aria-hidden="true"
                                >
                                    <path
                                        d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8m-12 4h.02"
                                        strokeWidth={2}
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                    />
                                </svg>
                                {
                                    isDragReject?
                                        <p className="text-xs text-gray-500 select-none">Invalid file type or file is too large <span className="select-none invisible">file here, or click to browse</span></p> :
                                        isDragActive ?
                                            <p className="text-xs text-gray-500 select-none">Drop file here <span className="select-none invisible">file here, or click to browse</span></p> :
                                            <p className="text-xs text-gray-500 select-none">Drag & drop a <span className="font-bold text-black">{"<"}200kB {acceptedTypesLabel}</span> file here, or click to browse</p>
                                }
                            </>
                        }


                    </div>

                    <input {...getInputProps()} />
                </div>
            </div>
        )
    }

    return (
        <Controller
            control={control}
            name={fieldName}
            render={({field:{onChange, onBlur, value}}) =>
                <DropZone onChange={onChange}/>}
        />
    )
}