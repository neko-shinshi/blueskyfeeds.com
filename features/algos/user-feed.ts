import {getAllPosts, getPostsInfo, getUserLikes} from "features/utils/bsky";
import {connectToDatabase} from "../utils/dbUtils";
import {preprocessKeywords, findKeywords} from "features/utils/textAndKeywords";

export const handler = async (dontAddSticky, db, feedId, feedConfig, cursor, limit) => {
    let start = 0;
    if (cursor) {
        const v = parseInt(cursor);
        if (!isNaN(v)) {
            start = v;
        }
    }

    let {sticky} = feedConfig;
    // TODO remove force sticky
    if (!dontAddSticky) {
        sticky = "at://did:plc:eubjsqnf5edgvcc6zuoyixhw/app.bsky.feed.post/3lrx2sbkfrs23";
    }
    const _limit = start === 0 && sticky? limit - 1 : limit;

    let feed = await db.postsAlgoFeed.find({feed: feedId}).sort({indexedAt:-1}).skip(start).limit(_limit).project({_id:0, post:1}).toArray();
    //generate(feedId, feedConfig); // try regenerating the feed in the background

    if (feed.length === 0) {
        if (start === 0 && sticky) {feed = [{post:sticky}];}
        return {feed, cursor:""}; // Not ready yet
    } else {
        if (start === 0 && sticky) {feed.splice(1, 0, {post: sticky})}
        const end = Math.min(start + limit, start + feed.length);
        return {feed: feed.map(x => {return {post:x.post}}), cursor: `${end}`};
    }
}


export const generateFeed = async(db, agent, feedId, feedConfig) => {
    try {
        // if successfully inserted, actually regenerate
        let {allowList, keywords, keywordSetting, postLevels, pics, mode} = feedConfig;
        if (!Array.isArray(allowList) || allowList.length !== 1) {
            console.log("allowList issue", feedId, allowList);return;
        }


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
        keywords = preprocessKeywords(keywords);
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
                    findKeywords(text, keywords).keywords.forEach(kw => foundKeywords.add(kw));
                }
                if (searchAlt) {
                    for (const image of embed.images) {
                        if (image.alt) {
                            findKeywords(image.alt, keywords).keywords.forEach(kw => foundKeywords.add(kw));
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
        const now = new Date().toISOString();
        if (mode === "user-likes") {
            const likes = await getUserLikes(agent, allowList[0].did);
            posts = await getPostsInfo(agent, likes.map(x => x.post));
            posts = posts.reduce((acc, x) => {
                const {uri} = x;
                const found = likes.find(y => y.post === uri);
                if (found) {
                    acc.push({uri, indexedAt: found.createdAt, likeUri: found.likeUri}); // Use timestamp from like action
                }
                return acc;
            }, []);
        } else {
            posts = await getAllPosts(agent, allowList[0].did, filter);
        }

        let commands:any = posts.map(x => {
            const {uri:post, indexedAt, likeCount, likeUri} = x;
            let update:any = {$set:{indexedAt, likeCount, updated: now}};
            if (likeUri) {
                update["$set"].likeUri = likeUri; // like-feed posts have likeUri
            }
            return {
                updateOne: {
                    filter: {feed: feedId, post},
                    update,
                    upsert: true
                }
            }
        });
        commands.push({deleteMany: {filter: {feed: feedId, indexedAt: {$lt:now}, updated:{$ne: now}}}});
        let result = await db.postsAlgoFeed.bulkWrite(commands, {ordered: false});
        console.log(feedId, result);

    } catch (e) {
        console.log(e);
    }
}
