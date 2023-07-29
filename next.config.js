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
  rewrites: async () => [
    {
      source: '/.well-known/did.json',
      destination: '/api/well-known'
    }
  ]
}

module.exports = nextTranslate(nextConfig)

