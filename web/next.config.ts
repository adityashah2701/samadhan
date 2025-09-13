import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  webpack: (config: any) => {
    // Allow webpack to handle .mjs files
    config.module.rules.push({
      test: /\.mjs$/,
      include: /node_modules/,
      type: "javascript/auto",
    });
    return config;
  },
  experimental: {
    esmExternals: "loose",
  },
  transpilePackages: ["convex"],
};

export default nextConfig;
