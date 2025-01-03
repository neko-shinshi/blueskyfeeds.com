import {randomBytes} from "crypto";
import {getOAuthClient} from "features/utils/bsky-oauth";

export default async function handler (req, res) {
    return new Promise(async resolve => {
        if (req.method !== "GET") {res.status(404).send(); return;}
        let {handle, back} = req.query;
        if (!handle || !back) {res.status(404).send(); return;}

        const prev = Buffer.from(back, 'base64url').toString();


        const ac = new AbortController();
        req.on('close', () => ac.abort());

        handle = handle.startsWith("@")? handle.slice(1) : handle;
        const state =  JSON.stringify({prev, rand:randomBytes(512).toString('base64url')});
        const client = await getOAuthClient(req, res);

        const url = await client.authorize(handle, {signal: ac.signal, state});
        console.log("TO URL", url.toString());
        res.redirect(302, url.toString());
    });
}