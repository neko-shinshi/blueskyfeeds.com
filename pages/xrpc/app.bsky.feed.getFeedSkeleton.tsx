import {parseJwt} from "features/utils/jwtUtils";
import {handler as userFeedHandler} from 'features/algos/user-feed';
import {handler as liveFeedHandler} from 'features/algos/live-feed';
import {getDbClient} from "features/utils/db";
import {IDatabase} from "pg-promise";

const MS_HALF_DAY = 12*60*60*1000;


const getAndLogUser = async (req, db:IDatabase<any>, feedId:string, now) => {
    let {authorization} = req.headers;
    let user;
    if (authorization && authorization.startsWith("Bearer ")) {
        authorization = authorization.slice(7);
        const {iss} = parseJwt(authorization);
        if (iss) {
            user = iss;
            if (!global.views) {
                global.views = new Map();
            }
            const key = `${iss} ${feedId}`;
            const then = global.views.get(key);
            if (!then || now - then > MS_HALF_DAY) { // don't update if seen within last half day
                global.views.set(key, now);
                await db.none("INSERT INTO feed_view (feed_id, viewer, t_viewed) VALUES ($1, $2, NOW()) ON CONFLICT (feed_id, viewer) DO UPDATE SET t_viewed = EXCLUDED.t_viewed", [feedId, user]);
               // await db.feedViews.updateOne({user, feed:feedId}, {$set: {expireAt}}, {upsert:true});
            }
        }
    }
    return user;
}

const REF1 = "ref1", REF2 = "ref2";
export async function getServerSideProps({req, res, query}) {
    try {
        res.setHeader("Content-Type", "application/json");
    } catch {}


    let {feed:feedId, cursor:queryCursor, limit:_limit=50, did} = query;
    if (!feedId) { return { redirect: { destination: '/400', permanent: false } } }

    let limit = parseInt(_limit);
    if (limit > 100) { return { redirect: { destination: '/400', permanent: false } } }

    const dbUtils = await getDbClient();
    if (!dbUtils) { return { redirect: { destination: '/500', permanent: false } } }
    const {db} = dbUtils;

    let feedObj:any, viewers:string[] = [];
    await db.tx(async t => {
        await t.query("SELECT * FROM get_feed_preview($1, $2, $3)", [feedId, REF1, REF2]);
        const [feedBody, lists] = await Promise.all([
            t.oneOrNone(`FETCH ALL IN ${REF1}`),
            t.manyOrNone(`FETCH ALL IN ${REF2}`)
        ]);
        if (feedBody && feedBody.mode !== null) {
            feedObj = feedBody;
            for (const {ids} of lists) {
                ids.forEach(x => viewers.push(x));
            }
        }
    });

    if (!feedObj) {return { redirect: { destination: '/404', permanent: false } } }

    let user;
    const now = new Date().getTime();
    if (process.env.NEXT_PUBLIC_DEV === "1" && did) {
        user = did;
    } else {
        user = await getAndLogUser(req, db, feedId, now);
    }

    if (viewers.length > 0 && !viewers.find(x => x === user)) {
        res.statusCode = 401;
        res.write(JSON.stringify({
            feed:[], cursor:"",
            error: "Private Feed",
            message:"The feed owner has restricted access to this feed, contact them to view it"
        }));
        res.end();
        return {props: {}};
    }

    let cursor:string;
    let feed:any[];

    // Algo feeds are deprecated
    /*
    const algo = algos[feedId];
    if (algo) {
        const {feed: feedV, cursor: cursorV} = await algo(db, user, queryCursor, limit);
        feed = feedV;
        cursor = cursorV;
    } else {*/
        let {mode} = feedObj;
        if (mode === "user-likes" || mode === "user-posts") {
            const {feed: feedV, cursor: cursorV} = await userFeedHandler(db, feedId, feedObj, queryCursor, limit);
            feed = feedV;
            cursor = cursorV;
        } else if (mode === "posts") {
            // query by index
            const skip = parseInt(queryCursor) || 0;
            const posts = await db.manyOrNone("SELECT post_id FROM feed_post_algo WHERE feed_id = $1 ORDER BY index ASC LIMIT $2 OFFSET $3", [feedId, limit, skip]);

            feed = posts.slice(skip, limit).map(x => {return {post: x.post_id};});
            cursor = `${feed.length+skip}`;
        } else {
            const {feed: feedV, cursor: cursorV} = await liveFeedHandler (dbUtils, feedObj, queryCursor, limit, now);
            feed = feedV;
            cursor = cursorV;
        }
   // }

    res.write(JSON.stringify({feed, cursor}));
    res.end();
    return {props: {}};
}

export default function Home({}) {
    return <div></div>
}