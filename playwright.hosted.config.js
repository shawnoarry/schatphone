import { defineConfig, devices } from '@playwright/test'

const baseURL = process.env.PLAYWRIGHT_BASE_URL || 'http://127.0.0.1:5183/schatphone/'
const target = new URL(baseURL)
const isLocal = target.hostname === '127.0.0.1' || target.hostname === 'localhost'
const chromiumExecutablePath = process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH || undefined

export default defineConfig({
  testDir: './e2e',
  testMatch: 'hosted-product-proof.spec.js',
  timeout: 120_000,
  expect: { timeout: 20_000 },
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  workers: 1,
  reporter: process.env.CI ? [['list'], ['html', { open: 'never' }]] : [['list']],
  use: {
    baseURL,
    serviceWorkers: 'allow',
    screenshot: 'only-on-failure',
    trace: 'retain-on-failure',
  },
  webServer: isLocal
    ? {
        command: `npm run preview -- --host ${target.hostname} --port ${target.port || '5183'} --strictPort`,
        url: baseURL,
        reuseExistingServer: !process.env.CI,
        timeout: 120_000,
      }
    : undefined,
  projects: [
    {
      name: 'hosted-chromium',
      use: {
        ...devices['Desktop Chrome'],
        launchOptions: { executablePath: chromiumExecutablePath },
      },
    },
    {
      name: 'hosted-mobile-chrome',
      use: {
        ...devices['Pixel 5'],
        launchOptions: { executablePath: chromiumExecutablePath },
      },
    },
  ],
})
