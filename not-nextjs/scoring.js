// Hacker news score
// https://medium.com/hacking-and-gonzo/how-hacker-news-ranking-algorithm-works-1d9b0cf2c08d
const {connectToDatabase} = require("../features/utils/dbUtils");

const generateScore = (ups, diffTime, gravity) =>{
    const hours = diffTime / 3600000;
    return (ups+1) / Math.pow((hours+2), gravity);
}

const generateScoreWithTime = (ups, now, then, gravity) => {
    const diffTime = now.getTime() - new Date(then).getTime();
    return generateScore(ups, diffTime, gravity);
}

const updateScores = async() => {
    const db = await connectToDatabase();
    const [posts, like, reply, repost] = await Promise.all([
        db.posts.find({}).project({_id:1, createdAt:1}).toArray(),
        db.likes.find({}).project({_id:0, parent:1}).toArray(),
        db.replies.find({}).project({_id:0, parent:1}).toArray(),
        db.reposts.find({}).project({_id:0, parent:1}).toArray()
    ]);

    const now = new Date();
    const commands = posts.map(post => {
        const {createdAt:then, _id} = post;
        const likes = like.filter(x => x.parent === _id).length;
        const ups = likes + reply.filter(x => x.parent === _id).length + repost.filter(x => x.parent === _id).length;
        const likeV = generateScoreWithTime(likes, now, then, db.gravity);
        const upV = generateScoreWithTime(ups, now, then, db.gravity);

        return {
            updateOne: {
                filter: {_id},
                update: {$set: {likes, ups, likeV, upV}}
            }
        };
    });
    return await db.posts.bulkWrite(commands, {ordered:false});
}

module.exports = {
    updateScores
}