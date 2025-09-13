/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    domains: ['neat-peccary-29.convex.cloud'], // allow Next.js <Image> to load from this domain
  },
  eslint: {
    ignoreDuringBuilds: true, // lets build continue even if ESLint finds issues
  },
};

module.exports = nextConfig;
