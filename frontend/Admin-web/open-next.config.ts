import { defineCloudflareConfig } from "@opennextjs/cloudflare/config";
import type { OpenNextConfig } from "@opennextjs/cloudflare/config";

const config = {
  ...defineCloudflareConfig({}),
  imageOptimization: {
    override: {
      wrapper: "dummy",
      converter: "dummy",
    },
    loader: "dummy",
  },
} satisfies OpenNextConfig;

export default config;
