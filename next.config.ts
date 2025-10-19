import type { NextConfig } from "next";

const isDevelopment = process.env.NODE_ENV === 'development';

const nextConfig: NextConfig = {
  // Build configuration
  eslint: {
    ignoreDuringBuilds: true, // Disable linting during build
  },
  typescript: {
    ignoreBuildErrors: true, // Disable TypeScript errors during build
  },
  
  // Experimental features
  experimental: {
    ppr: false, // Disable partial prerendering
  },

  // Image optimization
  images: {
    formats: ['image/avif', 'image/webp'],
    minimumCacheTTL: isDevelopment ? 0 : 60, // No cache in dev, 60s in production
  },

  // Compression
  compress: true,

  // Remove powered-by header
  poweredByHeader: false,

  // Enable ETags for caching (disabled in development for easier debugging)
  generateEtags: !isDevelopment,

  // Headers for security and caching
  async headers() {
    const headers = [
      // Security headers for all routes
      {
        source: '/:path*',
        headers: [
          { key: 'X-DNS-Prefetch-Control', value: 'on' },
          { key: 'X-Frame-Options', value: 'SAMEORIGIN' },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
        ],
      },
      // Static assets caching - aggressive in production, minimal in dev
      {
        source: '/_next/static/:path*',
        headers: [
          { 
            key: 'Cache-Control', 
            value: isDevelopment 
              ? 'no-cache, no-store, must-revalidate' 
              : 'public, max-age=31536000, immutable' 
          },
        ],
      },
      // API routes - no caching to prevent stale data
      {
        source: '/api/:path*',
        headers: [
          { 
            key: 'Cache-Control', 
            value: 'no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0'
          },
          { key: 'Pragma', value: 'no-cache' },
          { key: 'Expires', value: '0' },
        ],
      },
      // App pages - revalidate frequently in development
      {
        source: '/(dashboard|contacts|deals|pipelines|analytics)/:path*',
        headers: [
          { 
            key: 'Cache-Control', 
            value: isDevelopment 
              ? 'no-cache, no-store, must-revalidate' 
              : 'private, max-age=0, must-revalidate'
          },
        ],
      },
    ];

    return headers;
  },
};

export default nextConfig;
