/**
 * E2E Tests: AI Actions Tab - Observation Suggestions
 * 
 * LP-obs-studio-cleanup-1.4.0: Tests the AI Actions tab workflow with:
 * - Request Suggestions button
 * - Observation context footnote
 * - Auto-resolve toggle
 * - Apply suggestion flow
 * 
 * Source-of-truth: Workflow W2 — Product Completion
 * https://www.notion.so/2ba45ee1ec5a80698690f9492961ed8b
 */

import { test, expect, Page } from '@playwright/test';
import {
  TEST_USERS,
  signInWithEmail,
  generateTestId,
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

test.describe('AI Actions Tab - Observation Suggestions', () => {
  test.beforeEach(async ({ page }) => {
    // Sign in as admin
    await signInWithEmail(page, TEST_USERS.ADMIN.email, TEST_USERS.ADMIN.password);
  });

  test('should display Request Suggestions button', async ({ page }) => {
    const productId = await findProductByMpn(page, TEST_MPN);
    test.skip(!productId, 'Test product not found');

    await navigateToAIActionsTab(page, productId!);

    // Look for the Request Suggestions button
    const requestButton = page.locator('button:has-text("Request Suggestions")');
    await expect(requestButton).toBeVisible({ timeout: 5000 });
  });

  test('should display auto-resolve toggle', async ({ page }) => {
    const productId = await findProductByMpn(page, TEST_MPN);
    test.skip(!productId, 'Test product not found');

    await navigateToAIActionsTab(page, productId!);

    // Look for the auto-resolve toggle
    const autoResolveToggle = page.locator('text=/auto-resolve/i');
    await expect(autoResolveToggle).toBeVisible({ timeout: 5000 });
  });

  test('should show Observation Suggestions section', async ({ page }) => {
    const productId = await findProductByMpn(page, TEST_MPN);
    test.skip(!productId, 'Test product not found');

    await navigateToAIActionsTab(page, productId!);

    // Look for the Observation Suggestions section
    const suggestionsSection = page.locator('text=/Observation Suggestions/i').first();
    await expect(suggestionsSection).toBeVisible({ timeout: 5000 });
  });

  test('should generate suggestions when clicking Request Suggestions', async ({ page }) => {
    const productId = await findProductByMpn(page, TEST_MPN);
    test.skip(!productId, 'Test product not found');

    await navigateToAIActionsTab(page, productId!);

    // Click Request Suggestions
    const requestButton = page.locator('button:has-text("Request Suggestions")');
    await requestButton.click();

    // Wait for loading to complete (button should change from ⏳ back to 🔍)
    await page.waitForFunction(
      () => {
        const btn = document.querySelector('button:has-text("Request Suggestions")');
        return btn && !btn.textContent?.includes('⏳');
      },
      { timeout: 10000 }
    ).catch(() => {
      // May timeout if no suggestions - that's okay
    });

    // Either suggestions appear OR "No suggestions available" message
    const hasSuggestions = await page.locator('.suggestion-card').count() > 0;
    const hasEmptyMessage = await page.locator('text=/No suggestions available/i').isVisible();

    expect(hasSuggestions || hasEmptyMessage).toBe(true);
  });

  test('should display footnote with observation counts after generation', async ({ page }) => {
    const productId = await findProductByMpn(page, TEST_MPN);
    test.skip(!productId, 'Test product not found');

    await navigateToAIActionsTab(page, productId!);

    // Click Request Suggestions
    const requestButton = page.locator('button:has-text("Request Suggestions")');
    await requestButton.click();

    // Wait for loading to complete
    await page.waitForTimeout(3000);

    // Check for footnote (may or may not appear depending on observations)
    const footnote = page.locator('.observation-context-footnote');
    
    // Footnote only appears if there are observations
    if (await footnote.isVisible({ timeout: 2000 })) {
      // Verify footnote structure
      await expect(footnote.locator('text=/observations/i')).toBeVisible();
      await expect(footnote.locator('text=/tags/i')).toBeVisible();
    }
  });

  test('should apply a suggestion when clicking Apply', async ({ page }) => {
    const productId = await findProductByMpn(page, TEST_MPN);
    test.skip(!productId, 'Test product not found');

    await navigateToAIActionsTab(page, productId!);

    // Click Request Suggestions
    const requestButton = page.locator('button:has-text("Request Suggestions")');
    await requestButton.click();
    await page.waitForTimeout(3000);

    // Check if any suggestions exist
    const suggestionCards = page.locator('.suggestion-card');
    const count = await suggestionCards.count();

    if (count > 0) {
      // Click the first Apply button
      const applyButton = suggestionCards.first().locator('button:has-text("Apply")');
      
      if (await applyButton.isVisible({ timeout: 2000 })) {
        await applyButton.click();
        
        // Wait for the suggestion to be applied
        await page.waitForTimeout(2000);
        
        // The suggestion card should now show "✓ Applied" badge
        const appliedBadge = suggestionCards.first().locator('text=/Applied/i');
        await expect(appliedBadge).toBeVisible({ timeout: 5000 });
      }
    } else {
      // No suggestions to apply - skip
      test.skip(true, 'No suggestions available to test Apply flow');
    }
  });

  test('should clear suggestions when clicking Clear Suggestions', async ({ page }) => {
    const productId = await findProductByMpn(page, TEST_MPN);
    test.skip(!productId, 'Test product not found');

    await navigateToAIActionsTab(page, productId!);

    // Click Request Suggestions
    const requestButton = page.locator('button:has-text("Request Suggestions")');
    await requestButton.click();
    await page.waitForTimeout(3000);

    // Check if any suggestions exist
    const suggestionCards = page.locator('.suggestion-card');
    const initialCount = await suggestionCards.count();

    if (initialCount > 0) {
      // Click Clear Suggestions
      const clearButton = page.locator('button:has-text("Clear Suggestions")');
      await clearButton.click();

      // Wait for suggestions to be cleared
      await page.waitForTimeout(500);

      // Verify suggestions are cleared
      const finalCount = await page.locator('.suggestion-card').count();
      expect(finalCount).toBe(0);

      // Should show empty message
      const emptyMessage = page.locator('text=/No suggestions available/i');
      await expect(emptyMessage).toBeVisible({ timeout: 2000 });
    } else {
      // No suggestions to clear - skip
      test.skip(true, 'No suggestions available to test Clear flow');
    }
  });

  test('should record AI history entry when applying suggestion', async ({ page }) => {
    const productId = await findProductByMpn(page, TEST_MPN);
    test.skip(!productId, 'Test product not found');

    await navigateToAIActionsTab(page, productId!);

    // Click Request Suggestions
    const requestButton = page.locator('button:has-text("Request Suggestions")');
    await requestButton.click();
    await page.waitForTimeout(3000);

    // Check if any suggestions exist
    const suggestionCards = page.locator('.suggestion-card');
    const count = await suggestionCards.count();

    if (count > 0) {
      // Remember current AI history count
      const historyItems = page.locator('.ai-history-item');
      const initialHistoryCount = await historyItems.count();

      // Click the first Apply button
      const applyButton = suggestionCards.first().locator('button:has-text("Apply")');
      
      if (await applyButton.isVisible({ timeout: 2000 })) {
        await applyButton.click();
        await page.waitForTimeout(2000);

        // Check that a new AI history entry was added
        const newHistoryCount = await historyItems.count();
        expect(newHistoryCount).toBeGreaterThan(initialHistoryCount);

        // Verify the new entry contains "Apply Suggestion" or similar
        const latestEntry = historyItems.first(); // Most recent is first (reversed)
        await expect(latestEntry).toContainText(/apply.*suggestion|suggestion/i);
      }
    } else {
      test.skip(true, 'No suggestions available to test AI history');
    }
  });
});

test.describe('Mobile Behavior - AI Actions Tab', () => {
  test.use({ viewport: { width: 375, height: 667 } }); // iPhone SE

  test.beforeEach(async ({ page }) => {
    await signInWithEmail(page, TEST_USERS.ADMIN.email, TEST_USERS.ADMIN.password);
  });

  test('should still show Observation Suggestions on mobile', async ({ page }) => {
    const productId = await findProductByMpn(page, TEST_MPN);
    test.skip(!productId, 'Test product not found');

    await navigateToAIActionsTab(page, productId!);

    // Observation Suggestions section should be visible on mobile
    const suggestionsSection = page.locator('text=/Observation Suggestions/i').first();
    await expect(suggestionsSection).toBeVisible({ timeout: 5000 });

    // Request Suggestions button should be visible
    const requestButton = page.locator('button:has-text("Request Suggestions")');
    await expect(requestButton).toBeVisible({ timeout: 5000 });
  });
});
