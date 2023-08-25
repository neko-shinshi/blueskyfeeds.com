const deleteDeadPosts = async (db) => {
    const feeds = await db.feeds.find({mode:"live"}).toArray();
    let postIds = new Set();
    for (const feedObj of feeds) {
        let {allowList, blockList, everyList, keywordSetting,
            keywords, languages, pics, postLevels, sort, sticky, hideLikeSticky} = feedObj;

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

        let keywordSearch = [], fail=false;
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
                fail = true;
                sticky = "at://did:plc:eubjsqnf5edgvcc6zuoyixhw/app.bsky.feed.post/3k4ematehei27";
            }
        }

        if (!fail) {
            console.log(JSON.stringify(dbQuery));
            const getSortMethod = (sort) => {
                switch (sort) {
                    case "like": return {likes:-1, createdAt:-1};
                    case "ups": return {ups:-1, createdAt: -1};
                    case "sLike": return {likeV:-1, createdAt: -1};
                    case "sUps": return {upV:-1, createdAt:-1};

                    // "new" also
                    default: return {createdAt: -1};
                }
            }
            const sortMethod = getSortMethod(sort);
            const result = await db.posts.find(dbQuery).sort(sortMethod).limit(1000).project({_id: 1}).toArray();
            result.forEach(x => {
                postIds.add(x._id);
            });
        }
    }

    let cutOff = new Date();
    cutOff.setHours(cutOff.getHours()-2);
    const result = await db.posts.deleteMany({_id: {$nin: postIds}, createdAt: {$lt: cutOff}});
    console.log(result);
}

module.exports = {
    deleteDeadPosts
}