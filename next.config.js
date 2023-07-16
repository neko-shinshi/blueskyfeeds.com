const nextTranslate = require('next-translate')


const nextConfig = {
  reactStrictMode: false,
  swcMinify: true,
  poweredByHeader: false,
  rewrites: async () => [
    {
      source: '/.well-known/did.json',
      destination: '/api/well-known'
    },
    {
      source: '/xrpc/app.bsky.feed.describeFeedGenerator',
      destination: '/api/feed-reply/describe'
    },
    {
      source: '/xrpc/app.bsky.feed.getFeedSkeleton',
      destination: '/api/feed-reply/skeleton'
    }
  ]
}

module.exports = nextTranslate(nextConfig)

