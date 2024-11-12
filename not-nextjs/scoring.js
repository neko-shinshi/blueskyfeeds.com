// Hacker news score
// https://medium.com/hacking-and-gonzo/how-hacker-news-ranking-algorithm-works-1d9b0cf2c08d
const {secondsAfter} = require("../features/utils/timeUtils");
const {BskyAgent} = require("@atproto/api");
const {queue} = require("async");

const GRAVITY = 1.6;
const MAX_QUERY = 25;
const CONCURRENCY = 2;

const listsToDids = (l) => {
    let list = l || [];
    return list.map(x => x.did);
}

const generateScore = (ups, diffTime) =>{
    const hours = diffTime / 3600000;
    return (ups+1) / Math.pow((hours+2), GRAVITY);
}

const generateScoreWithTime = (ups, now, then) => {
    const diffTime = now.getTime() - new Date(then).getTime();
    return generateScore(ups, diffTime);
}

const updateScores = async(db) => {

    try {
        await db.data.insertOne({_id: "calculate_score", expireAt: secondsAfter(14.5*60)});

        const feedIds = await db.feeds.find({mode: "live", sort: {$ne: "new"}}).project({_id:1}).toArray();
        console.log(feedIds.length);
        const now = new Date();
        let writeCommands = [];

        const cursor = db.posts.find({feeds:{$in: feedIds.map(x => x._id)}}).project({_id:1, indexedAt:1}).sort({indexedAt:-1});
        let i = 0;
        const agent = new BskyAgent({ service: "https://api.bsky.app/" });

        const q = queue( async ({uris, step}, qcb) => {

        }, CONCURRENCY);


        for await (const post of cursor) {
            const {indexedAt:then, _id, likes, ups} = post;
            const likeV = generateScoreWithTime(likes, now, then, GRAVITY);
            const upV = generateScoreWithTime(ups, now, then, GRAVITY);

            writeCommands.push({
                updateOne: {
                    filter: {_id},
                    update: {$set: {likeV, upV}}
                }
            });

            if (writeCommands.length === 100) {
                const result = await db.posts.bulkWrite(writeCommands, {ordered:false});
                if (!result.ok) {
                    console.log(i, "error", result);
                } else {
                    console.log(i, "updated scores", result.nMatched, result.nModified);
                }

                writeCommands = [];
            }

            i++;
        }

        if (writeCommands.length > 0) {
            const result = await db.posts.bulkWrite(writeCommands, {ordered:false});
            if (!result.ok) {
                console.log("error", result);
            } else {
                console.log("updated scores", result.nMatched, result.nModified);
            }
        }
        console.log("complete scoring");

    } catch {}
}

module.exports = {
    updateScores
}