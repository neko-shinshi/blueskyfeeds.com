import {expandUserLists} from "features/utils/bsky";
import {getLoggedInInfo} from "features/network/session";
import {testRecaptcha} from "features/utils/recaptchaUtils";
import {AtpAgent} from "@atproto/api";

export default async function handler(req, res) {
    if (req.method !== "POST") { res.status(400).send(); return; }
    let {data, captcha} = req.body;
    if (!data || !captcha) { res.status(400).send(); return; }
    const [{ error}, captchaPass] = await Promise.all([
        getLoggedInInfo(req, res),
        testRecaptcha(captcha)
    ]);
    if (error) { res.status(error).send(); return; }
    if (!captchaPass) { res.status(529).send(); return; }

    const publicAgent = new AtpAgent({service: "https://api.bsky.app/"});
    const result = await expandUserLists(data, publicAgent);
    res.status(200).json(result);
}