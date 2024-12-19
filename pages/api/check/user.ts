import {getActorsInfo} from "features/utils/bsky";
import {getLoggedInInfo} from "features/network/session";
import {testRecaptcha} from "features/utils/recaptchaUtils";
import {AtpAgent} from "@atproto/api";

export default async function handler(req, res) {
    if (req.method !== "GET") { res.status(400).send(); return; }
    let {actors, captcha} = req.query;
    if (!actors || !captcha) { res.status(400).send(); return; }
    const [{ error}, captchaPass] = await Promise.all([
        getLoggedInInfo(req, res),
        testRecaptcha(captcha)
    ]);
    if (error) { res.status(error).send(); return; }
    if (!captchaPass) { res.status(529).send(); return; }

    try {
        const publicAgent = new AtpAgent({service: "https://api.bsky.app/"});
        const result = await getActorsInfo(publicAgent, actors.split(","));
        res.status(200).json(result);
    } catch (e) {
        console.log(e);
        res.status(400).send();
    }
}