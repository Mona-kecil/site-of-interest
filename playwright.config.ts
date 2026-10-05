import { defineConfig } from "@playwright/test";

const baseURL = "http://127.0.0.1:5173";

export default defineConfig({
  testDir: "./e2e",
  use: {
    baseURL,
    viewport: { width: 1440, height: 900 },
    // Specs start as returning visitors so the tour invite stays out of the way; tour.spec.ts opts out.
    storageState: {
      cookies: [],
      origins: [
        {
          origin: baseURL,
          localStorage: [{ name: "soi-tour", value: "seen" }],
        },
      ],
    },
  },
  // Specs read the configured Convex deployment; push functions first with `npx convex dev --once`.
  webServer: {
    command: "npx vp dev --host 127.0.0.1 --port 5173 --strictPort",
    reuseExistingServer: true,
    url: baseURL,
  },
});
