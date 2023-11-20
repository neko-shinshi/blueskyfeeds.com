const {BskyAgent} = require("@atproto/api");

const getAgent = async () => {
    const agent = new BskyAgent({ service: "https://bsky.social/" });
    await agent.login({
        identifier: process.env.BLUESKY_USERNAME,
        password: process.env.BLUESKY_PASSWORD
    });
    return agent;
}

const updateAllFeeds = async (db) => {
    const result = await db.allFeedsUpdate.find({}).toArray();
    const ids = result.map(x => x._id);
    const users = [...result.reduce((acc, x) => {
        x.users.forEach(y => acc.add(y));
        return acc;
    }, new Set())];
    const agent = await getAgent();
    let feeds = [];
    for (const actor of users) {
        console.log("actor", actor);
        let cursor = {};
        let attempt = 0;
        do {
            const params = {actor, ...cursor};
            try {
                const {data} = await agent.api.app.bsky.feed.getActorFeeds(params);
                const {cursor:newCursor, feeds:newFeeds} = data;
                if (newCursor === cursor?.cursor) {
                    break;
                }

                newFeeds.forEach(x => feeds.push(x));

                if (!newCursor) {
                    cursor = null;
                } else {
                    cursor = {cursor: newCursor};
                }
            } catch (e) {
                if (e.status === 400) {
                    console.log("feed actor not found ", actor); break;
                } else {
                    console.log(e);
                }
                attempt++;
                if (attempt > 2) {
                    break;
                }
            }
        } while (cursor);
    }

    if (feeds.length > 0) {
        const ts = Math.floor(new Date().getTime()/1000);
        const command = feeds.map(x => {
            const {uri: _id, ...o} = x;
            return {
                replaceOne: {
                    filter: {_id},
                    replacement: {...o, ts},
                    upsert: true
                }
            }
        });
        console.log(JSON.stringify(command));

        console.log(await db.allFeeds.bulkWrite(command, {ordered:false}));
        console.log(await db.allFeedsUpdate.deleteMany({_id: {$in: ids}}));
    }

    console.log("feeds updated");
}

module.exports = {
    updateAllFeeds
}