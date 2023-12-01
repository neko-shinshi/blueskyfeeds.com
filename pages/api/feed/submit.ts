import {userPromise} from "features/utils/apiUtils";
import {
    editFeed,
    getCustomFeeds,
    isVIP,
    rebuildAgentFromToken,
    getPostInfo,
    expandUserLists
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
import {generate as generateFeed} from "features/algos/user-feed";
import {wLogger} from "features/utils/logger";
import sharp from "sharp";

// Regular users are restricted to MAX_FEEDS_PER_USER feeds and MAX_KEYWORDS_PER_FEED keywords

export default async function handler(req, res) {
    return userPromise(req, res, "POST", true, true,
        ({shortName}) => !!shortName,
        async ({db, token}) => {
            const agent = await rebuildAgentFromToken(token);
            if (!agent) {res.status(401).send(); return;}

            let body = await expandUserLists(req.body, agent, true);
            let {
                image, imageUrl, encoding, languages:_languages,  postLevels:_postLevels, pics:_pics, keywordSetting,
                keywords:_keywords, keywordsQuote:_keywordsQuote, keywordsLink:_keywordsLink, // TODO handle keywords in links
                mode, posts:_posts,
                sort, displayName, shortName, description, mustUrl, blockUrl, copy, highlight, sticky, mustLabels, allowLabels,
                allowList, allowListSync,
                blockList, blockListSync,
                everyList, everyListSync,
                mentionList, mentionListSync,
                viewers, viewersSync
            } = body;

            const did = agent.session.did;
            const _id = `at://${did}/app.bsky.feed.generator/${shortName}`;
            wLogger.info(`submit ${_id}`);


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
                const feedIds = await getMyCustomFeedIds(agent, db);
                if (feedIds.indexOf(_id) < 0 && feedIds.length >= MAX_FEEDS_PER_USER && !isVIP(agent)) {
                    console.log("too many feeds");
                    res.status(400).send("too many feeds"); return;
                }
            }

            keywordSetting = keywordSetting.filter(x => KEYWORD_SETTING.find(y => y.id === x));
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
                await editFeed(agent, {img, shortName, displayName, description});

                const o = {
                    languages,  postLevels, pics, keywordSetting, keywords, keywordsQuote, copy, highlight, sticky, posts, allowLabels, mustLabels,
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
                await db.allFeeds.bulkWrite(commands);

                if (mode === "user-likes" || mode === "user-posts") {
                    generateFeed(db, agent, _id, o).then(r => {
                        wLogger.info(`generate ${_id}`);
                        // Nothing
                    });
                }

                wLogger.info(`submitted ${_id}`);

                res.status(200).json({did});
            } catch (e) {
                console.log(e);
                console.log("failed to edit feed");
                res.status(400).send();
            }
        });
}