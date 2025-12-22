import { defineConfig, devices } from '@playwright/test';

/**
 * Playwright E2E Test Configuration for ROPI AOSS
 * 
 * Supports running tests against:
 * - Local dev server (http://localhost:5173)
 * - Preview URLs (Firebase Hosting preview channels)
 * - Staging (https://ropi-aoss-staging.web.app)
 * - Production (https://ropi-aoss.web.app)
 * 
 * Configure target via BASE_URL environment variable
 */

// Reduced timeouts for faster CI feedback - smoke tests should be fast
export default defineConfig({
  testDir: './e2e',
  
  /* Maximum time one test can run for - reduced from 60s for faster failures */
  timeout: 30 * 1000,
  
  /* Run tests in files in parallel */
  fullyParallel: true,
  
  /* Fail the build on CI if you accidentally left test.only in the source code */
  forbidOnly: !!process.env.CI,
  
  /* Retry on CI only - reduced from 3 to 1 for faster feedback */
  retries: process.env.CI ? 1 : 0,
  
  /* Opt out of parallel tests on CI */
  workers: process.env.CI ? 1 : undefined,
  
  /* Reporter to use */
  reporter: [
    ['html', { outputFolder: 'playwright-report' }],
    ['list'],
    process.env.CI ? ['github'] : ['list']
  ],
  
  /* Shared settings for all the projects below */
  use: {
    /* Base URL for all tests - override with BASE_URL env var */
    baseURL: process.env.BASE_URL || 'http://localhost:5173',
    
    /* Reduced timeouts for faster CI feedback */
    navigationTimeout: 30 * 1000,
    actionTimeout: 15 * 1000,
    
    /* Collect trace when retrying the failed test */
    trace: 'on-first-retry',
    
    /* Screenshot on failure */
    screenshot: 'only-on-failure',
    
    /* Video on failure */
    video: 'retain-on-failure',
  },

  /* Configure projects for major browsers */
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
    
    // Uncomment to add Firefox and WebKit
    // {
    //   name: 'firefox',
    //   use: { ...devices['Desktop Firefox'] },
    // },
    // {
    //   name: 'webkit',
    //   use: { ...devices['Desktop Safari'] },
    // },
  ],

  /* Run your local dev server before starting the tests */
  // Disabled by default - in CI we test against preview URLs
  // webServer: {
  //   command: 'pnpm dev',
  //   url: 'http://localhost:5173',
  //   reuseExistingServer: !process.env.CI,
  // },
});
