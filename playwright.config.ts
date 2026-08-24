import { defineConfig, devices } from '@playwright/test';

const BASE_URL = process.env.E2E_BASE_URL ?? 'http://localhost:5173';

/**
 * One browser project, one signed-in storage state, one worker.
 *
 * Two constraints from the real backend shape this file:
 *
 * - **The auth limiter allows 50 sign-ins per 15 minutes.** Signing in per test would burn
 *   through that in a single run, so `globalSetup` signs in once and every test reuses the
 *   saved `storageState`.
 * - **There is no test database.** Checkout really decrements stock and really empties the
 *   cart, so `globalSetup` re-seeds the backend and the suite runs serially — parallel
 *   workers would race each other over the same rows.
 */
export default defineConfig({
  testDir: './e2e',
  globalSetup: './e2e/global-setup.ts',
  // Serial: these specs share one backend and mutate it.
  workers: 1,
  fullyParallel: false,
  forbidOnly: Boolean(process.env.CI),
  retries: 0,
  reporter: process.env.CI ? [['list'], ['html', { open: 'never' }]] : [['list']],
  timeout: 60_000,
  expect: { timeout: 10_000 },

  use: {
    baseURL: BASE_URL,
    storageState: './e2e/.auth/customer.json',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },

  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],

  // Reuses a dev server if one is already up, and starts one otherwise.
  webServer: {
    command: 'npm run dev',
    url: BASE_URL,
    reuseExistingServer: true,
    timeout: 120_000,
  },
});
