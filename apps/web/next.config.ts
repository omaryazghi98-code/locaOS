import type { NextConfig } from 'next';

const API = process.env.API_URL ?? 'http://127.0.0.1:3001';

const nextConfig: NextConfig = {
  transpilePackages: ['@locaos/domain'],
  async rewrites() {
    // Same-origin /api from the browser, proxied server-side to the NestJS API.
    return [{ source: '/api/:path*', destination: `${API}/api/:path*` }];
  },
};

export default nextConfig;
