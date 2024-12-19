import {getCustomFeeds, getSavedFeeds, isSuperAdmin} from "features/utils/bsky";
import {SavedFeedsPrefV2} from "@atproto/api/src/client/types/app/bsky/actor/defs";
import {AtpAgent} from "@atproto/api";
import {IDatabase} from "pg-promise";
const MS_ONE_WEEK = 7*24*60*60*1000;
const MS_ONE_DAY = 24*60*60*1000;
export const getMyFeeds = async (agent:AtpAgent, db:IDatabase<any>) => {
    let my = await getCustomFeeds(agent); // including from other 3rd parties
    const did = agent.session.did;

    const query = "SELECT * FROM "

    const regex = new RegExp(`^at://${did}`);
    let [editableFeeds, feedViews] = await Promise.all([
        db.feeds.find({_id: regex}).project({_id:1}).toArray(),
        db.feedViews.aggregate([
            {$match: {feed: new RegExp(`^at://${did}`)}},
            {$group: {_id: "$feed", expireAt: {$push: "$expireAt"}}},
        ]).toArray(),
    ]);

    // Get view stats
    const now = new Date().getTime();
    feedViews = feedViews.map(x => {
        const {_id, expireAt} = x;
        const week = expireAt.length;
        const day = expireAt.reduce((acc,y) => {
            const diff = now - y.getTime() + MS_ONE_WEEK;
            if (diff < MS_ONE_DAY) {acc++;}
            return acc;
        }, 0);
        return {_id, week, day};
    });

    let { data: preferences } = await agent.app.bsky.actor.getPreferences();
    const prefV2:SavedFeedsPrefV2 = preferences.find(x => x["$type"] === "app.bsky.actor.defs#savedFeedsPrefV2") as SavedFeedsPrefV2;
    if (prefV2) {
        const {items} = prefV2;
        for (const item of items) {
            const {type, value, pinned} = item;
            if (type === "feed") {

            }
        }
    } else {
        const pref = preferences.find(x =>  x["$type"] === "app.bsky.actor.defs#savedFeedsPref");
        if (pref) {
            const {pinned, saved} = pref;
        }
    }

    let saved = await getSavedFeeds(agent);
    my = my.reduce((acc, x) => {
        const editable = editableFeeds.find(y => y._id === x.uri);
        const views = feedViews.find(y => y._id === x.uri);
        const found = saved.find(y => y.uri === x.uri);
        if (found) {
            found.my = true;
            if (editable) {
                found.edit = true;
                if (views) {
                    found.views = views;
                }
            }
        } else {
            x.my = true;
            if (editable) {
                x.edit = true;
                if (views) {
                    x.views = views;
                }
            }
            acc.push(x);
        }

        return acc;
    }, []);


    return [ ...saved, ...my];
}

export const getFeedDetails = async (agent, db, feedId) => {
    const superAdmin = feedId.includes("/") && isSuperAdmin(agent);
    let feedData = {uri:feedId};
    if (!superAdmin) {
        const feeds = (await getCustomFeeds(agent)) as any[];
        feedData = feeds.find(x => x.uri.endsWith(feedId));
        if (!feedData && !superAdmin) { return false; }
    } else {
        const result = await agent.api.app.bsky.feed.getFeedGenerator({feed:feedId});
        if (result) {
            feedData = result.data.view;
        }
    }

    const dbData = await db.feeds.findOne({_id: feedData.uri});
    if (!dbData) { return false; }
    return {...feedData, ...dbData};
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