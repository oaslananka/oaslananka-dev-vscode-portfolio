import { hashSync } from 'bcryptjs';
import { defineConfig, devices } from '@playwright/test';

import { E2E_ADMIN_PASSWORD, E2E_CRON_SECRET } from './e2e/constants';

const baseURL = 'http://127.0.0.1:3100';

const databaseEnv = Object.fromEntries(
  ['DATABASE_URL', 'DATABASE_URL_UNPOOLED', 'DATABASE_DRIVER'].flatMap((key) => {
    const value = process.env[key];
    return value ? [[key, value]] : [];
  }),
) as Record<string, string>;

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: process.env.CI
    ? [['github'], ['html', { open: 'never' }]]
    : [['list']],
  timeout: 30_000,
  expect: {
    timeout: 7_500,
    toHaveScreenshot: {
      animations: 'disabled',
      maxDiffPixelRatio: 0.01,
    },
  },
  use: {
    baseURL,
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },
  projects: [
    {
      name: 'chromium',
      testIgnore: /visual\.spec\.ts/,
      use: {
        ...devices['Desktop Chrome'],
        channel:
          process.env.PLAYWRIGHT_USE_SYSTEM_CHROME === 'true'
            ? 'chrome'
            : undefined,
      },
    },
    {
      name: 'chromium-visual',
      testMatch: /visual\.spec\.ts/,
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'firefox-smoke',
      testMatch: /smoke\.spec\.ts/,
      use: { ...devices['Desktop Firefox'] },
    },
    {
      name: 'webkit-smoke',
      testMatch: /smoke\.spec\.ts/,
      use: { ...devices['Desktop Safari'] },
    },
  ],
  webServer: {
    command: process.env.CI
      ? 'npm run start -- --hostname 127.0.0.1 --port 3100'
      : 'npm run build && npm run start -- --hostname 127.0.0.1 --port 3100',
    url: baseURL,
    reuseExistingServer: !process.env.CI,
    timeout: 180_000,
    env: {
      ...databaseEnv,
      ALLOW_DEFAULT_CONTENT: 'true',
      E2E_GITHUB_FIXTURE: 'true',
      AUTH_SECRET: 'ci-e2e-auth-secret-not-used-in-production',
      RATE_LIMIT_HMAC_SECRET: 'ci-e2e-rate-limit-secret-not-used-in-production',
      CRON_SECRET: E2E_CRON_SECRET,
      ADMIN_PASSWORD_HASH: hashSync(E2E_ADMIN_PASSWORD, 4),
      SITE_URL: baseURL,
    },
  },
});
