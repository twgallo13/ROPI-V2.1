/**
 * E2E Test: Products List → Product Editor Navigation
 * 
 * Tests complete user flow:
 * - Sign in as admin
 * - Navigate to /products
 * - Verify products load
 * - Test search functionality
 * - Click product card
 * - Verify Product Editor loads
 * 
 * Homer Products List v1.0
 */

import { test, expect } from '@playwright/test';

test.describe('Products List Page', () => {
  test.beforeEach(async ({ page }) => {
    // Sign in as admin
    const adminEmail = process.env.VITE_E2E_ADMIN_EMAIL || 'admin@test.com';
    const adminPassword = process.env.VITE_E2E_ADMIN_PASSWORD || 'password123';

    await page.goto('/login');
    await page.fill('input[type="email"]', adminEmail);
    await page.fill('input[type="password"]', adminPassword);
    await page.click('button[type="submit"]');

    // Wait for auth to complete
    await page.waitForURL('/app/**');
  });

  test('should load products list page', async ({ page }) => {
    await page.goto('/products');

    // Wait for page to load
    await expect(page.locator('h1')).toContainText('Products');

    // Should show search bar
    await expect(page.locator('input[type="search"]')).toBeVisible();

    // Should show products grid
    await expect(page.locator('.products-grid')).toBeVisible();
  });

  test('should display product cards with correct information', async ({ page }) => {
    await page.goto('/products');

    // Wait for products to load
    await page.waitForSelector('.product-card', { timeout: 10000 });

    // Get first product card
    const firstCard = page.locator('.product-card').first();
    await expect(firstCard).toBeVisible();

    // Should have SKU
    await expect(firstCard.locator('.product-card-sku')).toBeVisible();

    // Should have name
    await expect(firstCard.locator('.product-card-name')).toBeVisible();

    // Should have status badge
    await expect(firstCard.locator('.status-badge')).toBeVisible();
  });

  test('should handle search functionality', async ({ page }) => {
    await page.goto('/products');

    // Wait for initial load
    await page.waitForSelector('.product-card', { timeout: 10000 });

    // Get first product's SKU
    const firstSku = await page.locator('.product-card-sku').first().textContent();

    if (firstSku) {
      // Enter search query
      await page.fill('input[type="search"]', firstSku.trim());
      await page.click('button[type="submit"]');

      // Wait for search results
      await page.waitForTimeout(1000); // Brief wait for debounce

      // Should show search indicator
      await expect(page.locator('.search-indicator')).toBeVisible();

      // Should show results
      const resultsCount = await page.locator('.product-card').count();
      expect(resultsCount).toBeGreaterThan(0);

      // First result should match search
      const resultSku = await page.locator('.product-card-sku').first().textContent();
      expect(resultSku).toContain(firstSku.trim());
    }
  });

  test('should clear search when clicking clear button', async ({ page }) => {
    await page.goto('/products');

    // Enter search query
    await page.fill('input[type="search"]', 'TEST');

    // Click clear button
    await page.click('.search-clear-btn');

    // Search input should be empty
    const searchInput = page.locator('input[type="search"]');
    await expect(searchInput).toHaveValue('');
  });

  test('should navigate to product editor when clicking product card', async ({ page }) => {
    await page.goto('/products');

    // Wait for products to load
    await page.waitForSelector('.product-card', { timeout: 10000 });

    // Click first product card
    const firstCard = page.locator('.product-card').first();
    await firstCard.click();

    // Should navigate to product editor
    await expect(page).toHaveURL(/\/app\/products\/[a-zA-Z0-9]+/);

    // Should show product editor (check for editor-specific element)
    // Adjust selector based on actual Product Editor implementation
    await expect(page.locator('h1, h2')).toBeVisible();

    // Should NOT show blank page
    const bodyText = await page.locator('body').textContent();
    expect(bodyText?.trim()).not.toBe('');
  });

  test('should handle pagination with "Load More" button', async ({ page }) => {
    await page.goto('/products');

    // Wait for initial load
    await page.waitForSelector('.product-card', { timeout: 10000 });

    // Count initial products
    const initialCount = await page.locator('.product-card').count();

    // Check if "Load More" button exists
    const loadMoreButton = page.locator('.load-more-btn');

    if (await loadMoreButton.isVisible()) {
      await loadMoreButton.click();

      // Wait for new products to load
      await page.waitForTimeout(1000);

      // Should have more products
      const newCount = await page.locator('.product-card').count();
      expect(newCount).toBeGreaterThan(initialCount);
    }
  });

  test('should show loading state while fetching', async ({ page }) => {
    await page.goto('/products');

    // Should show loading spinner initially
    const loadingSpinner = page.locator('.loading-spinner, .spinner');

    // Wait for either loading spinner or products to appear
    await Promise.race([
      loadingSpinner.waitFor({ state: 'visible', timeout: 2000 }).catch(() => {}),
      page.waitForSelector('.product-card', { timeout: 5000 }),
    ]);

    // Eventually products should load
    await expect(page.locator('.product-card').first()).toBeVisible({ timeout: 10000 });
  });

  test('should show empty state when no products exist', async ({ page }) => {
    // This test may need mocking or a test environment with no products
    await page.goto('/products?q=NONEXISTENT-QUERY-XYZ123');

    // Wait for search to complete
    await page.waitForTimeout(2000);

    // Should show empty state message
    const emptyState = page.locator('.empty-state, .no-products');

    if (await emptyState.isVisible()) {
      await expect(emptyState).toContainText(/no products/i);
    }
  });

  test('should be responsive on mobile viewport', async ({ page }) => {
    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });

    await page.goto('/products');

    // Wait for products to load
    await page.waitForSelector('.product-card', { timeout: 10000 });

    // Products grid should be single column on mobile
    const grid = page.locator('.products-grid');
    await expect(grid).toBeVisible();

    // Product cards should be visible and tappable
    const firstCard = page.locator('.product-card').first();
    await expect(firstCard).toBeVisible();

    // Tap target should be large enough (44px minimum)
    const box = await firstCard.boundingBox();
    expect(box?.height).toBeGreaterThanOrEqual(44);
  });

  test('should handle keyboard navigation', async ({ page }) => {
    await page.goto('/products');

    // Wait for products to load
    await page.waitForSelector('.product-card', { timeout: 10000 });

    // Tab to search input
    await page.keyboard.press('Tab');

    // Type in search input
    await page.keyboard.type('TEST');

    // Enter to submit search
    await page.keyboard.press('Enter');

    // Wait for search results
    await page.waitForTimeout(1000);

    // Should show search indicator
    await expect(page.locator('.search-indicator')).toBeVisible();
  });

  test('should handle errors gracefully', async ({ page }) => {
    // Intercept API call and return error
    await page.route('**/api/products*', (route) => {
      route.fulfill({
        status: 500,
        body: JSON.stringify({ error: 'Internal Server Error' }),
      });
    });

    await page.goto('/products');

    // Wait for error state
    await page.waitForTimeout(2000);

    // Should show error message
    const errorAlert = page.locator('.error-alert, .error-message');
    await expect(errorAlert).toBeVisible();

    // Should show retry button
    const retryButton = page.locator('button').filter({ hasText: /try again|retry/i });
    await expect(retryButton).toBeVisible();
  });

  test('should filter products by brand', async ({ page }) => {
    await page.goto('/products');

    // Wait for products to load
    await page.waitForSelector('.product-card', { timeout: 10000 });

    // Enter brand filter
    const brandInput = page.locator('input#brand-filter');
    await expect(brandInput).toBeVisible();
    await brandInput.fill('Nike');

    // Wait for debounce and results
    await page.waitForTimeout(500);

    // Verify API was called with brand filter
    await page.waitForResponse(response => 
      response.url().includes('/api/products') && 
      response.url().includes('brand=Nike')
    );

    // Results should load
    await expect(page.locator('.product-card')).toHaveCount(await page.locator('.product-card').count());
  });

  test('should filter by status', async ({ page }) => {
    await page.goto('/products');

    await page.waitForSelector('.product-card', { timeout: 10000 });

    // Select status filter
    const statusSelect = page.locator('select#status-filter');
    await expect(statusSelect).toBeVisible();
    await statusSelect.selectOption('active');

    // Wait for results
    await page.waitForResponse(response => 
      response.url().includes('/api/products') && 
      response.url().includes('status=active')
    );
  });

  test('should sort products by name', async ({ page }) => {
    await page.goto('/products');

    await page.waitForSelector('.product-card', { timeout: 10000 });

    // Change sort option
    const sortSelect = page.locator('select#sort-select');
    await expect(sortSelect).toBeVisible();
    await sortSelect.selectOption('name-asc');

    // Wait for sorted results
    await page.waitForResponse(response => 
      response.url().includes('/api/products') && 
      response.url().includes('sortBy=name') &&
      response.url().includes('sortDir=asc')
    );

    // Verify products are displayed
    await expect(page.locator('.product-card').first()).toBeVisible();
  });

  test('should clear all filters', async ({ page }) => {
    await page.goto('/products');

    await page.waitForSelector('.product-card', { timeout: 10000 });

    // Add multiple filters
    await page.locator('input#brand-filter').fill('Nike');
    await page.locator('select#status-filter').selectOption('active');
    
    // Wait for filters to apply
    await page.waitForTimeout(500);

    // Click clear filters button
    const clearButton = page.locator('button').filter({ hasText: /clear filters/i });
    await expect(clearButton).toBeVisible();
    await clearButton.click();

    // Filters should be cleared
    await expect(page.locator('input#brand-filter')).toHaveValue('');
    await expect(page.locator('select#status-filter')).toHaveValue('');
  });

  test('should combine search, filter, and sort', async ({ page }) => {
    await page.goto('/products');

    await page.waitForSelector('.product-card', { timeout: 10000 });

    // Add search term
    await page.fill('input[type="search"]', 'shoe');

    // Add filter
    await page.locator('select#status-filter').selectOption('active');

    // Change sort
    await page.locator('select#sort-select').selectOption('name-asc');

    // Wait for combined query
    await page.waitForTimeout(500);

    // Verify API was called with all parameters
    const response = await page.waitForResponse(response => 
      response.url().includes('/api/products') &&
      response.url().includes('q=shoe') &&
      response.url().includes('status=active') &&
      response.url().includes('sortBy=name')
    );

    expect(response.status()).toBe(200);
  });

  test('should load more products with filters applied', async ({ page }) => {
    await page.goto('/products');

    await page.waitForSelector('.product-card', { timeout: 10000 });

    // Add a filter
    await page.locator('select#status-filter').selectOption('active');
    await page.waitForTimeout(500);

    // Count initial products
    const initialCount = await page.locator('.product-card').count();

    // Click Load More if available
    const loadMoreButton = page.locator('button').filter({ hasText: /load more/i });
    if (await loadMoreButton.isVisible()) {
      await loadMoreButton.click();

      // Wait for new products to load
      await page.waitForTimeout(1000);

      // Should have more products (or same if no more available)
      const newCount = await page.locator('.product-card').count();
      expect(newCount).toBeGreaterThanOrEqual(initialCount);
    }
  });

  test('should show 50 items initially', async ({ page }) => {
    // Intercept API call to verify limit parameter
    let requestUrl = '';
    await page.route('**/api/products*', async (route) => {
      requestUrl = route.request().url();
      await route.continue();
    });

    await page.goto('/products');

    // Wait for API call
    await page.waitForResponse(response => response.url().includes('/api/products'));

    // Verify limit=50 in URL
    expect(requestUrl).toContain('limit=50');
  });

  test('should debounce search input', async ({ page }) => {
    let apiCallCount = 0;

    await page.route('**/api/products*', async (route) => {
      if (route.request().url().includes('q=')) {
        apiCallCount++;
      }
      await route.continue();
    });

    await page.goto('/products');
    await page.waitForSelector('.product-card', { timeout: 10000 });

    // Type rapidly in search
    await page.locator('input[type="search"]').fill('s');
    await page.locator('input[type="search"]').fill('sh');
    await page.locator('input[type="search"]').fill('sho');
    await page.locator('input[type="search"]').fill('shoe');

    // Wait for debounce (300ms + buffer)
    await page.waitForTimeout(500);

    // Should have called API only once after debounce
    expect(apiCallCount).toBeLessThanOrEqual(1);
  });
});
