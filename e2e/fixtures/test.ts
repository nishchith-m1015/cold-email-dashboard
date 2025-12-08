import { test as base } from '@playwright/test';

/**
 * E2E Test Fixture with Mock Clerk Auth
 * 
 * This extends the base Playwright test to inject mock Clerk authentication
 * so that client-side <SignedIn> components work properly.
 */

export const test = base.extend({
  page: async ({ page }, use) => {
    // Inject mock Clerk auth before each test
    await page.addInitScript(() => {
      // Mock the Clerk session
      (window as any).__clerk_session = {
        user: {
          id: 'test_user_123',
          emailAddresses: [{
            emailAddress: 'test@example.com',
          }],
          firstName: 'Test',
          lastName: 'User',
        },
        status: 'active',
      };
      
      // Mock localStorage Clerk data
      localStorage.setItem('__clerk_client_jwt', 'mock_jwt_token_for_e2e_testing');
    });
    
    // Use the page with mocked auth
    await use(page);
  },
});

export { expect } from '@playwright/test';
