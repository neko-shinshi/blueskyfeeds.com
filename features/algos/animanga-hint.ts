import {connectToDatabase} from "features/utils/dbUtils";

export const id = "at://did:plc:tazrmeme4dzahimsykusrwrk/app.bsky.feed.generator/animanga-hint";
const sticky = "";

export const handler = async (db, user, queryCursor, limit) => {
    let dbQuery:any = {
        $and: [
            {kwText: {$in:["{t:t w:animanga}",
                        "{t:t w:anime}", "{t:t w:animes}",
                        "{t:t w:manga}", "{t:t w:mangas}"]}},
            {kwText: {$in:["{t:t w:suggest}", "{t:t w:suggestion}", "{t:t w:suggestions}",
                        "{t:t w:recommend}", "{t:t w:recommendation}", "{t:t w:recommendations}"]}}
        ],
        replyRoot:null
    }
    console.log(JSON.stringify(dbQuery));

    let result:any[] = [];
    let feed=[], cursor="";

    if (queryCursor) {
        try {
            let [_postId, tss] = queryCursor.split("::");
            const [userId, __postId] = _postId.split("/");
            const postId = `at://${userId}/app.bsky.feed.post/${__postId}`
            tss = parseInt(tss);
            tss = new Date(tss).toISOString();
            dbQuery.createdAt = {$lte: tss}
            let projection:any = {createdAt: 1};
            result = await db.posts.find(dbQuery).sort({createdAt: -1}).limit(limit+100).project(projection).toArray(); // don't bother querying beyond 500
            if (result.length === 0) {
                return {cursor, feed};
            }

            let index = result.findIndex(x => x._id === postId);
            if (index === -1) {
                index = result.findIndex(x => x.createdAt < tss);
            }
            if (index === -1) {
                return {cursor, feed};
            }
            result = result.slice(index+1, index+1+limit);
            const last = result.at(-1);
            if (last) {
                try {
                    const ts = new Date(last.createdAt).getTime();
                    const parts = last._id.split("/");
                    const id = `${parts[2]}/${parts[4]}`;
                    cursor = `${id}::${ts}`;
                } catch (e) {
                    cursor = "";
                }
            }
        } catch (e) {}

    } else {
        if (sticky) {limit = limit -1;}

        let projection:any = {createdAt: 1};
        result = await db.posts.find(dbQuery).sort({createdAt: -1}).project(projection).limit(limit).toArray();
        if (result.length === 0) {
            console.log("nothing");
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
            const ts = new Date(last.createdAt).getTime();
            const parts = last._id.split("/");
            const id = `${parts[2]}/${parts[4]}`;
            cursor = `${id}::${ts}`;
        }

    }
    feed = result.map(x => {return {post: x._id};});
    return {feed, cursor};
}