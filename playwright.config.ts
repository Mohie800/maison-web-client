import { defineConfig, devices } from "@playwright/test";

/**
 * E2E against a real build talking to the dev API.
 *
 * `next dev` is deliberately not used: half the bugs these tests exist to catch
 * were caching and server-component behaviour that only shows in a production
 * build. `npm run build` is expected to have run — `webServer` starts `npm start`
 * and reuses one already listening.
 *
 * A single Chromium project. The app is server-rendered and the layouts are
 * plain flex/grid, so a second engine would buy repetition rather than coverage;
 * RTL is exercised by visiting the `ar` locale instead.
 */
const PORT = Number(process.env.E2E_PORT ?? 3311);

export default defineConfig({
  testDir: "./e2e",
  // The dev API is shared, so mutating specs must not race each other.
  fullyParallel: false,
  workers: 1,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? "github" : [["list"]],
  timeout: 60_000,
  expect: { timeout: 15_000 },

  use: {
    baseURL: `http://localhost:${PORT}`,
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
    locale: "en-GB",
  },

  projects: [
    { name: "chromium", use: { ...devices["Desktop Chrome"] } },
  ],

  webServer: {
    command: `npm start -- --port ${PORT}`,
    url: `http://localhost:${PORT}/en`,
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
});
