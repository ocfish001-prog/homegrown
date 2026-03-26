import withPWAInit from 'next-pwa'

const withPWA = withPWAInit({
  dest: 'public',
  disable: process.env.NODE_ENV === 'development',
  register: true,
  skipWaiting: true,
})

/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'img.evbuc.com',
      },
      {
        protocol: 'https',
        hostname: '**.evbuc.com',
      },
      {
        protocol: 'https',
        hostname: 'cdn.evbuc.com',
      },
      {
        protocol: 'https',
        hostname: 'sfpl.org',
      },
    ],
  },
}

export default withPWA(nextConfig)
