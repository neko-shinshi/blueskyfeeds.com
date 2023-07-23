import {getCustomFeeds, getSavedFeedIds, getSavedFeeds} from "features/utils/bsky";


export const getMyFeeds = async (agent, db) => {
    let my = await getCustomFeeds(agent);
    const did = agent.session.did;
    const regex = new RegExp(`^at://${did}`);
    const editableFeeds = await db.feeds.find({_id: regex}).project({_id:1}).toArray();
    let saved = await getSavedFeeds(agent);

    my = my.reduce((acc, x) => {
        const editable = editableFeeds.find(y => y._id === x.uri);
        const found = saved.find(y => y.uri === x.uri);
        if (found) {
            found.my = true;
            if (editable) {
                found.edit = true;
            }
        } else {
            x.my = true;
            if (editable) {
                x.edit = true;
            }
            acc.push(x);
        }

        return acc;
    }, []);

    return [ ...saved, ...my];
}

export const getMyFeedIds = async (agent) => {
    let myFeeds:any = {};
    myFeeds.my = (await getCustomFeeds(agent)).map(x => x.uri);
    myFeeds = {...myFeeds, ...await getSavedFeedIds(agent)};

    return myFeeds;
}

export const getFeedDetails = async (agent, db, feedId) => {
     const feeds = await getCustomFeeds(agent);
     const foundFeed = feeds.find(x => x.uri.endsWith(feedId));
     if (!foundFeed) { return false; }
     const dbData = await db.feeds.findOne({_id: foundFeed.uri});
     if (!dbData) { return false; }
     delete dbData._id;
     return {...foundFeed, ...dbData};
}

export const getMyCustomFeedIds = async (agent, db) => {
    const regex = new RegExp(`^at://${agent.session.did}`);
    return (await db.feeds.find({_id: regex}).project({_id: 1}).toArray()).map(x => x._id);
}

export const feedUriToUrl = (uri) => {
    return uri.slice(5).replace("app.bsky.feed.generator", "feed");
}

export const feedRKeyToUri = (rkey, did) => {
    return `at://${did}/app.bsky.feed.generator/${rkey}`;
}