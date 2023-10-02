const {connectToDatabase} = require("../utils/dbUtils");
const {BskyAgent} = require("@atproto/api");

const MS_UPDATE_FOLLOWS = 60*60*1000; // 1 hour

const getAgent = async (service, identifier, password) => {
    const agent = new BskyAgent({ service: `https://${service}/` });
    try {
        await agent.login({identifier, password});
        return agent;
    } catch (e) {
        console.log("login fail", identifier);
        if (identifier === process.env.BLUESKY_USERNAME) {
            if (e.status === 429) {
                console.log("MAIN RATE LIMITED");
            } else {
                console.log(e);
            }
        }
        return null;
    }
}

const getFollowing = async (agent, actor) => {
    let cursor = {};
    let uris = new Set();
    do {
        const params = {actor, ...cursor, limit:100};
        console.log("following", uris.size, cursor);
        const {data} = await agent.getFollows(params);
        const {cursor:newCursor, follows} = data;
        if (newCursor === cursor?.cursor) {
            return [...uris];
        }
        const oldSize = uris.size;
        follows.forEach(x => uris.add(x.did));
        const diff = uris.size - oldSize;
        console.log("following +",diff)
        if (!newCursor || diff === 0) {
            cursor = null;
        } else {
            cursor = {cursor: newCursor};
        }
    } while (cursor);

    return [...uris];
}

const sticky = "at://did:plc:eubjsqnf5edgvcc6zuoyixhw/app.bsky.feed.post/3kabxgbzcxs2c";
const id = "at://did:plc:eubjsqnf5edgvcc6zuoyixhw/app.bsky.feed.generator/only-following";

const handler = async (user, inCursor, limit) => {
    console.log("algo feed");
    if (!user) {return {feed: [], cursor:""};}
    const db = await connectToDatabase();
    if (!db) {return {feed: [], cursor:""};} // DB fail
    const key = `follows_${user}`;
    const feedConfig = await db.dataAlgoFeed.findOne({_id:key, type:"only_following"});
    let feed=[], cursor="";
    const now = new Date().getTime();
    // first time, or have not fetched followers before, or last fetched was > MS_UPDATE_FOLLOWS ago
    if (!feedConfig || !feedConfig.last || now - feedConfig.last > MS_UPDATE_FOLLOWS) {
        // Flag user for update
        db.dataAlgoFeed.updateOne(
            {_id: key, type: "only_following"},
            {$set: {update:true}}, // set an update flag
            {upsert:true}
        ).then((resp, error) => {
            if (resp) {
                console.log("resp",resp);
            }
            if (error) {
                console.log("error",error);
            }
        });
    }

    if (feedConfig && Array.isArray(feedConfig.follows)) {
        console.log("has follows");
        const now = new Date().getTime();
        const {follows} = feedConfig;

        let query = {author:{$in: follows}, $or: [{replyParent:{$in: [...follows, user]}}, {replyParent: null}]};
        const sort = {createdAt:-1};
        const projection = {_id:1, createdAt:1};

        if (inCursor) {
            let [_postId, tss] = inCursor.split("::");
            const [userId, __postId] = _postId.split("/");
            const postId = `at://${userId}/app.bsky.feed.post/${__postId}`
            tss = parseInt(tss);
            tss = new Date(tss).toISOString();
            query.createdAt = {$lte: tss}
            feed = await db.posts.find(query).sort(sort).limit(limit+100).project(projection).toArray();
            if (feed.length > 0) {
                db.posts.updateMany({_id: {$in: feed.map(x => x._id)}}, {$set: {last: now }});
            }
            let index = feed.findIndex(x => x._id === postId);
            if (index === -1) {
                index = feed.findIndex(x => x.createdAt < tss);
            }
            if (index === -1) {
                return {cursor, feed};
            }
            feed = feed.slice(index+1, index+1+limit);
        } else {
            limit = limit -1;
            feed = await db.posts.find(query).sort(sort).limit(limit).project(projection).toArray();
            if (feed.length > 0) {
                db.posts.updateMany({_id: {$in: feed.map(x => x._id)}}, {$set: {last: now }});
            }
            feed = feed.filter(x => x._id !== sticky);
            feed.splice(1,0, {_id: sticky});
        }

        const last = feed.at(-1);
        if (last) {
            try {
                console.log("last", JSON.stringify(last));
                const ts = new Date(last.createdAt).getTime();
                const parts = last._id.split("/");
                const id = `${parts[2]}/${parts[4]}`;
                cursor = `${id}::${ts}`;
            } catch (e) {
                cursor = "";
            }
        }
    }

    return {feed: feed.map(x => {return {post:x._id}}), cursor};
}


const updateOnlyFollowing = async(db) => {
    const now = new Date().getTime();
    const toQuery = await db.dataAlgoFeed.find({type:"only_following", update:true}).toArray();
    if (toQuery.length === 0) {
        return;
    }

    try {
        const agent = await getAgent("bsky.social" , process.env.BLUESKY_USERNAME, process.env.BLUESKY_PASSWORD);
        if (agent) {
            let commands = [];
            for (const obj of toQuery) {
                const {_id} = obj;
                const [_, user] = _id.split("_");
                const follows = await getFollowing(agent, user);
                commands.push({
                    updateOne: {
                        filter: {_id},
                        update: {$set: {follows, last: now, update:false}}
                    }
                });
            }

            const result = await db.dataAlgoFeed.bulkWrite(commands, {ordered:false});
        }
    } catch (e) {
        console.error("Following fetch failed");
        console.error(e);
    }
}

module.exports = {
    id, handler, updateOnlyFollowing
}