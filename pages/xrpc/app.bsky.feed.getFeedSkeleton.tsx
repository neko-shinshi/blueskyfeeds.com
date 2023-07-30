import {connectToDatabase} from "features/utils/dbUtils";
import {randomInt} from "crypto";

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

export async function getServerSideProps({req, res, query}) {
    try {
        res.setHeader("Content-Type", "application/json");
    } catch {}
    let {feed:feedId, cursor:queryCursor, limit:_limit=50} = query;
    if (!feedId) { return { redirect: { destination: '/400', permanent: false } } }

    if (feedId === "at://did:plc:tazrmeme4dzahimsykusrwrk/app.bsky.feed.generator/Test123") {
        console.log("headers",req.headers);
        console.log("query", query);
    }

    let limit = parseInt(_limit);
    if (limit > 100) { return { redirect: { destination: '/400', permanent: false } } }

    const db = await connectToDatabase();
    if (!db) { return { redirect: { destination: '/500', permanent: false } } }
    const [feedObj, sticky] = await Promise.all([
        db.feeds.findOne({_id: feedId}),
        db.sticky.findOne({_id: feedId})
    ]);
    if (!feedObj) {return { redirect: { destination: '/400', permanent: false } } }

    const {allowList, blockList, everyList, keywordSetting,
        keywords, languages, pics, postLevels, sort} = feedObj;
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

    let keywordSearch = [];
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

    if (everyList.length > 0) {
        let authorQuery:any = {author: {$in: everyList}};
        if (dbQuery.lang) {
            authorQuery.lang = dbQuery.lang;
        }
        if (dbQuery.hasImage) {
            authorQuery.hasImage = dbQuery.hasImage;
        }
        if (dbQuery.replyRoot) {
            authorQuery.replyRoot = dbQuery.replyRoot;
        }

        dbQuery = {$or: [authorQuery, dbQuery]};
    }
    // console.log(JSON.stringify(query, null, 2));

    const sortMethod = getSortMethod(sort);
    let result:any[];
    let cursor:string;


    if (queryCursor) {
        if (sort === "new") {
            const [_postId, tss] = queryCursor.split("::");
            const [userId, __postId] = _postId.split("/");
            const postId = `at://${userId}/app.bsky.feed.post/${__postId}`;
            result = await db.posts.find(dbQuery).sort(sortMethod).limit(500).project({createdAt: 1}).toArray(); // don't bother querying beyond 500
            if (result.length === 0) {res.write(JSON.stringify({cursor:"", feed:[]})); res.end(); return;}
            let index = result.findIndex(x => x._id === postId);
            if (index === -1) {
                const tsss = new Date(tss).toISOString();
                index = result.findIndex(x => x.createdAt < tsss);
            }
            if (index === -1) {res.write(JSON.stringify({cursor:"", feed:[]})); res.end(); return;}
            result = result.slice(index+1, index+1+limit);
            const last = result.at(-1);
            if (last) {
                const ts = new Date(last.createdAt).getTime();
                const parts = last._id.split("/");
                const id = `${parts[2]}/${parts[4]}`;
                cursor = `${id}::${ts}`;
            }
        } else {
            const skip = parseInt(queryCursor);
            result = await db.posts.find(dbQuery).sort(sortMethod).skip(skip).limit(limit).project({_id: 1}).toArray();
            if (result.length === 0) {res.write(JSON.stringify({cursor:"", feed:[]})); res.end(); return;}
            cursor = `${limit+skip}`;
        }
    } else {
        if (sort === "new") {
            if (sticky) {limit = limit -1;}
            result = await db.posts.find(dbQuery).sort(sortMethod).project({createdAt: 1}).limit(limit).toArray();
            if (result.length === 0) {res.write(JSON.stringify({cursor:"", feed:[]})); res.end(); return;}
            if (sticky) {result.splice(1,0, {_id: sticky.p})}
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
            if (result.length === 0) {res.write(JSON.stringify({cursor:"", feed:[]})); res.end(); return;}
            if (sticky) {result.splice(randomInt(0, 2),0, {_id: sticky.p})}
            cursor = `${limit}`;
        }
    }

    const feed = result.map(x => {return {post: x._id};});
    res.write(JSON.stringify({feed, cursor}));
    res.end();
    return {props: {}};
}

export default function Home({}) {
    return <div></div>
}