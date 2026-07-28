const { defineConfig, devices } = require("playwright/test");

module.exports = defineConfig({
  testDir: "./e2e",
  testMatch: /\.spec\.cjs$/,
  fullyParallel: false,
  workers: 1,
  timeout: 180_000,
  expect: { timeout: 30_000 },
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [["line"], ["html", { outputFolder: "playwright-report", open: "never" }]] : "list",
  outputDir: "test-results/playwright",
  use: {
    baseURL: "http://127.0.0.1",
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
    video: "retain-on-failure",
    actionTimeout: 30_000,
    navigationTimeout: 60_000,
  },
  projects: [
    {
      name: "chromium",
      use: {
        ...devices["Desktop Chrome"],
        permissions: ["camera", "microphone"],
        launchOptions: {
          args: [
            "--use-fake-ui-for-media-stream",
            "--use-fake-device-for-media-stream",
            "--autoplay-policy=no-user-gesture-required",
          ],
        },
      },
    },
    { name: "firefox", testMatch: /mosh-smoke\.spec\.cjs$/, use: { ...devices["Desktop Firefox"] } },
    { name: "webkit", testMatch: /mosh-smoke\.spec\.cjs$/, use: { ...devices["Desktop Safari"] } },
  ],
});
