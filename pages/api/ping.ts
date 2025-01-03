import {getLoggedInInfo} from "features/network/session";
import {respondApiErrors} from "features/utils/api";
import {getDbClient} from "features/utils/db";

export default async function handler (req, res) {
    return new Promise(async resolve => {
        if (req.method !== "GET") { res.status(400).send(); }
        const [{ error, privateAgent}, {db}] = await Promise.all([
            getLoggedInInfo(req, res),
            getDbClient()
        ]);
        if (respondApiErrors(res, [{val:error, code:error}, {val:!privateAgent, code:401}, {val:!db, code: 500}])) { return; }

        await db.none("INSERT INTO user_log (did, ts) VALUES ($1, $2) ON CONFLICT (did) DO UPDATE SET ts = EXCLUDED.ts", [privateAgent.did, new Date()]);

        res.status(200).send();
    });
}