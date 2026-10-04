import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "./e2e",
  use: {
    baseURL: "http://127.0.0.1:5173",
    viewport: { width: 1440, height: 900 },
  },
  // Specs read the configured Convex deployment; push functions first with `npx convex dev --once`.
  webServer: {
    command: "npx vp dev --host 127.0.0.1 --port 5173 --strictPort",
    reuseExistingServer: true,
    url: "http://127.0.0.1:5173",
  },
});
