import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  workers: 1,
  reporter: process.env.CI ? "github" : "list",
  use: {
    baseURL: process.env.PLAYWRIGHT_BASE_URL ?? "http://127.0.0.1:3000",
    trace: "on-first-retry",
  },
  projects: [
    {
      name: "desktop-1280x800",
      testMatch: /.*\.spec\.ts/,
      use: {
        ...devices["Desktop Chrome"],
        viewport: { width: 1280, height: 800 },
      },
    },
    {
      name: "mobile-393x852",
      testMatch: /.*\.spec\.ts/,
      use: {
        ...devices["Pixel 5"],
        viewport: { width: 393, height: 852 },
      },
    },
  ],
  webServer: process.env.CI
    ? undefined
    : {
        command: "pnpm start",
        url: "http://127.0.0.1:3000",
        reuseExistingServer: true,
      },
});
