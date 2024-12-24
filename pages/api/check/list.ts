import {getLoggedInInfo} from "features/network/session";
import {testRecaptcha} from "features/utils/recaptchaUtils";
import {queryWithCursor} from "features/utils/utils";
import {ListItemView} from "@atproto/api/src/client/types/app/bsky/graph/defs";
import {getPublicAgent} from "features/utils/bsky";
import {respondApiErrors} from "features/utils/api";

export default async function handler(req, res) {
    let {list, captcha} = req.body;
    if (req.method !== "POST" || !list || !captcha) { res.status(400).send(); return; }
    const [{ error, privateAgent}, captchaPass] = await Promise.all([
        getLoggedInInfo(req, res), testRecaptcha(captcha)
    ]);
    if (respondApiErrors(res, [{val:error, code:error}, {val:!privateAgent, code:401}, {val:!captchaPass, code:529}])) { return; }

    if (list.startsWith("at://")) {
        list = list.slice(5);
    } else if (list.startsWith("https://bsky.app/profile/")) {
        list = list.slice(25);
    }
    const publicAgent = getPublicAgent();

    if (!list.startsWith("did:plc:")) {
        const [actor, ...rest] = list.split("/");
        if (!actor) {res.status(400).send(); return;}
        const {data:{did}} = await publicAgent.getProfile({actor});
        if (!did) {res.status(400).send(); return;}
        list = [did, ...rest].join("/");
    }

    list = `at://${list.replace("/lists/", "/app.bsky.graph.list/")}`

    const listStore = `${list.slice(5).replace("/app.bsky.graph.list/", "/lists/")}`;
    const users:Map<string, any> = new Map();
    try {
        await queryWithCursor((o) => publicAgent.app.bsky.graph.getList(o), {list},
            ({items}:{items:ListItemView[]})=> {
            items.forEach(x => {
                const {subject:{did, handle, displayName}} = x;
                users.set(did, {did, handle, displayName: displayName || ""});
            });
        });
        res.status(200).json({
            id: listStore,
            v:[...users.values()]
        });
    } catch (e) {
        console.log(e);
        res.status(400).send();
    }
}