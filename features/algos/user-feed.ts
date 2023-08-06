import {getAgent, getAllPosts, getPostsInfo, getUserLikes} from "features/utils/bsky";
import {randomInt} from "crypto";
import {connectToDatabase} from "../utils/dbUtils";
import {secondsAfter} from "features/utils/timeUtils";
import {preprocessKeywords, findKeywords} from "features/utils/textAndKeywords";

export const handler = async (feedId, feedConfig, user, cursor, limit) => {
    let start = 0;
    if (cursor) {
        const v = parseInt(cursor);
        if (!isNaN(v)) {
            start = v;
        }
    }
    const db = await connectToDatabase();
    if (!db) {return {feed: [], cursor:""};} // DB fail
    const {sort, sticky} = feedConfig;
    const _limit = start === 0 && sticky? limit - 1 : limit;
    let sortMethod:any = {indexedAt:-1};
    if (sort === "like") {
        sortMethod = {likeCount:-1, indexedAt: -1};
    }

    let feed = await db.postsAlgoFeed.find({feed: feedId}).sort(sortMethod).skip(start).limit(_limit).project({_id:0, post:1}).toArray();
    generate(feedId, feedConfig); // try regenerating the feed in the background

    if (feed.length === 0) {
        if (start === 0 && sticky) {feed = [{post:sticky}];}
        return {feed, cursor:""}; // Not ready yet
    } else {
        if (start === 0 && sticky) {feed.splice(1, 0, {post: sticky})}
        const end = Math.min(start + limit, start + feed.length);
        return {feed: feed.map(x => {return {post:x.post}}), cursor: `${end}`};
    }
}


const generate = async(feedId, feedConfig) => {
    const db = await connectToDatabase();
    if (!db) {return;}
    try {
        await db.dataAlgoFeed.insertOne({_id: `feed_lock_${feedId}`, expireAt: secondsAfter(randomInt(10, 15)*60)});
        // if successfully inserted, actually regenerate
        let {allowList, keywords, keywordSetting, postLevels, pics, v, mode} = feedConfig;
        if (!Array.isArray(allowList) || allowList.length !== 1) {console.log("allowList issue", feedId, allowList);return;}

        const agent = await getAgent("bsky.social" , process.env.BLUESKY_USERNAME, process.env.BLUESKY_PASSWORD);
        if (!agent) {console.log("agent error"); return}

        const topLevel = postLevels.indexOf("top") >= 0;
        const replyLevel = postLevels.indexOf("reply") >= 0;
        const allowText = pics.indexOf("text") >= 0;
        const allowPics = pics.indexOf("pics") >= 0;
        const searchText = keywordSetting.indexOf("text") >= 0;
        const searchAlt = keywordSetting.indexOf("alt") >= 0;
        const keywordMapping = new Map();
        keywords.forEach(x => {
            keywordMapping.set(x.t, x.a);
        });
        keywords = await preprocessKeywords(keywords);
        const filter = post => {
            const{record:{reply, text, embed}, likeCount} = post;
            if ((topLevel && !replyLevel && reply) || // top level only
                (!topLevel && replyLevel && !reply)) { // reply only
                return false;
            }

            const hasImage = !!(embed &&
                embed["$type"] === "app.bsky.embed.images" &&
                Array.isArray(embed.images));

            if ((allowText && !allowPics && hasImage) || // text only
                (!allowText && allowPics && !hasImage)) { // image only
                return false;
            }

            if (Object.keys(keywords).length > 0) {
                // Filter keywords based on keywordSetting
                let foundKeywords = new Set();
                if (searchText) {
                    findKeywords(text, keywords).forEach(kw => foundKeywords.add(kw));
                }
                if (searchAlt) {
                    for (const image of embed.images) {
                        if (image.alt) {
                            findKeywords(image.alt, keywords).forEach(kw => foundKeywords.add(kw));
                        }
                    }
                }
                let hasKeyword = false;
                foundKeywords.forEach(kw => {
                    const allowOrBlock = keywordMapping.get(kw);
                    if (allowOrBlock === false) {
                        return false;
                    }
                    if (allowOrBlock) {
                        hasKeyword = true;
                    }
                });
                return hasKeyword;
            }
            return true;
        };


        let posts;
        if (mode === "user-likes") {
            const likes = await getUserLikes(agent, allowList[0]);
            posts = await getPostsInfo(agent, likes.map(x => x.post), filter);
            posts = posts.reduce((acc, x) => {
                const {uri, likeCount} = x;
                const found = likes.find(y => y.post === uri);
                if (found) {
                    acc.push({uri, likeCount, indexedAt: found.createdAt}); // Use timestamp from like
                }
                return acc;
            }, [])
        } else {
            posts = await getAllPosts(agent, allowList[0], filter);
        }

        let commands:any = posts.map(x => {return {insertOne: {feed: feedId, post:x.uri, indexedAt: x.indexedAt, likeCount:x.likeCount}}});
        commands.splice(0, 0, {deleteMany: {filter: {feed: feedId}}});
        let result = await db.postsAlgoFeed.bulkWrite(commands);
        console.log(feedId, result);

    } catch {}
}
