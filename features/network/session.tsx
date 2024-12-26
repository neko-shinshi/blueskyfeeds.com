import {AtpAgent, AtpSessionData, AtpSessionEvent} from "@atproto/api";
import {deleteCookie,} from "cookies-next";
import {UserProfileView} from "features/utils/types";
import {updatePublicCookie, updateSessionCookie} from "features/utils/cookieUtils";
import {SESSION_KEY_ID, SESSION_MISC_ID} from "features/utils/constants";
import EventEmitter from "node:events";

export async function getLoggedInInfo (req, res) {
    try {
        let privateAgent = null;
        const sessionKey = req.cookies[SESSION_KEY_ID];
        if (sessionKey) {
            const {token, service} = JSON.parse(sessionKey);
            try {
                const gate = new EventEmitter();
                privateAgent = new AtpAgent({ service ,
                    persistSession: async (evt: AtpSessionEvent, sess?: AtpSessionData) => {
                    switch (evt) {
                        case "create":
                        case "update": {
                            updateSessionCookie({service, token:sess}, req, res);
                            break;
                        }
                        default: {
                            console.log("deleting cookie", evt);
                            deleteCookie(SESSION_KEY_ID, {req, res});
                            deleteCookie(SESSION_MISC_ID, {req, res});
                        }
                    }
                    gate.emit("k");
                }});
                privateAgent.resumeSession(token);
                await new Promise(resolve => gate.once('k', resolve));
                const {data:{did, handle, displayName, avatar}} = await privateAgent.getProfile({actor: privateAgent.session.did});
                updatePublicCookie({did, handle, displayName, avatar}, req, res);
            } catch (e) {
                console.error("token error",e);
                deleteCookie(SESSION_KEY_ID, {req, res});
                deleteCookie(SESSION_MISC_ID, {req, res});
                return {error: 401};
            }
        }
        return {privateAgent};
    } catch (e) {
        console.error(e);
        return { error: 500 }
    }
}