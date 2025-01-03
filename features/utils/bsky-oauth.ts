import {NodeOAuthClient, NodeSavedSession, NodeSavedState} from "@atproto/oauth-client-node";
import {JoseKey} from "@atproto/jwk-jose";
import {deleteCookie, getCookie, setCookie} from "cookies-next";
import {SESSION_KEY_ID, STATE_KEY_ID} from "features/utils/constants";
import {defaultCookieOptions} from "features/utils/cookieUtils";

export const clientMetadata:Readonly<any> =  {
    // Must be a URL that will be exposing this metadata
    client_id: `${process.env.NEXT_PUBLIC_BASE_URL}/client-metadata.json`,
    client_name: 'Blueskyfeeds.com OAuth',
    client_uri: process.env.NEXT_PUBLIC_BASE_URL,
    logo_uri: `${process.env.NEXT_PUBLIC_BASE_URL}/android-chrome-512x512.png`,
    tos_uri: `${process.env.NEXT_PUBLIC_BASE_URL}/terms`,
    policy_uri: `${process.env.NEXT_PUBLIC_BASE_URL}/privacy-policy`,
    redirect_uris: [`${process.env.NEXT_PUBLIC_BASE_URL}/api/oauth-callback`],
    grant_types: ['authorization_code', 'refresh_token'],
    response_types: ['code'],
    application_type: 'web',
    scope: "atproto transition:generic",
    token_endpoint_auth_method: 'private_key_jwt',
    token_endpoint_auth_signing_alg: 'ES256',
    dpop_bound_access_tokens: true,
    jwks_uri: `${process.env.NEXT_PUBLIC_BASE_URL}/jwks.json`,
};

async function getKeyset():Promise<any> {
    if (!global.keyset) {
        global.keyset = await Promise.all([
            JoseKey.fromImportable(process.env.PRIVATE_KEY_1),
            JoseKey.fromImportable(process.env.PRIVATE_KEY_2),
            JoseKey.fromImportable(process.env.PRIVATE_KEY_3),
        ]);
    }
    return global.keyset;
}

export async function getOAuthClient(req, res):Promise<NodeOAuthClient> {
    const keyset = await getKeyset();
    return new NodeOAuthClient({
        clientMetadata,
        keyset,
        stateStore: {
            async set(key: string, internalState: NodeSavedState): Promise<void> {
                setCookie(`${STATE_KEY_ID}_${key}`, JSON.stringify(internalState), defaultCookieOptions(req, res));
            },
            async get(key: string): Promise<NodeSavedState | undefined> {
                const val = getCookie(`${STATE_KEY_ID}_${key}`, {req, res});
                if (!val) { return undefined; }
                return JSON.parse(val);
            },
            async del(key: string): Promise<void> {
                deleteCookie(`${STATE_KEY_ID}_${key}`, {req, res, domain: process.env.NEXT_PUBLIC_DOMAIN, path:"/"});
            },
        },

        // Interface to store authenticated session data
        sessionStore: {
            async set(sub: string, session: NodeSavedSession): Promise<void> {
                let value = JSON.stringify(session);
                setCookie(SESSION_KEY_ID, value, defaultCookieOptions(req, res));
            },
            async get(sub: string): Promise<NodeSavedSession | undefined> {
                let val = getCookie(SESSION_KEY_ID, {req, res});
                if (!val) {return undefined; }
                return JSON.parse(val);
            },
            async del(sub: string): Promise<void> {
                deleteCookie(SESSION_KEY_ID, {req, res, domain: process.env.NEXT_PUBLIC_DOMAIN, path:"/"});
            },
        }
    });
}
