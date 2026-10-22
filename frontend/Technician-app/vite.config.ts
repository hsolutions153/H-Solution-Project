import { defineConfig, loadEnv } from "vite";
import vinext from "vinext";
import { cloudflare } from "@cloudflare/vite-plugin";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");
  if (!process.env.API_URL && env.API_URL) process.env.API_URL = env.API_URL;

  return {
    define: mode === "development" && env.API_URL
      ? { "process.env.API_URL": JSON.stringify(env.API_URL) }
      : undefined,
    plugins: [
      vinext(),
      tailwindcss(),
      cloudflare({
        viteEnvironment: {
          name: "rsc",
          childEnvironments: ["ssr"],
        },
      }),
    ],
  };
});
