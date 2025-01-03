import {getOAuthClient} from "features/utils/bsky-oauth";

export default async function handler (req, res) {
    return new Promise(async resolve => {
        const client = await getOAuthClient(req, res);

        res.status(200).json(client.jwks);
    });
}