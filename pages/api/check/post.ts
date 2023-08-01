import {userPromise} from "features/utils/apiUtils";
import {getPostInfo, rebuildAgentFromToken} from "features/utils/bsky";

export default async function handler(req, res) {
    return userPromise(req, res, "GET", true, false,
        ({post}) => !!post,
        async ({token}) => {
        const agent = await rebuildAgentFromToken(token);
        if (!agent) {res.status(401).send(); return;}
        const {post} = req.query;
        try {
            const {text, uri} = await getPostInfo(agent, post);
            if (uri) {
                res.status(200).json({text, uri});
                return;
            }
        } catch (e) {
            console.log(e);
        }
        res.status(400).send();
    });
}