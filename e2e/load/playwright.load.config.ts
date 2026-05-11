/**
 * Playwright config specifically for load tests.
 * Separate from the main playwright.config.ts so load tests don't
 * interfere with regular E2E tests.
 *
 * Usage:
 *   npx playwright test --config=e2e/load/playwright.load.config.ts
 *
 * Profile selection:
 *   LOAD_PROFILE=baseline  npx playwright test --config=... --workers=1
 *   LOAD_PROFILE=light     npx playwright test --config=... --workers=5
 *   LOAD_PROFILE=normal    npx playwright test --config=... --workers=20
 *   LOAD_PROFILE=peak      npx playwright test --config=... --workers=50
 *   LOAD_PROFILE=spike     npx playwright test --config=... --workers=80
 *
 * Or use the npm script: npm run load:test --profile=normal
 */

import { defineConfig, devices } from '@playwright/test';

const profile  = process.env.LOAD_PROFILE ?? 'light';
const workers  = parseInt(process.env.LOAD_WORKERS ?? '0') ||
  ({ baseline: 1, light: 5, normal: 20, peak: 50, spike: 80 }[profile as string] ?? 5);

export default defineConfig({
  testDir:       '.',   // relative to this config file (already in e2e/load/)
  testMatch:     '**/load.spec.ts',
  timeout:       180_000,   // 3 min per test — AI responses + think time can be slow
  expect:        { timeout: 60_000 },
  fullyParallel: true,
  retries:       0,         // no retries in load tests — failures are data points
  workers,
  reporter: [
    ['list'],
    ['html', { outputFolder: 'e2e/load/report', open: 'never' }],
    ['json', { outputFile: 'e2e/load/playwright-results.json' }],
  ],
  use: {
    baseURL:    process.env.LOAD_TEST_URL ?? 'https://ai-tutor-agent-ten.vercel.app',
    headless:   true,
    // Simulate real desktop browser — not an obvious bot
    userAgent:  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
    viewport:   { width: 1280, height: 900 },
    // Don't capture media for load tests — saves disk space
    video:      'off',
    screenshot: 'only-on-failure',
    trace:      'off',
    // Each worker gets an isolated browser context = isolated cookies/storage
    // This simulates unique users, each with their own anonymous session
  },
  projects: [
    {
      name: 'load-chromium',
      use:  { ...devices['Desktop Chrome'] },
    },
  ],
});
