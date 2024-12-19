import {getLoggedInInfo} from "features/network/session";
import {testRecaptcha} from "features/utils/recaptchaUtils";
import {AtpAgent} from "@atproto/api";
import {queryWithCursor} from "features/utils/utils";
import {ListItemView} from "@atproto/api/src/client/types/app/bsky/graph/defs";

export default async function handler(req, res) {
    if (req.method !== "GET") { res.status(400).send(); return; }
    let {list, captcha} = req.query;
    if (!list || !captcha) { res.status(400).send(); return; }
    const [{ error}, captchaPass] = await Promise.all([
        getLoggedInInfo(req, res),
        testRecaptcha(captcha)
    ]);
    if (error) { res.status(error).send(); return; }
    if (!captchaPass) { res.status(529).send(); return; }


    if (list.startsWith("at://")) {
        list = list.slice(5);
    } else if (list.startsWith("https://bsky.app/profile/")) {
        list = list.slice(25);
    }
    const publicAgent = new AtpAgent({service: "https://api.bsky.app/"});

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