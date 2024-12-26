import {AtpAgent, UnicodeString} from "@atproto/api";
import {SIGNATURE} from "features/utils/signature";
import {processQ} from "features/utils/queue";
import {callApiInChunks, queryWithCursor} from "features/utils/utils";
import {ListItemView} from "@atproto/api/src/client/types/app/bsky/graph/defs";
import {detectFacets} from "@atproto/api/dist/rich-text/detection";
import {GeneratorView} from "@atproto/api/src/client/types/app/bsky/feed/defs";


export function getPublicAgent () {
    return new AtpAgent({ service: "https://api.bsky.app/" });
}

export const getCustomFeeds = async (agent:AtpAgent):Promise<GeneratorView[]> => {
    const actor = agent.session.did;
    return await queryWithCursor((o) => agent.app.bsky.feed.getActorFeeds(o), {actor},
        ({feeds}) => { return feeds; });
}


export const deleteFeed = async (agent:AtpAgent, rkey:string) => {
    const record = {
        repo: agent.session.did,
        collection: 'app.bsky.feed.generator',
        rkey,
    };

    try {
        const result = await agent.com.atproto.repo.deleteRecord(record);
        if (result.success) {
            return true;
        }
    } catch (e) {
        console.log(e);
    }
    return false;
}

export const editFeed = async (agent:AtpAgent, {img, shortName, displayName, description}) => {
    /*try {
        await agent.api.app.bsky.feed.describeFeedGenerator()
    } catch (err) {
        throw new Error(
            'The bluesky server is not ready to accept published custom feeds yet',
        )
    }*/
    const myDid = agent.session!.did;
    const {imageBlob, encoding} = img;
    let avatar = {};
    if (imageBlob) {
        const blobRes = await agent.com.atproto.repo.uploadBlob(imageBlob, {encoding});
        avatar = {avatar:blobRes.data.blob};
    }

    const appendedDescription = `${description}${SIGNATURE}`;
    const initialFacets = detectFacets(new UnicodeString(appendedDescription));
    const descriptionFacets = [];

    for (const facet of initialFacets) {
        for (const feature of facet.features) {
            switch (feature.$type) {
                case "app.bsky.richtext.facet#link": {
                    if (feature.uri === "https://BlueskyFeeds.com") {
                        feature.uri = `https://blueskyfeeds.com/profile/${myDid}/feed/${shortName}`;
                    }
                    descriptionFacets.push(facet);
                    break;
                }
                case "app.bsky.richtext.facet#mention": {
                    const actor = feature.did as string;
                    try {
                        const {data:{did}} = await agent.getProfile({actor});
                        feature.did = did;
                        descriptionFacets.push(facet);
                    } catch (e) {
                        console.error(`Update ${myDid}/${shortName} skip`, actor, e);
                    }
                    break;
                }
                case "app.bsky.richtext.facet#tag" : {
                    descriptionFacets.push(facet);
                    break;
                }
            }
        }
    }


    const record = {
        repo: myDid,
        collection: 'app.bsky.feed.generator',
        rkey:shortName,
        record: {
            did: `did:web:blueskyfeeds.com`,
            displayName,
            description: appendedDescription,
            descriptionFacets,
            ...avatar,
            createdAt: new Date().toISOString(),
        },
    };

    return await agent.com.atproto.repo.putRecord(record);
}

const MAX_GET_POST_ATTEMPTS = 3;

async function tryGetPosts(agent:AtpAgent, uris:string[], attempt = 1):Promise<any[]> {
    try {
        console.log("Sending uris", {uris});
        const {data:{posts}} = await agent.getPosts({uris});
        return posts;
    } catch (e) {
        if (e.error === "InternalServerError") {
            if (uris.length <= 1) { // This is the buggy post
                console.error("damaged uri", uris);
                return [];
            }
            // Use binary search to find the error
            const half = Math.ceil(uris.length / 2);
            const [x, y] = await Promise.all([
                tryGetPosts(agent, uris.slice(0, half), 1),
                tryGetPosts(agent, uris.slice(half), 1)
            ]);

            return x.concat(y);
        }

        if (attempt <= MAX_GET_POST_ATTEMPTS) {
            console.log(e);
            return await tryGetPosts(agent, uris, attempt + 1);
        } else {
            throw e;
        }
    }
}


export const getPostInfo = async (agent:AtpAgent, postUris:string[]) => {
    let users:Set<string> = new Set();
    postUris.forEach(postUri => {
        if (!postUri.startsWith("at://did:plc:")) {
            if (postUri.startsWith("https://bsky.app/profile/")) {
                //remove it
                postUri = postUri.slice(25);
            }
            const [user] = postUri.split("/post/");
            users.add(user);
        }
    });

    let handleToDid = new Map();
    (await getActorsInfo(agent, [...users])).forEach(actor => {
        const {did, handle} = actor;
        handleToDid.set(did, did);
        handleToDid.set(handle, did);
    });

    const uris = Array.from(postUris.reduce((acc, postUri) => {
        let uri = postUri;
        if (!postUri.startsWith("at://did:plc:")) {
            if (postUri.startsWith("https://bsky.app/profile/")) {
                //remove it
                postUri = postUri.slice(25);
            }
            const [user, post] = postUri.split("/post/");
            const did = handleToDid.get(user);
            uri = `at://${did}/app.bsky.feed.post/${post}`;
        }
        acc.add(uri);
        return acc;
    }, new Set()));


    const MAX_QUERY = 25;
    const result = await callApiInChunks(uris, MAX_QUERY, (o) => tryGetPosts(agent, o), (posts) => {
        return posts.reduce((acc,x) => {
            const {record, uri, author}  = x;
            if (uri) {
                const {text} = record;
                acc.push({text: text || "", uri, record, author});
            }
            return acc;
        }, []);
    }, 0, false); // Retry internally, so 0 retries here
    console.log("RESULT", result);
    return result;
}

export const getActorsInfo = async (agent:AtpAgent, actors:string[]):Promise<{did:string, handle:string, displayName:string}[]> => {
    const MAX_QUERY = 25;
    return await callApiInChunks(actors, MAX_QUERY, (o) => agent.getProfiles({actors:o}), ({profiles}) => {
        return profiles.map(x => {
            const {did, handle, displayName} = x;
            return {did, handle, displayName: displayName || ""};
        });
    });
}

export const isVIP = (privateAgent:AtpAgent) => {
    return ["did:plc:eubjsqnf5edgvcc6zuoyixhw",
        "did:plc:tazrmeme4dzahimsykusrwrk",
        "did:plc:2dozc4lhicvbmpsbxnicvdpj",
        "did:plc:be5wkrivorcuc6db22drsc6z",
    ].indexOf(privateAgent.session.did) >= 0;
}

export const isSuperAdmin = (privateAgent:AtpAgent) => {
    return ["did:plc:eubjsqnf5edgvcc6zuoyixhw",
        "did:plc:tazrmeme4dzahimsykusrwrk"
    ].indexOf(privateAgent.session.did) >= 0;
}

export const getAllPosts = async (agent, target, filter= (post) => true) => {
    let uris = new Set();
    let posts = [];

    await queryWithCursor((o) => agent.getAuthorFeed(o), {actor:target, limit:100}, ({feed}) => {
        feed.forEach(item => {
            const {post} = item;
            const {uri} = post;
            if (!uris.has(uri)) {
                uris.add(uri);
                const {author:{did}} = post;
                if (did === target && filter(post)) {
                    const {post:{indexedAt, likeCount}} = item;
                    posts.push({uri, indexedAt, likeCount});
                }
            }
        });
    });

    return posts;
}

export const getFollowing = async (agent, actor) => {
    let cursor:any = {};
    let uris = new Set();
    do {
        const params = {actor, ...cursor, limit:100};
        console.log("following", uris.size, cursor);
        const {data} = await agent.getFollows(params);
        const {cursor:newCursor, follows} = data;
        if (newCursor === cursor?.cursor) {
            return [...uris];
        }
        const oldSize = uris.size;
        follows.forEach(x => uris.add(x.did));
        const diff = uris.size - oldSize;
        console.log("following +",diff)
        if (!newCursor || diff === 0) {
            cursor = null;
        } else {
            cursor = {cursor: newCursor};
        }
    } while (cursor);

    return [...uris];
}

export const getRecentPostsFrom = async (agent, target, fromDateString, limit=30) => {
    const params = {actor: target, limit};
    let uris = [];
    try {
        const {data:{feed}} = await agent.getAuthorFeed(params);
        feed.forEach(item => {
            const {post:{author:{did}, uri, indexedAt}} = item;
            if (did === target // Skip reposts
                && indexedAt > fromDateString) {
                uris.push({uri, indexedAt});
            }
        });
    } catch {}

    return uris;
}

export const getUserLikes = async (agent, target) => {
    let cursor:any = {};
    let uris = new Set();
    let likes = [];
    let found = 0;
    try {
        do {
            const {data:{records, cursor:newCursor}} = await agent.api.com.atproto.repo.listRecords(
                {repo:target, collection:"app.bsky.feed.like", limit:100, ...cursor});
            if (newCursor === cursor?.cursor) {
                return likes;
            }

            const oldSize = uris.size;
            records.forEach(item => {
                const {uri, value} = item;
                if (!uris.has(uri)) {
                    uris.add(uri);
                    const {createdAt, subject:{uri:post}} = value;
                    likes.push({post, createdAt, likeUri: uri});
                }
            });
            found += records.length;
            console.log("total", found);
            const diff = uris.size - oldSize;
            if (!newCursor || diff === 0) {
                cursor = null;
            } else {
                cursor = {cursor: newCursor};
            }
        } while (cursor);
    } catch (e) {
        console.log(e);
    }

    console.log("complete");

    return likes;
}

export const getPostsInfo = async (agent, postIds, filter = x => true) => {
    let results = [];
    if (Array.isArray(postIds) && postIds.length > 0) {
        const MAX_QUERY = 25;
        let chunks = [];
        for (let i = 0; i < postIds.length; i += MAX_QUERY) {
            chunks.push(postIds.slice(i, i + MAX_QUERY));
        }
        await processQ(chunks, 2, async (uris, wcb) => {
            if (!uris) {
                return wcb(null, uris + ' got processed');
            }
            try {
                const {data:{posts}} = (await agent.api.app.bsky.feed.getPosts({uris}));
                if (posts && Array.isArray(posts) && posts.length > 0) {
                    posts.forEach(post => {
                        if (filter(post)) {
                            const {uri, likeCount} = post;
                            results.push({uri, likeCount});
                        }
                    });
                }
                wcb(null, uris + ' got processed');
            } catch (e) {
                wcb(null, uris + ' got skipped');
            }
        });
    }

    return results;
}

export const feedHasUserLike = async (agent, feedId, userId) => {
    let cursor:any = {};
    do {
        const params = {uri:feedId, limit:100, ...cursor};
        const {data} = await agent.api.app.bsky.feed.getLikes(params);
        const {cursor:newCursor, likes} = data;
        if (newCursor === cursor?.cursor) {
            break;
        }

        for (const x of likes) {
            if (x.actor.did === userId) {
                return true;
            }
        }

        if (!newCursor) {
            cursor = null;
        } else {
            cursor = {cursor: newCursor};
        }
    } while (cursor);
    return false;
}

export const expandUserLists = async (feedData:any, agent:AtpAgent, compress=false) => {
    let {
        allowList, allowListSync,
        blockList, blockListSync,
        mentionList, mentionListSync,
        everyList, everyListSync,
        viewers, viewersSync,
    } = feedData;
    let listMap = new Map();
    if (everyListSync) {
        listMap.set(everyListSync, []);
    }
    if (blockListSync) {
        listMap.set(blockListSync, []);
    }
    if (allowListSync) {
        listMap.set(allowListSync, []);
    }
    if (viewersSync) {
        listMap.set(viewersSync, []);
    }
    if (mentionListSync) {
        listMap.set(mentionListSync, []);
    }

    for (const lyst of listMap.keys()) {
        let users = new Map();
        try {
            const list = `at://${lyst.replace("/lists/", "/app.bsky.graph.list/")}`
            await queryWithCursor((o) => agent.app.bsky.graph.getList(o), {list},
                ({items}:{items:ListItemView[]})=> {
                    items.forEach(x => {
                        const {subject:{did, handle, displayName}, uri} = x;
                        const key = `${list}_${did}`;
                        users.set(did, {did, handle, displayName: displayName || "", uri});
                    });
                });
            listMap.set(lyst, [...users.values()]);
        } catch (e) {
            console.error("repo not found?");
            console.error(e);
        }
    }

    let _actors = new Set();
    let updateEveryList = false,
        updateBlockList = false,
        updateAllowList = false,
        updateMentionList = false,
        updateViewers = false;
    const processList = (list) => {
        if (Array.isArray(list) && list.length > 0) {
            if (typeof list[0] === 'string' || list[0] instanceof String) {
                // old version is flattened, keep this feature for recovery of OLD json style
                list.forEach(x => _actors.add(x));
                return list;
            } else {
                list.forEach(x => _actors.add(x.did));
                return list.map(x => x.did);
            }
        }
        return false;
    }

    if (everyListSync) {
        const o = listMap.get(everyListSync);
        if (o) {
            if (compress) {
                everyList = o.map(x => {return {did: x.did, uri:x.uri}});
            } else {
                everyList = o;
            }
        } else {
            everyList = [];
        }
    } else if (everyList) {
        everyList = processList(everyList);
        if (everyList) {
            updateEveryList = true;
        }
    }
    if (blockListSync) {
        const o = listMap.get(blockListSync);
        if (o) {
            if (compress) {
                blockList = o.map(x => {return {did: x.did, uri:x.uri}});
            } else {
                blockList = o;
            }
        } else {
            blockList = [];
        }
    } else if (blockList) {
        blockList = processList(blockList);
        if (blockList) {
            updateBlockList = true;
        }
    }
    if (allowListSync) {
        const o = listMap.get(allowListSync);
        if (o) {
            if (compress) {
                allowList = o.map(x => {return {did: x.did, uri:x.uri}});
            } else {
                allowList = o;
            }
        } else {
            allowList = [];
        }
    } else if (allowList) {
        allowList = processList(allowList);
        if (allowList) {
            updateAllowList = true;
        }
    }

    if (mentionListSync) {
        const o = listMap.get(mentionListSync);
        if (o) {
            if (compress) {
                mentionList = o.map(x => {return {did: x.did, uri:x.uri}});
            } else {
                mentionList = o;
            }
        } else {
            mentionList = [];
        }
    } else if (mentionList) {
        mentionList = processList(mentionList);
        if (mentionList) {
            updateMentionList = true;
        }
    }

    if (viewersSync) {
        const o = listMap.get(viewersSync);
        if (o) {
            if (compress) {
                viewers = o.map(x => {return {did: x.did, uri:x.uri}});
            } else {
                viewers = o;
            }
        } else {
            viewers = [];
        }
    } else if (viewers) {
        viewers = processList(viewers);
        if (viewers) {
            updateViewers = true;
        }
    }

    const actors = Array.from(_actors) as string[];
    if (actors.length > 0) {
        const profiles = await getActorsInfo(agent, actors);
        const convert = (container) => {
            if (compress) {
                return profiles.filter(x => container.find(y => y === x.did)).map(x => {return {did: x.did}});
            } else {
                return profiles.filter(x => container.find(y => y === x.did));
            }
        }
        if (updateAllowList) {
            allowList = convert(allowList);
        }
        if (updateMentionList) {
            mentionList = convert(mentionList);
        }
        if (updateBlockList) {
            blockList = convert(blockList);
        }
        if (updateEveryList) {
            everyList = convert(everyList);
        }
        if (updateViewers) {
            viewers = convert(viewers);
        }
    }

    return {
        allowList:allowList||[],
        blockList:blockList||[],
        mentionList:mentionList||[],
        everyList:everyList||[],
        viewers:viewers||[],
        everyListSync: everyListSync||"",
        blockListSync: blockListSync||"",
        allowListSync: allowListSync||"",
        mentionListSync: mentionListSync || "",
        viewersSync: viewersSync||""
    };
}