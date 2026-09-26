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
      {
        protocol: 'https',
        hostname: '**.r2.dev',
      },
    ],
  },
  experimental: {
    optimizePackageImports: ['@telnd/ui'],
  },

  // Tunnel domains for `next dev` (ngrok / Cloudflare quick tunnels). Next
  // blocks cross-origin dev assets by default — every chunk request from a
  // tunneled page gets a 403, so JS never runs and the page stays on its
  // server-rendered state forever. Bare hostnames / wildcard labels only;
  // custom tunnel domains get another line here. Ignored in production.
  allowedDevOrigins: [
    '*.ngrok-free.app',
    '*.ngrok-free.dev',
    '*.ngrok.app',
    '*.ngrok.io',
    '*.trycloudflare.com',
  ],

  // Browser calls stay same-origin: /api is proxied to the API server
  // here, instead of the page fetching http://localhost:3001 directly —
  // which an HTTPS tunnel breaks three ways at once (mixed content, CORS,
  // cross-site SameSite=Lax cookie). Server-side code keeps using API_URL
  // directly; it runs on this machine, so localhost works behind tunnels.
  async rewrites() {
    const api = process.env.API_URL || process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
    return [{ source: '/api/:path*', destination: `${api}/api/:path*` }];
  },
};

export default nextConfig;
