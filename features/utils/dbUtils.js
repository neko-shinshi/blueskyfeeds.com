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
                sessions: db.collection("sessions"), // session keys for rollover
                data: db.collection("data"),
                allFeeds: db.collection("allFeeds"),
                allHandles: db.collection("allHandles"),
                feeds: db.collection("feeds"),
            };
            return global.cachedDb;
        })
        .catch((error) => {
            console.error(error);
        });
};

/*
// Indexes
db.allFeeds.createIndex( { likeCount: -1, indexedAt:1 } )
 */

module.exports = {
    connectToDatabase
}

