import {userPromise} from "features/utils/apiUtils";
import {checkValidActors, rebuildAgentFromToken} from "features/utils/bsky";

export default async function handler(req, res) {
    return userPromise(req, res, "GET", true, false,
        ({actors, captcha}) => !!actors && !!captcha,
        async ({token}) => {
            const agent = await rebuildAgentFromToken(token);
            if (!agent) {res.status(401).send(); return;}

            const {actors:_actors} = req.query;
            const actors = _actors.split(",");


            try {
                const result = await checkValidActors(agent, actors);
                res.status(200).json(result);
            } catch (e) {
                console.log(e);
            }
            res.status(400).send();
        });
}