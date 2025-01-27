import {getDbClient} from "features/utils/db";
import {respondApiErrors} from "features/utils/api";

export default async function handler (req, res) {
    async function subQuery (QUERY:{query:string, values:any[]}) {
        if (req.method !== "POST" && req.method !== "DELETE") { }
        const {db, helpers} = await getDbClient();
        if (respondApiErrors(res, [{val:!db, code: 500}])) { return; }
        const q = helpers.concat([QUERY]);
        console.log(q);
        const result = await db.oneOrNone(q);
        if (!result) {
            res.status(409).send();
        } else {
            res.status(200).send();
        }
    }

    return new Promise(async resolve => {
        const {feed, tag} = req.body;
        if (respondApiErrors(res, [{val:!feed || !tag, code: 422}])) { return; }
        switch (req.method) {
            case "POST": {
                await subQuery({query:"INSERT INTO every_feed_tag (feed_id, tag, ts) VALUES ($1, $2, $3) ON CONFLICT DO NOTHING RETURNING tag", values:[feed, tag, new Date()]})
                break;
            }
            case "DELETE": {
                await subQuery({query:"DELETE FROM every_feed_tag WHERE feed_id = $1 AND tag = $2 RETURNING tag", values:[feed, tag]})
                break;
            }
            default: {
                res.status(400).send();
            }
        }

    });
}