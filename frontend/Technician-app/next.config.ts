import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: ["@h-mobility/ui"],
  serverExternalPackages: ["sharp"],
  images: {
    unoptimized: true,
  },
};

export default nextConfig;
