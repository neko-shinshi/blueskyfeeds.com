import {userPromise} from "features/utils/apiUtils";
import {rebuildAgentFromToken} from "features/utils/bsky";

export default async function handler(req, res) {
    return userPromise(req, res, "GET", true, false,
        ({actors, captcha}) => !!actors && !!captcha,
        async ({token}) => {
            const agent = await rebuildAgentFromToken(token);
            if (!agent) {res.status(401).send(); return;}

            const {actors} = req.query;
            try {
                const {data:{profiles}} = await agent.api.app.bsky.actor.getProfiles({actors});
                const result = profiles.map(x => {
                    const {did, handle, displayName} = x;
                    return {did, handle, displayName};
                });
               // const {did, handle, displayName} = result.data;
                res.status(200).json(result);
                return;
            } catch (e) {
                console.log(e);
            }
            res.status(400).send();
        });
}