import { defineConfig, devices } from '@playwright/test';

/**
 * Playwright Configuration for Smoke Tests
 * Optimized for staging environment pre-deployment validation
 */
export default defineConfig({
  testDir: './e2e/smoke-tests',
  
  testMatch: '**/*.smoke.spec.ts',
  
  timeout: 30000,
  
  fullyParallel: false,
  
  forbidOnly: !!process.env.CI,
  
  retries: process.env.CI ? 2 : 1,
  
  workers: 1,
  
  reporter: [
    ['list'],
    ['html', { outputFolder: 'smoke-test-results' }],
    ['json', { outputFile: 'smoke-test-results.json' }],
  ],
  
  use: {
    baseURL: process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:5173',
    
    trace: 'on-first-retry',
    
    screenshot: 'only-on-failure',
    
    video: 'retain-on-failure',
    
    actionTimeout: 10000,
    
    navigationTimeout: 15000,
  },
  
  projects: [
    {
      name: 'chromium-smoke',
      use: { 
        ...devices['Desktop Chrome'],
        viewport: { width: 1280, height: 720 },
      },
    },
  ],
  
  webServer: process.env.CI ? undefined : {
    command: 'npm run dev',
    url: 'http://localhost:5173',
    reuseExistingServer: true,
    timeout: 120000,
  },
});
