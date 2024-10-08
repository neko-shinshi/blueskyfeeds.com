const {BskyAgent} = require("@atproto/api");
const FEED_BLACKLIST_DID = ["did:web:localhost", "did:web:example.com"];
const updateAllFeeds = async (db) => {
    const result = await db.fetchFeeds.find({}).project({_id:0, uid:1}).toArray();
    const ids = result.map(x => x.uid);
    const users = [...result.reduce((acc, x) => {
        x.users.forEach(y => acc.add(y));
        return acc;
    }, new Set())];
    let feeds = new Map();
    let commands = [];
    let failed = [];
    const agent = new BskyAgent({ service: "https://api.bsky.app/" });

    for (const actor of users) {
        console.log("actor", actor);
        let cursor = {};
        let attempt = 0;
        do {
            const params = {actor, ...cursor};
            try {
                const {data} = await agent.api.app.bsky.feed.getActorFeeds(params);
                const {cursor:newCursor, feeds:newFeeds} = data;
                if (!!newCursor && newCursor === cursor?.cursor) {
                    break;
                }
                let existing = feeds.get(actor);
                if (!existing) {
                    existing = [];
                }
                newFeeds.forEach(x => {
                    if (FEED_BLACKLIST_DID.indexOf(x.did) < 0) {
                        existing.push(x);
                    }
                });
                if (existing.length > 0) {
                    feeds.set(actor, existing);
                }
                if (!newCursor) {
                    cursor = null;
                } else {
                    cursor = {cursor: newCursor};
                }
            } catch (e) {
                if (e.status === 400 && e.error === "InvalidRequest") {
                    console.log("feed actor not found ", actor);
                    commands.push({deleteMany: {filter: {"creator.did": actor}}});
                    break;
                } else {
                    console.log(e);
                }
                attempt++;
                if (attempt > 2) {
                    failed.push(actor);
                    break;
                }
            }
        } while (cursor);
    }

    if (feeds.size > 0) {
        const ts = Math.floor(new Date().getTime()/1000);
        for (let [did, value] of feeds) {
            if (value.length > 0) {
                const deleteOthers = {deleteMany: {filter: {"creator.did": did, _id: {$nin: value.map(x => x.uri)}}}};
                commands.push(deleteOthers);

                for (const x of value) {
                    const {uri: _id, ...o} = x;
                    commands.push({
                        replaceOne: {
                            filter: {_id},
                            replacement: {...o, ts},
                            upsert: true
                        }
                    });
                }
            } else {
                const deleteOthers = {deleteMany: {filter: {"creator.did": did}}};
                commands.push(deleteOthers);
            }
        }
    }

    if (commands.length > 0) {
        console.log("feeds updated", await db.allFeeds.bulkWrite(commands, {ordered:false}));
        console.log("feed update ids cleared", await db.fetchFeeds.deleteMany({_id: {$in: ids}}));
    }
    if (failed.length > 0) {
        console.log("feed update fail", await db.fetchFeeds.insert({users: failed}));
    }

    console.log("feeds updated");
}

module.exports = {
    updateAllFeeds
}