import {userPromise} from "features/utils/apiUtils";
import {getActorsInfo, rebuildAgentFromToken} from "features/utils/bsky";

export default async function handler(req, res) {
    return userPromise(req, res, "GET", true, false,
        ({list, captcha}) => !!list && !!captcha,
        async ({token}) => {
            const agent = await rebuildAgentFromToken(token);
            if (!agent) {res.status(401).send(); return;}

            let {list} = req.query;
            if (!list.startsWith("did:plc:")) {
                const [actor, ...rest] = list.split("/");
                console.log("actor", actor);
                const {data:{did}} = await agent.getProfile({actor});
                list = [did, ...rest].join("/");
            }

            list = `at://${list.replace("/lists/", "/app.bsky.graph.list/")}`

            let cursor:any = {};
            let ids = new Set();
            try {
                do {
                    const params = {list, ...cursor};
                    const {data:{items, cursor:newCursor}} = await agent.api.app.bsky.graph.getList(params);
                    if (newCursor === cursor?.cursor) {
                        break;
                    }
                    items.forEach(x => ids.add(x.subject.did))
                    if (!newCursor) {
                        cursor = null;
                    } else {
                        cursor = {cursor: newCursor};
                    }
                } while (cursor);
                const result = await getActorsInfo(agent, [...ids]);
                res.status(200).json(result);
            } catch (e) {
                console.log(e);
                res.status(400).send();
            }
        });
}