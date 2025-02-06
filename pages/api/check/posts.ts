import {userPromise} from "features/utils/apiUtils";
import {getPostInfo, rebuildAgentFromToken} from "features/utils/bsky";

export default async function handler(req, res) {
    return userPromise(req, res, "GET", true,
        ({posts}) => !!posts,
        async ({token}) => {
        const agent = await rebuildAgentFromToken(token);
        if (!agent) {res.status(401).send(); return;}
        let {posts} = req.query;
        posts = posts.split(",");
        try {
            const postData = (await getPostInfo(agent, posts)).map(post => {
                const {text, uri} = post;
                return {text, uri};
            });
            res.status(200).json({posts:postData});
            return;
        } catch (e) {
            console.log(e);
        }
        res.status(400).send();
    });
}