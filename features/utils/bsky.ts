import { BskyAgent }  from "@atproto/api";
import {SIGNATURE} from "features/utils/constants";

export const getAgent = async (service, identifier, password) => {
    const agent = new BskyAgent({ service: `https://${service}/` });
    try {
        await agent.login({identifier, password});
        return agent;
    } catch (e) {
        console.log(e);
        return null;
    }
}

export const rebuildAgentFromToken = async (token) => {
    const {sub:_did, did:__did, refreshJwt, accessJwt, service} = token;
    try {
        const agent = new BskyAgent({ service: `https://${service}/` });
        await agent.resumeSession({did: __did || _did, refreshJwt, accessJwt, handle:"", email:""});
        return agent;
    } catch (e) {
        console.log(e);
        return false;
    }
}


export const getCustomFeeds = async (agent) => {
    let cursor:any = {};
    let results:any = [];
    do {
        const params = {actor: agent.session.did, ...cursor};
        const {success, data} = await agent.api.app.bsky.feed.getActorFeeds(params);

        if (success) {
            const {cursor:newCursor, feeds} = data;
            feeds.forEach(x => results.push(x));
            if (!newCursor) {
                cursor = null;
            } else {
                cursor = {cursor: newCursor};
            }
        } else {
            return false; // Failure
        }
    } while (cursor);
    return results;
}

export const getSavedFeedIds = async (agent) => {
    let {success, data} = await agent.api.app.bsky.actor.getPreferences();

    if (success) {
        const feeds = data.preferences.find(x =>  x["$type"] === "app.bsky.actor.defs#savedFeedsPref");
        if (feeds) {
            const {$type, ...rest} = feeds;
            return rest;
        }
    }
    return {};
}


export const getSavedFeeds = async (agent) => {
    const feeds = await getSavedFeedIds(agent);
    if (feeds) {
        let {success, data} = await agent.api.app.bsky.feed.getFeedGenerators({feeds: feeds.saved});
        if (success) {
            return data.feeds.map(x => {
                if (feeds.pinned.indexOf(x.uri) >= 0) {
                    return {...x, pinned:true};
                }
                return x;
            });
        }
    }
    return [];
}

export const deleteFeed = async (agent, rkey) => {
    const record = {
        repo: agent.session.did,
        collection: 'app.bsky.feed.generator',
        rkey,
    };

    try {
        const result = await agent.api.com.atproto.repo.deleteRecord(record);
        if (result.success) {
            return true;
        }
    } catch (e) {
        console.log(e);
    }
    return false;
}

export const editFeed = async (agent, {img, shortName, displayName, description}) => {
    try {
        await agent.api.app.bsky.feed.describeFeedGenerator()
    } catch (err) {
        throw new Error(
            'The bluesky server is not ready to accept published custom feeds yet',
        )
    }
    const {imageBlob, encoding} = img;
    let avatar:any = {};
    if (imageBlob) {
        const blobRes = await agent.api.com.atproto.repo.uploadBlob(imageBlob, {encoding});
        avatar = {avatar:blobRes.data.blob};
    }

    const record = {
        repo: agent.session?.did ?? '',
        collection: 'app.bsky.feed.generator',
        rkey:shortName,
        record: {
            did: `did:web:blueskyfeeds.com`,
            displayName,
            description: `${description}${SIGNATURE}`,
            ...avatar,
            createdAt: new Date().toISOString(),
        },
    };

    return await agent.api.com.atproto.repo.putRecord(record);
}

export const isVIP = (agent) => {
    return agent.session.did === "did:plc:tazrmeme4dzahimsykusrwrk" || agent.session.did === "did:plc:2dozc4lhicvbmpsbxnicvdpj";
}