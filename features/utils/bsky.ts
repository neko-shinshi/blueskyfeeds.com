import { BskyAgent }  from "@atproto/api";
import {SIGNATURE} from "features/utils/signature";
import {processQ} from "features/utils/queue";

export const getAgent = async (service, identifier, password) => {
    const agent = new BskyAgent({ service: `https://${service}/` });
    try {
        await agent.login({identifier, password});
        return agent;
    } catch (e) {
        console.log("login fail", e);
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
    let cursor = {};
    let results = [];
    do {
        const params = {actor: agent.session.did, ...cursor};
        const {data} = await agent.api.app.bsky.feed.getActorFeeds(params);
        const {cursor:newCursor, feeds} = data;
        feeds.forEach(x => results.push(x));
        if (!newCursor) {
            cursor = null;
        } else {
            cursor = {cursor: newCursor};
        }
    } while (cursor);
    return results;
}

const getSavedFeedIds = async (agent) => {
    let { data} = await agent.api.app.bsky.actor.getPreferences();
    const feeds = data.preferences.find(x =>  x["$type"] === "app.bsky.actor.defs#savedFeedsPref");
    if (feeds) {
        const {$type, ...rest} = feeds;
        return rest;
    }

    return {};
}


export const getSavedFeeds = async (agent) => {
    const feeds = await getSavedFeedIds(agent);
    if (feeds && feeds.saved) {
        let {data} = await agent.api.app.bsky.feed.getFeedGenerators({feeds: feeds.saved});
        return data.feeds.map(x => {
            if (feeds.pinned.indexOf(x.uri) >= 0) {
                return {...x, pinned:true};
            }
            return x;
        });
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
    let avatar = {};
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

export const getPostInfo = async (agent, postId) => {
    let postUri = postId;
    if (!postUri.startsWith("at://did:plc:")) {
        if (postUri.startsWith("https://bsky.app/profile/")) {
            //remove it
            postUri = postUri.slice(25);
        }
        const [user, post] = postUri.split("/post/");
        const [{did}] = await getActorsInfo(agent, [user]);
        postUri = `at://${did}/app.bsky.feed.post/${post}`;
    }
    console.log(postUri);
    try {

        const {data:{posts}} = (await agent.api.app.bsky.feed.getPosts({uris:[postUri]}));
        if (posts && Array.isArray(posts) && posts.length > 0) {
            const {record, uri} =  posts[0];
            if (uri) {
                const {text} = record;
                return {text: text || "", uri};
            }
        }
    } catch {}

    return {};
}

export const getActorsInfo = async (agent, actors) => {
    if (Array.isArray(actors) && actors.length > 0) {
        const MAX_QUERY = 25;
        let allProfiles = [];
        for (let i = 0; i < actors.length; i += MAX_QUERY) {
            const chunk = actors.slice(i, i + MAX_QUERY);
            const {data:{profiles}} = (await agent.api.app.bsky.actor.getProfiles({actors: chunk}));
            profiles.forEach(x => allProfiles.push(x));
        }
        return allProfiles.map(x => {
            const {did, handle, displayName} = x;
            return {did, handle, displayName: displayName || ""};
        });
    } else {
        return [];
    }
}

export const isVIP = (agent) => {
    return ["did:plc:eubjsqnf5edgvcc6zuoyixhw",
        "did:plc:tazrmeme4dzahimsykusrwrk",
        "did:plc:2dozc4lhicvbmpsbxnicvdpj"
    ].indexOf(agent.session.did) >= 0;
}

export const getAllPosts = async (agent, target, filter= (post) => true) => {
    let cursor:any = {};
    let uris = new Set();
    let posts = [];
    let found = 0;
    try {
        do {
            const params = {actor: target, ...cursor, limit:100};
            const {data} = await agent.getAuthorFeed(params);
            const {cursor:newCursor, feed} = data;
            if (newCursor === cursor?.cursor) {
                return posts;
            }
            const oldSize = uris.size;
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
            found += feed.length;
            console.log("found", found);
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
            return uris;
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

    return uris;
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
                    likes.push({post, createdAt});
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