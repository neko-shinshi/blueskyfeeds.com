
import {AtpAgent, AtpSessionData, AtpSessionEvent} from "@atproto/api";
import {updateSessionCookie} from "features/utils/cookieUtils";

export default async function handler (req, res) {
    return new Promise(async resolve => {
        const {token, service} = req.body;
        if (req.method !== "POST" || !token || !service) { res.status(400).send(); }
        try {
            const agent = new AtpAgent({service,
                persistSession: async (evt: AtpSessionEvent, sess?: AtpSessionData) => {
                    switch (evt) {
                        case "create":
                        case "update": {
                            updateSessionCookie({service, token: sess}, req, res);
                            res.status(200).send();
                            break;
                        }
                        case "create-failed": {
                            res.status(401).send();
                            break;
                        }
                        case "expired":
                        case "network-error": {
                            res.status(500).send();
                            break;
                        }
                    }
                }
            });
            await agent.resumeSession(token);
        } catch (e) {
            console.error(e);
            res.status(500).send();
        }
    });
}