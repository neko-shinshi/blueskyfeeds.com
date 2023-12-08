// Hacker news score
// https://medium.com/hacking-and-gonzo/how-hacker-news-ranking-algorithm-works-1d9b0cf2c08d
const {secondsAfter} = require("../features/utils/timeUtils");

const SUPPORTED_CW_LABELS = ["nudity", "sexual", "porn", "corpse"];
const listsToDids = (l) => {
    let list = l || [];
    return list.map(x => x.did);
}

const getKeywordQuery = (feedObj) => {
    let {allowList, blockList, everyList, keywordSetting, mentionList,
        keywords, keywordsQuote, languages, pics, postLevels, allowLabels, mustLabels} = feedObj;

    allowList = listsToDids(allowList);
    blockList = listsToDids(blockList);
    everyList = listsToDids(everyList);
    mentionList = listsToDids(mentionList);


    let dbQuery = {};
    if (allowList.length > 0) {
        // Only search posts from x users
        dbQuery.author = {$in: allowList};
    } else if (blockList.length > 0) {
        dbQuery.author = {$nin: blockList};
    }

    if (mentionList.length > 0) {
        dbQuery.mentions = {$in: mentionList};
    }

    const wantPics = pics.indexOf("pics") >= 0;
    const wantText = pics.indexOf("text") >= 0;
    if (!(wantPics && wantText)) {
        dbQuery.hasImage = wantPics;
    }

    if (dbQuery.hasImage && Array.isArray(mustLabels) && mustLabels.length > 0) {
        // NSFW Image posts only
        const rejectedLabels = SUPPORTED_CW_LABELS.filter(x => allowLabels.indexOf(x) < 0);
        dbQuery.labels = {$in: mustLabels, $nin: rejectedLabels}
    } else if (wantPics) {
        // Check content warning requirements
        if (Array.isArray(allowLabels)) {
            const rejectedLabels = SUPPORTED_CW_LABELS.filter(x => allowLabels.indexOf(x) < 0);
            dbQuery.labels = {$nin: rejectedLabels}
        }
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
        languages = languages.reduce((acc, x) => {
            acc.push(x);
            if (x) {
                acc.push(new RegExp(`^${x}-`));
            }
            return acc;
        }, []);
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

    if (keywordSetting.indexOf("link") >= 0 && findKeywords.length > 0) {
        keywordSearch.push({kwLink:{$in: findKeywords, $nin: blockKeywords}});
    }


    switch (keywordSearch.length) {
        case 0: {
            break;
        }
        case 1: {
            dbQuery = {...dbQuery, ...keywordSearch[0]};
            break;
        }
        case 2:
        case 3: {
            dbQuery = {...dbQuery, $or:keywordSearch};
            break;
        }
    }

    const findKeywordsQuote = keywordsQuote?.filter(x => x.a).map(x => x.t) || [];
    const searchQuoteKeywords = findKeywordsQuote.length > 0;

    let queryOrs = [];
    if (everyList.length > 0) {
        let authorQuery = {author: {$in: everyList}};
        if (dbQuery.lang) {
            authorQuery.lang = dbQuery.lang;
        }
        if (dbQuery.hasOwnProperty('hasImage')) {
            authorQuery.hasImage = dbQuery.hasImage;
        }

        if (dbQuery.hasOwnProperty('replyRoot')) {
            authorQuery.replyRoot = dbQuery.replyRoot;
        }
        if (dbQuery.hasOwnProperty('labels')) {
            authorQuery.labels = dbQuery.labels;
        }

        if (findKeywords.length + findKeywordsQuote.length === 0) {
            // dbQuery = authorQuery; // Totally block not in everyList
            queryOrs.push(authorQuery);
        } else {
            //dbQuery = {$or: [authorQuery, dbQuery]};
            queryOrs.push(authorQuery);
            queryOrs.push(dbQuery);
        }
    } else {
        if (findKeywords.length === 0) {
            if (mentionList.length > 0) {
                queryOrs.push(dbQuery);
            } else {
                if (!searchQuoteKeywords) {
                    return {feed:[{post: "at://did:plc:eubjsqnf5edgvcc6zuoyixhw/app.bsky.feed.post/3k4ematehei27"}], cursor:""};
                } // else, ignore all other settings and just look for quote
            }
        } else {
            queryOrs.push(dbQuery);
        }
    }


    if (searchQuoteKeywords) {
        const blockKeywordsQuote = keywordsQuote.filter(x => !x.a).map(x => x.t);
        queryOrs.push({kwText:{$in: findKeywordsQuote, $nin: blockKeywordsQuote}, quoteUri:{$ne:null}});
    }

    if (queryOrs.length === 1) {
        dbQuery = queryOrs[0];
    } else {
        dbQuery = {$or: queryOrs};
    }

    return dbQuery;
}

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

        const feeds = await db.feeds.find({mode: "live", sort: {$ne: "new"}, $or: [{"keywords.0":{$exists:true}}, {"everyList.0":{$exists:true}}]}).toArray();
        console.log(feeds.length);
        let commands = feeds.map(feed => {
            console.log("feed ", feed._id);
            return getKeywordQuery(feed);
        });
        commands = {$or: commands};
        const now = new Date();
        const scoreAt = Math.floor(now.getTime()/1000);
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
                    update: {$set: {likes, ups, likeV, upV, scoreAt}}
                }
            });

            if (i % 5000 === 4999) {
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