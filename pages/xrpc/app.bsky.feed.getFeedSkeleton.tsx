import {connectToDatabase} from "features/utils/dbUtils";
import {parseJwt} from "features/utils/jwtUtils";
import {handler as userFeedHandler} from 'features/algos/user-feed';
import {handler as liveFeedHandler} from 'features/algos/live-feed';

export const getSortMethod = (sort) => {
    switch (sort) {
        case "like": return {likes:-1, indexedAt:-1};
        case "ups": return {ups:-1, indexedAt: -1};
        case "sLike": return {likeV:-1, indexedAt: -1};
        case "sUps": return {upV:-1, indexedAt:-1};

        // "new" also
        default: return {indexedAt: -1};
    }
}

const MS_ONE_WEEK = 7*24*60*60*1000;
const MS_HALF_DAY = 12*60*60*1000;
const MS_CHECK_DELAY = 6*60*60*1000;

const makeExpiryDate = (nowTs) => {
    return new Date(nowTs + MS_ONE_WEEK);
}

export const listsToDids = (l) => {
    let list = l || [];
    return list.map(x => x.did);
}


const getAndLogUser = async (req, db, feedId, now) => {
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
                const expireAt = makeExpiryDate(now);
                await db.feedViews.updateOne({user, feed:feedId}, {$set: {expireAt}}, {upsert:true});
            }
        }
    }
    return user;
}

export async function getServerSideProps({req, res, query}) {
    try {
        res.setHeader("Content-Type", "application/json");
    } catch {}


    let {feed:feedId, cursor:queryCursor, limit:_limit=50, did} = query;
    if (!feedId) { return { redirect: { destination: '/400', permanent: false } } }

    let limit = parseInt(_limit);
    if (limit > 100) { return { redirect: { destination: '/400', permanent: false } } }

    const db = await connectToDatabase();
    if (!db) { return { redirect: { destination: '/500', permanent: false } } }

    // TODO edit
    const [feedObj, likeStickyUsers] = await Promise.all([
        db.feeds.findOne({_id: feedId}),
        db.data.find({_id: {$ne: "c_0"}}).project({_id:1}).toArray()
    ]);
    if (!feedObj) {return { redirect: { destination: '/404', permanent: false } } }
    const {viewers} = feedObj;

    let user;
    const now = new Date().getTime();

    if (process.env.NEXT_PUBLIC_DEV === "1" && did) {
        user = did;
    } else {
        user = await getAndLogUser(req, db, feedId, now);
    }

    // TODO remove
    const feedOwner = feedId.split("/")[2];
    const dontAddSticky = likeStickyUsers.find(x => x._id === user || x._id === feedOwner);

    if (Array.isArray(viewers) && viewers.length > 0 && !viewers.find(x => x.did === user)) {
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
            const {feed: feedV, cursor: cursorV} = await userFeedHandler(dontAddSticky, db, feedId, feedObj, queryCursor, limit);
            feed = feedV;
            cursor = cursorV;
        } else if (mode === "posts") {
            let {posts} = feedObj;
            const skip = parseInt(queryCursor) || 0;
            // TODO remove
            if (!dontAddSticky) {
                posts.splice(1, 0, {post: "at://did:plc:eubjsqnf5edgvcc6zuoyixhw/app.bsky.feed.post/3lrx2sbkfrs23"});
            }

            feed = posts.slice(skip, limit).map(x => {return {post: x};});
            cursor = `${feed.length+skip}`;
        } else {
            const {feed: feedV, cursor: cursorV} = await liveFeedHandler (dontAddSticky, db, feedObj, queryCursor, limit, now);
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