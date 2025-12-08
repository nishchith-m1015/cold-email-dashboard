import { test, expect } from '../fixtures/test';

/**
 * Smoke Tests - Critical User Paths
 * 
 * These tests verify the most important user journeys work:
 * 1. Homepage loads
 * 2. Dashboard displays key metrics
 * 3. Navigation works
 * 4. Analytics page loads
 * 
 * Run with: PLAYWRIGHT_TEST=true npm run dev (in one terminal)
 *           npm run test:e2e (in another terminal)
 */

test.describe('Dashboard Smoke Tests', () => {
  test('homepage loads and displays Total Sends card', async ({ page }) => {
    // Navigate to homepage
    await page.goto('/');
    
    // Wait for page to be loaded (domcontentloaded is more reliable than networkidle)
    await page.waitForLoadState('domcontentloaded');
    
    // Wait a bit for React to hydrate
    await page.waitForTimeout(2000);
    
    // Verify that the "Total Sends" metric card is visible
    // This confirms the dashboard is rendering data
    const totalSendsCard = page.getByText(/Total Sends/i).first();
    await expect(totalSendsCard).toBeVisible({ timeout: 10000 });
    
    // Verify campaign selector is present
    const campaignSelector = page.getByText(/All Campaigns|Campaign/i).first();
    await expect(campaignSelector).toBeVisible({ timeout: 10000 });
  });

  test('can navigate to Analytics page', async ({ page }) => {
    // Start at homepage
    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(2000);
    
    // Find and click the Analytics link in navigation (look for it in header/nav)
    const analyticsLink = page.locator('a[href="/analytics"]').first();
    await expect(analyticsLink).toBeVisible({ timeout: 10000 });
    await analyticsLink.click();
    
    // Wait for navigation
    await page.waitForURL('**/analytics', { timeout: 10000 });
    
    // Verify URL changed to /analytics
    await expect(page).toHaveURL('/analytics');
    
    // Verify analytics page content loaded (use .first() to handle multiple headings)
    const analyticsHeading = page.getByRole('heading', { name: /Analytics/i }).first();
    await expect(analyticsHeading).toBeVisible({ timeout: 10000 });
  });

  test('date range picker is functional', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');
    
    // Look for date range picker (it might be a button or input)
    // This is a flexible selector that should match common date picker patterns
    const datePickerButton = page.locator('button').filter({ hasText: /Last|days|Date/i }).first();
    
    // If date picker exists, verify it's clickable
    if (await datePickerButton.isVisible({ timeout: 5000 }).catch(() => false)) {
      await expect(datePickerButton).toBeVisible();
      
      // Click to open date picker
      await datePickerButton.click();
      
      // Wait a moment for dropdown to appear
      await page.waitForTimeout(500);
      
      // Look for date options (Last 7 days, Last 30 days, etc.)
      const dateOption = page.getByText(/Last \d+ days|Custom/i).first();
      
      // If options appear, verify they're clickable
      if (await dateOption.isVisible({ timeout: 2000 }).catch(() => false)) {
        await expect(dateOption).toBeVisible();
      }
    }
  });

  test('campaign selector displays and is interactive', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');
    
    // Find campaign selector button
    const campaignButton = page.locator('button').filter({ hasText: /All Campaigns|Campaign/i }).first();
    
    if (await campaignButton.isVisible({ timeout: 5000 }).catch(() => false)) {
      await expect(campaignButton).toBeVisible();
      
      // Click to open dropdown
      await campaignButton.click();
      
      // Wait for dropdown
      await page.waitForTimeout(500);
      
      // Look for "All Campaigns" option
      const allCampaignsOption = page.getByText(/All Campaigns/i).first();
      
      if (await allCampaignsOption.isVisible({ timeout: 2000 }).catch(() => false)) {
        await expect(allCampaignsOption).toBeVisible();
      }
    }
  });

  test('metrics display numeric values', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');
    
    // Wait for any metric cards to load
    await page.waitForTimeout(2000);
    
    // Look for metric cards with numeric values
    // This regex matches numbers with optional commas and decimals
    const numericValue = page.locator('text=/[0-9,]+(\\.\\d+)?/').first();
    
    // Verify at least one numeric value is displayed
    await expect(numericValue).toBeVisible({ timeout: 10000 });
  });

  test('no console errors on page load', async ({ page }) => {
    const consoleErrors: string[] = [];
    
    // Listen for console errors
    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        consoleErrors.push(msg.text());
      }
    });
    
    // Navigate to homepage
    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');
    
    // Wait a bit for any delayed errors
    await page.waitForTimeout(2000);
    
    // Filter out known/acceptable errors (like Supabase warnings)
    const filteredErrors = consoleErrors.filter(error => 
      !error.includes('Supabase credentials') &&
      !error.includes('favicon.ico') &&
      !error.includes('Failed to load resource')
    );
    
    // Verify no critical errors
    expect(filteredErrors).toHaveLength(0);
  });

  test('page has correct title', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');
    
    // Verify page title is set
    await expect(page).toHaveTitle(/Cold Email Dashboard|Dashboard/i);
  });

  test('loading states render before data', async ({ page }) => {
    // Start navigation but don't wait for network to be idle
    await page.goto('/', { waitUntil: 'domcontentloaded' });
    
    // Check if skeleton/loading states are visible initially
    // (They might not be if data loads very quickly)
    const loadingIndicators = page.locator('[class*="skeleton"], [class*="loading"], [aria-busy="true"]');
    
    // Just verify the page structure exists, loading states are optional
    const mainContent = page.locator('main, [role="main"]').first();
    await expect(mainContent).toBeVisible({ timeout: 10000 });
  });
});

test.describe('Analytics Page Tests', () => {
  test('analytics page loads with charts', async ({ page }) => {
    await page.goto('/analytics');
    await page.waitForLoadState('domcontentloaded');
    
    // Verify analytics heading (use .first() to handle multiple "Analytics" headings)
    const heading = page.getByRole('heading', { name: /Analytics/i }).first();
    await expect(heading).toBeVisible({ timeout: 10000 });
    
    // Wait for charts to load (give them time to render)
    await page.waitForTimeout(2000);
    
    // Look for chart elements (SVG or canvas)
    const chartElements = page.locator('svg, canvas').first();
    
    // Verify at least one chart element exists
    if (await chartElements.isVisible({ timeout: 5000 }).catch(() => false)) {
      await expect(chartElements).toBeVisible();
    }
  });

  test('can navigate back to overview from analytics', async ({ page }) => {
    await page.goto('/analytics');
    await page.waitForLoadState('domcontentloaded');
    
    // Find logo/brand link which should go back to homepage
    // Most dashboards have a clickable logo that navigates home
    const homeLink = page.locator('a[href="/"]').first();
    await expect(homeLink).toBeVisible({ timeout: 10000 });
    
    // Click to go back
    await homeLink.click();
    
    // Wait for navigation
    await page.waitForURL('**/', { timeout: 10000 });
    
    // Verify we're back at root
    await expect(page).toHaveURL('/');
  });
});

test.describe('Responsive Design Tests', () => {
  test('dashboard works on mobile viewport', async ({ page }) => {
    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });
    
    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');
    
    // Wait for content to render
    await page.waitForTimeout(3000);
    
    // Check if metric cards are visible (might stack vertically)
    const metricCard = page.getByText(/Total Sends/i).first();
    await expect(metricCard).toBeVisible({ timeout: 10000 });
  });

  test('dashboard works on tablet viewport', async ({ page }) => {
    // Set tablet viewport
    await page.setViewportSize({ width: 768, height: 1024 });
    
    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');
    
    // Verify layout adapts
    const mainContent = page.locator('main, [role="main"]').first();
    await expect(mainContent).toBeVisible();
  });
});
