import {userPromise} from "features/utils/apiUtils";
import {getActorsInfo, rebuildAgentFromToken} from "features/utils/bsky";

export default async function handler(req, res) {
    return userPromise(req, res, "GET", true,
        ({list}) => !!list,
        async ({token}) => {
            const agent = await rebuildAgentFromToken(token);
            if (!agent) {res.status(401).send(); return;}

            let {list} = req.query;
            if (list.startsWith("at://")) {
                list = list.slice(5);
            } else if (list.startsWith("https://bsky.app/profile/")) {
                list = list.slice(25);
            }

            if (!list.startsWith("did:plc:")) {
                const [actor, ...rest] = list.split("/");
                if (!actor) {res.status(400).send(); return;}
                const {data:{did}} = await agent.getProfile({actor});
                if (!did) {res.status(400).send(); return;}
                list = [did, ...rest].join("/");
            }

            list = `at://${list.replace("/lists/", "/app.bsky.graph.list/")}`

            const listStore = `${list.slice(5).replace("/app.bsky.graph.list/", "/lists/")}`;

            let cursor:any = {};
            let users = new Map();
            try {
                do {
                    const params = {list, ...cursor};
                    const {data:{items, cursor:newCursor}} = await agent.api.app.bsky.graph.getList(params);
                    if (newCursor === cursor?.cursor) {
                        break;
                    }

                    items.forEach(x => {
                        const {subject:{did, handle, displayName}} = x;
                        users.set(did, {did, handle, displayName: displayName || ""});
                    })
                    if (!newCursor) {
                        cursor = null;
                    } else {
                        cursor = {cursor: newCursor};
                    }
                } while (cursor);
                res.status(200).json({
                    id: listStore,
                    v:[...users.values()]
                });
            } catch (e) {
                console.log(e);
                res.status(400).send();
            }
        });
}