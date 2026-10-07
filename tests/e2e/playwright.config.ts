import { defineConfig, devices } from "@playwright/test";

/**
 * End-to-end tests run against an already-running stack (`make dev` or `docker compose up`).
 * Set E2E_BASE_URL to target another environment.
 * Set PLAYWRIGHT_CHROMIUM_EXECUTABLE to use a pre-installed Chromium instead of `playwright install`.
 */
const executablePath = process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE;

export default defineConfig({
  testDir: "./specs",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? "github" : "list",
  use: {
    baseURL: process.env.E2E_BASE_URL ?? "http://localhost:3000",
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
  },
  projects: [
    {
      name: "chromium",
      use: {
        ...devices["Desktop Chrome"],
        launchOptions: executablePath ? { executablePath } : {},
      },
    },
  ],
});
