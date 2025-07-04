import {randomInt} from "crypto";
import {getSortMethod, listsToDids} from "pages/xrpc/app.bsky.feed.getFeedSkeleton";
import {SUPPORTED_CW_LABELS} from "features/utils/constants";

export const handler = async (dontAddSticky, db, feedObj, queryCursor, limit, now=0, customSort="") => {
    let feed=[], cursor="";
    let {_id, sort, sticky, hideLikeSticky} = feedObj;
    const dbQuery:any = {feeds:_id};

    // TODO remove force sticky
    if (!dontAddSticky) {
        sticky = "at://did:plc:eubjsqnf5edgvcc6zuoyixhw/app.bsky.feed.post/3lrx2sbkfrs23";
    }

    let result:any[] = [];
    const sortMethod = getSortMethod(customSort || sort);
    try {
        if (queryCursor) {
            if (sort === "new") {
                let [_postId, tss] = queryCursor.split("::");
                const [userId, __postId] = _postId.split("/");
                const postId = `at://${userId}/app.bsky.feed.post/${__postId}`
                tss = parseInt(tss);
                tss = new Date(tss);
                dbQuery.indexedAt = {$lte: tss}
                let projection:any = {indexedAt: 1};
                result = await db.posts.find(dbQuery).sort(sortMethod).limit(limit+100).project(projection).toArray(); // don't bother querying beyond 500
                if (result.length === 0) {
                    return {cursor, feed};
                } else if (now) {
                    db.posts.updateMany({_id: {$in: result.map(x => x._id)}}, {$set: {last: now }});
                }

                let index = result.findIndex(x => x._id === postId);
                if (index === -1) {
                    index = result.findIndex(x => x.indexedAt < tss);
                }
                if (index === -1) {
                    return {cursor, feed};
                }
                result = result.slice(index+1, index+1+limit);
                const last = result.at(-1);
                if (last) {
                    try {
                        const ts = new Date(last.indexedAt).getTime();
                        const parts = last._id.split("/");
                        const id = `${parts[2]}/${parts[4]}`;
                        cursor = `${id}::${ts}`;
                    } catch (e) {
                        cursor = "";
                    }
                }
            } else {
                const skip = parseInt(queryCursor) || 0;
                let projection:any = {_id: 1};
                result =  await db.posts.find(dbQuery).sort(sortMethod).skip(skip).limit(limit).project(projection).toArray();
                if (result.length === 0) {
                    return {cursor, feed};
                } else {
                    db.posts.bulkWrite(result.map(x => {
                        return {
                            updateOne: {
                                filter: {_id:x._id},
                                update: {$set: {last: now}}
                            }
                        }
                    }), {ordered: false});
                }
                cursor = `${result.length+skip}`;
            }
        } else {
            if (sort === "new") {
                if (sticky) {limit = limit -1;}

                let projection:any = {indexedAt: 1};
                result = await db.posts.find(dbQuery).sort(sortMethod).project(projection).limit(limit).toArray();
                if (result.length === 0) {
                    feed = sticky? [{post:sticky}] : [];
                    return {cursor, feed};
                } else {
                    db.posts.bulkWrite(result.map(x => {
                        return {
                            updateOne: {
                                filter: {_id: x._id},
                                update: {$set: {last: now}}
                            }
                        }
                    }), {ordered: false});
                }

                if (sticky) {
                    result = result.filter(x => x._id !== sticky);
                    result.splice(1,0, {_id: sticky});
                }
                // return last item + timestamp
                const last = result.at(-1);
                if (last) {
                    const ts = new Date(last.indexedAt).getTime();
                    const parts = last._id.split("/");
                    const id = `${parts[2]}/${parts[4]}`;
                    cursor = `${id}::${ts}`;
                }
            } else {
                if (sticky) {limit = limit -1;}
                let projection:any = {_id: 1};
                result = await db.posts.find(dbQuery).sort(sortMethod).project(projection).limit(limit).toArray();
                if (result.length === 0) {
                    feed = sticky? [{post:sticky}] : [];
                    return {cursor, feed};
                } else {
                    db.posts.updateMany({_id: {$in: result.map(x => x._id)}}, {$set: {last: now }});
                }


                if (sticky) {
                    result = result.filter(x => x._id !== sticky);
                    result.splice(randomInt(0, 2),0, {_id: sticky});
                }
                cursor = `${limit}`;
            }
        }
    } catch (e) {
        console.error(_id, e);
    }

    feed = result.map(x => {return {post: x._id};});
    return {feed, cursor};
}
