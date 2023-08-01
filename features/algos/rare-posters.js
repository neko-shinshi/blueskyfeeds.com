const {getAgent, getRecentPostsFrom, getFollowing} = require("../utils/bsky");
const {randomInt} = require("crypto");
const {processQ} = require("../utils/queue");
const {connectToDatabase} = require("../utils/dbUtils");
const {secondsAfter} = require("../utils/timeUtils");

const id = "at://did:plc:eubjsqnf5edgvcc6zuoyixhw/app.bsky.feed.generator/rare-posters";
const handler = async (user, cursor, limit) => {
    let start = 0;
    if (cursor) {
        const v = parseInt(cursor);
        if (!isNaN(v)) {
            start = v;
        }
    }

    const db = await connectToDatabase();
    if (!db) {return {feed: [], cursor:""};} // DB fail

    const feed = await db.dataAlgoFeed.findOne({_id: `feed_rare-posters_${user}`});
    generate(user); // try regenerating the feed in the background

    if (!feed) {
        return {feed: [], cursor:""}; // Not ready yet
    }

    if (cursor) {
        const end = start + limit;
        return {feed: feed.posts.slice(start, end), cursor: `${end}`};
    } else {
        return {feed: feed.posts.slice(0, limit), cursor: `${limit}`};
    }
}

const generate = async(did) => {
    const db = await connectToDatabase();
    if (!db) {return;}
    try {
        await db.dataAlgoFeed.insertOne({_id: `feed_lock_rare-posters_${did}`, expireAt: secondsAfter(randomInt(10, 15)*60)});
        // if successfully inserted, actually regenerate

        const agent = await getAgent("bsky.social" , process.env.BLUESKY_USERNAME, process.env.BLUESKY_PASSWORD);
        if (!agent) {return []}

        // Get all follows
        const following = await getFollowing(agent, did);
        // Get last 20 messages of each follows within last 7 days
        let posts = [];
        let i=0;
        console.log(following);

        await processQ([...following], 2, async (target, wcb) => {
            console.log("checking", did, ++i);
            if (!target) {
                console.log("no target", did, i);
                return wcb(null, target + ' got processed');
            }
            const then = new Date(new Date().getTime() - 1000 * 60 * 60 * 24 * 7).toISOString();

            try {
                const _posts = await getRecentPostsFrom(agent, target, then);
                if (_posts.length <= 20) {
                    _posts.forEach(x => posts.push(x));
                }
                console.log('done', did, i);
                wcb(null, target + ' got processed');
            } catch (e) {
                console.log('fail', did, i, e);
                wcb(null, target + ' got skipped');
            }
        });

        posts = posts.sort((a,b) => {
            return -a.indexedAt.localeCompare(b.indexedAt); // negate to sort latest on top
        }).map(x => x.uri);

        const result = await db.dataAlgoFeed.updateOne({_id: `feed_rare-posters_${did}`}, {$set:{posts}}, {upsert:true});
        console.log(result);
    } catch {}
}

module.exports = {
    id, handler
}

