import { test, expect } from '@playwright/test';

/**
 * Simple page load test to diagnose issues
 */

test('can load homepage', async ({ page }) => {
  // Navigate to homepage
  await page.goto('/', { waitUntil: 'domcontentloaded' });
  
  // Take screenshot to see what's rendered
  await page.screenshot({ path: 'test-results/homepage-load.png', fullPage: true });
  
  // Log the title
  const title = await page.title();
  console.log('Page title:', title);
  
  // Log the URL (to see if we got redirected)
  console.log('Current URL:', page.url());
  
  // Check if Clerk sign-in page appeared
  const isClerkSignIn = await page.locator('text=Sign in').isVisible().catch(() => false);
  console.log('Is Clerk sign-in visible?', isClerkSignIn);
  
  // Try to find any text on the page
  const bodyText = await page.locator('body').textContent();
  console.log('Body text (first 200 chars):', bodyText?.substring(0, 200));
});
