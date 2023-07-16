import {userPromise} from "features/utils/apiUtils";
import {rebuildAgentFromSession} from "features/utils/feedUtils";

export default async function handler(req, res) {
    return userPromise(req, res, "GET", true, false,
        ({user, captcha}) => !!user && !!captcha,
        async ({session}) => {
            const agent = await rebuildAgentFromSession(session);
            if (!agent) {res.status(401).send(); return;}

            const {user:actor} = req.query;
            try {
                const result = await agent.api.app.bsky.actor.getProfile({actor});
                const {did, handle, displayName} = result.data;
                res.status(200).send({did, handle, displayName});
                return;

            } catch (e) {
                console.log(e);
            }
            res.status(400).send();
        });
}