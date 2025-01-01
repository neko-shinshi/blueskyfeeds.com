import {NodeOAuthClient, NodeSavedSession, NodeSavedState} from '@atproto/oauth-client-node'
import { JoseKey } from '@atproto/jwk-jose'
import {Agent} from "@atproto/api";

export const clientMetadata:Readonly<any> =  {
    // Must be a URL that will be exposing this metadata
    client_id: 'https://my-app.com/client-metadata.json',
    client_name: 'My App',
    client_uri: 'https://my-app.com',
    logo_uri: 'https://my-app.com/android-chrome-512x512.png',
    tos_uri: 'https://my-app.com/tos',
    policy_uri: 'https://my-app.com/policy',
    redirect_uris: ['https://my-app.com/callback'],
    grant_types: ['authorization_code', 'refresh_token'],
    response_types: ['code'],
    application_type: 'web',
    scope: "atproto transition:generic",
    token_endpoint_auth_method: 'private_key_jwt',
    token_endpoint_auth_signing_alg: 'ES256',
    dpop_bound_access_tokens: true,
    jwks_uri: 'https://my-app.com/jwks.json',
};


export async function getAuthClient ():Promise<NodeOAuthClient> {
    return new NodeOAuthClient({
        // This object will be used to build the payload of the /client-metadata.json
        // endpoint metadata, exposing the client metadata to the OAuth server.
        clientMetadata,

        // Used to authenticate the client to the token endpoint. Will be used to
        // build the jwks object to be exposed on the "jwks_uri" endpoint.

        keyset: await Promise.all([
            JoseKey.fromImportable(process.env.PRIVATE_KEY_1),
            JoseKey.fromImportable(process.env.PRIVATE_KEY_2),
            JoseKey.fromImportable(process.env.PRIVATE_KEY_3),
        ]),

        // Interface to store authorization state data (during authorization flows)
        stateStore: {
            async set(key: string, internalState: NodeSavedState): Promise<void> {

            },
            async get(key: string): Promise<NodeSavedState | undefined> {
                return undefined;
            },
            async del(key: string): Promise<void> {

            },
        },

        // Interface to store authenticated session data
        sessionStore: {
            async set(sub: string, session: NodeSavedSession): Promise<void> {

            },
            async get(sub: string): Promise<NodeSavedSession | undefined> {
                return undefined;
            },
            async del(sub: string): Promise<void> {

            },
        }
    });
}

export async function getRestoredAgent ():Promise<Agent> {
    const did = 'did:plc:123'; // TODO get from cookie
    if (!did) { return null; }
    try {
        // check cookie for did
        const client = await getAuthClient();
        const oauthSession = await client.restore(did);

        const agent = new Agent(oauthSession);

        return agent;
    } catch (e) {
        console.error(e);
        return null;
    }
}
