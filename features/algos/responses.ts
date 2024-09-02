import {getSortMethod, listsToDids} from "pages/xrpc/app.bsky.feed.getFeedSkeleton";

export const handler = async (db, feedConfig, cursor, limit, now) => {
    let {everyList, blockList, sort, postLevels, pics} = feedConfig;
    everyList = listsToDids(everyList);
    blockList = listsToDids(blockList);
    const dbQuery:any = {author: {$nin: [...everyList, ...blockList]}, $or:[{quote: {$in:everyList}}, {replyParent:{$in:everyList}}, {replyRoot:{$in:everyList}}]}
    const skip = parseInt(cursor) || 0;

    const wantTop = postLevels.indexOf("top") >= 0;
    const wantReply = postLevels.indexOf("reply") >= 0;
    if (!(wantTop && wantReply)) {
        if (wantTop) {
            dbQuery.replyRoot = null;
        } else { // wantReply
            dbQuery.replyRoot = {$ne: null};
        }
    }

    const wantPics = pics.indexOf("pics") >= 0;
    const wantText = pics.indexOf("text") >= 0;
    if (!(wantPics && wantText)) {
        dbQuery.hasImage = wantPics;
    }
    const sortMethod = getSortMethod(sort);

    let feed = await db.posts.find(dbQuery).sort(sortMethod).skip(skip).limit(limit).project({_id: 1}).toArray();
    if (feed.length > 0) {
        db.posts.updateMany({_id: {$in: feed.map(x => x._id)}}, {$set: {last: now }});
    }

    feed = feed.map(x => {return {post: x._id}})
    cursor = `${feed.length+skip}`;

    return {feed, cursor};
}