import {getAgent, getRecentPostsFrom, getFollowing} from "features/utils/bsky";
import {randomInt} from "crypto";
import {processQ} from "features/utils/queue";
import {connectToDatabase}  from "../utils/dbUtils";
import {secondsAfter} from "features/utils/timeUtils";

export const id = "at://did:plc:eubjsqnf5edgvcc6zuoyixhw/app.bsky.feed.generator/rare-posters";
export const handler = async (user, cursor, limit) => {
    let start = 0;
    if (cursor) {
        const v = parseInt(cursor);
        if (!isNaN(v)) {
            start = v;
        }
    }

    const db = await connectToDatabase();
    if (!db) {return {feed: [], cursor:""};} // DB fail
    const feedId = `rare-posters_${user}`;
    const feed = await db.postsAlgoFeed.find({feed: feedId}).sort({indexedAt:-1}).skip(start).limit(limit).project({_id:0, post:1}).toArray();
    generate(user); // try regenerating the feed in the background

    if (feed.length === 0) {
        return {feed: [], cursor:""}; // Not ready yet
    } else {
        const end = Math.min(start + limit, start + feed.length);
        return {feed: feed.map(x => {return {post:x.post}}), cursor: `${end}`};
    }
}

const generate = async(did) => {
    const db = await connectToDatabase();
    if (!db) {return;}
    try {
        const feedId = `rare-posters_${did}`;
        await db.dataAlgoFeed.insertOne({_id: `feed_lock_${feedId}`, expireAt: secondsAfter(randomInt(10, 15)*60)});
        // if successfully inserted, actually regenerate

        const agent = await getAgent("bsky.social" , process.env.BLUESKY_USERNAME, process.env.BLUESKY_PASSWORD);
        if (!agent) {console.log("agent error"); return}

        // Get all follows
        const following = await getFollowing(agent, did);
        // Get last 20 messages of each follows within last 7 days
        let posts = [];
        let i=0;

        await processQ([...following], 2, async (target, wcb) => {
            if (!target) {
                return wcb(null, target + ' got processed');
            }
            const then = new Date(new Date().getTime() - 1000 * 60 * 60 * 24 * 7).toISOString();

            try {
                const _posts = await getRecentPostsFrom(agent, target, then);
                if (_posts.length <= 20) {
                    _posts.forEach(x => posts.push(x));
                }
                wcb(null, target + ' got processed');
            } catch (e) {
                wcb(null, target + ' got skipped');
            }
        });

        let commands:any = posts.map(x => {return {insertOne: {feed: feedId, post:x.uri, indexedAt: x.indexedAt}}});
        commands.splice(0, 0, {deleteMany: {filter: {feed: feedId}}});
        let result = await db.postsAlgoFeed.bulkWrite(commands);
        console.log(feedId, result);
    } catch {}
}

module.exports = {
    id, handler
}

