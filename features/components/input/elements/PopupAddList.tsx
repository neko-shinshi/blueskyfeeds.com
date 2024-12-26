import PopupWithInputText from "features/components/PopupWithInputText";
import {getPublicAgent} from "features/utils/bsky";
import PopupLoading from "features/components/PopupLoading";
import {queryWithCursor} from "features/utils/utils";
import {ListItemView} from "@atproto/api/src/client/types/app/bsky/graph/defs";

const prefixes = [
    "at://",
    "https://bsky.app/profile/",
    "bsky.app/profile/"
];

export default function PopupAddList(
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
        placeholder="bsky.app/profile/[user]/lists/[list] or at://[user]/app.bsky.graph.list/[list]"
        validateCallback={v => {
            return prefixes.find(x => v.startsWith(x)) && (v.includes("/app.bsky.graph.list/") || v.includes("/lists/")) ? "" : "Invalid User";
        }}
        yesText="Add"
        busy={busy}
        yesCallback={async (vv:string, callback) => {
            let listId = vv.trim();
            if (listId === "") {
                resultCallback({});
                callback();
            } else {
                setBusy(true);
                const publicAgent = getPublicAgent();

                listId = prefixes.reduce((acc, x) => acc.replace(x, ""), listId);
                if (!listId.startsWith("did:plc:")) {
                    const [actor, ...rest] = listId.split("/");
                    if (!actor) {throw "unknown user";}
                    const {data:{did}} = await publicAgent.getProfile({actor});
                    if (!did) {throw "unknown user";}
                    listId = [did, ...rest].join("/");
                }

                listId = `at://${listId.replace("/lists/", "/app.bsky.graph.list/")}`;

                console.log("Checking", listId);

                try {
                    let listData:any = false;
                    const users = await queryWithCursor((o) => publicAgent.app.bsky.graph.getList(o), {list: listId},
                        ({items, list}:{items:ListItemView[], list:any}) => {
                            if (!listData) {
                                const {creator:{did, handle, displayName}, name, description, uri} = list;
                                const url = `https://bsky.app/profile/${did}/lists/${listId.at(-1)}`;
                                listData = {creator:{did, handle, displayName}, name, description, url, uri};
                            }
                            return items.map(x => {
                                const {uri, subject:{did, handle, displayName}} = x;
                                return {uri, did, handle, displayName: displayName || ""};
                            });
                        });
                    listData.users = users;
                    resultCallback(listData, callback);
                } catch (e) {
                    console.error(e);
                    if (e.error === "InternalServerError") {
                        // Invalid
                        console.log("Invalid");
                    }
                    callback("Invalid list or list not found");
                }

                setBusy(false);

            }
        }}>
        <PopupLoading isOpen={busy} />
    </PopupWithInputText>
}
