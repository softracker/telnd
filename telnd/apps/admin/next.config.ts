import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,

  // Tunnel domains for `next dev` (ngrok / Cloudflare quick tunnels). Next
  // blocks cross-origin dev assets by default — every chunk request coming
  // from a tunneled page gets a 403, so JS never loads, React never
  // hydrates, and the SSR'd preloader spins forever. Entries are bare
  // hostnames or wildcard labels only (no scheme, no port). A custom
  // tunnel domain gets one more line here. Ignored in production builds.
  allowedDevOrigins: [
    '*.ngrok-free.app',
    '*.ngrok-free.dev',
    '*.ngrok.app',
    '*.ngrok.io',
    '*.trycloudflare.com',
  ],

  // The browser must never call http://localhost:3001 directly. Behind an
  // HTTPS tunnel that request dies three ways at once: blocked as mixed
  // content, refused by CORS, and its cross-site SameSite=Lax session
  // cookie is never sent. Proxying /api server-side keeps the page and
  // the API on one origin — localhost, tunnel, or production — so the
  // cookie is always same-site and no CORS/mixed-content rule applies.
  async rewrites() {
    const api = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
    return [{ source: '/api/:path*', destination: `${api}/api/:path*` }];
  },

  // No referrer leaves the panel at all (#34). Document URLs here carry
  // secrets in the query string (`/reset-password?token=…`, `/2fa?…`), and
  // a single external link, image, or fetch would hand the full URL to a
  // third party via the Referer header. `no-referrer` is the blunt,
  // correct answer for an admin app with no external resources.
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [{ key: 'Referrer-Policy', value: 'no-referrer' }],
      },
    ];
  },
};

export default nextConfig;
