import {userPromise} from "features/utils/apiUtils";
import {feedRKeyToUri, feedUriToUrl, rebuildAgentFromSession} from "features/utils/feedUtils";
import {deleteFeed} from "features/utils/bsky";

export default async function handler(req, res) {
    return userPromise(req, res, "DELETE", true, true,
        ({rkey, captcha}) => !!rkey && !!captcha,
        async ({db, session}) => {
        const agent = await rebuildAgentFromSession(session);
        if (!agent) {res.status(401).send(); return;}

        const did = agent.session.did;
        const {rkey} = req.body;
        if (await deleteFeed(agent, rkey)) {
            const uri = feedRKeyToUri(rkey, did);
            db.allFeeds.deleteOne({_id: uri});
            db.feeds.deleteOne({_id: uri}); // This one
            res.status(200).send();

            return;
        }

        res.status(400).send();
    });
}