import withPWAInit from 'next-pwa'
import bundleAnalyzer from '@next/bundle-analyzer'

const withBundleAnalyzer = bundleAnalyzer({
  enabled: process.env.ANALYZE === 'true',
})

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
      { protocol: 'https', hostname: 'img.evbuc.com' },
      { protocol: 'https', hostname: '**.evbuc.com' },
      { protocol: 'https', hostname: 'cdn.evbuc.com' },
      { protocol: 'https', hostname: 'sfpl.org' },
      { protocol: 'https', hostname: '**.netlify.app' },
      { protocol: 'https', hostname: 'images.unsplash.com' },
    ],
  },
}

export default withBundleAnalyzer(withPWA(nextConfig))
