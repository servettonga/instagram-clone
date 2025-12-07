/** @type {import('next').NextConfig} */
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Use environment variable for base path - allows dev to work without prefix
const basePath = process.env.NEXT_PUBLIC_BASE_PATH || '';

const nextConfig = {
  // Essential for Docker
  output: 'standalone',

  // Base path for serving under /innogram (only in production)
  basePath: basePath,
  assetPrefix: basePath,

  // Prevent trailing slash redirects that cause loops with Nginx
  trailingSlash: false,
  skipTrailingSlashRedirect: true,

  // Allow local network access in development (use your local IP or wildcard patterns)
  // Add specific IPs as needed: 'http://192.168.1.24:3000'
  allowedDevOrigins: ['http://192.168.1.24:3000', 'http://192.168.1.100:3000', 'http://10.0.0.1:3000'],

  // For monorepo setup
  outputFileTracingRoot: path.join(__dirname, '../../'),

  typescript: {
    ignoreBuildErrors: true,
  },

  // Proxy API requests to backend (Next.js rewrites)
  async rewrites() {
    // In production, API calls go through Nginx which routes to core-server
    // In development, we proxy directly to localhost:8000
    if (process.env.NODE_ENV === 'development') {
      return [
        {
          source: '/api/:path*',
          destination: 'http://localhost:8000/api/:path*',
        },
        {
          source: '/internal/auth/:path*',
          destination: 'http://localhost:4000/internal/auth/:path*',
        },
        {
          source: '/uploads/:path*',
          destination: 'http://localhost:8000/uploads/:path*',
        },
      ];
    }
    return [];
  },

  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'lh3.googleusercontent.com',
        pathname: '/**',
      },
      // Local development backend
      {
        protocol: 'http',
        hostname: 'localhost',
        port: '8000',
        pathname: '/uploads/**',
      },
      // Cloudflare R2 storage (production)
      {
        protocol: 'https',
        hostname: 'innogram.web-dev.codes',
        pathname: '/**',
      },
    ],

    // Disable Next.js image optimizer until avatars are hosted on a globally reachable domain.
    unoptimized: true,
  },
};

export default nextConfig;
