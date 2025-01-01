const nextTranslate = require('next-translate')
const nextConfig = {
  reactStrictMode: false,
  swcMinify: true,
  poweredByHeader: false,
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'cdn.bsky.app',
        port: '',
        pathname: '/img/**'
      },
      {
        protocol: 'https',
        hostname: 'cdn.bsky.social',
        port: '',
        pathname: '/imgproxy/**'
      },
      {
        protocol: 'https',
        hostname: 'av-cdn.bsky.app',
        port: '',
        pathname: '/img/**'
      }
    ]
  },
  rewrites: async () => [
    {
      source: '/client-metadata.json',
      destination: '/api/client-metadata'
    },
    {
      source: '/.well-known/did.json',
      destination: '/api/well-known'
    },
    {
      source: '/preview',
      destination: '/'
    }
  ]
}

module.exports = nextTranslate(nextConfig)

