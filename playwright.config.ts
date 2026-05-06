import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',
  timeout: 30_000,
  expect: { timeout: 10_000 },
  fullyParallel: false,
  retries: 1,
  reporter: [['list'], ['html', { outputFolder: 'e2e-report', open: 'never' }]],
  use: {
    baseURL: 'http://localhost:5173',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    headless: true,
  },
  projects: [
    {
      name: 'chromium',
      use: {
        ...devices['Desktop Chrome'],
        // No executablePath — let Playwright auto-detect the installed browser
      },
    },
  ],
  webServer: [
    {
      command: 'echo "backend already running"',
      url: 'http://localhost:4000/api/health',
      reuseExistingServer: true,
    },
    {
      command: 'echo "frontend already running"',
      url: 'http://localhost:5173',
      reuseExistingServer: true,
    },
  ],
});
