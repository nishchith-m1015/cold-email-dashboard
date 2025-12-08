import { test as base } from '@playwright/test';
import fs from 'fs';
import path from 'path';

/**
 * Auth Fixture for Bypassing Clerk Authentication
 * 
 * In E2E tests, we don't want to go through the full Clerk login flow.
 * This fixture creates a mock auth state that allows tests to run as if logged in.
 * 
 * Strategy:
 * 1. Create a storage state file with mock session data
 * 2. Playwright loads this state before each test
 * 3. Tests run as authenticated user without login UI
 */

const authFile = path.join(__dirname, '.auth', 'user.json');

/**
 * Setup authentication state
 * 
 * For a real implementation with Clerk:
 * 1. Use Clerk test tokens (if available)
 * 2. Or perform login once and save storage state
 * 3. Reuse that state for all tests
 * 
 * For now, we create a minimal mock state.
 */
export async function setupAuth() {
  const authDir = path.dirname(authFile);
  
  // Ensure .auth directory exists
  if (!fs.existsSync(authDir)) {
    fs.mkdirSync(authDir, { recursive: true });
  }
  
  // Create mock auth state
  // This is a simplified version - in production, you'd either:
  // 1. Use Clerk's test mode tokens
  // 2. Perform a real login and save the state
  // 3. Use environment variables for test credentials
  const mockAuthState = {
    cookies: [
      {
        name: '__session',
        value: 'mock-session-token-for-testing',
        domain: 'localhost',
        path: '/',
        expires: -1,
        httpOnly: true,
        secure: false,
        sameSite: 'Lax',
      },
    ],
    origins: [
      {
        origin: 'http://localhost:3000',
        localStorage: [
          {
            name: '__clerk_db_jwt',
            value: JSON.stringify({
              token: 'mock-jwt-token',
              userId: 'test-user-id',
              sessionId: 'test-session-id',
            }),
          },
        ],
      },
    ],
  };
  
  // Write auth state to file
  fs.writeFileSync(authFile, JSON.stringify(mockAuthState, null, 2));
  
  console.log('✅ Auth state created at:', authFile);
  console.log('📝 Note: This is a MOCK auth state. For real testing, use Clerk test tokens.');
}

/**
 * Extended test with auth fixture
 * 
 * Usage in tests:
 * import { test, expect } from './fixtures/auth';
 * 
 * test('my test', async ({ page }) => {
 *   // page is already authenticated
 * });
 */
export const test = base.extend({
  // You can add custom fixtures here
  // For example, a fixture that provides mock data
});

export { expect } from '@playwright/test';

// Setup auth state when this module is imported
if (process.env.NODE_ENV !== 'test') {
  setupAuth();
}
