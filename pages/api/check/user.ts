import {getActorsInfo, getPublicAgent} from "features/utils/bsky";
import {getLoggedInInfo} from "features/network/session";
import {testRecaptcha} from "features/utils/recaptchaUtils";
import {respondApiErrors} from "features/utils/api";

export default async function handler(req, res) {
    let {actors, captcha} = req.body;
    if (req.method !== "POST" || !actors || !captcha) { res.status(400).send(); return; }
    const [{ error, privateAgent}, captchaPass] = await Promise.all([
        getLoggedInInfo(req, res), testRecaptcha(captcha)
    ]);
    if (respondApiErrors(res, [{val:error, code:error}, {val:!privateAgent, code:401}, {val:!captchaPass, code:529}])) { return; }

    try {
        const publicAgent = getPublicAgent();
        const result = await getActorsInfo(publicAgent, actors.split(","));
        res.status(200).json(result);
    } catch (e) {
        console.log(e);
        res.status(400).send();
    }
}