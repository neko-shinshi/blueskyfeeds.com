import {userPromise} from "features/utils/apiUtils";
import {getActorsInfo, editFeed, getCustomFeeds, isVIP, rebuildAgentFromToken, getPostInfo} from "features/utils/bsky";
import {serializeFile} from "features/utils/fileUtils";
import {
    FEED_MODES,
    KEYWORD_SETTING,
    MAX_FEEDS_PER_USER,
    MAX_KEYWORDS_PER_LIVE_FEED, MAX_KEYWORDS_PER_USER_FEED,
    PICS_SETTING,
    POST_LEVELS,
    SORT_ORDERS,
    SUPPORTED_LANGUAGES, USER_FEED_MODE
} from "features/utils/constants";
import {isValidDomain} from "features/utils/validationUtils";
import {getMyCustomFeedIds} from "features/utils/feedUtils";
import {compressKeyword} from "features/utils/objectUtils";

// Regular users are restricted to MAX_FEEDS_PER_USER feeds and MAX_KEYWORDS_PER_FEED keywords

export default async function handler(req, res) {
    return userPromise(req, res, "POST", true, true,
        ({shortName}) => !!shortName,
        async ({db, token}) => {
            const agent = await rebuildAgentFromToken(token);
            if (!agent) {res.status(401).send(); return;}
            console.log("received");

            let {image, imageUrl, encoding, languages:_languages,  postLevels:_postLevels, pics:_pics, keywordSetting, keywords:_keywords, mode,
                sort, displayName, shortName, description, allowList, blockList, everyList, mustUrl, blockUrl, copy, highlight, sticky} = req.body;

            if (sticky) {
                const {uri} = await getPostInfo(agent, sticky);
                if (!uri) {
                    res.status(400).send("invalid sticky"); return;
                } else {
                    sticky = uri; // only store uri
                }
            } else {
                sticky = null;
            }

            if (!/^[a-zA-Z0-9_-]+$/.test(shortName)) {
                res.status(400).send("invalid short name"); return;
            }

            let modeParent = mode.startsWith("user")? "user" : mode;
            if (!SORT_ORDERS.find(x => x.id === sort && x.mode.indexOf(modeParent) >= 0)) {
                res.status(400).send("invalid sort"); return;
            }

            if (mode) {
                if (mode.startsWith("user")) {
                    const subMode = mode.slice(5);
                    if (!USER_FEED_MODE.find(x => x.id === subMode)) {
                        res.status(400).send("Invalid user mode"); return;
                    }
                } else {
                    mode = FEED_MODES.find(x => x.id === mode)? mode : "live";
                }
            } else {
                mode = "live";
            }

            const did = agent.session.did;
            const _id = `at://${did}/app.bsky.feed.generator/${shortName}`;

            if (!isVIP(agent)) {
                const feedIds = await getMyCustomFeedIds(agent, db);
                if (feedIds.indexOf(_id) < 0 && feedIds.length >= MAX_FEEDS_PER_USER && !isVIP(agent)) {
                    res.status(400).send("too many feeds"); return;
                }
            }



            keywordSetting = keywordSetting.filter(x => KEYWORD_SETTING.find(y => y.id === x));
            const pics = _pics.filter(x => PICS_SETTING.find(y => y.id === x));
            if (pics.length === 0 || pics.length !== _pics.length) {
                console.log("b")
                res.status(400).send("missing pics"); return;
            }
            const postLevels = _postLevels.filter(x => POST_LEVELS.find(y => y.id === x));
            if (postLevels.length === 0 || postLevels.length !== _postLevels.length) {
                console.log("c")
                res.status(400).send("missing levels"); return;
            }
            const languages = _languages.filter(x => SUPPORTED_LANGUAGES.indexOf(x) >= 0);
            if (languages.length !== _languages.length) {
                // Empty languages means skip filtering language
                console.log("d")
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

            if (keywords.length > MAX_KEYWORDS_PER_LIVE_FEED && !isVIP(agent)) {
                res.status(400).send("too many keywords"); return;
            }

            if (mode === "user" && keywords.length > MAX_KEYWORDS_PER_USER_FEED) {
                res.status(400).send("too many keywords"); return;
            }

            if (keywords.length !== _keywords.length) {
                console.log("e")
                res.status(400).send("missing keywords"); return;
            }
            keywords = keywords.map(x => compressKeyword(x));
            keywords.sort((a,b) => {
               return a.t.localeCompare(b.t);
            });

            if ([...new Set([...mustUrl, ...blockUrl])]
                .filter(x => isValidDomain(x)).length !== mustUrl.length + blockUrl.length) {
                res.status(400).send("missing urls"); return;
            }

            const actors = [...new Set([...allowList, ...blockList, ...everyList])]; // dids
            if (actors.length !== allowList.length + blockList.length + everyList.length) {
                res.status(400).send("duplicate"); return;
            }
            if (actors.length > 0) {
                const allProfiles = await getActorsInfo(agent, actors);
                blockList = blockList.filter(x => allProfiles.find(y => y.did === x));
                allowList = allowList.filter(x => allProfiles.find(y => y.did === x));
                everyList = everyList.filter(x => allProfiles.find(y => y.did === x));
            }

            let img = {};
            if (encoding) {
                if (imageUrl) {
                    image = await serializeFile(imageUrl);
                }
                const imageBlob = Buffer.from(image, "base64");
                img = {imageBlob, encoding};
            }

            try {
                // Update feed at Bluesky's side
                console.log("submit to bsky")
                await editFeed(agent, {img, shortName, displayName, description});

                const o = {languages,  postLevels, pics, keywordSetting, keywords, copy, highlight, sticky,
                    sort, allowList, blockList, everyList, mustUrl, blockUrl, mode};

                // Update current feed
                await db.feeds.updateOne({_id},
                    {$set: o},
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
                res.status(200).send();
            } catch (e) {
                console.log(e);
                console.log("failed to edit feed");
                res.status(400).send();
            }
        });
}