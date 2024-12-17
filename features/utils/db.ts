import pgp from 'pg-promise'
import {IDatabase, IHelpers} from "pg-promise";
import {global} from "styled-jsx/css";
export async function getDbClient ():Promise<{db:IDatabase<any>, helpers:IHelpers}> {
    // @ts-ignore
    if (global.dbCache) {
        try {
            // @ts-ignore
            const c = await global.dbCache.db.connect();
            c.done(); // release connection, was just testing if works
            // @ts-ignore
            return Promise.resolve(global.dbCache);
        } catch (e) {
            return null;
        }
    }

    const connectionString = process.env.DB_STRING as string;
    const t = pgp({capSQL: true});
    const result = {db: t({connectionString}), helpers:t.helpers};
    try {
        const c = await result.db.connect();
        c.done(); // release connection, was just testing if works
        console.log("db connected");
        // @ts-ignore
        global.dbCache = result;
        return result;
    } catch (e) {
        console.error(e);
        return null;
    }
}