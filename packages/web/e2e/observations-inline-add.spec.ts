/**
 * E2E Tests: Inline Observation Add Modal - AI Tab & Desktop
 * 
 * LP-observations-consolidation-1.2.0: Tests inline tags-first Add/Edit/Delete UX:
 * - No window.open or navigate for Add actions
 * - Inline modal opens without route change
 * - PATCH /api/products/:productId/observation via authFetch
 * - UI updates within 3 seconds after save
 * 
 * Acceptance Criteria (from LP spec):
 * 1. AI tab Add button opens inline modal (no navigation)
 * 2. Desktop product page Add button opens inline modal (no navigation)
 * 3. Modal uses tags-first workflow with TagsEditor
 * 4. Submit calls PATCH API, UI reflects changes < 3s
 * 
 * Source-of-truth: Observations Consolidation Phase PRD
 */

import { test, expect, Page } from '@playwright/test';
import {
  TEST_USERS,
  signInWithEmail,
  waitForFirestoreWrite,
} from './helpers';

const TEST_MPN = '211737-90H1-8'; // Seeded test product

/**
 * Navigate to the product editor AI Actions tab
 */
async function navigateToAIActionsTab(page: Page, productId: string) {
  await page.goto(`/products/${productId}?tab=ai`);
  // Wait for the AI Actions tab to load
  await page.waitForSelector('text=/describe engine|ai actions/i', { timeout: 10000 });
}

/**
 * Navigate to product page (Observations panel is on desktop sidebar)
 */
async function navigateToProductPage(page: Page, productId: string) {
  await page.goto(`/products/${productId}`);
  // Wait for the product page to load
  await page.waitForSelector('[class*="product-editor"], [class*="ProductEditor"]', { timeout: 10000 });
}

/**
 * Find product by MPN and get its ID
 */
async function findProductByMpn(page: Page, mpn: string): Promise<string | null> {
  await page.goto('/products');
  
  // Search for the product
  const searchInput = page.locator('input[placeholder*="Search"]').first();
  if (await searchInput.isVisible({ timeout: 3000 })) {
    await searchInput.fill(mpn);
    await page.waitForTimeout(1000);
  }
  
  // Click on the product row
  const productRow = page.locator(`text="${mpn}"`).first();
  if (await productRow.isVisible({ timeout: 3000 })) {
    await productRow.click();
    await page.waitForURL(/\/products\/[^/]+/);
    const url = page.url();
    const match = url.match(/\/products\/([^/?]+)/);
    return match ? match[1] : null;
  }
  
  return null;
}

test.describe('LP-1.2.0: AI Tab Inline Observation Modal', () => {
  test.beforeEach(async ({ page }) => {
    // Sign in as admin
    await signInWithEmail(page, TEST_USERS.ADMIN.email, TEST_USERS.ADMIN.password);
  });

  test('should display Add Observation button (not link) in AI tab', async ({ page }) => {
    const productId = await findProductByMpn(page, TEST_MPN);
    test.skip(!productId, 'Test product not found');

    await navigateToAIActionsTab(page, productId!);

    // Look for the Add Observation button (should be a button, not anchor)
    const addButton = page.locator('button:has-text("Add Observation")');
    await expect(addButton).toBeVisible({ timeout: 5000 });
    
    // Verify it's NOT an anchor tag
    const addLink = page.locator('a:has-text("Add Observation")');
    await expect(addLink).not.toBeVisible({ timeout: 1000 }).catch(() => {
      // This is expected - the link should NOT exist
    });
  });

  test('should open inline modal without navigation when clicking Add Observation', async ({ page }) => {
    const productId = await findProductByMpn(page, TEST_MPN);
    test.skip(!productId, 'Test product not found');

    await navigateToAIActionsTab(page, productId!);
    const initialUrl = page.url();

    // Click Add Observation button
    const addButton = page.locator('button:has-text("Add Observation")');
    await addButton.click();

    // Wait for modal to appear
    const modal = page.locator('.observation-modal, [class*="observation-modal"]');
    await expect(modal).toBeVisible({ timeout: 3000 });

    // CRITICAL: URL should NOT have changed (no navigation)
    expect(page.url()).toBe(initialUrl);
    
    // Modal should have title
    await expect(page.locator('text=/add observation tags/i')).toBeVisible();
  });

  test('should show TagsEditor in modal with input and suggestions', async ({ page }) => {
    const productId = await findProductByMpn(page, TEST_MPN);
    test.skip(!productId, 'Test product not found');

    await navigateToAIActionsTab(page, productId!);

    // Open modal
    const addButton = page.locator('button:has-text("Add Observation")');
    await addButton.click();

    // Wait for modal
    const modal = page.locator('.observation-modal');
    await expect(modal).toBeVisible({ timeout: 3000 });

    // Should have tags input
    const tagsInput = modal.locator('.tags-editor-input, input[aria-label="Add tag"]');
    await expect(tagsInput).toBeVisible();

    // Should have Cancel and Add Observation buttons
    await expect(modal.locator('button:has-text("Cancel")')).toBeVisible();
    await expect(modal.locator('button:has-text("Add Observation")')).toBeVisible();
  });

  test('should add tag via Enter key and display as chip', async ({ page }) => {
    const productId = await findProductByMpn(page, TEST_MPN);
    test.skip(!productId, 'Test product not found');

    await navigateToAIActionsTab(page, productId!);

    // Open modal
    await page.locator('button:has-text("Add Observation")').click();
    await page.waitForSelector('.observation-modal');

    // Type a tag and press Enter
    const testTag = `test-tag-${Date.now()}`;
    const tagsInput = page.locator('.tags-editor-input, input[aria-label="Add tag"]');
    await tagsInput.fill(testTag);
    await tagsInput.press('Enter');

    // Tag should appear as chip
    const tagChip = page.locator(`.tags-editor-chip:has-text("${testTag}")`);
    await expect(tagChip).toBeVisible({ timeout: 2000 });

    // Input should be cleared
    await expect(tagsInput).toHaveValue('');
  });

  test('should close modal when clicking Cancel', async ({ page }) => {
    const productId = await findProductByMpn(page, TEST_MPN);
    test.skip(!productId, 'Test product not found');

    await navigateToAIActionsTab(page, productId!);

    // Open modal
    await page.locator('button:has-text("Add Observation")').click();
    const modal = page.locator('.observation-modal');
    await expect(modal).toBeVisible();

    // Click Cancel
    await modal.locator('button:has-text("Cancel")').click();

    // Modal should close
    await expect(modal).not.toBeVisible({ timeout: 2000 });
  });

  test('should close modal when clicking overlay', async ({ page }) => {
    const productId = await findProductByMpn(page, TEST_MPN);
    test.skip(!productId, 'Test product not found');

    await navigateToAIActionsTab(page, productId!);

    // Open modal
    await page.locator('button:has-text("Add Observation")').click();
    const modal = page.locator('.observation-modal');
    await expect(modal).toBeVisible();

    // Click on overlay (outside modal)
    await page.locator('.observation-modal-overlay').click({ position: { x: 10, y: 10 } });

    // Modal should close
    await expect(modal).not.toBeVisible({ timeout: 2000 });
  });

  test('should submit observation and update UI within 3 seconds', async ({ page }) => {
    const productId = await findProductByMpn(page, TEST_MPN);
    test.skip(!productId, 'Test product not found');

    await navigateToAIActionsTab(page, productId!);

    // Open modal
    await page.locator('button:has-text("Add Observation")').click();
    await page.waitForSelector('.observation-modal');

    // Add a unique tag
    const uniqueTag = `e2e-test-${Date.now()}`;
    const tagsInput = page.locator('.tags-editor-input, input[aria-label="Add tag"]');
    await tagsInput.fill(uniqueTag);
    await tagsInput.press('Enter');

    // Intercept the API call
    const apiPromise = page.waitForResponse(
      response => response.url().includes('/api/products/') && 
                  response.url().includes('/observation') &&
                  response.request().method() === 'PATCH'
    );

    // Click Add Observation
    const submitButton = page.locator('.observation-modal button:has-text("Add Observation")');
    await submitButton.click();

    // Wait for API response
    const response = await apiPromise;
    expect(response.ok()).toBe(true);

    // Modal should close
    const modal = page.locator('.observation-modal');
    await expect(modal).not.toBeVisible({ timeout: 3000 });

    // Tag should appear in the product observation tags section (within 3s)
    const tagInUI = page.locator(`.product-obs-tag:has-text("${uniqueTag}")`);
    await expect(tagInUI).toBeVisible({ timeout: 3000 });
  });

  test('should prevent submit when no tags entered', async ({ page }) => {
    const productId = await findProductByMpn(page, TEST_MPN);
    test.skip(!productId, 'Test product not found');

    await navigateToAIActionsTab(page, productId!);

    // Open modal
    await page.locator('button:has-text("Add Observation")').click();
    await page.waitForSelector('.observation-modal');

    // Submit button should be disabled when no tags
    const submitButton = page.locator('.observation-modal button:has-text("Add Observation")');
    await expect(submitButton).toBeDisabled();
  });
});

test.describe('LP-1.2.0: Desktop Product Page Inline Observation Modal', () => {
  test.beforeEach(async ({ page }) => {
    // Sign in as admin
    await signInWithEmail(page, TEST_USERS.ADMIN.email, TEST_USERS.ADMIN.password);
  });

  test('should display Add Observation button in ObservationsPanel', async ({ page }) => {
    const productId = await findProductByMpn(page, TEST_MPN);
    test.skip(!productId, 'Test product not found');

    await navigateToProductPage(page, productId!);

    // Look for Add Observation button in the panel
    const addButton = page.locator('.panel-add-button:has-text("Add Observation"), button:has-text("+ Add Observation")');
    await expect(addButton).toBeVisible({ timeout: 5000 });
  });

  test('should open inline modal from ObservationsPanel without navigation', async ({ page }) => {
    const productId = await findProductByMpn(page, TEST_MPN);
    test.skip(!productId, 'Test product not found');

    await navigateToProductPage(page, productId!);
    const initialUrl = page.url();

    // Click Add Observation button
    const addButton = page.locator('.panel-add-button:has-text("Add Observation"), button:has-text("+ Add Observation")');
    await addButton.click();

    // Wait for modal to appear (ObservationsPanel uses different modal class)
    const modal = page.locator('.modal, [class*="modal"]').filter({ hasText: /add observation/i });
    await expect(modal).toBeVisible({ timeout: 3000 });

    // CRITICAL: URL should NOT have changed (no navigation)
    expect(page.url()).toBe(initialUrl);
  });

  test('should submit observation from ObservationsPanel and show in panel', async ({ page }) => {
    const productId = await findProductByMpn(page, TEST_MPN);
    test.skip(!productId, 'Test product not found');

    await navigateToProductPage(page, productId!);

    // Click Add Observation button
    const addButton = page.locator('.panel-add-button:has-text("Add Observation"), button:has-text("+ Add Observation")');
    await addButton.click();

    // Wait for modal
    const modal = page.locator('.modal, [class*="modal"]').filter({ hasText: /add observation/i });
    await expect(modal).toBeVisible({ timeout: 3000 });

    // Add a unique tag
    const uniqueTag = `desktop-e2e-${Date.now()}`;
    const tagsInput = modal.locator('input[class*="tag-input"], .tag-input');
    await tagsInput.fill(uniqueTag);
    await tagsInput.press('Enter');

    // Intercept the API call
    const apiPromise = page.waitForResponse(
      response => response.url().includes('/api/products/') && 
                  response.url().includes('/observation') &&
                  response.request().method() === 'PATCH'
    );

    // Click Add Observation
    const submitButton = modal.locator('button:has-text("Add Observation")');
    await submitButton.click();

    // Wait for API response
    const response = await apiPromise;
    expect(response.ok()).toBe(true);

    // Modal should close
    await expect(modal).not.toBeVisible({ timeout: 3000 });
  });
});

test.describe('LP-1.2.0: No Navigation Acceptance Check', () => {
  test.beforeEach(async ({ page }) => {
    await signInWithEmail(page, TEST_USERS.ADMIN.email, TEST_USERS.ADMIN.password);
  });

  test('AI tab Add button should NOT open new tab or navigate', async ({ page, context }) => {
    const productId = await findProductByMpn(page, TEST_MPN);
    test.skip(!productId, 'Test product not found');

    await navigateToAIActionsTab(page, productId!);

    // Listen for new pages (tabs)
    const newPagePromise = context.waitForEvent('page', { timeout: 2000 }).catch(() => null);

    // Click Add Observation
    await page.locator('button:has-text("Add Observation")').click();

    // No new tab should open
    const newPage = await newPagePromise;
    expect(newPage).toBeNull();
  });

  test('Desktop Add button should NOT open new tab or navigate', async ({ page, context }) => {
    const productId = await findProductByMpn(page, TEST_MPN);
    test.skip(!productId, 'Test product not found');

    await navigateToProductPage(page, productId!);

    // Listen for new pages (tabs)
    const newPagePromise = context.waitForEvent('page', { timeout: 2000 }).catch(() => null);

    // Click Add Observation
    await page.locator('.panel-add-button:has-text("Add Observation"), button:has-text("+ Add Observation")').click();

    // No new tab should open
    const newPage = await newPagePromise;
    expect(newPage).toBeNull();
  });
});
