import {userPromise} from "features/utils/apiUtils";
import {rebuildAgentFromSession} from "features/utils/feedUtils";

export default async function handler(req, res) {
    return userPromise(req, res, "DELETE", true, true,
        ({rkey, captcha}) => !!rkey && !!captcha,
        async ({db, session}) => {
        console.log('delete');
        const agent = await rebuildAgentFromSession(session);
        if (!agent) {res.status(401).send(); return;}

        const {rkey} = req.body;
        const record = {
            repo: agent.session.did,
            collection: 'app.bsky.feed.generator',
            rkey,
        };
        console.log("try delete",record);

        try {
            const result = await agent.api.com.atproto.repo.deleteRecord(record);
            if (result.success) {
                res.status(200).send();
                return;
            }
            console.log(result);
        } catch (e) {
            console.log(e);
        }
        res.status(400).send();
    });
}