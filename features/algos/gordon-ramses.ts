
import {getAgent, getAllPosts} from "features/utils/bsky";
import {randomInt} from "crypto";
import {connectToDatabase} from "../utils/dbUtils";
import {secondsAfter} from "features/utils/timeUtils";

export const id = "at://did:plc:eubjsqnf5edgvcc6zuoyixhw/app.bsky.feed.generator/gordonramses";
const feedId = "feed_gordon-ramses";

export const handler = async (user, cursor, limit) => {
    const db = await connectToDatabase();
    if (!db) {return {feed: [], cursor:""};} // DB fail

    console.log('ramses');
    const feed = await db.postsAlgoFeed.aggregate([{$match: {feed:feedId}}, {$sample: { size: limit}}, {$project: {_id: "$post"}}]).toArray();
    generate(); // try regenerating the feed in the background

    return {feed: feed.map(x => {return {post:x._id}}), cursor: ""};
}



const generate = async() => {
    /*
    const db = await connectToDatabase();
    if (!db) {return;}
    try {
        await db.dataAlgoFeed.insertOne({_id: "feed_lock_gordon-ramses", expireAt: secondsAfter(randomInt(24*60*60, 25*60*60))});
        // if successfully inserted, actually regenerate

        const agent = await getAgent("bsky.social" , process.env.BLUESKY_USERNAME, process.env.BLUESKY_PASSWORD);
        if (!agent) {console.log("agent error"); return}
        const posts = await getAllPosts(agent, "did:plc:ssswl2yqnc4snqvsdu5u7jiq", post => {
            const{record:{reply}, likeCount} = post;
            return !reply && likeCount >= 20 && likeCount <=50;
        })
        let commands:any = posts.map(x => {return {insertOne: {feed: feedId, post:x.uri}}});
        commands.splice(0, 0, {deleteMany: {filter: {feed: feedId}}});

        let result = await db.postsAlgoFeed.bulkWrite(commands);
        console.log("gordon-ramses", result);

    } catch {}*/
}

