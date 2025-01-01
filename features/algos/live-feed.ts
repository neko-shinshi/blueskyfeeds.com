import {randomInt} from "crypto";
import {IDatabase, IHelpers} from "pg-promise";
import {dateAsTimestamp} from "features/utils/types";

export const handler = async (dbUtils:{db:IDatabase<any>, helpers:IHelpers}, feedObj, queryCursor, limit, now=0) => {
    let feed=[], cursor="";
    let {id:feedId, sort, sticky} = feedObj;

    let result:any[] = [];
  //  const sortMethod = getSortMethod(customSort || sort);

    const {db, helpers} = dbUtils;

    try {
        if (sort === "new") {
            if (!queryCursor) {
                if (sticky) {limit = limit -1;}

                //       let projection:any = {t_indexed: 1};
                const query = "SELECT post_id, t_indexed FROM post, feed_post_live WHERE id = post_id AND feed_id = $1 ORDER BY t_indexed DESC LIMIT $2";
                const values = [feedId, limit];
                let result = await db.manyOrNone(helpers.concat([{query, values}]));

                //    result = await db.posts.find(dbQuery).sort(sortMethod).project(projection).limit(limit).toArray();
                if (result.length === 0) {
                    feed = sticky? [{post:sticky}] : [];
                    return {cursor, feed};
                }

                if (sticky) {
                    result = result.filter(x => x._id !== sticky);
                    result.splice(1,0, {_id: sticky});
                }
                // return last item + timestamp
                const last = result.at(-1);
                if (last) {
                    const ts = new Date(last.t_indexed).getTime();
                    const parts = last._id.split("/");
                    const id = `${parts[2]}/${parts[4]}`;
                    cursor = `${id}::${ts}`;
                }
            } else {
                let [_postId, tss] = queryCursor.split("::");
                const [userId, __postId] = _postId.split("/");
                const postId = `at://${userId}/app.bsky.feed.post/${__postId}`
                tss = parseInt(tss);
                tss = new Date(tss);

                const query = "SELECT post_id, t_indexed FROM post, feed_post_live WHERE id = post_id AND feed_id = $1 AND t_indexed <= $2 ORDER BY t_indexed DESC LIMIT $3";
                const values = [feedId, dateAsTimestamp(tss), limit+100];
                let result = await db.manyOrNone(helpers.concat([{query, values}]));

                // result = await db.posts.find(dbQuery).sort(sortMethod).limit(limit+100).project(projection).toArray(); // don't bother querying beyond 500
                if (result.length === 0) {
                    return {cursor, feed};
                }

                let index = result.findIndex(x => x.post_id === postId);
                if (index === -1) {
                    index = result.findIndex(x => x.t_indexed < tss);
                }
                if (index === -1) {
                    return {cursor, feed};
                }
                result = result.slice(index+1, index+1+limit);
                const last = result.at(-1);
                if (last) {
                    try {
                        const ts = new Date(last.t_indexed).getTime();
                        const parts = last._id.split("/");
                        const id = `${parts[2]}/${parts[4]}`;
                        cursor = `${id}::${ts}`;
                    } catch (e) {
                        cursor = "";
                    }
                }
            }
        } else {
            if (!queryCursor) {
                if (sticky) {limit = limit -1;}
                // SORT METHOD!!

                const query = `SELECT p.id AS post_id FROM post AS p, feed_post_live AS l, feed_live_score AS s WHERE p.id = l.post_id AND p.id = s.post_id AND feed_id = $1 ORDER BY ${sort} DESC LIMIT $2`;
                const values = [feedId, limit];
                let result = await db.manyOrNone(helpers.concat([{query, values}]));

               // result = await db.posts.find(dbQuery).sort(sortMethod).project(projection).limit(limit).toArray();
                if (result.length === 0) {
                    feed = sticky? [{post:sticky}] : [];
                    return {cursor, feed};
                }

                if (sticky) {
                    result = result.filter(x => x._id !== sticky);
                    result.splice(randomInt(0, 2),0, {post_id: sticky});
                }
                cursor = `${limit}`;
            } else {
                const skip = parseInt(queryCursor) || 0;
                const query = `SELECT p.id AS post_id FROM post AS p, feed_post_live AS l, feed_live_score AS s WHERE p.id = l.post_id AND p.id = s.post_id AND feed_id = $1 ORDER BY ${sort} DESC LIMIT $2 OFFSET $3`;
                const values = [feedId, limit, skip];
                let result = await db.manyOrNone(query, values);
                //  result =  await db.posts.find(dbQuery).sort(sortMethod).skip(skip).limit(limit).project(projection).toArray();
                if (result.length === 0) {
                    feed = sticky? [{post:sticky}] : [];
                    return {cursor, feed};
                }
                cursor = `${result.length+skip}`;
            }
        }
        await db.none(helpers.concat([{
            query:"UPDATE post SET t_seen = $1 WHERE id IN ($2:csv)",
            values:[dateAsTimestamp(new Date(now)), result.map(x => x.post_id)]}]));

    } catch (e) {
        console.error(feedId, e);
    }

    feed = result.map(x => {return {post: x.post_id};});
    return {feed, cursor};
}
