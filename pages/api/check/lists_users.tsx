import {userPromise} from "features/utils/apiUtils";
import {expandUserLists, rebuildAgentFromToken} from "features/utils/bsky";

export default async function handler(req, res) {
    return userPromise(req, res, "POST", true,
        ({}) => true,
        async ({token}) => {
            const agent = await rebuildAgentFromToken(token);
            if (!agent) {res.status(401).send();return;}
            const {data} = req.body;
            if (!data) {res.status(400).send();return;}

            const result = await expandUserLists(data, agent);
            res.status(200).json(result);
        });
}