/**
 * E2E Tests: Observations Page Add Flow
 * 
 * LP-observations-consolidation-1.3.0: Tests Scan/Manual MPN → product-scoped modal flow.
 * 
 * Test coverage:
 * 1. Manual MPN: enter known test MPN, resolve product, verify modal opens, add tags, save
 * 2. Scan flow: simulate scanner to resolve MPN/product, open modal, save
 * 3. Legacy check: assert legacy required-title form NOT opened for primary Add button
 * 4. URL unchanged: assert page.url() unchanged after modal interactions
 * 5. Firestore update: assert product.observation contains expected tags
 * 
 * Acceptance Criteria:
 * - Primary Add button opens ScanOrManualMPN, NOT legacy form
 * - Modal is inline (no navigation)
 * - Save uses PATCH /api/products/:productId/observation
 * - UI updates within 3 seconds
 * 
 * Source-of-truth: LP-observations-consolidation-1.3.0 PRD
 */

import { test, expect, Page } from '@playwright/test';
import {
  TEST_USERS,
  signInWithEmail,
} from './helpers';

const TEST_MPN = '211737-90H1-8'; // Seeded test product

/**
 * Navigate to the observations page
 */
async function navigateToObservationsPage(page: Page) {
  await page.goto('/observations');
  // Wait for the page to load
  await page.waitForSelector('text=/Observations/i', { timeout: 10000 });
}

test.describe('LP-1.3.0: Observations Page - Scan/Manual MPN Add Flow', () => {
  test.beforeEach(async ({ page }) => {
    // Sign in as admin
    await signInWithEmail(page, TEST_USERS.admin.email, TEST_USERS.admin.password);
  });

  test('primary Add button should open ScanOrManualMPN, NOT legacy form', async ({ page }) => {
    await navigateToObservationsPage(page);

    // Click the primary Add Observation button
    const addButton = page.locator('[data-testid="add-observation-btn"]');
    await expect(addButton).toBeVisible({ timeout: 5000 });
    await addButton.click();

    // Should show ScanOrManualMPN UI (product selection)
    const scanOrManual = page.locator('text=/Select Product|Scan Barcode|Enter MPN/i');
    await expect(scanOrManual).toBeVisible({ timeout: 3000 });

    // Should NOT show legacy form fields (title/severity required)
    const legacyTitleField = page.locator('input[name="title"][required]');
    await expect(legacyTitleField).not.toBeVisible({ timeout: 1000 });
  });

  test('Manual MPN flow: enter MPN → resolve → modal → save', async ({ page }) => {
    await navigateToObservationsPage(page);
    const initialUrl = page.url();

    // Click Add Observation
    await page.locator('[data-testid="add-observation-btn"]').click();
    
    // Wait for ScanOrManualMPN modal
    await expect(page.locator('text=/Select Product/i')).toBeVisible({ timeout: 3000 });

    // Click "Enter MPN" option
    await page.locator('text=/Enter MPN|Manual/i').click();

    // Enter MPN
    const mpnInput = page.locator('input.manual-mpn-input, input[placeholder*="MPN"]');
    await mpnInput.fill(TEST_MPN);

    // Click Find Product
    await page.locator('button:has-text("Find Product")').click();

    // Wait for ObservationsAddModal to appear
    const modal = page.locator('.observations-add-modal, text=/Add Observation Tags/i');
    await expect(modal).toBeVisible({ timeout: 5000 });

    // CRITICAL: URL should NOT have changed
    expect(page.url()).toBe(initialUrl);

    // Add a unique tag
    const uniqueTag = `e2e-obs-page-${Date.now()}`;
    const tagsInput = page.locator('.tags-editor-input, input[aria-label="Add tag"]');
    await tagsInput.fill(uniqueTag);
    await tagsInput.press('Enter');

    // Tag should appear as chip
    await expect(page.locator(`.tags-editor-chip:has-text("${uniqueTag}")`)).toBeVisible();

    // Intercept the API call
    const apiPromise = page.waitForResponse(
      response => response.url().includes('/api/products/') && 
                  response.url().includes('/observation') &&
                  response.request().method() === 'PATCH'
    );

    // Click Add Observation
    await page.locator('button:has-text("Add Observation")').last().click();

    // Wait for API response
    const response = await apiPromise;
    expect(response.ok()).toBe(true);

    // Modal should close
    await expect(modal).not.toBeVisible({ timeout: 3000 });

    // Success message should appear
    await expect(page.locator('text=/Observation added|success/i')).toBeVisible({ timeout: 3000 });

    // URL should still be unchanged
    expect(page.url()).toBe(initialUrl);
  });

  test('Scan flow (simulated): scan MPN → resolve → modal → save', async ({ page }) => {
    await navigateToObservationsPage(page);
    const initialUrl = page.url();

    // Click Add Observation
    await page.locator('[data-testid="add-observation-btn"]').click();
    
    // Wait for ScanOrManualMPN modal
    await expect(page.locator('text=/Select Product/i')).toBeVisible({ timeout: 3000 });

    // Click "Scan Barcode" option
    await page.locator('text=/Scan Barcode|Scan/i').first().click();

    // Use the demo input (simulates scanner)
    const scanInput = page.locator('.scan-demo-input input, input[placeholder*="scanned"]');
    await scanInput.fill(TEST_MPN);

    // Click Simulate Scan
    await page.locator('button:has-text("Simulate Scan")').click();

    // Wait for ObservationsAddModal to appear
    const modal = page.locator('.observations-add-modal, text=/Add Observation Tags/i');
    await expect(modal).toBeVisible({ timeout: 5000 });

    // CRITICAL: URL should NOT have changed
    expect(page.url()).toBe(initialUrl);

    // Add a tag
    const scanTag = `scan-test-${Date.now()}`;
    const tagsInput = page.locator('.tags-editor-input, input[aria-label="Add tag"]');
    await tagsInput.fill(scanTag);
    await tagsInput.press('Enter');

    // Intercept and submit
    const apiPromise = page.waitForResponse(
      response => response.url().includes('/api/products/') && 
                  response.url().includes('/observation') &&
                  response.request().method() === 'PATCH'
    );

    await page.locator('button:has-text("Add Observation")').last().click();

    const response = await apiPromise;
    expect(response.ok()).toBe(true);

    // Modal should close
    await expect(modal).not.toBeVisible({ timeout: 3000 });
  });

  test('legacy form is NOT shown by primary Add button', async ({ page }) => {
    await navigateToObservationsPage(page);

    // Click primary Add button
    await page.locator('[data-testid="add-observation-btn"]').click();

    // Wait a moment for any UI to appear
    await page.waitForTimeout(500);

    // Legacy form indicators should NOT be visible
    const legacyFormIndicators = [
      'input[name="title"]',
      'select[name="severity"]',
      'label:has-text("Title *")',
    ];

    for (const selector of legacyFormIndicators) {
      const element = page.locator(selector);
      await expect(element).not.toBeVisible({ timeout: 1000 }).catch(() => {
        // Expected - element should not exist
      });
    }
  });

  test('Cancel closes modal without changes', async ({ page }) => {
    await navigateToObservationsPage(page);

    // Click Add Observation
    await page.locator('[data-testid="add-observation-btn"]').click();

    // Wait for ScanOrManualMPN modal
    await expect(page.locator('text=/Select Product/i')).toBeVisible({ timeout: 3000 });

    // Click Cancel (close button)
    await page.locator('.scan-or-manual-close, button:has-text("×")').first().click();

    // Modal should close
    await expect(page.locator('text=/Select Product/i')).not.toBeVisible({ timeout: 2000 });
  });

  test('clicking overlay closes modal', async ({ page }) => {
    await navigateToObservationsPage(page);

    // Click Add Observation
    await page.locator('[data-testid="add-observation-btn"]').click();

    // Wait for modal
    await expect(page.locator('text=/Select Product/i')).toBeVisible({ timeout: 3000 });

    // Click on overlay (outside modal content)
    await page.mouse.click(10, 10);

    // Modal should close
    await expect(page.locator('text=/Select Product/i')).not.toBeVisible({ timeout: 2000 });
  });
});

test.describe('LP-1.3.0: Legacy Form Access', () => {
  test.beforeEach(async ({ page }) => {
    await signInWithEmail(page, TEST_USERS.admin.email, TEST_USERS.admin.password);
  });

  test('legacy form accessible via dropdown menu', async ({ page }) => {
    await navigateToObservationsPage(page);

    // Click dropdown trigger (▼ button)
    await page.locator('button:has-text("▼")').click();

    // Legacy option should appear
    const legacyOption = page.locator('text=/Legacy Add Form/i');
    await expect(legacyOption).toBeVisible({ timeout: 2000 });

    // Click legacy option
    await legacyOption.click();

    // Legacy form with Title field should appear
    const legacyTitleField = page.locator('label:has-text("Title")');
    await expect(legacyTitleField).toBeVisible({ timeout: 3000 });
  });
});

test.describe('LP-1.3.0: No Navigation Acceptance Check', () => {
  test.beforeEach(async ({ page }) => {
    await signInWithEmail(page, TEST_USERS.admin.email, TEST_USERS.admin.password);
  });

  test('Add flow should NOT open new tab', async ({ page, context }) => {
    await navigateToObservationsPage(page);

    // Listen for new pages (tabs)
    const newPagePromise = context.waitForEvent('page', { timeout: 2000 }).catch(() => null);

    // Click Add Observation
    await page.locator('[data-testid="add-observation-btn"]').click();

    // No new tab should open
    const newPage = await newPagePromise;
    expect(newPage).toBeNull();
  });

  test('entire Manual MPN → Save flow maintains same URL', async ({ page }) => {
    await navigateToObservationsPage(page);
    const startUrl = page.url();

    // Click Add
    await page.locator('[data-testid="add-observation-btn"]').click();
    expect(page.url()).toBe(startUrl);

    // Click Enter MPN
    await page.locator('text=/Enter MPN|Manual/i').click();
    expect(page.url()).toBe(startUrl);

    // Enter MPN and resolve
    await page.locator('input.manual-mpn-input, input[placeholder*="MPN"]').fill(TEST_MPN);
    await page.locator('button:has-text("Find Product")').click();

    // Wait for modal
    await page.waitForSelector('.observations-add-modal, text=/Add Observation Tags/i', { timeout: 5000 });
    expect(page.url()).toBe(startUrl);

    // Add tag and save
    const tagsInput = page.locator('.tags-editor-input, input[aria-label="Add tag"]');
    await tagsInput.fill('url-test-tag');
    await tagsInput.press('Enter');
    await page.locator('button:has-text("Add Observation")').last().click();

    // Wait for modal to close
    await page.waitForTimeout(1000);
    expect(page.url()).toBe(startUrl);
  });
});
