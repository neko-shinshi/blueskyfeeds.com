import { BskyAgent }  from "@atproto/api";

export const getAgent = async (service, identifier, password) => {
    const agent = new BskyAgent({ service: `https://${service}/` });
    try {
        await agent.login({identifier, password});
        return agent;
    } catch (e) {
        return null;
    }
}

export const rebuildAgent = async (service, {did,refreshJwt, accessJwt, handle, email:_email=""}:
                                       {did:string,refreshJwt:string, accessJwt:string, handle:string, email?:string}) => {
    const agent = new BskyAgent({ service: `https://${service}/` });
    let email = _email? {email: _email} : {};
    await agent.resumeSession({did,refreshJwt, accessJwt, handle, ...email});
    return agent;
}



export const getMyCustomFeeds = async (agent) => {
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