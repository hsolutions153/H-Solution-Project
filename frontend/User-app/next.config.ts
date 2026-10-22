import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: ["@h-mobility/ui"],
  images: {
    unoptimized: true,
    remotePatterns: [
      {
        protocol: "https",
        hostname: "**",
      },
      {
        protocol: "http",
        hostname: "**",
      },
    ],
  },
};

export default nextConfig;

