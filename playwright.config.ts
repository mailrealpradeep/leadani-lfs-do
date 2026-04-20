import { defineConfig, devices } from "@playwright/test";

const PORT = process.env.PORT || "5000";

export default defineConfig({
  testDir: "./e2e",
  testMatch: /.*\.spec\.ts$/,
  timeout: 60_000,
  expect: { timeout: 10_000 },
  fullyParallel: false,
  retries: 0,
  reporter: [["list"]],
  use: {
    baseURL: process.env.E2E_BASE_URL || `http://localhost:${PORT}`,
    headless: true,
    trace: "retain-on-failure",
  },
  // Reuses the running dev server (the `Start application` workflow). When
  // running locally without it, this command will boot one instead.
  webServer: {
    command: "npm run dev",
    url: `http://localhost:${PORT}`,
    reuseExistingServer: true,
    timeout: 120_000,
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
});
