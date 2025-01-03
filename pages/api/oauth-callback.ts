import {Agent} from "@atproto/api";
import {getOAuthClient} from "features/utils/bsky-oauth";
import {setUserData} from "features/utils/cookieUtils";

export default async function handler (req, res) {
    return new Promise(async resolve => {
        console.log("Called back")
        const params = req.query;

        const {error, error_description} = params;
        if (error) {
            // FAIL
            // error: 'access_denied',
            //   error_description: 'This request was already authorized'
            res.redirect(500, "/500");
        }

        const URLParams = new URLSearchParams(params);
        const client = await getOAuthClient(req, res);

        // Process successful authentication here
        try {
            const { session, state } = await client.callback(URLParams);
            const did = session.did;

            const agent = new Agent(session);

            const {data:{handle, displayName, avatar}} = await agent.getProfile({actor: did});
            setUserData({did, handle, displayName, avatar, req, res});

            const {prev} = JSON.parse(state);
            res.redirect(302, prev);
        } catch (e) {
            console.error(e);
            res.redirect(401, "/401");
        }
    });
}