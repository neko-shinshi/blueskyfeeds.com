import {deleteFeed} from "features/utils/bsky";
import {wLogger} from "features/utils/logger";
import {getLoggedInInfo} from "features/network/session";
import {getDbClient} from "features/utils/db";
import {respondApiErrors} from "features/utils/api";
import {testRecaptcha} from "features/utils/recaptchaUtils";

export default async function handler(req, res) {
    const {rkey, captcha} = req.body;
    if (req.method !== "DELETE" || !rkey) { res.status(400).send(); return; }
    const [{ error, privateAgent}, {db}, captchaPass] = await Promise.all([
        getLoggedInInfo(req, res), getDbClient(), testRecaptcha(captcha)
    ]);
    if (respondApiErrors(res, [{val:error, code:error}, {val:!privateAgent, code:401}, {val:!captchaPass, code:529}])) { return; }

    const did = privateAgent.session.did;
    if (!(await deleteFeed(privateAgent, rkey))) {
        res.status(400).send();
    } else {
        const uri = `at://${did}/app.bsky.feed.generator/${rkey}`;
        await Promise.all([
            db.none("DELETE FROM every_feed WHERE id = $1", [uri]),
            db.none("DELETE FROM feed WHERE id = $1", [uri]),
        ]);
        res.status(200).send();
        wLogger.info(`delete ${uri}`);
    }
}