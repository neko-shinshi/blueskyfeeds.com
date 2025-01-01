import {getAuthClient} from "features/utils/bsky-oauth";
import {OAuthCallbackError} from "@atproto/oauth-client";
import {Agent} from "@atproto/api";

export default async function handler (req, res) {
    return new Promise(async resolve => {
        const params = req.query;

        const URLParams = new URLSearchParams(params);


        const client = await getAuthClient();

        try {
            try {
                const { session, state } = await client.callback(params);

                // Process successful authentication here. For example:

                const agent = new Agent(session);

                const profile = await agent.getProfile({ actor: agent.did })

                console.log('Bsky profile:', profile.data)
            } catch (err) {
                // Silent sign-in failed, retry without prompt=none
                if (
                    err instanceof OAuthCallbackError &&
                    ['login_required', 'consent_required'].includes(err.params.get('error'))
                ) {
                    // Parse previous state
                    const { user, handle } = JSON.parse(err.state)

                    const url = await client.authorize(handle, {
                        // Note that we omit the prompt parameter here. Setting "prompt=none"
                        // here would result in an infinite redirect loop.

                        // Build a new state (or re-use the previous one)
                        state: JSON.stringify({
                            user,
                            handle,
                        }),
                    })

                    // redirect to new URL
                    res.redirect(url)

                    return
                }

                throw err
            }
        } catch (e) {

        }

    });
}