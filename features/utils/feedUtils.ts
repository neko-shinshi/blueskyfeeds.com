import {getMyCustomFeeds, getSavedFeedIds, getSavedFeeds, rebuildAgent} from "features/utils/bsky";

export const rebuildAgentFromSession = async (session) => {
    const {id:did, refreshJwt, accessJwt, handle, email, service} = session.user;
    try {
        return await rebuildAgent(service, {did, refreshJwt, accessJwt, handle, email});
    } catch (e) {
        return false;
    }
}


export const getMyFeeds = async (agent) => {
    let my = await getMyCustomFeeds(agent);
    const saved = await getSavedFeeds(agent);

    my = my.reduce((acc, x) => {
        const found = saved.find(y => y.uri === x.uri);
        if (found) {
            found.my = true;
        } else {
            x.my = true;
            acc.push(x);
        }
        return acc;
    }, []);


    return [...my, ...saved];
}

export const getMyFeedIds = async (agent) => {
    let myFeeds:any = {};
    myFeeds.my = (await getMyCustomFeeds(agent)).map(x => x.uri);
    myFeeds = {...myFeeds, ...await getSavedFeedIds(agent)};

    return myFeeds;
}

export const feedUriToUrl = (uri) => {
    return uri.slice(5).replace("app.bsky.feed.generator", "feed");
}