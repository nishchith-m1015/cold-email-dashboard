import { test, expect } from '@playwright/test';

/**
 * Setup Verification Test
 * 
 * This test verifies that Playwright is installed and configured correctly.
 * It doesn't require the dev server to be running.
 */

test.describe('Playwright Setup', () => {
  test('playwright can navigate to external URL', async ({ page }) => {
    // Navigate to a known external page
    await page.goto('https://playwright.dev/');
    
    // Verify page loaded
    await expect(page).toHaveTitle(/Playwright/);
  });
  
  test('can create and interact with elements', async ({ page }) => {
    // Set simple HTML content
    await page.setContent(`
      <html>
        <body>
          <h1>Test Page</h1>
          <button id="testBtn">Click Me</button>
          <div id="result"></div>
          <script>
            document.getElementById('testBtn').addEventListener('click', () => {
              document.getElementById('result').textContent = 'Button Clicked!';
            });
          </script>
        </body>
      </html>
    `);
    
    // Find heading
    const heading = page.getByRole('heading', { name: 'Test Page' });
    await expect(heading).toBeVisible();
    
    // Click button
    const button = page.getByRole('button', { name: 'Click Me' });
    await button.click();
    
    // Verify result
    const result = page.locator('#result');
    await expect(result).toHaveText('Button Clicked!');
  });
});
