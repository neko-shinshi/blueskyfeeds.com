import {userPromise} from "features/utils/apiUtils";
import {feedRKeyToUri, feedUriToUrl, } from "features/utils/feedUtils";
import {deleteFeed, rebuildAgentFromToken} from "features/utils/bsky";

export default async function handler(req, res) {
    return userPromise(req, res, "DELETE", true, true,
        ({rkey, captcha}) => !!rkey && !!captcha,
        async ({db, token}) => {
        const agent = await rebuildAgentFromToken(token);
        if (!agent) {res.status(401).send(); return;}

        const did = agent.session.did;
        const {rkey} = req.body;
        if (await deleteFeed(agent, rkey)) {
            const uri = feedRKeyToUri(rkey, did);
            db.allFeeds.deleteOne({_id: uri});
            db.feeds.deleteOne({_id: uri});
            res.status(200).send();

            return;
        }

        res.status(400).send();
    });
}