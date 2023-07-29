const nextTranslate = require('next-translate')


const nextConfig = {
  reactStrictMode: false,
  swcMinify: true,
  poweredByHeader: false,
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'cdn.bsky.social',
        port: '',
        pathname: '/imgproxy/**',
      },
    ],
  },
  redirects: async () => [
    {
      source: '/.well-known/did.json',
      destination: '/api/well-known',
      permanent:false
    },
    {
      source: '/xrpc/app.bsky.feed.describeFeedGenerator',
      destination: '/api/feed-reply/describe',
      permanent:false
    },
    {
      source: '/xrpc/app.bsky.feed.getFeedSkeleton',
      destination: '/api/feed-reply/skeleton',
      permanent:false
    }
  ]
}

module.exports = nextTranslate(nextConfig)

