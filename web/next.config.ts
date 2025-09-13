import type { NextConfig } from "next";
import path from "path";
const withTM = require("next-transpile-modules")([
  "../backend", // tell Next to transpile backend
]);

const nextConfig: NextConfig = withTM({
  experimental: {
    turbo: {
      resolveAlias: {
        "@backend": path.resolve(__dirname, "../backend"),
      },
    },
  },
  webpack: (config:any) => {
    config.resolve.alias["@backend"] = path.resolve(__dirname, "../backend");
    return config;
  },
});

export default nextConfig;
