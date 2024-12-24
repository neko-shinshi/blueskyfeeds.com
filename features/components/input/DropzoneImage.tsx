import {useDropzone} from "react-dropzone";
import clsx from "clsx";
import {useEffect, useRef, useState} from "react";
import Image from "next/image";
import {serializeFile} from "features/utils/fileUtils";

const acceptedTypes = {'image/jpeg': [".jpg", ".jpeg"], 'image/png':[".png"]};
const acceptedTypesLabel = "jpg or png";
const additionalCheck = async(file) => {
    const blobToData = (blob: Blob) => {
        return new Promise((resolve) => {
            const reader = new FileReader()
            reader.onloadend = () => resolve(reader.result)
            reader.readAsDataURL(blob)
        });
    }

    const data = await blobToData(file) as string;
    const header = data.split(",")[1].slice(0,30);
    if (header.startsWith("iVBORw0K")) {
        console.log("png");
        return "image/png";
    } else if (header.startsWith("/9j/")) {
        console.log("jpg");
        return "image/jpeg";
    } else if (header.startsWith("UklGR")) {
        console.log("webp");
        return "image/webp";
    }

    console.log("unknown");
    return false;
}

export default function DropzoneImage({path, dataManager, className=""}) {
    const imageRef = useRef(null);
    const data = useState<any>(null);
    const [file, setFile] = data;
    useEffect(() => {
        dataManager.register(path, () => {
            const v = data[0];
            return v;
        }, (val) => {
            console.log("Setting as", val);
            data[1](val);
        });
    }, [dataManager, data]);



    const {
        getRootProps,
        getInputProps,
        isDragActive,
        isDragReject,
    } = useDropzone({
        accept: acceptedTypes,
        minSize: 0,
        maxSize: 20000000,
        maxFiles: 1,
        onDrop: async (acceptedFiles, rejectedFiles) => {
            if (acceptedFiles.length === 1) {
                let file = acceptedFiles[0];
                const encoding = await additionalCheck(file);
                if (encoding) {
                    const base64img = await serializeFile(URL.createObjectURL(file));
                    console.log(base64img);
                    setFile({
                        url: `data:${encoding};base64,${base64img}`,
                        encoding
                    });
                }
            } else if (rejectedFiles.length > 0 && rejectedFiles[0].errors.length > 0) {
                alert(rejectedFiles[0].errors[0].message);
            }
        }
    });
    return <>
        <div className={clsx(className, "w-full h-full flex justify-center border-2 border-gray-300 border-dashed ")}>
            <div  {...getRootProps({className: "dropzone space-y-1 grid place-items-center p-4 w-full h-full"})}>
                <div>
                    {
                        !file &&
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
                                isDragReject ?
                                    <p className="text-xs text-gray-500 select-none">Invalid file type or file is too
                                        large <span className="select-none invisible">file here, or click to browse</span>
                                    </p> :
                                    isDragActive ?
                                        <p className="text-xs text-gray-500 select-none">Drop file here <span
                                            className="select-none invisible">file here, or click to browse</span></p> :
                                        <p className="text-xs text-gray-500 select-none">Drag & drop a <span
                                            className="font-bold text-black">{"<"}200kB {acceptedTypesLabel}</span> file
                                            here, or click to browse</p>
                            }
                        </>
                    }
                </div>
                <input {...getInputProps()} />
                {
                    file && <Image ref={imageRef} className="object-cover hover:blur-sm p-2" unoptimized fill src={file.url} alt="feed-avatar" onError={() => { /* DO NOTHING */}}/>
                }
            </div>
        </div>

    </>
}