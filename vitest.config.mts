import path from "node:path";
import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    alias: {
      "@": path.resolve(import.meta.dirname, "src"),
      "server-only": path.resolve(import.meta.dirname, "tests/helpers/empty.ts"),
    },
  },
  test: {
    include: ["tests/**/*.test.ts"],
    environment: "node",
    testTimeout: 60_000,
    hookTimeout: 60_000,
    pool: "forks",
    env: {
      SESSION_SECRET: "unit-test-session-secret-0123456789abcdef",
      STAFF_EMAILS: "support@curiocrate.test",
      APP_URL: "http://localhost:3000",
    },
  },
});
