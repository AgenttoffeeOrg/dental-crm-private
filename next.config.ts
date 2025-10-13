import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  eslint: {
    // Disable linting during build to skip all warnings/errors
    ignoreDuringBuilds: true,
  },
  typescript: {
    // Disable TypeScript type checking during build
    ignoreBuildErrors: true,
  },
  // Disable static page generation - make everything dynamic
  experimental: {
    ppr: false,
  },
};

export default nextConfig;
