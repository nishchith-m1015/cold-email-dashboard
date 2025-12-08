import { Page } from '@playwright/test';

/**
 * Common Test Utilities for E2E Tests
 * 
 * Reusable functions to simplify test writing
 */

/**
 * Wait for dashboard to be fully loaded
 * Checks for common indicators that data has loaded
 */
export async function waitForDashboardLoad(page: Page) {
  // Wait for network to be idle
  await page.waitForLoadState('networkidle');
  
  // Wait for at least one metric card to be visible
  await page.waitForSelector('text=/Total|Sends|Replies/i', { timeout: 10000 });
  
  // Give charts time to render
  await page.waitForTimeout(1000);
}

/**
 * Check if element exists without throwing
 */
export async function elementExists(page: Page, selector: string): Promise<boolean> {
  try {
    const element = await page.locator(selector).first();
    return await element.isVisible({ timeout: 2000 });
  } catch {
    return false;
  }
}

/**
 * Click and wait for navigation
 */
export async function clickAndNavigate(page: Page, selector: string) {
  await page.locator(selector).click();
  await page.waitForLoadState('networkidle');
}

/**
 * Fill form field and wait
 */
export async function fillField(page: Page, label: string | RegExp, value: string) {
  const input = page.getByLabel(label);
  await input.fill(value);
  await page.waitForTimeout(300); // Debounce
}

/**
 * Take screenshot with standardized naming
 */
export async function takeScreenshot(page: Page, name: string) {
  await page.screenshot({ 
    path: `e2e/screenshots/${name}-${Date.now()}.png`,
    fullPage: true,
  });
}

/**
 * Mock API response for testing
 */
export async function mockApiRoute(
  page: Page, 
  route: string, 
  response: any,
  status: number = 200
) {
  await page.route(`**/api/${route}`, async (route) => {
    await route.fulfill({
      status,
      contentType: 'application/json',
      body: JSON.stringify(response),
    });
  });
}

/**
 * Clear all mock routes
 */
export async function clearMockRoutes(page: Page) {
  await page.unroute('**/*');
}
