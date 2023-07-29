import {connectToDatabase} from "features/utils/dbUtils";

export async function getServerSideProps({req, res, query}) {
    const db = await connectToDatabase();
    if (!db) { return { redirect: { destination: '/500', permanent: false } } }
    const feeds = await db.feeds.find({}).toArray();
    res.write(JSON.stringify({
        encoding: 'application/json',
        body: {
            did: `did:web:blueskyfeeds.com`,
            feeds: feeds.map(x => {
                return {uri: x._id}
            }),
        },
    }));
    res.end();
    return {props: {}};
}

export default function Home({}) {
    return <div></div>
}