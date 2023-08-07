import {HiTrash} from "react-icons/hi";
import InputFileDropzone from "features/input/InputFileDropzone";
import Image from "next/image";
import InputTextButton from "features/input/InputTextButton";
import InputTextAreaBasic from "features/input/InputTextAreaBasic";
import {useRef} from "react";

export default function BlueskyForm({shortNameLocked, setPopupState, useFormReturn}) {
    const {
        watch,
        getValues,
        setValue,
    } = useFormReturn;
    const watchFile = watch("file");
    const watchShortName = watch("shortName");
    const imageRef = useRef(null);

    return <div className="bg-white p-2">
        <div className="flex justify-between">
            <div className="flex place-items-center gap-2">
                <div className="font-bold text-lg">Bluesky Feed Settings</div>
                <div>(This info is submitted to Bluesky)</div>
            </div>
            {
                shortNameLocked &&
                <button type="button"
                        onClick={() => {if (shortNameLocked) {setPopupState("delete")}}}
                        className="p-1 inline-flex items-center rounded-md shadow-sm text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500">
                    <HiTrash className="w-6 h-6"/>
                    <div className="text-lg font-medium">Delete this feed</div>
                </button>
            }

        </div>
        <div className="flex w-full place-items-center gap-4">
            <div>
                <div className="text-center">Feed Avatar</div>
                <div className="w-40 h-40 aspect-square relative rounded-xl overflow-hidden">
                    <InputFileDropzone
                        fieldName="file"
                        className="inset-0 absolute rounded-xl z-10"
                        useFormReturn={useFormReturn}
                        acceptedTypes={{'image/jpeg': [".jpg", ".jpeg"], 'image/png':[".png"]}}
                        acceptedTypesLabel="jpg or png"/>
                    {
                        watchFile && <Image ref={imageRef} className="object-cover hover:blur-sm" unoptimized fill src={watchFile.url} alt="feed-avatar" />
                    }
                </div>
            </div>

            <div className="grow">
                <InputTextButton
                    maxLength={24}
                    fieldName="displayName"
                    fieldReadableName="Feed Full Name (Max 24 characters)"
                    options={{required: "This is required"}}
                    useFormReturn={useFormReturn}
                    placeholder="My Amazing Feed"
                    optional={false}
                    buttonDisabled={shortNameLocked}
                    buttonText="Make Short Name"
                    buttonCallback={() => {
                        if (!shortNameLocked) {
                            const name = getValues("displayName");
                            setValue("shortName", name.toLowerCase().replaceAll(" ", "-").replaceAll(/[^a-z0-9-_]/g, "").slice(0,15));
                        }
                    }} />
                <InputTextButton
                    maxLength={15} fieldName="shortName" disabled={shortNameLocked}
                    fieldReadableName="Unique Short Name among all your feeds (CANNOT be changed once submitted)"
                    subtext="(alphanumeric and dashes only, max 15 characters) [0-9a-zA-z-]"
                    options={
                        {
                            required: "This is required",
                            pattern: {
                                value: /^[a-zA-Z0-9_-]+$/,
                                message: 'Only alphanumeric and dashes allowed',
                            }
                        }} useFormReturn={useFormReturn} placeholder="my-amazing-feed"
                    buttonText={`${15-(watchShortName?.length || 0)} left`}
                    buttonCallback={() => {}}
                    buttonDisabled={true}
                />
                <InputTextAreaBasic fieldName="description" fieldReadableName="Description (Max 200 characters)" maxLength={200} options={{}} useFormReturn={useFormReturn} placeholder="This is an amazing feed, please use it" />
            </div>
        </div>
    </div>
}