import PopupWithInputText from "features/components/PopupWithInputText";
import {getActorsInfo, getPublicAgent} from "features/utils/bsky";
import PopupLoading from "features/components/PopupLoading";
import {cleanupStringToArray} from "features/utils/utils";
export default function PopupAddUsers(
    {
        isOpen,
        setOpen,
        title,
        message,
        busy,
        setBusy,
        resultCallback
    }: {
        isOpen:boolean
        setOpen:(boolean) => void,
        title:string,
        message:string,
        busy:boolean
        setBusy:any
        resultCallback:any
    }) {

    return <PopupWithInputText
        isOpen={isOpen}
        setOpen={setOpen}
        title={title}
        message={message}
        placeholder="bsky.app/profile/[user] or or did:plc or handle"
        validateCallback={x => {
            return cleanupStringToArray(x).every(v => v.includes(".") || v.startsWith("did:plc:") && v.includes("bsky.app/profile/")) ? "" : "Invalid User";
        }}
        yesText="Add"
        busy={busy}
        yesCallback={async (vv:string, callback) => {
            const v = vv.trim();
            if (v === "") {
                resultCallback({});
                callback();
            } else {
                setBusy(true);
                const publicAgent = getPublicAgent();
                const actors = cleanupStringToArray(v).map(x => {
                    if (x.startsWith("https://")) {
                        return x.split("/").at(4);
                    }
                    if (x.startsWith("bsky.app")) {
                        return x.split("/").at(2);
                    }
                    return x;
                });

                console.log("actors:", actors);

                try {
                    resultCallback(await getActorsInfo(publicAgent, actors), callback);
                } catch (e) {
                    console.error(e);
                    if (e.error === "InternalServerError") {
                        // Invalid
                        console.log("Invalid");
                    }
                    callback("Invalid users or users not found");
                }

                setBusy(false);

            }
        }}>
        <PopupLoading isOpen={busy} />
    </PopupWithInputText>
}
