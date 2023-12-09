// server.js
const { parse } = require('url');
const next = require('next');
const fs = require('fs');
const dev = process.env.NODE_ENV !== 'production';
const hostname = '0.0.0.0';
const port = 9123;
const app = next({ dev, hostname, port });
const handle = app.getRequestHandler();
const {updateScores} = require("./not-nextjs/scoring");
const {updateAllFeeds} = require("./not-nextjs/update-all-feeds");
const {connectToDatabase} = require("./features/utils/dbUtils");
const { Cron } = require("croner");
const {updateLabels} = require("./not-nextjs/update-labels")
const {BskyAgent} = require("@atproto/api");

const handleData = async (req, res) => {
    try {
        // Be sure to pass `true` as the second argument to `url.parse`.
        // This tells it to parse the query portion of the URL.
        const parsedUrl = parse(req.url, true);
        const { pathname, query } = parsedUrl;

        if (pathname.startsWith('/_next/')) {
            await app.render(req, res, pathname, query);
        } else {
            await handle(req, res, parsedUrl);
        }
    } catch (err) {
        console.error('Error occurred handling', req.url, err);
        res.statusCode = 500;
        res.end('internal server error');
    }
}

const getServer = (secure) => {
    if (secure) {
        const options = {
            key: fs.readFileSync('ss-key.pem'),
            cert: fs.readFileSync('ss-cert.pem')
        };
        return require('https').createServer(options, handleData);
    } else {
        return require('http').createServer(handleData);
    }
}



app.prepare().then(async () => {
    const secure = dev; // https is provided by load balancer and cloudflare
    const server = getServer(secure);

    server.listen(port, async (err) => {
        if (err) throw err;
        const db = await connectToDatabase();
        console.log(`> Ready on http${secure? "s":""}://${hostname}:${port}`);

        const agents = [{
            identifier: process.env.BLUESKY_USERNAME0,
            password: process.env.BLUESKY_PASSWORD0
        },{
            identifier: process.env.BLUESKY_USERNAME,
            password: process.env.BLUESKY_PASSWORD
        }];
        let currentAgentIndex = 0;
        const getAgent = async () => {
            const agent = new BskyAgent({ service: "https://bsky.social/" });
            let currentAgent = agents[currentAgentIndex];
            try {
                await agent.login(currentAgent);
                return agent;
            } catch (e) {
                console.log(`login switch from ${currentAgent.identifier}`);
                console.log(e);

                currentAgentIndex = (currentAgentIndex + 1)%2;
                currentAgent = agents[currentAgentIndex];
                console.log(`login switch to ${currentAgent.identifier}`);
                try {
                    await agent.login(currentAgent);
                    return agent;
                } catch (e) {
                    console.log("login fail");
                    console.log(e.status, e.error);
                    return null;
                }
            }
        }



        const agent = await getAgent();
        await updateLabels(db, agent);
        if (process.env.NEXT_PUBLIC_DEV !== "1") {

            if (false) {
                const agent = await getAgent();
                if (agent) {
                    await updateAllFeeds(db, agent);
                    Cron('*/11 * * * *', async () => {
                        const agent = await getAgent();
                        if (agent) {
                            const db = await connectToDatabase();
                            await updateAllFeeds(db, agent);
                        }
                    });

                    await updateLabels(db, agent);
                    Cron('*/13 * * * *', async () => {
                        const agent = await getAgent();
                        if (agent) {
                            const db = await connectToDatabase();
                            await updateLabels(db, agent);
                        }
                    });
                }
            }


            await updateScores(db);
            Cron('*/13 * * * *', async () => {
                const db = await connectToDatabase();
                await updateScores(db);
            });


            /*
            Cron("26 15 * * *", { timezone: 'Asia/Singapore' }, async () => {
                const db = await connectToDatabase();
                await clearPosts(db);
            });
            */
        }
    });
});
