import {connectToDatabase} from "features/utils/dbUtils";
import {randomInt} from "crypto";
import {validateAuthGetUser} from "features/auth/serverAuth";
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

export default async function handler (req, res) {
    return new Promise(async resolve => {
        if (req.method === "GET") {
            let {feed:feedId, cursor:queryCursor, limit:_limit=50} = req.query;
            if (!feedId) {
                res.status(400).send();
                return;
            }

            if (feedId === "at://did:plc:eubjsqnf5edgvcc6zuoyixhw/app.bsky.feed.generator/test") {
                console.log(req.rawHeaders);
                console.log(req.rawTrailers);
                console.log(req.credentials);
                console.log(req.query);
                console.log(req.cookies);
//                console.log(userId);
            }


            let limit = parseInt(_limit);
            if (limit > 100) {
                res.status(400).json({error:"InvalidRequest", message:"Error: limit cannot be greater than 100"});
                return;
            }

            const db = await connectToDatabase();
            const [feedObj, sticky] = await Promise.all([
                db.feeds.findOne({_id: feedId}),
                db.sticky.findOne({_id: feedId})
            ]);
            if (!feedObj) {res.status(400).send();return;}

            const {allowList, blockList, everyList, keywordSetting,
                keywords, languages, pics, postLevels, sort} = feedObj;
            let query:any = {};
            if (allowList.length > 0) {
                // Only search posts from x users
                query.author = {$in: allowList};
            } else if (blockList.length > 0) {
                query.author = {$nin: blockList};
            }
            const wantPics = pics.indexOf("pics") >= 0;
            const wantText = pics.indexOf("text") >= 0;
            if (!(wantPics && wantText)) {
                query.hasImage = wantPics;
            }
            const wantTop = postLevels.indexOf("top") >= 0;
            const wantReply = postLevels.indexOf("reply") >= 0;
            if (!(wantTop && wantReply)) {
                if (wantTop) {
                    query.replyRoot = null;
                } else { // wantReply
                    query.replyRoot = {$ne: null};
                }
            }
            if (languages.length > 0) {
                query.lang = {$in: languages};
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
                    query = {...query, ...keywordSearch[0]};
                    break;
                }
                case 2: {
                    query = {...query, $or:keywordSearch};
                    break;
                }
            }

            if (everyList.length > 0) {
                let authorQuery:any = {author: {$in: everyList}};
                if (query.lang) {
                    authorQuery.lang = query.lang;
                }
                if (query.hasImage) {
                    authorQuery.hasImage = query.hasImage;
                }
                if (query.replyRoot) {
                    authorQuery.replyRoot = query.replyRoot;
                }

                query = {$or: [authorQuery, query]};
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
                    result = await db.posts.find(query).sort(sortMethod).limit(500).project({createdAt: 1}).toArray(); // don't bother querying beyond 500
                    if (result.length === 0) {
                        res.status(200).json({cursor:"", feed:[]}); return;
                    }
                    let index = result.findIndex(x => x._id === postId);
                    if (index === -1) {
                        const tsss = new Date(tss).toISOString();
                        index = result.findIndex(x => x.createdAt < tsss);
                    }
                    if (index === -1) {
                        res.status(200).json({cursor:"", feed:[]}); return;
                    }
                    result = result.slice(index+1, index+1+limit);
                    const last = result.at(-1);
                    const ts = new Date(last.createdAt).getTime();
                    const parts = last._id.split("/");
                    const id = `${parts[2]}/${parts[4]}`;
                    cursor = `${id}::${ts}`;
                } else {
                    const skip = parseInt(queryCursor);
                    result = await db.posts.find(query).sort(sortMethod).skip(skip).limit(limit).project({_id: 1}).toArray();
                    if (result.length === 0) {
                        res.status(200).json({cursor:"", feed:[]}); return;
                    }
                    cursor = `${limit+skip}`;
                }
            } else {
                if (sort === "new") {
                    if (sticky) {limit = limit -1;}
                    result = await db.posts.find(query).sort(sortMethod).project({createdAt: 1}).limit(limit).toArray();
                    if (result.length === 0) {res.status(200).json({cursor:"", feed:[]}); return;}
                    if (sticky) {result.splice(1,0, {_id: sticky.p})}
                    // return last item + timestamp
                    const last = result.at(-1);
                    const ts = new Date(last.createdAt).getTime();
                    const parts = last._id.split("/");
                    const id = `${parts[2]}/${parts[4]}`;
                    cursor = `${id}::${ts}`;
                } else {
                    if (sticky) {limit = limit -1;}
                    result = await db.posts.find(query).sort(sortMethod).project({_id: 1}).limit(limit).toArray();
                    if (result.length === 0) {res.status(200).json({cursor:"", feed:[]}); return;}
                    if (sticky) {result.splice(randomInt(0, 2),0, {_id: sticky.p})}
                    cursor = `${limit}`;
                }
            }

            const feed = result.map(x => {return {post: x._id};});
            res.status(200).json({feed, cursor});
        } else {
            res.status(404).send();
        }
    });
}