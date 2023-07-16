import {userPromise} from "features/utils/apiUtils";
import {rebuildAgentFromSession} from "features/utils/feedUtils";
import {editFeed, getCustomFeeds} from "features/utils/bsky";
import {serializeFile} from "features/utils/fileUtils";
import {SUPPORTED_LANGUAGES} from "features/utils/constants";

export default async function handler(req, res) {
    return userPromise(req, res, "POST", true, true,
        ({captcha, shortName}) => !!captcha && !!shortName,
        async ({db, session}) => {
            const agent = await rebuildAgentFromSession(session);
            if (!agent) {res.status(401).send(); return;}
            let { image, imageUrl, encoding, displayName, shortName, description,
                sort, blockList:_blockList, allowList:_allowList, languages:_languages} = req.body;
            const actors = [...new Set([..._allowList, ..._blockList])]; // dids

            if (actors.length !== _allowList.length + _blockList.length) {
                res.status(400).send("duplicate"); return;
            }
            const {data:{profiles}} = (await agent.api.app.bsky.actor.getProfiles({actors}));
            const blockList = _blockList.filter(x => profiles.find(y => y.did === x));
            const allowList = _allowList.filter(x => profiles.find(y => y.did === x));
            const languages = _languages.filter(x => SUPPORTED_LANGUAGES.indexOf(x) >= 0);

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
                await editFeed(agent, {img, shortName, displayName, description});
                await db.feeds.updateOne({_id},
                    {$set:{sort, languages, allowList, blockList}},
                    {upsert:true});
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