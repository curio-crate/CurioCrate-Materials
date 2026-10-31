import { defineConfig, devices } from "@playwright/test";
import path from "node:path";

// E2E runs against a production build with every outside service in local/test mode and a
// fresh PGlite database per run. Set E2E_BASE_URL to test an already-running server instead.
const PORT = 3210;
const external = process.env.E2E_BASE_URL;
const runId = process.env.E2E_RUN_ID ?? String(Date.now());

export default defineConfig({
  testDir: "./e2e",
  outputDir: "./test-results",
  timeout: 180_000, // multi-role tests sign in several teachers against one production server
  expect: { timeout: 15_000 },
  fullyParallel: false,
  workers: 1,
  retries: 0,
  reporter: [["list"], ["json", { outputFile: "test-results/results.json" }]],
  use: {
    baseURL: external ?? `http://localhost:${PORT}`,
    viewport: { width: 1440, height: 900 },
    trace: "off", // trace teardown hangs with many open media contexts; screenshots are kept on failure
    screenshot: "only-on-failure",
  },
  // Real Google Chrome (what Chromebooks run): Playwright's bundled Chromium has no H.264/AAC, so HLS video can't play in it.
  projects: [{ name: "chrome", use: { ...devices["Desktop Chrome"], channel: "chrome", viewport: { width: 1440, height: 900 } } }],
  webServer: external
    ? undefined
    : {
        command: `npm run start -- -p ${PORT}`,
        url: `http://localhost:${PORT}/api/health`,
        timeout: 180_000,
        reuseExistingServer: false,
        env: {
          APP_URL: `http://localhost:${PORT}`,
          PGLITE_DIR: path.join(".data", `e2e-${runId}`),
          SESSION_SECRET: "e2e-session-secret-not-for-production-0123456789",
          CURIE_RETENTION_DAYS: "30",
          E2E: "1",
        },
      },
});
