import {getCustomFeeds, getPublicAgent, isSuperAdmin} from "features/utils/bsky";
import {SavedFeedsPref} from "@atproto/api/src/client/types/app/bsky/actor/defs";
import {AtpAgent} from "@atproto/api";
import {IDatabase} from "pg-promise";
import {callApiInChunks, sortWithSelectors} from "features/utils/utils";
import {GeneratorView} from "@atproto/api/src/client/types/app/bsky/feed/defs";

const MS_ONE_DAY = 24*60*60*1000;
export const getMyFeeds = async (privateAgent:AtpAgent, db:IDatabase<any>) => {
    const did = privateAgent.session.did;
    const [createdFeeds, { data: {preferences} }, views] = await Promise.all([
        getCustomFeeds(privateAgent), // including from other 3rd parties
        privateAgent.app.bsky.actor.getPreferences(), // Get
        db.manyOrNone("SELECT f.id AS id, v.t_viewed AS t_viewed FROM feed AS f "
            +"JOIN feed_admin AS a ON a.feed_id = f.id AND a.admin_id = $1 "
            +"LEFT JOIN feed_view AS v ON v.feed_id = f.id",
            [did])
    ]);
    const pref = preferences.find(x =>  x["$type"] === "app.bsky.actor.defs#savedFeedsPref");
    const {pinned, saved} = pref as SavedFeedsPref;
    const pinnedSet = new Set(pinned);
    const savedSet = new Set(saved);
    const nowTime = new Date().getTime();
    const feedViews:Map<string, {week:number, day:number}> = new Map();
    for (const {id, t_viewed} of views as {id: string, t_viewed: Date | null}[]) {
        const obj = feedViews.get(id) || {week:0, day:0};
        if (t_viewed) {
            obj.week++;
            const diff = nowTime - t_viewed.getTime();
            if (diff <= MS_ONE_DAY) {
                obj.day++;
            }
        }
        feedViews.set(id, obj);
    }
    const publicAgent = getPublicAgent();
    const feeds = createdFeeds.map(feed => {
        const {uri} = feed;
        feed.my = true;
        if (pinnedSet.has(uri)) {
            feed.pinned = true;
            pinnedSet.delete(uri);
        }
        if (savedSet.has(uri)) {
            feed.saved = true;
            savedSet.delete(uri);
        }
        const views = feedViews.get(uri);
        if (views) {
            feed.views = views;
            feed.edit = true;
            feedViews.delete(uri);
        }

        return feed;
    });

    const feedsToFetch = new Set(feedViews.keys());
    savedSet.forEach(x => feedsToFetch.add(x));

    const items = Array.from(feedsToFetch);

    feeds.push(...await callApiInChunks(items, 150,
        (o) => publicAgent.app.bsky.feed.getFeedGenerators({feeds:o}),
        ({feeds:_feeds}:{feeds:GeneratorView[]}) => {

        return _feeds.map(feed => {
            const {uri} = feed;
            if (pinnedSet.has(uri)) {
                feed.pinned = true;
            }
            if (savedSet.has(uri)) {
                feed.saved = true;
            }
            const views = feedViews.get(uri);
            if (views) {
                feed.views = views;
                feed.edit = true;
            }
            return feed;
        });
    }));

    sortWithSelectors(feeds, [
        (a,b) => !a.views === !b.views? 0 : !a.views? 1 : -1,
        (a,b) => !a.my === !b.my? 0 : !a.my? 1 : -1,
        (a,b) => !a.pinned === !b.pinned? 0 : !a.pinned? 1 : -1,
        (a,b) => !a.saved === !b.saved? 0 : !a.saved? 1 : -1,
        (a,b) => a.displayName.localeCompare(b.displayName, 'en', { sensitivity: 'base' })
    ]);

    return feeds;
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

