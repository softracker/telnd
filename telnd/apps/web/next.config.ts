import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  compress: true,
  images: {
    formats: ['image/avif', 'image/webp'],
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**.telnd.com',
      },
    ],
  },
  experimental: {
    optimizePackageImports: ['@telnd/ui'],
  },
};

export default nextConfig;
