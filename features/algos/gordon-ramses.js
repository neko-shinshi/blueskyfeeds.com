const {getAgent, getAllPosts} = require("../utils/bsky");
const {connectToDatabase} = require("../utils/dbUtils");
const {secondsAfter} = require("../utils/timeUtils");
const {randomInt} = require("crypto");

const id = "at://did:plc:eubjsqnf5edgvcc6zuoyixhw/app.bsky.feed.generator/gordonramses";

const handler = async (user, cursor, limit) => {
    const db = await connectToDatabase();
    if (!db) {return {feed: [], cursor:""};} // DB fail

    const feed = await db.dataAlgoFeed.findOne({_id: "feed_gordon-ramses"});
    generate(); // try regenerating the feed in the background

    if (!feed) {
        return {feed: [], cursor:""}; // Not ready yet
    }

    shuffleArray(feed.posts);

    return {feed: feed.posts.slice(0, limit).map(x => {return {post:x}}), cursor: "0"};

    // Cursor is just the index
}

function shuffleArray(array) {
    for (var i = array.length - 1; i > 0; i--) {
        var j = Math.floor(Math.random() * (i + 1));
        var temp = array[i];
        array[i] = array[j];
        array[j] = temp;
    }
}

const generate = async() => {
    const db = await connectToDatabase();
    if (!db) {return;}
    try {
        await db.dataAlgoFeed.insertOne({_id: "feed_lock_gordon-ramses", expireAt: secondsAfter(randomInt(24*60*60, 25*60*60))});
        // if successfully inserted, actually regenerate

        const agent = await getAgent("bsky.social" , process.env.BLUESKY_USERNAME, process.env.BLUESKY_PASSWORD);
        if (!agent) {return []}
        console.log("query");
        const posts = (await getAllPosts(agent, "did:plc:ssswl2yqnc4snqvsdu5u7jiq", post => {
            const{record:{reply}, likeCount} = post;
            return !reply && likeCount >= 20 && likeCount <=50;
        })).map(x => x.uri);

        const result = await db.dataAlgoFeed.updateOne({_id: "feed_gordon-ramses"}, {$set:{posts}}, {upsert:true});
        console.log("gordon-ramses", result);

    } catch {}
}

module.exports = {
    handler, id, generate
}