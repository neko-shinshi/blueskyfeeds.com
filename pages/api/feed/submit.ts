import {userPromise} from "features/utils/apiUtils";
import {
    editFeed,
    getCustomFeeds,
    isVIP,
    rebuildAgentFromToken,
    getPostInfo,
    expandUserLists, isSuperAdmin
} from "features/utils/bsky";
import {serializeFile} from "features/utils/fileUtils";
import {
    FEED_MODES,
    KEYWORD_SETTING,
    MAX_FEEDS_PER_USER,
    MAX_KEYWORDS_PER_LIVE_FEED, MAX_KEYWORDS_PER_USER_FEED,
    PICS_SETTING,
    POST_LEVELS,
    SORT_ORDERS, SUPPORTED_CW_LABELS,
    SUPPORTED_LANGUAGES, USER_FEED_MODE
} from "features/utils/constants";
import {isValidDomain} from "features/utils/validationUtils";
import {getMyCustomFeedIds} from "features/utils/feedUtils";
import {compressKeyword} from "features/utils/objectUtils";
import {wLogger} from "features/utils/logger";
import sharp from "sharp";
import {handler as liveFeedHandler} from "features/algos/live-feed";
import {checkHashtags, findKeywords, prepKeywords} from "features/utils/textAndKeywords";
import {generateFeed} from "features/algos/user-feed";

// Regular users are restricted to MAX_FEEDS_PER_USER feeds and MAX_KEYWORDS_PER_FEED keywords

export default async function handler(req, res) {
    return userPromise(req, res, "POST", true, true,
        ({shortName}) => !!shortName,
        async ({db, token}) => {
            const agent = await rebuildAgentFromToken(token);
            if (!agent) {res.status(401).send(); return;}

            let body = await expandUserLists(req.body, agent, true);
            let {
                image, imageUrl, encoding, languages:_languages,  postLevels:_postLevels, pics:_pics, keywordSetting, everyListBlockKeywordSetting,
                keywords:_keywords, keywordsQuote:_keywordsQuote, keywordsLink:_keywordsLink, // TODO handle keywords in links
                mode, posts:_posts,
                sort, displayName, shortName, description, mustUrl, blockUrl, copy, highlight, sticky, mustLabels, allowLabels,
                allowList, allowListSync,
                blockList, blockListSync,
                everyList, everyListSync,
                mentionList, mentionListSync,
                viewers, viewersSync,
                keywordsEdited, keywordsQuoteEdited, everyListBlockKeyword, _id:overrideId
            } = body;

            const did = agent.session.did;
            let _id = `at://${did}/app.bsky.feed.generator/${shortName}`;
            const isSuper = isSuperAdmin(agent);
            let updateAtBsky = true;
            if (isSuper && overrideId) {
                if (overrideId !== _id) {
                    updateAtBsky = false;
                    _id = overrideId;
                }
            }

            wLogger.info(did, `submit ${_id}`);

            everyListBlockKeyword = everyListBlockKeyword || [];
            everyListBlockKeyword = everyListBlockKeyword.filter(x => {
                const {w,t,r,a, ...other} = x;
                if (Object.keys(other).length === 0 && (typeof w === 'string' || w instanceof String) && typeof a == "boolean" ) {
                    switch (t) {
                        case "t":
                        case "s": {
                            return Array.isArray(r) &&
                                r.every(y => (typeof y.p === 'string' || y.p instanceof String || typeof y.s === 'string' || y.s instanceof String));
                        }
                        case "#": {
                            return true;
                        }
                    }
                }

                return false;
            });

            everyListBlockKeyword = everyListBlockKeyword.map(x => compressKeyword(x));
            everyListBlockKeyword.sort((a,b) => {
                return a.t.localeCompare(b.t);
            });
            mustLabels = mustLabels.filter(x => SUPPORTED_CW_LABELS.indexOf(x) >= 0);
            allowLabels = allowLabels.filter(x => SUPPORTED_CW_LABELS.indexOf(x) >= 0);

            let posts = _posts;
            if (_posts) {
                if (Array.isArray(_posts)) {
                    if (_posts.length > 0) {
                        posts = (await getPostInfo(agent, _posts)).map(post => {
                            const {uri} = post;
                            return uri;
                        });
                    }
                } else {
                    console.log("invalid posts, not array")
                    res.status(400).send("invalid posts"); return;
                }
            }

            if (sticky) {
                const [post] = await getPostInfo(agent, [sticky]);
                if (!post) {
                    console.log("invalid sticky");
                    res.status(400).send("invalid sticky"); return;
                } else {
                    sticky = post.uri; // only store uri
                }
            } else {
                sticky = null;
            }

            if (!/^[a-zA-Z0-9_-]+$/.test(shortName)) {
                console.log("invalid short name")
                res.status(400).send("invalid short name"); return;
            }

            let modeParent = mode.startsWith("user")? "user" : mode;
            if (mode !== "posts" && !SORT_ORDERS.find(x => x.id === sort && x.mode.indexOf(modeParent) >= 0)) {
                console.log("invalid sort");
                res.status(400).send("invalid sort"); return;
            }

            if (mode) {
                if (mode.startsWith("user")) {
                    const subMode = mode.slice(5);
                    if (!USER_FEED_MODE.find(x => x.id === subMode)) {
                        console.log("invalid user mode")
                        res.status(400).send("Invalid user mode"); return;
                    }
                } else {
                    mode = FEED_MODES.find(x => x.id === mode)? mode : "live";
                }
            } else {
                mode = "live";
            }



            if (!isVIP(agent)) {
                try {
                    const feedIds = await getMyCustomFeedIds(agent, db);
                    if (feedIds.indexOf(_id) < 0 && feedIds.length >= MAX_FEEDS_PER_USER && !isVIP(agent)) {
                        console.log("too many feeds");
                        res.status(400).send("too many feeds"); return;
                    }
                } catch (e) {}
            }

            keywordSetting = keywordSetting.filter(x => KEYWORD_SETTING.find(y => y.id === x));
            everyListBlockKeywordSetting = everyListBlockKeywordSetting.filter(x => KEYWORD_SETTING.find(y => y.id === x));
            const pics = _pics.filter(x => PICS_SETTING.find(y => y.id === x));
            if (pics.length === 0 || pics.length !== _pics.length) {
                console.log("missing pics");
                res.status(400).send("missing pics"); return;
            }
            const postLevels = _postLevels.filter(x => POST_LEVELS.find(y => y.id === x));
            if (postLevels.length === 0 || postLevels.length !== _postLevels.length) {
                console.log("missing levels");
                res.status(400).send("missing levels"); return;
            }
            const languages = _languages.filter(x => SUPPORTED_LANGUAGES.indexOf(x) >= 0);
            if (languages.length !== _languages.length) {
                // Empty languages means skip filtering language
                console.log("missing languages");
                res.status(400).send("missing languages"); return;
            }

            let keywords = _keywords.filter(x => {
                const {w,t,r,a, ...other} = x;
                if (Object.keys(other).length === 0 && (typeof w === 'string' || w instanceof String) && typeof a == "boolean" ) {
                    switch (t) {
                        case "t":
                        case "s": {
                            return Array.isArray(r) && w !== " " && w !== "\n" &&
                                r.every(y => (typeof y.p === 'string' || y.p instanceof String || typeof y.s === 'string' || y.s instanceof String));
                        }
                        case "#": {
                            return true;
                        }
                    }
                }

                return false;
            });

            let keywordsQuote = _keywordsQuote.filter(x => {
                const {w,t,r,a, ...other} = x;
                if (Object.keys(other).length === 0 && (typeof w === 'string' || w instanceof String) && typeof a == "boolean" ) {
                    switch (t) {
                        case "t":
                        case "s": {
                            return Array.isArray(r) &&
                                r.every(y => (typeof y.p === 'string' || y.p instanceof String || typeof y.s === 'string' || y.s instanceof String));
                        }
                        case "#": {
                            return true;
                        }
                    }
                }

                return false;
            });

            if ((keywordsQuote.length > MAX_KEYWORDS_PER_LIVE_FEED || keywords.length > MAX_KEYWORDS_PER_LIVE_FEED)
                && !isVIP(agent)) {
                console.log("too many keywords");
                res.status(400).send("too many keywords");
                return;
            }

            if (mode === "user" && keywords.length > MAX_KEYWORDS_PER_USER_FEED) {
                console.log("too many keywords");
                res.status(400).send("too many keywords");
                return;
            }

            if (keywords.length !== _keywords.length) {
                console.log("missing keywords");
                res.status(400).send("missing keywords");
                return;
            }

            if (keywordsQuote.length !== _keywordsQuote.length) {
                console.log("missing keywords");
                res.status(400).send("missing keywords");
                return;
            }
            keywords = keywords.map(x => compressKeyword(x));
            keywords.sort((a,b) => {
               return a.t.localeCompare(b.t);
            });

            keywordsQuote = keywordsQuote.map(x => compressKeyword(x));
            keywordsQuote.sort((a,b) => {
                return a.t.localeCompare(b.t);
            });

            if ([...new Set([...mustUrl, ...blockUrl])]
                .filter(x => isValidDomain(x)).length !== mustUrl.length + blockUrl.length) {
                console.log("missing urls");
                res.status(400).send("missing urls"); return;
            }

            let img = {};
            if (encoding) {
                if (imageUrl) {
                    image = await serializeFile(imageUrl);
                }
                let imageBlob = Buffer.from(image, "base64");
                if (encoding === "image/webp") {
                    encoding = "image/png";
                    imageBlob = await sharp(imageBlob)
                        .toFormat('png')
                        .toBuffer();
                }
                img = {imageBlob, encoding};
            }

            try {
                // Update feed at Bluesky's side
                if (updateAtBsky) {
                    await editFeed(agent, {img, shortName, displayName, description});
                }

                const o = {
                    languages,  postLevels, pics, keywordSetting,
                    keywords, keywordsQuote, everyListBlockKeyword, everyListBlockKeywordSetting,
                    copy, highlight, sticky, posts, allowLabels, mustLabels,
                    sort,
                    viewers, viewersSync,
                    allowList, allowListSync,
                    blockList, blockListSync,
                    everyList, everyListSync,
                    mentionList, mentionListSync,
                    mustUrl, blockUrl, mode, updated: new Date().toISOString()};

                // Update current feed
                await db.feeds.updateOne({_id},
                    {$set: o, $setOnInsert:{created:new Date().toISOString()}},
                    {upsert:true});
                // Reload all current user's feeds
                try {
                    const commands = (await getCustomFeeds(agent) as any[]).map(x => {
                        const {uri, ...y} = x;
                        return {
                            updateOne: {
                                filter: {_id: uri},
                                update: {$set: y},
                                upsert: true
                            }
                        };
                    });
                    if (commands.length > 0) {
                        await db.allFeeds.bulkWrite(commands);
                    }
                } catch (e) {}



                switch (mode) {
                    case "user-likes":
                    case "user-posts": {
                        /*generateFeed(db, agent, _id, o).then(r => {
                            wLogger.info(`generate ${_id}`);
                            // Nothing
                        });*/
                        break;
                    }
                    case "live": {
                        if (keywordsEdited || keywordsQuoteEdited) {
                            /*
                            const updateKeywords = ({size, loop=false, customSort=""}) => {
                                liveFeedHandler( db, o, "", size,0, customSort).then(({feed}) => {
                                    if (feed.length === 0) {
                                        console.log(`no feed items ${_id}`);
                                        return;
                                    }

                                    wLogger.info(`live update ${_id}`);
                                    getPostInfo(agent, feed.map(x => x.post)).then(posts => {
                                        if (posts.length === 0) {
                                            console.log(`no posts ${_id}`);
                                            return;
                                        }
                                        const rawKeywords = o.keywords.map(x => {return {_id:x.t}});
                                        const kw = prepKeywords(rawKeywords);

                                        const commands = posts.reduce((acc, {uri, record}) => {
                                            let {embed, facets, text} = record;
                                            let kwAlt = new Set<string>();
                                            let kwLink = new Set<string>();
                                            let kwTag = new Set<string>();

                                            let tags = new Set<string>();
                                            if (Array.isArray(facets)) {
                                                // @ts-ignore
                                                facets.filter(x => Array.isArray(x.features) && x.features[0] &&
                                                    x.features[0]["$type"] === "app.bsky.richtext.facet#tag").forEach(x => {
                                                    const tag = x.features[0].tag as string;
                                                    tags.add(tag);
                                                });

                                                let buffer = Buffer.from(text);
                                                facets.filter(x => Array.isArray(x.features) && x.features[0] &&
                                                    x.features[0]["$type"] === "app.bsky.richtext.facet#link").sort((a, b) => {
                                                    return a.index.byteStart < b.index.byteStart ? 1 : -1;
                                                }).forEach(x => {
                                                    let parts: any = [];
                                                    if (buffer) {
                                                        parts.push(buffer.subarray(x.index.byteEnd, buffer.length));
                                                        parts.push(buffer.subarray(0, x.index.byteStart));
                                                        parts = parts.reverse();
                                                    }

                                                    buffer = Buffer.concat(parts);

                                                    const url = x.features[0]["uri"];
                                                    if (url) {
                                                        findKeywords(url, kw).keywords.forEach(kw => kwLink.add(kw));
                                                    }
                                                });
                                                text = buffer.toString("utf8");
                                            }

                                            checkHashtags([...tags].map(x => x.toLowerCase()), kw["#"], kwTag);

                                            if (embed) {
                                                switch (embed["$type"]) {
                                                    case "app.bsky.embed.recordWithMedia": {
                                                        // @ts-ignore
                                                        const imagess = embed.media?.images;
                                                        if (Array.isArray(imagess)) {
                                                            for (const image of imagess) {
                                                                if (image.alt) {
                                                                    findKeywords(image.alt, kw).keywords.forEach(kw => kwAlt.add(kw));
                                                                }
                                                            }
                                                        }

                                                        // @ts-ignore
                                                        const external = embed.external?.uri;
                                                        if (external) {
                                                            findKeywords(external, kw).keywords.forEach(kw => kwLink.add(kw));
                                                        }
                                                        break;
                                                    }
                                                    case "app.bsky.embed.images": {
                                                        if (Array.isArray(embed.images)) {
                                                            //@ts-ignore
                                                            for (const image of embed.images) {
                                                                if (image.alt) {
                                                                    findKeywords(image.alt, kw).keywords.forEach(kw => kwAlt.add(kw));
                                                                }
                                                            }
                                                        }
                                                        break;
                                                    }
                                                    case "app.bsky.embed.external": {
                                                        //@ts-ignore
                                                        findKeywords(embed.external?.uri, kw).keywords.forEach(kw => kwLink.add(kw));
                                                        break;
                                                    }
                                                }
                                            }
                                            let {keywords:kwText} = findKeywords(text, kw); // remove url from keyword search

                                            if (kwText.length + kwAlt.size + kwTag.size + kwLink.size > 0) {
                                                let $addToSet:any = {};
                                                if (kwText.length > 0) {
                                                    $addToSet.kwText = {$each: kwText};
                                                }
                                                if (kwAlt.size > 0) {
                                                    $addToSet.kwAlt = {$each: [...kwAlt]};
                                                }
                                                if (kwTag.size > 0) {
                                                    $addToSet.kwTag = {$each: [...kwTag]};
                                                }
                                                if (kwLink.size > 0) {
                                                    $addToSet.kwTag = {$each: [...kwLink]};
                                                }
                                                acc.push({
                                                    updateOne: {
                                                        filter: {_id: uri},
                                                        update: {$addToSet}
                                                    }
                                                });
                                            }

                                            return acc;
                                        }, []);

                                        if (commands.length > 0) {
                                            db.posts.bulkWrite(commands, {ordered:false}).then((result) => {
                                                wLogger.info(`${_id}: ${commands.length}/${posts.length} ${result.nModified}/${result.nMatched}`);
                                                if (loop) {
                                                    wLogger.info("looping");
                                                    setTimeout(() => {
                                                        // Update the most recent 300 posts 5 min later just in case they were not updated
                                                        updateKeywords({size:200, customSort:"new"});
                                                    }, 30*1000);
                                                }
                                            });
                                        } else {
                                            wLogger.info(`no commands ${_id}`);
                                        }
                                    });
                                });
                            }
                            updateKeywords({size:10000, loop:true});*/
                        }
                        break;
                    }
                }

                wLogger.info(`submitted ${_id}`);

                res.status(200).json({did});
            } catch (e) {
                wLogger.error(e);
                wLogger.error("failed to edit feed");
                res.status(400).send();
            }
        });
}