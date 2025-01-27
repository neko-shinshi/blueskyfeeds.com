import pgp from 'pg-promise'
import {IDatabase, IHelpers} from "pg-promise";
import {global} from "styled-jsx/css";
import {getSearchConfig} from "features/utils/getSearchConfig";
export async function getDbClient ():Promise<{db:IDatabase<any>, helpers:IHelpers}> {
    // @ts-ignore
    if (global.dbCache) {
        try {
            // @ts-ignore
            const c = await global.dbCache.db.connect();
            c.done(); // release connection, was just testing if works
            // @ts-ignore
            return Promise.resolve(global.dbCache);
        } catch (e) {
            return null;
        }
    }

    const connectionString = process.env.DB_STRING as string;
    const t = pgp({capSQL: true});
    const result = {db: t({connectionString}), helpers:t.helpers};
    try {
        const c = await result.db.connect();
        c.done(); // release connection, was just testing if works
        console.log("db connected");
        // @ts-ignore
        global.dbCache = result;
        return result;
    } catch (e) {
        console.error(e);
        return null;
    }
}

function deserializeFeed (feed: any) {
    let {id, mode, sort, keywords:kws, keywords_cfg, lang_cfg, media_cfg, post_level_cfg, label_cfg, a, e, b, m, v, timestamp} = feed;

    let {k:keywords, q: keywordsQuote, b: everyListBlockKeyword, n: nameKeywords} = kws.reduce((acc, x) => {
        const {m, ...o} = JSON.parse(x);
        m.forEach(mode => {
            if (acc[mode]) {
                acc[mode].add(JSON.stringify(o));
            } else {
                console.error(id, "unknown keyword mode", mode);
            }
        });
        return acc;
    }, {k:new Set(), q:new Set(), b: new Set(), n: new Set()});

    const mustLabels:string[] = [];
    const allowLabels:string[] = [];

    label_cfg.forEach(x => {
        const {l, m} = JSON.parse(x);
        switch (m) {
            case "m": { mustLabels.push(l); break; }
            case "a": { allowLabels.push(l); break; }
        }
    });

    keywords = prepKeywords(keywords);
    keywordsQuote = prepKeywords(keywordsQuote);
    everyListBlockKeyword = prepKeywords(everyListBlockKeyword);
    nameKeywords = prepKeywords(nameKeywords); // TODO work on this!

    const {keywordSetting, everyListBlockKeywordSetting} = keywords_cfg.reduce((acc:{keywordSetting:string[], everyListBlockKeywordSetting:string[]}, x:string) => {
        const parts = x.split("_");
        if (parts[0] === "e") {
            acc.everyListBlockKeywordSetting.push(parts[1]);
        } else {
            acc.keywordSetting.push(parts[0]);
        }
        return acc;
    }, {keywordSetting:[], everyListBlockKeywordSetting:[]});




    const result = {
        id, mode, sort, lang_cfg, media_cfg, post_level_cfg, mustLabels, allowLabels,
        keywords, keywordsQuote, everyListBlockKeyword,
        keywordSetting, everyListBlockKeywordSetting, nameKeywords,
        a, e, b, m, v
    };

    // console.log(JSON.stringify(result));

    return result;
}


function prepKeywords(data:Set<string>) {
    let block:any = {"#":[], s:[], t:[], empty:true};
    let search:any = {"#":[], s:[], t:[], empty: true};

    data.forEach(x => {
        const xx = JSON.parse(x);
        const {t, ...y} = xx;
        let newY:any = y;
        newY.o = xx.t;
        if (t === "s") { // Pre-processing for segment
            if (!newY.r) {
                newY.r = [];
            }
            // prevent combining emojis by adding ZWJ to prefix and suffix reject filter
            newY.r.push({p: "\u200d"});
            newY.r.push({s: "\u200d"});

            newY.r = newY.r.map(xx => {
                let {s, p} = xx;
                return {
                    w: [p, newY.w, s].filter(z => z).join(""),
                    i: [-p?.length || 0, s?.length || 0]
                }
            });
        }


        if (xx.a) {
            search[t].push(newY);
            search.empty = false;
        } else {
            block[t].push(newY);
            block.empty = false;
        }
    });

    return { search, block };
}


const REF1 = "ref1", REF2 = "ref2";
export async function get_feed_full (id:string, db:IDatabase<any>) {
    let feed:any = null;
    await db.tx(async t => {
        await t.query("SELECT * FROM get_feed_full($1, $2, $3)", [id, REF1, REF2]);
        let [feedBody, feedLists] = await Promise.all([
            t.oneOrNone(`FETCH ALL IN ${REF1}`),
            t.manyOrNone(`FETCH ALL IN ${REF2}`)
        ]);
        if (feedBody === null) { return null; }

        feedBody.id = id;
        feedBody.b = new Set(); // block
        feedBody.e = new Set(); // every
        feedBody.a = new Set(); // allow
        feedBody.m = new Set(); // mentions
        feedBody.v = new Set(); // viewers

        for (const list of feedLists) {
            const {type, ids} = list;
            for (const id of ids) {
                feedBody[type].add(id);
            }
        }

        feed = deserializeFeed(feedBody);
    });

    return feed;
}

export async function get_feed_raw (id:string, db:IDatabase<any>) {
    let feed:any = null;
    await db.tx(async t => {
        await t.query("SELECT * FROM get_feed_raw($1, $2, $3)", [id, REF1, REF2]);
        let [feedBodies, feedLists] = await Promise.all([
            t.manyOrNone(`FETCH ALL IN ${REF1}`),
            t.manyOrNone(`FETCH ALL IN ${REF2}`)
        ]);

        switch (feedBodies.length) {
            case 0: {
                return feed; // Empty
            }
            case 1: {
                feed = feedBodies[0];
                break;
            }
            case 2: {
                const mainIndex = feedBodies.findIndex(x => x.id === id);
                const otherIndex = (mainIndex+1) % 2;
                let {mode, sort, keywords, keywords_cfg, lang_cfg, media_cfg, post_level_cfg,label_cfg, keywords_merge} = feedBodies[mainIndex];
                const {sort:_sort, keywords:_keywords, keywords_cfg:_keywords_cfg, lang_cfg:_lang_cfg, media_cfg:_media_cfg, post_level_cfg:_post_level_cfg,label_cfg:_label_cfg} = feedBodies[otherIndex];

                if (!!keywords_merge) {
                    keywords = (keywords || []).concat(_keywords || []);
                } else {
                    keywords = keywords || _keywords;
                }

                feed = {
                    mode,
                    sort:sort || _sort,
                    keywords,
                    keywords_cfg: keywords_cfg || _keywords_cfg,
                    lang_cfg: lang_cfg || _lang_cfg,
                    media_cfg: media_cfg || _media_cfg,
                    post_level_cfg: post_level_cfg || _post_level_cfg,
                    label_cfg: label_cfg || _label_cfg
                }

                break;
            }
        }


        for (const {feed_id, type, did, list_uri, slot} of feedLists) {
            if (feed_id === feed.id) {

            }
        }

        feed = deserializeFeed(feed);
    });

    return feed;
}

export function makeTagQuery (myDid:string, tag:string, PAGE_SIZE:number, offset:number): {query:string, values:any[]} {
    return {
        query: "SELECT e.id, (admin_id IS NOT NULL) AS edit, ARRAY_REMOVE(ARRAY_AGG(tag), NULL) AS tags FROM every_feed AS e "
            + "LEFT JOIN feed_admin AS a ON a.feed_id = e.id AND admin_id = $1 "
            + "LEFT JOIN every_feed_tag AS t ON t.feed_id = e.id "
            + "GROUP BY e.id, likes, t_indexed, admin_id "
            + "HAVING NOT ('deprecated' = ANY (ARRAY_REMOVE(ARRAY_AGG(tag), NULL))) AND $2 = ANY (ARRAY_REMOVE(ARRAY_AGG(tag), NULL))"
            + "ORDER BY e.likes DESC, t_indexed ASC LIMIT $3 OFFSET $4",
        values: [myDid, tag, PAGE_SIZE, offset]};
}

export function makeEveryFeedQuery (myDid:string, qTrim:string, lInt:number, PAGE_SIZE:number, offset:number): {query:string, values:any[], def?:true} {
    if (qTrim) {
        const searchConfig = getSearchConfig(qTrim, lInt);
        return {
            query:"SELECT e.id, (admin_id IS NOT NULL) AS edit, ARRAY_REMOVE(ARRAY_AGG(tag), NULL) AS tags FROM every_feed AS e "
                + "LEFT JOIN feed_admin AS a ON a.feed_id = e.id AND admin_id = $1 "
                + "LEFT JOIN every_feed_tag AS t ON t.feed_id = e.id "
                + "WHERE e.id @@@ $2::JSONB "
                + "GROUP BY e.id, likes, t_indexed, admin_id "
                + "HAVING NOT ('deprecated' = ANY (ARRAY_REMOVE(ARRAY_AGG(tag), NULL))) "
                + "ORDER BY likes DESC, t_indexed ASC LIMIT $3 OFFSET $4",
            values:[myDid, searchConfig, PAGE_SIZE, offset]};
    } else if (lInt && !isNaN(lInt) && lInt > 0) {
        // Limit by likes
        return {
            query: "SELECT e.id, (admin_id IS NOT NULL) AS edit, ARRAY_REMOVE(ARRAY_AGG(tag), NULL) AS tags FROM every_feed AS e "
                + "LEFT JOIN feed_admin AS a ON a.feed_id = e.id AND admin_id = $1 "
                + "LEFT JOIN every_feed_tag AS t ON t.feed_id = e.id "
                + "WHERE e.likes > $2 "
                + "GROUP BY e.id, likes, t_indexed, admin_id "
                + "HAVING NOT ('deprecated' = ANY (ARRAY_REMOVE(ARRAY_AGG(tag), NULL))) "
                + "ORDER BY likes DESC, t_indexed ASC LIMIT $3 OFFSET $4",
            values: [myDid, lInt, PAGE_SIZE, offset]};
    }
    return {
        query: "SELECT e.id, (admin_id IS NOT NULL) AS edit, ARRAY_REMOVE(ARRAY_AGG(tag), NULL) AS tags FROM every_feed AS e "
            + "LEFT JOIN feed_admin AS a ON a.feed_id = e.id AND admin_id = $1 "
            + "LEFT JOIN every_feed_tag AS t ON t.feed_id = e.id "
            + "GROUP BY e.id, likes, t_indexed, admin_id "
            + "HAVING NOT ('deprecated' = ANY (ARRAY_REMOVE(ARRAY_AGG(tag), NULL))) "
            + "ORDER BY e.likes DESC, t_indexed ASC LIMIT $2 OFFSET $3",
        values: [myDid, PAGE_SIZE, offset], def:true};
}

export function makeLocalFeedQuery (myDid:string, qTrim:string, lInt:number, PAGE_SIZE:number, offset:number): {query:string, values:any[]} {
    if (qTrim) {
        const searchConfig = getSearchConfig(qTrim, lInt);
        return {
            query: "SELECT e.id, (admin_id IS NOT NULL) AS edit, ARRAY_REMOVE(ARRAY_AGG(tag), NULL) AS tags FROM feed AS f "
                + "JOIN every_feed AS e ON f.id = e.id AND f.highlight = TRUE "
                + "LEFT JOIN feed_admin AS a ON a.feed_id = e.id AND admin_id = $1 "
                + "LEFT JOIN every_feed_tag AS t ON t.feed_id = e.id "
                + "WHERE e.id @@@ $2::JSONB"
                + "GROUP BY e.id, likes, t_indexed, admin_id "
                + "ORDER BY likes, t_indexed ASC DESC LIMIT $3 OFFSET $4"
                + "SELECT id, EVERY(edit) AS edit,  FROM rr LEFT JOIN every_feed_tag ON feed_id = id GROUP BY id, likes, t_indexed ORDER BY likes DESC, t_indexed ASC",
            values: [myDid, searchConfig, PAGE_SIZE, offset]};
    } else if (!isNaN(lInt) && lInt > 0) {
        // Limit by likes
        return {
            query: "SELECT e.id, (admin_id IS NOT NULL) AS edit, ARRAY_REMOVE(ARRAY_AGG(tag), NULL) AS tags FROM feed AS f "
                + "JOIN every_feed AS e ON f.id = e.id AND f.highlight = TRUE "
                + "LEFT JOIN feed_admin AS a ON a.feed_id = e.id AND admin_id = $1 "
                + "LEFT JOIN every_feed_tag AS t ON t.feed_id = e.id "
                + "WHERE likes > $2 "
                + "GROUP BY e.id, likes, t_indexed, admin_id "
                + "ORDER BY likes DESC, t_indexed ASC LIMIT $3 OFFSET $4",
            values: [myDid, lInt, PAGE_SIZE, offset]};
    }
    return {
        query: "SELECT e.id, (admin_id IS NOT NULL) AS edit, ARRAY_REMOVE(ARRAY_AGG(tag), NULL) AS tags FROM feed AS f "
            + "JOIN every_feed AS e ON f.id = e.id AND f.highlight = TRUE "
            + "LEFT JOIN feed_admin AS a ON a.feed_id = e.id AND admin_id = $1 "
            + "LEFT JOIN every_feed_tag AS t ON t.feed_id = e.id "
            + "GROUP BY e.id, likes, t_indexed, admin_id "
            + "ORDER BY likes DESC, t_indexed ASC LIMIT $2 OFFSET $3",
        values: [myDid, PAGE_SIZE, offset]};
}
