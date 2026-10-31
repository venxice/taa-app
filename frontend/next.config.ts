import type { NextConfig } from 'next';

import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const backendUrl = (process.env.BACKEND_URL || 'http://localhost:5001').replace(/\/$/, '');

const nextConfig: NextConfig = {
  // Silence workspace-root warning (stale lockfile exists in ~/)
  outputFileTracingRoot: __dirname,
  // Allow a second dev server to run without sharing .next (NEXT_DIST_DIR env)
  distDir: process.env.NEXT_DIST_DIR || '.next',
  // Hide the dev-tools badge (it sits over the mobile bottom nav)
  devIndicators: false,
  async rewrites() {
    return [
      {
        source: '/api/:path*',
        destination: `${backendUrl}/api/:path*`,
      },
      {
        source: '/uploads/:path*',
        destination: `${backendUrl}/uploads/:path*`,
      },
    ];
  },
  images: {
    remotePatterns: [{ protocol: 'http', hostname: 'localhost' }],
  },
};

export default nextConfig;
