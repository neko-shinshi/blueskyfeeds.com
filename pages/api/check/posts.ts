import {getPostInfo} from "features/utils/bsky";
import {getLoggedInInfo} from "features/network/session";
import {testRecaptcha} from "features/utils/recaptchaUtils";
import {AtpAgent} from "@atproto/api";

export default async function handler(req, res) {
    if (req.method !== "POST") { res.status(400).send(); return; }
    let {posts, captcha} = req.body;
    if (!posts || !captcha) { res.status(400).send(); return; }
    const [{ error}, captchaPass] = await Promise.all([
        getLoggedInInfo(req, res),
        testRecaptcha(captcha)
    ]);
    if (error) { res.status(error).send(); return; }
    if (!captchaPass) { res.status(529).send(); return; }
    posts = posts.split(",");
    const publicAgent = new AtpAgent({service: "https://api.bsky.app/"});
    try {
        const postData = (await getPostInfo(publicAgent, posts)).map(post => {
            const {text, uri} = post;
            return {text, uri};
        });
        res.status(200).json({posts:postData});
    } catch (e) {
        console.error(e);
        res.status(400).send();
    }
}