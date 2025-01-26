import {getDbClient} from "features/utils/db";
import {respondApiErrors} from "features/utils/api";

export default async function handler (req, res) {
    return new Promise(async resolve => {
        if (req.method !== "POST") { res.status(400).send(); }
        const {db} = await getDbClient();
        let {feed, tag} = req.body;
        if (respondApiErrors(res, [{val:!db, code: 500}, {val:!feed || !tag, code: 422}])) { return; }
        tag = tag.toLowerCase();
        const result = await db.oneOrNone("INSERT INTO every_feed_tag (feed_id, tag, ts) VALUES ($1, $2, $3) ON CONFLICT DO NOTHING RETURNING tag", [feed, tag, new Date()]);
        if (!result) {
            res.status(409).send();
        } else {
            res.status(200).send();
        }
    });
}