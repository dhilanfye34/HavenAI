/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'export',
  // Packaged Electron loads pages via file://, so exported asset URLs
  // must be relative instead of root-absolute.
  assetPrefix: process.env.NODE_ENV === 'production' ? './' : undefined,
  experimental: {
    externalDir: true,
  },
  images: {
    unoptimized: true,
  },
  // Disable server-side features for Electron
  trailingSlash: true,
};

module.exports = nextConfig;
