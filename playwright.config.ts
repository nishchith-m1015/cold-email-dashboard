import { defineConfig, devices } from '@playwright/test';

/**
 * Playwright Configuration for Cold Email Dashboard
 * 
 * This config sets up E2E testing with:
 * - Local dev server on port 3000
 * - Chromium browser (can add more browsers later)
 * - Screenshot/video on failure
 * - Test-specific storage state for auth
 */

export default defineConfig({
  // Test directory
  testDir: './e2e/tests',
  
  // Maximum time one test can run for
  timeout: 30 * 1000,
  
  // Run tests in files in parallel
  fullyParallel: true,
  
  // Fail the build on CI if you accidentally left test.only in the source code
  forbidOnly: !!process.env.CI,
  
  // Retry on CI only
  retries: process.env.CI ? 2 : 0,
  
  // Opt out of parallel tests on CI (can be flaky)
  workers: process.env.CI ? 1 : undefined,
  
  // Reporter to use
  reporter: [
    ['html'],
    ['list'], // Terminal output
  ],
  
  // Shared settings for all the projects below
  use: {
    // Base URL to use in actions like `await page.goto('/')`
    baseURL: process.env.BASE_URL || 'http://localhost:3000',
    
    // Collect trace when retrying the failed test
    trace: 'on-first-retry',
    
    // Screenshot on failure
    screenshot: 'only-on-failure',
    
    // Video on failure
    video: 'retain-on-failure',
  },

  // Configure projects for major browsers
  projects: [
    {
      name: 'chromium',
      use: { 
        ...devices['Desktop Chrome'],
        // Use auth state from fixtures (bypasses Clerk login)
        storageState: './e2e/fixtures/.auth/user.json',
      },
    },
    
    // Uncomment to test on other browsers
    // {
    //   name: 'firefox',
    //   use: { 
    //     ...devices['Desktop Firefox'],
    //     storageState: './e2e/fixtures/.auth/user.json',
    //   },
    // },
    // {
    //   name: 'webkit',
    //   use: { 
    //     ...devices['Desktop Safari'],
    //     storageState: './e2e/fixtures/.auth/user.json',
    //   },
    // },
  ],

  // Run your local dev server before starting the tests
  // Note: Comment out if running dev server manually (npm run dev)
  // webServer: {
  //   command: 'npm run dev',
  //   url: 'http://localhost:3000',
  //   reuseExistingServer: !process.env.CI,
  //   timeout: 120 * 1000, // 2 minutes to start dev server
  //   stdout: 'ignore',
  //   stderr: 'pipe',
  // },
});
