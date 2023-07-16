import {connectToDatabase} from "features/utils/dbUtils";

export default async function handler (req, res) {
    return new Promise(async resolve => {
        if (req.method === "GET") {
            let {feed, cursor, limit=10} = req.query;
            if (!feed) {res.status(400).send();}
            const db = await connectToDatabase();
            const feeds = await db.feeds.find({}).toArray();

            res.status(200).json({
                encoding: 'application/json',
                body: {
                    did: `did:web:blueskyfeeds.com`,
                    feeds: feeds.map(x => {return {uri: x._id}}),
                },
            });
        } else {
            res.status(404).send();
        }
    });
}