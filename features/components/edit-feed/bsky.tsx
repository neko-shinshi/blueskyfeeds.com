import {HiTrash} from "react-icons/hi";
import DropzoneImage from "features/components/input/DropzoneImage";
import TextButton from "features/components/input/TextButton";
import TextArea from "features/components/input/TextArea";
import DataManager from "features/components/input/DataManager";

export default function ItemBsky({shortNameLocked, setPopupState, dataManager, feedShortNames}:
{shortNameLocked:boolean, setPopupState?:any, dataManager:DataManager, feedShortNames:string[]}) {
    return <div className="bg-white p-2">
        <div className="flex justify-between">
            <div className="flex place-items-center gap-2">
                <div className="font-bold text-lg">Bluesky Feed Settings</div>
                <div>(This info is submitted to Bluesky and not stored here)</div>
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
                    <DropzoneImage path="image" dataManager={dataManager} />
                </div>
            </div>

            <div className="grow">
                <TextButton
                    maxLength={24}
                    fieldReadableName="Feed Full Name (Max 24 characters)"
                    validate={(val:string, setError:any) => {
                        if (val.trim().length === 0) {
                            setError("This is required");
                        } else {
                            setError("");
                        }
                    }}
                    dataManager={dataManager}
                    path="displayName"
                    placeholder="My Amazing Feed"
                    optional={false}
                    buttonDisabled={shortNameLocked}
                    buttonText="Make Short Name"
                    buttonCallback={() => {
                        if (!shortNameLocked) {
                            const name = dataManager.get("displayName").toLowerCase().replaceAll(" ", "-").replaceAll(/[^a-z0-9-_]/g, "").slice(0,15);
                            dataManager.set("shortName", name);
                        }
                    }} />
                <TextButton
                    dataManager={dataManager}
                    path="shortName"
                    maxLength={15}
                    disabled={shortNameLocked}
                    fieldReadableName="Unique Short Name among all your feeds visible in the URL 'feed/short_name' (CANNOT be changed once submitted)"
                    subtext="(alphanumeric and dashes only, max 15 characters) [0-9a-zA-z-]"
                    validate={(val:string, setError:any) => {
                        if (shortNameLocked) { setError(""); }
                        else if (val.trim().length === 0) {
                            setError("This is required");
                        } else if (!/^[a-zA-Z0-9_-]+$/.test(val)){
                            setError("Only alphanumeric and dashes allowed");
                        } else if (feedShortNames.includes(val)) {
                            setError(`You already have a feed with short name '${val}'. Delete it first`);
                        } else{
                            setError("");
                        }
                    }}
                    placeholder="my-amazing-feed"
                    buttonTextFunction={(txt:string) => {
                        return `${15-(txt.length || 0)} left`;
                    }}
                    buttonCallback={() => {}}
                    buttonDisabled={true}
                />
                <TextArea path="description" optional={true} fieldReadableName="Description (Max 200 characters)" maxLength={200} placeholder="This is an amazing feed, please use it" dataManager={dataManager} validate={() => {}}/>
            </div>
        </div>
    </div>
}