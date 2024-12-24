import React from "react";
import PopupWithInputText from "features/components/PopupWithInputText";
import {getPostInfo, getPublicAgent} from "features/utils/bsky";
import PopupLoading from "features/components/PopupLoading";
export default function PopupWithAddPost(
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
        resultCallback,
        limitOne?:boolean
    }) {

    return <PopupWithInputText
        isOpen={isOpen}
        setOpen={setOpen}
        title={title}
        message={message}
        placeholder="bsky.app/profile/[user]/post/[id] or [user]/post/[id] or at://[user]/app.bsky.feed.post/[id] or "
        validateCallback={(v) => {
            return (v.includes("/post/") || (v.startsWith("at://did:plc:") && v.includes("/app.bsky.feed.post/"))) ? "" : "Invalid Post";
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
                let posts:any[];
                if (!limitOne && v.startsWith("[")) {
                    // Multi
                    posts = v.replaceAll("\\[|\\]", "").split(/,(\s)?/).filter(x=> !!x && x !== " ").map(x => x.startsWith("bsky.app/profile/")? `https://${x.trim()}` : x.trim());
                } else {
                    posts = [v.startsWith("bsky.app/profile/")? `https://${v}` : v];
                }
                try {
                    const postData = (await getPostInfo(publicAgent, posts)).map(post => {
                        const {text, uri} = post;
                        return {text, uri};
                    });
                    console.log("posts",postData);
                    if (limitOne) {
                        const [post] = postData;
                        const {uri, text} = post;
                        resultCallback({uri, text});
                        callback();
                    } else {
                        resultCallback(postData, callback);
                    }
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
