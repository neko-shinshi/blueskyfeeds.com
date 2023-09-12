// Hacker news score
// https://medium.com/hacking-and-gonzo/how-hacker-news-ranking-algorithm-works-1d9b0cf2c08d
const {secondsAfter} = require("../features/utils/timeUtils");

const generateScore = (ups, diffTime, gravity) =>{
    const hours = diffTime / 3600000;
    return (ups+1) / Math.pow((hours+2), gravity);
}

const generateScoreWithTime = (ups, now, then, gravity) => {
    const diffTime = now.getTime() - new Date(then).getTime();
    return generateScore(ups, diffTime, gravity);
}

const updateScores = async(db) => {
    const GRAVITY = 1.6;
    try {
        await db.data.insertOne({_id: "calculate_score", expireAt: secondsAfter(6.5*60)});

        const feeds = await db.feeds.find({sort: {$ne: "new"}, $or: [{"keywords.0":{$exists:true}}, {"everyList.0":{$exists:true}}]}).project({_id:0}).toArray();
        let commands = feeds.map(feed => {
            let {allowList, blockList, everyList, keywordSetting,
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

                if (findKeywords.length === 0) {
                    dbQuery = authorQuery; // Totally block not in everyList
                } else {
                    dbQuery = {$or: [authorQuery, dbQuery]};
                }
            } else {
                if (findKeywords.length === 0) {
                    dbQuery = {author:"_"}; // Block everything
                }
            }
            return dbQuery;
        });
        commands = {$or: commands};
        const now = new Date();
        let writeCommands = [];

        const cursor = db.posts.find(commands).project({_id:1, createdAt:1, idLikes:1, idReposts:1, idReplies:1}).sort({createdAt:-1});
        let i = 0;
        for await (const post of cursor) {
            const {createdAt:then, _id} = post;
            const likes = post.idLikes.length;
            const ups = likes + post.idReposts.length + post.idReplies.length;
            const likeV = generateScoreWithTime(likes, now, then, GRAVITY);
            const upV = generateScoreWithTime(ups, now, then, GRAVITY);

            writeCommands.push({
                updateOne: {
                    filter: {_id},
                    update: {$set: {likes, ups, likeV, upV}}
                }
            });

            if (i % 5000 === 4999) {
                const result = await db.posts.bulkWrite(writeCommands, {ordered:false});
                console.log("updated scores", result);
                writeCommands = [];
            }

            i++;
        }

        if (writeCommands.length > 0) {
            const result = await db.posts.bulkWrite(writeCommands, {ordered:false});
            console.log("updated scores", result);
        }
        console.log("complete scoring");

    } catch {}
}

module.exports = {
    updateScores
}