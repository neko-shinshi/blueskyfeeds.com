import {connectToDatabase} from "features/utils/dbUtils";
import {randomInt} from "crypto";
import {parseJwt} from "features/utils/jwtUtils";
import {algos} from 'features/algos'
import {handler as userFeedHandler} from 'features/algos/user-feed'
import {feedHasUserLike, getAgent} from "features/utils/bsky";
import {SUPPORTED_CW_LABELS} from "features/utils/constants";

const getSortMethod = (sort) => {
    switch (sort) {
        case "like": return {likes:-1, createdAt:-1};
        case "ups": return {ups:-1, createdAt: -1};
        case "sLike": return {likeV:-1, createdAt: -1};
        case "sUps": return {upV:-1, createdAt:-1};

        // "new" also
        default: return {createdAt: -1};
    }
}

const MS_ONE_WEEK = 7*24*60*60*1000;
const MS_HALF_DAY = 12*60*60*1000;

const makeExpiryDate = (nowTs) => {
    return new Date(nowTs + MS_ONE_WEEK);
}

const liveFeedHandler = async (db, feedObj, queryCursor, feedId, user, limit) => {
    let feed=[], cursor="";
    let {allowList, blockList, everyList, keywordSetting,
        keywords, languages, pics, postLevels, sort, mode, sticky, hideLikeSticky, allowLabels, mustLabels} = feedObj;
    let dbQuery:any = {};
    if (allowList.length > 0) {
        // Only search posts from x users
        dbQuery.author = {$in: allowList};
    } else if (blockList.length > 0) {
        dbQuery.author = {$nin: blockList};
    }
    const wantPics = pics.indexOf("pics") >= 0;
    const wantText = pics.indexOf("text") >= 0;
    if (!(wantPics && wantText)) {
        dbQuery.hasImage = wantPics;
    }

    if (dbQuery.hasImage && Array.isArray(mustLabels) && mustLabels.length > 0) {
        // NSFW Image posts only
        const rejectedLabels = SUPPORTED_CW_LABELS.filter(x => allowLabels.indexOf(x) < 0);
        dbQuery.labels = {$in: mustLabels, $nin: rejectedLabels}
    } else if (wantPics) {
        // Check content warning requirements
        if (Array.isArray(allowLabels)) {
            const rejectedLabels = SUPPORTED_CW_LABELS.filter(x => allowLabels.indexOf(x) < 0);
            dbQuery.labels = {$nin: rejectedLabels}
        }
    }

    const wantTop = postLevels.indexOf("top") >= 0;
    const wantReply = postLevels.indexOf("reply") >= 0;
    if (!(wantTop && wantReply)) {
        if (wantTop) {
            dbQuery.replyRoot = null;
        } else { // wantReply
            dbQuery.replyRoot = {$ne: null};
        }
    }
    if (languages.length > 0) {
        dbQuery.lang = {$in: languages};
    }

    let keywordSearch = [], fail=false;
    const findKeywords = keywords.filter(x => x.a).map(x => x.t);
    const blockKeywords = keywords.filter(x => !x.a).map(x => x.t);
    if (keywordSetting.indexOf("alt") >= 0 && findKeywords.length > 0) {
        keywordSearch.push({kwAlt:{$in: findKeywords, $nin: blockKeywords}});
    }

    if (keywordSetting.indexOf("text") >= 0 && findKeywords.length > 0) {
        keywordSearch.push({kwText:{$in: findKeywords, $nin: blockKeywords}});
    }

    switch (keywordSearch.length) {
        case 1: {
            dbQuery = {...dbQuery, ...keywordSearch[0]};
            break;
        }
        case 2: {
            dbQuery = {...dbQuery, $or:keywordSearch};
            break;
        }
    }
    let result:any[] = [];
    if (everyList.length > 0) {
        let authorQuery:any = {author: {$in: everyList}};
        if (dbQuery.lang) {
            authorQuery.lang = dbQuery.lang;
        }
        if (dbQuery.hasOwnProperty('hasImage')) {
            authorQuery.hasImage = dbQuery.hasImage;
        }

        if (dbQuery.hasOwnProperty('replyRoot')) {
            authorQuery.replyRoot = dbQuery.replyRoot;
        }
        if (dbQuery.hasOwnProperty('labels')) {
            authorQuery.labels = dbQuery.labels;
        }

        if (findKeywords.length === 0) {
            dbQuery = authorQuery; // Totally block not in everyList
        } else {
            dbQuery = {$or: [authorQuery, dbQuery]};
        }
    } else {
        if (findKeywords.length === 0) {
            fail = true;
            sticky = "at://did:plc:eubjsqnf5edgvcc6zuoyixhw/app.bsky.feed.post/3k4ematehei27";
        }
    }

    const sortMethod = getSortMethod(sort);
    if (queryCursor && !fail) {
        if (sort === "new") {
            try {
                let [_postId, tss] = queryCursor.split("::");
                const [userId, __postId] = _postId.split("/");
                const postId = `at://${userId}/app.bsky.feed.post/${__postId}`
                tss = parseInt(tss);
                tss = new Date(tss).toISOString();
                dbQuery.createdAt = {$lte: tss}
                result = await db.posts.find(dbQuery).sort(sortMethod).limit(limit+100).project({createdAt: 1}).toArray(); // don't bother querying beyond 500
                if (result.length === 0) {
                    return {cursor, feed};
                }
                let index = result.findIndex(x => x._id === postId);
                if (index === -1) {
                    index = result.findIndex(x => x.createdAt < tss);
                }
                if (index === -1) {
                    return {cursor, feed};
                }
                result = result.slice(index+1, index+1+limit);
                const last = result.at(-1);
                if (last) {
                    try {
                        const ts = new Date(last.createdAt).getTime();
                        const parts = last._id.split("/");
                        const id = `${parts[2]}/${parts[4]}`;
                        cursor = `${id}::${ts}`;
                    } catch (e) {
                        cursor = "";
                    }
                }
            } catch (e) {}
        } else {
            const skip = parseInt(queryCursor) || 0;
            result =  await db.posts.find(dbQuery).sort(sortMethod).skip(skip).limit(limit).project({_id: 1}).toArray();
            if (result.length === 0) {
                return {cursor, feed};
            }
            cursor = `${result.length+skip}`;
        }
    } else {
        if (hideLikeSticky === true) {
            const agent = await getAgent("bsky.social" , process.env.BLUESKY_USERNAME, process.env.BLUESKY_PASSWORD);
            if (agent && await feedHasUserLike(agent, feedId, user)) {
                sticky = null;
            }
        }
        if (sort === "new") {
            if (sticky) {limit = limit -1;}
            result = await db.posts.find(dbQuery).sort(sortMethod).project({createdAt: 1}).limit(limit).toArray();

            if (result.length === 0) {
                feed = sticky? [{post:sticky}] : [];
                return {cursor, feed};
            }
            if (sticky) {
                result = result.filter(x => x._id !== sticky);
                result.splice(1,0, {_id: sticky});
            }
            // return last item + timestamp
            const last = result.at(-1);
            if (last) {
                const ts = new Date(last.createdAt).getTime();
                const parts = last._id.split("/");
                const id = `${parts[2]}/${parts[4]}`;
                cursor = `${id}::${ts}`;
            }
        } else {
            if (sticky) {limit = limit -1;}
            result = await db.posts.find(dbQuery).sort(sortMethod).project({_id: 1}).limit(limit).toArray();
            if (result.length === 0) {
                feed = sticky? [{post:sticky}] : [];
                return {cursor, feed};
            }
            if (sticky) {
                result = result.filter(x => x._id !== sticky);
                result.splice(randomInt(0, 2),0, {_id: sticky});
            }
            cursor = `${limit}`;
        }
    }
    feed = result.map(x => {return {post: x._id};});
    return {feed, cursor};
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

    let user = did;
    let {authorization} = req.headers;
    if (authorization && authorization.startsWith("Bearer ")) {
        authorization = authorization.slice(7);
        const {iss} = parseJwt(authorization);
        if (iss) {
            user = iss;
            const now = new Date().getTime();
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

    const feedObj = await db.feeds.findOne({_id: feedId});
    if (!feedObj) {return { redirect: { destination: '/404', permanent: false } } }

    const algo = algos[feedId];
    let cursor:string;
    let feed:any[];

    if (algo) {
        const {feed: feedV, cursor: cursorV} = await algo(user, queryCursor, limit);
        feed = feedV;
        cursor = cursorV;
    } else {
        let {mode} = feedObj;
        if (mode === "responses") {
            let {everyList, blockList, sort} = feedObj;
            everyList = everyList.map(x => `^at://${x}`);
            blockList = blockList || [];
            const $regex = RegExp(everyList.join("|"));
            const dbQuery = {author: {$nin: [...everyList, ...blockList]}, $or:[{quote: {$regex}}, {replyParent:{$regex}}, {replyRoot:{$regex}}]}
            const skip = parseInt(queryCursor) || 0;
            feed = await db.posts.find(dbQuery).sort(getSortMethod(sort)).skip(skip).limit(limit).project({_id: 1}).toArray();
            feed = feed.map(x => {return {post: x._id}})
            cursor = `${feed.length+skip}`;
        } else if (mode === "user-likes" || mode === "user-posts") {
            const {feed: feedV, cursor: cursorV} = await userFeedHandler(feedId, feedObj, user, queryCursor, limit);
            feed = feedV;
            cursor = cursorV;
        } else if (mode === "posts") {
            let {posts} = feedObj;
            const skip = parseInt(queryCursor) || 0;
            feed = posts.slice(skip, limit).map(x => {return {post: x};});
            cursor = `${feed.length+skip}`;
        } else {
            const {feed: feedV, cursor: cursorV} = await liveFeedHandler (db, feedObj, queryCursor, feedId, user, limit);
            feed = feedV;
            cursor = cursorV;
        }
    }

    res.write(JSON.stringify({feed, cursor}));
    res.end();
    return {props: {}};
}

export default function Home({}) {
    return <div></div>
}