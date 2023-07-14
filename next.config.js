const nextTranslate = require('next-translate')


const nextConfig = {
  reactStrictMode: false,
  swcMinify: true,
  poweredByHeader: false,
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '127.0.0.1',
        port: '9123',
        pathname: '/images/**'
      }
    ]
  }
}

module.exports = nextTranslate(nextConfig)

