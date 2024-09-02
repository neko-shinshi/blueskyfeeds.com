import {randomInt} from "crypto";
import {getSortMethod, listsToDids} from "pages/xrpc/app.bsky.feed.getFeedSkeleton";
import {SUPPORTED_CW_LABELS} from "features/utils/constants";

export const handler = async (db, feedObj, queryCursor, limit, now=0, customSort="") => {
    let feed=[], cursor="";
    const dbQuery = getKeywordQuery(feedObj);

    let { sort, sticky, hideLikeSticky, keywordsQuote} = feedObj;

    const findKeywordsQuote = keywordsQuote?.filter(x => x.a).map(x => x.t) || [];
    const searchQuoteKeywords = findKeywordsQuote.length > 0;


    let result:any[] = [];
    const sortMethod = getSortMethod(customSort || sort);
    if (queryCursor) {
        if (sort === "new") {
            try {
                let [_postId, tss] = queryCursor.split("::");
                const [userId, __postId] = _postId.split("/");
                const postId = `at://${userId}/app.bsky.feed.post/${__postId}`
                tss = parseInt(tss);
                tss = new Date(tss).toISOString();
                dbQuery.createdAt = {$lte: tss}
                let projection:any = {createdAt: 1};
                if (searchQuoteKeywords) {projection = {...projection, quoteUri:1}}
                result = await db.posts.find(dbQuery).sort(sortMethod).limit(limit+100).project(projection).toArray(); // don't bother querying beyond 500
                if (result.length === 0) {
                    return {cursor, feed};
                } else if (now) {
                    db.posts.updateMany({_id: {$in: result.map(x => x._id)}}, {$set: {last: now }});
                }
                if (searchQuoteKeywords) {
                    result = result.map(x => x.quoteUri? {_id: x.quoteUri, createdAt: x.createdAt} : x);
                }

                let index = result.findIndex(x => x._id === postId);
                if (index === -1) {
                    index = result.findIndex(x => x.createdAt < tss);
                }
                if (index === -1) {
                    return {cursor, feed};
                }
                result = result.slice(index+1, index+1+limit);
                const last = result.at(-1);
                if (last) {
                    try {
                        const ts = new Date(last.createdAt).getTime();
                        const parts = last._id.split("/");
                        const id = `${parts[2]}/${parts[4]}`;
                        cursor = `${id}::${ts}`;
                    } catch (e) {
                        cursor = "";
                    }
                }
            } catch (e) {}
        } else {
            const skip = parseInt(queryCursor) || 0;
            let projection:any = {_id: 1};
            if (searchQuoteKeywords) {projection = {...projection, quoteUri:1}}
            result =  await db.posts.find(dbQuery).sort(sortMethod).skip(skip).limit(limit).project(projection).toArray();
            if (result.length === 0) {
                return {cursor, feed};
            } else {
                db.posts.updateMany({_id: {$in: result.map(x => x._id)}}, {$set: {last: now }});
            }
            if (searchQuoteKeywords) {
                result = result.map(x => x.quoteUri? {_id: x.quoteUri, createdAt: x.createdAt} : x);
            }
            cursor = `${result.length+skip}`;
        }
    } else {
        if (sort === "new") {
            if (sticky) {limit = limit -1;}

            let projection:any = {createdAt: 1};
            if (searchQuoteKeywords) {projection = {...projection, quoteUri:1}}
            result = await db.posts.find(dbQuery).sort(sortMethod).project(projection).limit(limit).toArray();
            if (result.length === 0) {
                feed = sticky? [{post:sticky}] : [];
                return {cursor, feed};
            } else {
                db.posts.updateMany({_id: {$in: result.map(x => x._id)}}, {$set: {last: now }});
            }
            if (searchQuoteKeywords) {
                result = result.map(x => x.quoteUri? {_id: x.quoteUri, createdAt: x.createdAt} : x);
            }

            if (sticky) {
                result = result.filter(x => x._id !== sticky);
                result.splice(1,0, {_id: sticky});
            }
            // return last item + timestamp
            const last = result.at(-1);
            if (last) {
                const ts = new Date(last.createdAt).getTime();
                const parts = last._id.split("/");
                const id = `${parts[2]}/${parts[4]}`;
                cursor = `${id}::${ts}`;
            }
        } else {
            if (sticky) {limit = limit -1;}
            let projection:any = {_id: 1};
            if (searchQuoteKeywords) {projection = {...projection, quoteUri:1}}
            result = await db.posts.find(dbQuery).sort(sortMethod).project(projection).limit(limit).toArray();
            if (result.length === 0) {
                feed = sticky? [{post:sticky}] : [];
                return {cursor, feed};
            } else {
                db.posts.updateMany({_id: {$in: result.map(x => x._id)}}, {$set: {last: now }});
            }

            if (searchQuoteKeywords) {
                result = result.map(x => x.quoteUri? {_id: x.quoteUri, createdAt: x.createdAt} : x);
            }

            if (sticky) {
                result = result.filter(x => x._id !== sticky);
                result.splice(randomInt(0, 2),0, {_id: sticky});
            }
            cursor = `${limit}`;
        }
    }
    feed = result.map(x => {return {post: x._id};});
    return {feed, cursor};
}

const getKeywordQuery = (feedObj) => {
    let {allowList, blockList, everyList, keywordSetting, mentionList, everyListBlockKeyword, everyListBlockKeywordSetting,
        keywords, keywordsQuote, languages, pics, postLevels, allowLabels, mustLabels} = feedObj;

    allowList = listsToDids(allowList);
    everyList = listsToDids(everyList);
    blockList = [...listsToDids(blockList), ...everyList]; // Filters on normal posts don't apply to everylist

    mentionList = listsToDids(mentionList);


    let dbQuery:any = {};
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


    const findKeywords = keywords.filter(x => x.a).map(x => x.t);
    const blockKeywords = keywords.filter(x => !x.a).map(x => x.t);


    if (findKeywords.length > 0) {
        let keywordSearch = [];

        if (keywordSetting.indexOf("alt") >= 0) {
            keywordSearch.push({kwAlt:{$in: findKeywords}});
        }

        if (keywordSetting.indexOf("text") >= 0) {
            keywordSearch.push({kwText:{$in: findKeywords}});
        }

        if (keywordSetting.indexOf("link") >= 0) {
            keywordSearch.push({kwLink:{$in: findKeywords}});
        }
        switch (keywordSearch.length) {
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
    }
    if (blockKeywords.length > 0) {
        if (keywordSetting.indexOf("alt") >= 0) {
            if (dbQuery.kwAlt) {
                dbQuery.kwAlt = {...dbQuery.kwAlt, $nin: blockKeywords};
            } else {
                dbQuery.kwAlt = {$nin: blockKeywords};
            }
        }

        if (keywordSetting.indexOf("text") >= 0) {
            if (dbQuery.kwText) {
                dbQuery.kwText = {...dbQuery.kwText, $nin: blockKeywords};
            } else {
                dbQuery.kwText = {$nin: blockKeywords};
            }
        }

        if (keywordSetting.indexOf("link") >= 0) {
            if (dbQuery.kwLink) {
                dbQuery.kwLink = {...dbQuery.kwLink, $nin: blockKeywords};
            } else {
                dbQuery.kwLink = {$nin: blockKeywords};
            }
        }
    }

    const findKeywordsQuote = keywordsQuote?.filter(x => x.a).map(x => x.t) || [];
    const searchQuoteKeywords = findKeywordsQuote.length > 0;

    let queryOrs = [];
    if (everyList.length > 0) {
        let authorQuery:any = {author: {$in: everyList}};
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

        if (Array.isArray(everyListBlockKeyword) && everyListBlockKeyword.length > 0) {
            everyListBlockKeywordSetting = everyListBlockKeywordSetting || ["text"];
            if (everyListBlockKeywordSetting.indexOf("alt") >= 0) {
                authorQuery.kwAlt = {$nin: everyListBlockKeyword.map(x => x.t)};
            }

            if (everyListBlockKeywordSetting.indexOf("text") >= 0) {
                authorQuery.kwText = {$nin: everyListBlockKeyword.map(x => x.t)};
            }

            if (everyListBlockKeywordSetting.indexOf("link") >= 0) {
                authorQuery.kwLink = {$nin: everyListBlockKeyword.map(x => x.t)};
            }
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
        let cmd:any = {$in: findKeywordsQuote};
        if (blockKeywordsQuote.length > 0) {
            cmd.$nin = blockKeywordsQuote;
        }
        queryOrs.push({kwText:cmd, quoteUri:{$ne:null}});
    }

    if (queryOrs.length === 1) {
        dbQuery = queryOrs[0];
    } else {
        dbQuery = {$or: queryOrs};
    }

    return dbQuery;
}