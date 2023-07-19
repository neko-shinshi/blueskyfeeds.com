import {userPromise} from "features/utils/apiUtils";
import {rebuildAgentFromToken} from "features/utils/feedUtils";
import {editFeed, getCustomFeeds} from "features/utils/bsky";
import {serializeFile} from "features/utils/fileUtils";
import {PICS_SETTING, POST_LEVELS, SORT_ORDERS, SUPPORTED_LANGUAGES} from "features/utils/constants";
import {isValidDomain} from "features/utils/validationUtils";

export default async function handler(req, res) {
    return userPromise(req, res, "POST", true, true,
        ({captcha, shortName}) => !!captcha && !!shortName,
        async ({db, token}) => {

            let {image, imageUrl, encoding, languages:_languages,  postLevels:_postLevels, pics:_pics, keywordSetting, keywords:_keywords,
                sort, displayName, shortName, description, allowList, blockList, everyList, mustUrl, blockUrl} = req.body;

            const agent = await rebuildAgentFromToken(token);
            if (!agent) {res.status(401).send(); return;}
            console.log("received")
            if (!SORT_ORDERS.find(x => x.id === sort)) {
                console.log("a")
                res.status(400).send("invalid sort"); return;
            }

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
                // Empty lanuages means skip filtering language
                console.log("d")
                res.status(400).send("missing languages"); return;
            }

            const keywords = _keywords.filter(x => {
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
            if (keywords.length !== _keywords.length) {
                console.log("e")
                res.status(400).send("missing keywords"); return;
            }
            keywords.sort((a,b) => {
               return a.w.localeCompare(b.w);
            });

            if ([...new Set([...mustUrl, ...blockUrl])]
                .filter(x => isValidDomain(x)).length !== mustUrl.length + blockUrl.length) {
                console.log("f")
                res.status(400).send("missing urls"); return;
            }


            const actors = [...new Set([...allowList, ...blockList, ...everyList])]; // dids

            if (actors.length !== allowList.length + blockList.length + everyList.length) {
                console.log("duplicate")
                res.status(400).send("duplicate"); return;
            }
            if (actors.length > 0) {
                const {data:{profiles}} = (await agent.api.app.bsky.actor.getProfiles({actors}));
                blockList = blockList.filter(x => profiles.find(y => y.did === x));
                allowList = allowList.filter(x => profiles.find(y => y.did === x));
                everyList = everyList.filter(x => profiles.find(y => y.did === x));
            }



            let img = {};
            if (encoding) {
                if (imageUrl) {
                    image = await serializeFile(imageUrl);
                }
                const imageBlob = Buffer.from(image, "base64");
                img = {imageBlob, encoding};
            }

            const did = agent.session.did;
            const _id = `at://${did}/app.bsky.feed.generator/${shortName}`;

            try {
                // Update feed at Bluesky's side
                await editFeed(agent, {img, shortName, displayName, description});


                const o = {languages,  postLevels, pics, keywordSetting, keywords,
                    sort, allowList, blockList, everyList, mustUrl, blockUrl};

                // Update current feed
                await db.feeds.updateOne({_id},
                    {$set: o},
                    {upsert:true});
                // Reload all current user's feeds
                const commands = (await getCustomFeeds(agent)).map(x => {
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