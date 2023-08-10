const {MongoClient} = require("mongodb");

const connectToDatabase = async () => {
    if (global.cachedDb) {
        return Promise.resolve(global.cachedDb);
    }
    const URI_VAR = process.env.DB_URI;
    const PW_VAR = process.env.DB_PASSWORD;

    if (!URI_VAR || !PW_VAR) {
        throw new Error('Please define the environment variables inside .env.local');
    }

    const uri = PW_VAR === "null" ? URI_VAR : URI_VAR.replace("@", `${encodeURIComponent(PW_VAR)}@`);

    return MongoClient.connect(uri)
        .then((client) => {
            let db = client.db('anime');
            global.cachedDb = {
                db: db,
                sticky: db.collection("sticky"),
                sessions: db.collection("sessions"), // session keys for rollover
                data: db.collection("data"),
                dataAlgoFeed: db.collection("dataAlgoFeed"),
                postsAlgoFeed: db.collection("postsAlgoFeed"),
                allFeeds: db.collection("allFeeds"),
                allHandles: db.collection("allHandles"),
                feeds: db.collection("feeds"),
                feedViews: db.collection("feedViews"),
                posts: db.collection("posts"),
                keywords: db.collection("keywords"),
            };
            return global.cachedDb;
        })
        .catch((error) => {
            console.error(error);
        });
};

module.exports = {
    connectToDatabase
}

/*
// Indexes
db.sessions.createIndex( { expireAt: 1 }, { expireAfterSeconds: 0 } )
db.data.createIndex( { expireAt: 1 }, { expireAfterSeconds: 0 } )
db.posts.createIndex( { expireAt: 1 }, { expireAfterSeconds: 0 } )
db.posts.createIndex( { idLikes: 1 } )
db.posts.createIndex( { idReposts: 1 } )
db.posts.createIndex( { idReplies: 1 } )
db.dataAlgoFeed.createIndex( { expireAt: 1 }, { expireAfterSeconds: 0 } )
db.feedViews.createIndex({ expireAt: 1 }, { expireAfterSeconds: 0 } )

db.allFeeds.createIndex( { likeCount: -1, indexedAt:1 } )
db.feeds.createIndex({keywords:1})
db.feedViews.createIndex({user:1, feed:1}, {unique:true})
db.feedViews.createIndex({feed:1})
db.dataAlgoFeed.createIndex( { _id: 1, indexedAt:-1 } )
db.postsAlgoFeed.createIndex({feed:1})
db.postsAlgoFeed.createIndex({feed:1, indexedAt:-1 } )
db.postsAlgoFeed.createIndex({feed:1, likeCount:-1, indexedAt:-1 } )
 */
