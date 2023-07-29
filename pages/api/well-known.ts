export default async function handler (req, res) {
    return new Promise(async resolve => {

        res.status(200).json({
            "@context": ["https://www.w3.org/ns/did/v1"],
            "id": "did:web:blueskyfeeds.com",
            "service": [
                {
                    "id": "#bsky_fg",
                    "type": "BskyFeedGenerator",
                    "serviceEndpoint": "https://blueskyfeeds.com"
                }
            ]
        });
    })
}