/** @type {import('next').NextConfig} */

const nextConfig = {
  images: {
    domains: ['neat-peccary-29.convex.cloud'],
  },
  eslint: {
    ignoreDuringBuilds: true, 
  },
   outputFileTracingRoot: process.cwd(),
  typescript: {
    ignoreBuildErrors: true,
  },
};

module.exports = nextConfig;
