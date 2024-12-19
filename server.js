// server.js
const { parse } = require('url');
const next = require('next');
const fs = require('fs');
const dev = process.env.NODE_ENV !== 'production';
const hostname = '0.0.0.0';
const port = 9123;
const app = next({ dev, hostname, port });
const handle = app.getRequestHandler();

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
        console.log(`> Ready on http${secure? "s":""}://${hostname}:${port}`);

        if (process.env.NEXT_PUBLIC_DEV !== "1") {
            
        }
    });
});
