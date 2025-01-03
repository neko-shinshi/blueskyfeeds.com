import {Agent} from "@atproto/api";
import {deleteCookie, getCookie} from "cookies-next";
import {setUserData} from "features/utils/cookieUtils";
import {SESSION_KEY_ID, SESSION_MISC_ID} from "features/utils/constants";
import {getOAuthClient} from "features/utils/bsky-oauth";

export async function getLoggedInInfo (req, res) {
    try {
        let privateAgent:Agent = null;
        const sessionKey = getCookie(SESSION_MISC_ID, {req, res});
        if (sessionKey) {
            const {did} = JSON.parse(sessionKey);
            if (!did) {return {privateAgent};}
            try {
                const client = await getOAuthClient(req, res);
                const oauthSession = await client.restore(did);
                privateAgent = new Agent(oauthSession);
                const {data:{handle, displayName, avatar}} = await privateAgent.getProfile({actor: did});
                setUserData({did, handle, displayName, avatar, req, res});
            } catch (e) {
                console.error("token error",e);
                deleteCookie(SESSION_MISC_ID, {req, res});
                deleteCookie(SESSION_KEY_ID, {req, res});

                return {error: 401};
            }
        }
        return {privateAgent};
    } catch (e) {
        console.error(e);
        return { error: 500 }
    }
}