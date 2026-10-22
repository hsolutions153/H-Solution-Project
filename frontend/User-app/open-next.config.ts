import { defineCloudflareConfig } from "@opennextjs/cloudflare/config";

// Keep the default OpenNext cache while the app is first deployed.
// R2 incremental cache can be added later without changing the Next.js app.
export default defineCloudflareConfig({});
