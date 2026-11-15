import { defineConfig, devices } from "@playwright/test";

// The site blocks headless/automation user agents (bot protection), so tests
// present a normal browser UA. Set BASE_URL to test a deployed copy.
const UA = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0 Safari/537.36";
const MOBILE_UA = "Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1";

export default defineConfig({
  testDir: "./tests",
  timeout: 60_000,
  expect: { timeout: 10_000 },
  fullyParallel: false,
  workers: 1,
  reporter: [["list"]],
  use: { baseURL: process.env.BASE_URL ?? "http://localhost:3100", userAgent: UA, trace: "off", timezoneId: "America/Detroit" },
  projects: [
    { name: "desktop", use: { viewport: { width: 1366, height: 768 } }, testIgnore: /mobile/ },
    { name: "mobile", use: { ...devices["iPhone 13"], browserName: "chromium", userAgent: MOBILE_UA }, testMatch: /mobile/ },
  ],
  webServer: process.env.BASE_URL ? undefined : { command: "npx next start -p 3100", port: 3100, reuseExistingServer: true, timeout: 120_000 },
});
