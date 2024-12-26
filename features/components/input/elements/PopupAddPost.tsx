import PopupWithInputText from "features/components/PopupWithInputText";
import {getPostInfo, getPublicAgent} from "features/utils/bsky";
import PopupLoading from "features/components/PopupLoading";
import {cleanupStringToArray} from "features/utils/utils";
export default function PopupAddPost(
    {
        isOpen,
        setOpen,
        title,
        message,
        busy,
        setBusy,
        resultCallback,
        limitOne=true
    }: {
        isOpen:boolean
        setOpen:(boolean) => void,
        title:string,
        message:string,
        busy:boolean
        setBusy:any
        resultCallback:any,
        limitOne?:boolean
    }) {

    return <PopupWithInputText
        isOpen={isOpen}
        setOpen={setOpen}
        title={title}
        message={message}
        placeholder="bsky.app/profile/[user]/post/[id] or [user]/post/[id] or at://[user]/app.bsky.feed.post/[id]"
        validateCallback={x => {
            return cleanupStringToArray(x).every(v => v.includes("/post/") || (v.startsWith("at://did:plc:") && v.includes("/app.bsky.feed.post/"))) ? "" : "Invalid Post";
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
                let posts = cleanupStringToArray(v).map(post => post.startsWith("bsky.app/profile/")? `https://${post.trim()}` : post.trim());

                try {
                    if (posts.length < 0) {
                        throw "no posts";
                    }
                    if (limitOne) {
                        posts = posts.slice(0,1);
                    }
                    console.log("SENDING", posts);
                    const postData = (await getPostInfo(publicAgent, posts)).map(post => {
                        const {text, uri, author} = post;
                        const url = `https://bsky.app/profile/${author.handle}/post/${uri.split("/").at(-1)}`;
                        return {text, uri, author, url};
                    });
                    console.log("posts", postData);
                    resultCallback(postData, callback);
                } catch (e) {
                    console.error(e);
                    if (e.error === "InternalServerError") {
                        // Invalid
                        console.log("Invalid");
                    }
                    callback("Invalid post or post not found");
                }

                setBusy(false);

            }
        }}>
        <PopupLoading isOpen={busy} />
    </PopupWithInputText>
}
