const { BskyAgent }  = require ("@atproto/api");
const {connectToDatabase} = require("../features/utils/dbUtils");

const getAgent = async () => {
    const agent = new BskyAgent({ service: "https://bsky.social/" });
    await agent.login({
        identifier: process.env.BLUESKY_USERNAME,
        password: process.env.BLUESKY_PASSWORD
    });
    return agent;
}

module.exports = {
    getAgent,
}