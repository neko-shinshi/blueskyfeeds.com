import {expandUserLists, getPublicAgent} from "features/utils/bsky";
import {getLoggedInInfo} from "features/network/session";
import {testRecaptcha} from "features/utils/recaptchaUtils";
import {respondApiErrors} from "features/utils/api";

export default async function handler(req, res) {
    let {data, captcha} = req.body;
    if (req.method !== "POST" || !data || !captcha) { res.status(400).send(); return; }
    const [{ error, privateAgent}, captchaPass] = await Promise.all([
        getLoggedInInfo(req, res), testRecaptcha(captcha)
    ]);
    if (respondApiErrors(res, [{val:error, code:error}, {val:!privateAgent, code:401}, {val:!captchaPass, code:529}])) { return; }

    const publicAgent = getPublicAgent();
    const result = await expandUserLists(data, publicAgent);
    res.status(200).json(result);
}