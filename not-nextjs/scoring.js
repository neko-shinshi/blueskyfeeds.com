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
    const GRAVITY = 2;
    const db = await connectToDatabase();
    const feeds = await db.feeds.find({sort: {$ne: "new"}, keywords:{$exists:true}}).project({_id:0}).toArray();
    let commands = feeds.map(feed => {
        console.log(feed);
        const {allowList, blockList, everyList, keywordSetting,
            keywords, languages, pics, postLevels} = feed;
        let dbQuery = {};
        if (allowList.length > 0) {
            // Only search posts from x users
            dbQuery.author = {$in: allowList};
        } else if (blockList.length > 0) {
            dbQuery.author = {$nin: blockList};
        }
        const wantPics = pics.indexOf("pics") >= 0;
        const wantText = pics.indexOf("text") >= 0;
        if (!(wantPics && wantText)) {
            dbQuery.hasImage = wantPics;
        }
        const wantTop = postLevels.indexOf("top") >= 0;
        const wantReply = postLevels.indexOf("reply") >= 0;
        if (!(wantTop && wantReply)) {
            if (wantTop) {
                dbQuery.replyRoot = null;
            } else { // wantReply
                dbQuery.replyRoot = {$ne: null};
            }
        }
        if (languages.length > 0) {
            dbQuery.lang = {$in: languages};
        }

        let keywordSearch = [];
        const findKeywords = keywords.filter(x => x.a).map(x => x.t);
        const blockKeywords = keywords.filter(x => !x.a).map(x => x.t);
        if (keywordSetting.indexOf("alt") >= 0 && findKeywords.length > 0) {
            keywordSearch.push({kwAlt:{$in: findKeywords, $nin: blockKeywords}});
        }

        if (keywordSetting.indexOf("text") >= 0 && findKeywords.length > 0) {
            keywordSearch.push({kwText:{$in: findKeywords, $nin: blockKeywords}});
        }

        switch (keywordSearch.length) {
            case 1: {
                dbQuery = {...dbQuery, ...keywordSearch[0]};
                break;
            }
            case 2: {
                dbQuery = {...dbQuery, $or:keywordSearch};
                break;
            }
        }

        if (everyList.length > 0) {
            let authorQuery = {author: {$in: everyList}};
            if (dbQuery.lang) {
                authorQuery.lang = dbQuery.lang;
            }
            if (dbQuery.hasImage) {
                authorQuery.hasImage = dbQuery.hasImage;
            }
            if (dbQuery.replyRoot) {
                authorQuery.replyRoot = dbQuery.replyRoot;
            }

            dbQuery = {$or: [authorQuery, dbQuery]};
        }
        return dbQuery;
    });
    commands = {$or: commands};
    const posts = await db.posts.find(commands).project({_id:1, createdAt:1}).toArray();
    const postIds = posts.map(x => x._id);


    const [like, reply, repost] = await Promise.all([
        db.likes.find({parent:{$in: postIds}}).project({_id:0, parent:1}).toArray(),
        db.replies.find({parent:{$in: postIds}}).project({_id:0, parent:1}).toArray(),
        db.reposts.find({parent:{$in: postIds}}).project({_id:0, parent:1}).toArray()
    ]);

    const now = new Date();
    const writeCommands = posts.map(post => {
        const {createdAt:then, _id} = post;
        const likes = like.filter(x => x.parent === _id).length;
        const ups = likes + reply.filter(x => x.parent === _id).length + repost.filter(x => x.parent === _id).length;
        const likeV = generateScoreWithTime(likes, now, then, GRAVITY);
        const upV = generateScoreWithTime(ups, now, then, GRAVITY);

        return {
            updateOne: {
                filter: {_id},
                update: {$set: {likes, ups, likeV, upV}}
            }
        };
    });
    return await db.posts.bulkWrite(writeCommands, {ordered:false});
}

module.exports = {
    updateScores
}