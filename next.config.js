/** @type {import('next').NextConfig} */
const { withSentryConfig } = require("@sentry/nextjs");

const isDevelopment = process.env.NODE_ENV === 'development';

const nextConfig = {
  // Build configuration
  eslint: {
    ignoreDuringBuilds: true, // Disable linting during build
  },
  typescript: {
    ignoreBuildErrors: true, // Disable TypeScript errors during build
  },
  
  // Skip static generation for error pages
  skipTrailingSlashRedirect: true,
  skipMiddlewareUrlNormalize: true,

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

// Wrap Next.js config with Sentry
module.exports = withSentryConfig(
  nextConfig,
  {
    // For all available options, see:
    // https://github.com/getsentry/sentry-webpack-plugin#options

    // Suppresses source map uploading logs during build
    silent: true,
    org: process.env.SENTRY_ORG,
    project: process.env.SENTRY_PROJECT,
  },
  {
    // For all available options, see:
    // https://docs.sentry.io/platforms/javascript/guides/nextjs/manual-setup/

    // Upload a larger set of source maps for prettier stack traces (increases build time)
    widenClientFileUpload: true,

    // Transpiles SDK to be compatible with IE11 (increases bundle size)
    transpileClientSDK: true,

    // Routes browser requests to Sentry through a Next.js rewrite to circumvent ad-blockers.
    // This can increase your server load as well as your hosting bill.
    // Note: Check that the configured route will not match with your Next.js middleware, otherwise reporting of client-
    // side errors will fail.
    tunnelRoute: "/monitoring",

    // Hides source maps from generated client bundles
    hideSourceMaps: true,

    // Automatically tree-shake Sentry logger statements to reduce bundle size
    disableLogger: true,

    // Enables automatic instrumentation of Vercel Cron Monitors.
    // See the following for more information:
    // https://docs.sentry.io/product/crons/
    // https://vercel.com/docs/cron-jobs
    automaticVercelMonitors: true,
  }
);
