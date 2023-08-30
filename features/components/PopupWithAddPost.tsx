import React from "react";
import {localGet} from "features/network/network";
import PopupWithInputText from "features/components/PopupWithInputText";
export default function PopupWithAddPost(
    {
        isOpen,
        setOpen,
        title,
        message,
        recaptcha,
        setBusy,
        resultCallback,
        limitOne=true
    }: {
        isOpen:boolean
        setOpen:(boolean) => void,
        title:string,
        message:string,
        recaptcha:any
        setBusy:any
        resultCallback,
        limitOne?:boolean
    }) {

    return  <PopupWithInputText
        isOpen={isOpen}
        setOpen={setOpen}
        title={title}
        message={message}
        placeholder="[user]/post/[id] or at://[user]/app.bsky.feed.post/[id]"
        validateCallback={(v) => {
            return (v.includes("/post/") || (v.startsWith("at://did:plc:") && v.includes("/app.bsky.feed.post/"))) ? "" : "Invalid Post";
        }}
        yesCallback={(vv:string, callback) => {
            const v = vv.trim();
            if (v === "") {
                resultCallback({});
                callback();
            } else {
                if (typeof recaptcha !== 'undefined') {
                    setBusy(true);
                    recaptcha.ready(async () => {
                        let posts;
                        console.log("v", v)
                        if (!limitOne && v.startsWith("[")) {
                            // Multi
                            posts = v.slice(1, -1).split(/,(\s)?/).filter(x=>x && x !== " ").map(x => x.startsWith("bsky.app/profile/")? `https://${x.trim()}` : x.trim());
                        } else {
                            posts = [v.startsWith("bsky.app/profile/")? `https://${v}` : v];
                        }

                        console.log("posts",posts);

                        //@ts-ignore
                        const captcha = await recaptcha.execute(process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY, {action: 'submit'});
                        //@ts-ignore
                        const result = await localGet("/check/posts", {captcha, posts});
                        setBusy(false);
                        if (result.status === 200 && result.data.posts.length > 0) {
                            if (limitOne) {
                                const [post] = result.data.posts;
                                const {uri, text} = post;
                                resultCallback({uri, text});
                                callback();
                            } else {
                                console.log("meow");
                                resultCallback(result.data.posts, callback);
                            }
                        } else if (result.status === 400 || result.data.posts.length === 0) {
                            callback("Invalid post or post not found");
                        } else if (result.status === 401) {
                            callback("Bluesky account error, please logout and login again");
                        } else {
                            callback("Unknown error");
                        }
                    });
                }
            }
        }}/>
}
