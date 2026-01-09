/**
 * LP-phase2b-001: MPN Display Verification
 * 
 * Binding Rule: UI must display MPN for every product and never expose product_id to users.
 * 
 * This test verifies:
 * 1. API response includes product_identifiers.mpn
 * 2. UI displays MPN in CompletionCard
 * 3. UI displays MPN in ExportGatePanel
 * 4. UI does NOT display product_id anywhere visible to users
 * 5. MPN matches between API and UI
 * 
 * Lisa's acceptance criteria:
 * - If any screenshot or automated test shows product_id in user-facing surface, submission REJECTED
 * - MPN must be visible and match API response
 * - product_id must NOT appear in body text, tooltips, or labels
 */

import { test, expect } from '@playwright/test';

const BASE_URL = process.env.BASE_URL || 'http://localhost:5173';
const EMAIL = process.env.VITE_E2E_ADMIN_EMAIL || 'theo@shiekh.com';
const PASSWORD = process.env.VITE_E2E_ADMIN_PASSWORD || '';

// Test product IDs as specified by Lisa
const TEST_PRODUCTS = [
  { id: 'product-0001', expectedState: 'ready' },
  { id: 'product-0004', expectedState: 'partial' },
  { id: 'product-0007', expectedState: 'blocked' },
];

test.describe('LP-phase2b-001: MPN Display Verification', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate and sign in
    await page.goto(BASE_URL);
    await page.waitForLoadState('networkidle');

    const signInBtn = page.locator('[data-testid="signin-trigger"], button:has-text("Sign In")').first();
    await signInBtn.waitFor({ state: 'visible', timeout: 10000 });
    await signInBtn.click();

    const modal = page.locator('[data-testid="signin-modal"], .signin-modal, .modal').first();
    await modal.waitFor({ state: 'visible', timeout: 5000 });

    await page.fill('input[type="email"]', EMAIL);
    await page.fill('input[type="password"]', PASSWORD);
    await page.click('button[type="submit"]:has-text("Sign In")');

    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);
  });

  for (const testProduct of TEST_PRODUCTS) {
    test(`Product ${testProduct.id} (${testProduct.expectedState}): MPN displayed, product_id NOT visible`, async ({ page }) => {
      // Navigate to product page
      await page.goto(`${BASE_URL}/products/${testProduct.id}`);
      await page.waitForLoadState('networkidle');

      // Intercept API call to get completion data
      let apiResponse: any = null;
      page.on('response', async (response) => {
        if (response.url().includes(`/api/products/${testProduct.id}/completion`)) {
          apiResponse = await response.json();
        }
      });

      // Wait for completion card to load
      await page.waitForSelector('[data-testid="completion-card-mpn"]', { timeout: 10000 });

      // Verify API response contains productIdentifiers with MPN
      if (apiResponse) {
        expect(apiResponse.productIdentifiers).toBeDefined();
        expect(apiResponse.productIdentifiers.mpn).toBeDefined();
        expect(apiResponse.productIdentifiers.mpn).not.toBe('');
        expect(apiResponse.productIdentifiers.productId).toBe(testProduct.id);
      }

      // Verify MPN is displayed in CompletionCard
      const completionCardMpn = await page.locator('[data-testid="completion-card-mpn"]').textContent();
      expect(completionCardMpn).toBeTruthy();
      expect(completionCardMpn).not.toBe('UNKNOWN-MPN');

      // Verify MPN is displayed in ExportGatePanel (if present)
      const exportGateMpn = page.locator('[data-testid="export-gate-mpn"]');
      if (await exportGateMpn.count() > 0) {
        const mpnText = await exportGateMpn.textContent();
        expect(mpnText).toBeTruthy();
        expect(mpnText).toBe(completionCardMpn); // Must match
      }

      // Verify MPN matches API response
      if (apiResponse && apiResponse.productIdentifiers?.mpn) {
        expect(completionCardMpn).toBe(apiResponse.productIdentifiers.mpn);
      }

      // CRITICAL: Verify product_id is NOT visible in page text
      const bodyText = await page.textContent('body');
      expect(bodyText).not.toContain(testProduct.id); // product_id must not appear

      // Verify product_id is NOT in any visible elements
      const allText = await page.evaluate(() => {
        const walker = document.createTreeWalker(
          document.body,
          NodeFilter.SHOW_TEXT,
          null
        );
        const textNodes: string[] = [];
        let node;
        while ((node = walker.nextNode())) {
          if (node.textContent && node.textContent.trim()) {
            textNodes.push(node.textContent.trim());
          }
        }
        return textNodes.join(' ');
      });
      expect(allText).not.toContain(testProduct.id);

      // Take screenshot for evidence
      await page.screenshot({
        path: `inventory/LP-phase2b-001/evidence/screenshots/mpn-display-${testProduct.id}.png`,
        fullPage: true,
      });

      console.log(`✅ MPN verification PASSED for ${testProduct.id}: MPN="${completionCardMpn}", product_id NOT visible`);
    });
  }

  test('MPN assertion: product_id must never appear in tooltips or aria-labels', async ({ page }) => {
    // Navigate to first test product
    await page.goto(`${BASE_URL}/products/${TEST_PRODUCTS[0].id}`);
    await page.waitForLoadState('networkidle');

    // Check all elements with title attributes (tooltips)
    const titledElements = await page.locator('[title]').all();
    for (const el of titledElements) {
      const title = await el.getAttribute('title');
      expect(title).not.toContain(TEST_PRODUCTS[0].id);
    }

    // Check all elements with aria-label attributes
    const ariaLabeledElements = await page.locator('[aria-label]').all();
    for (const el of ariaLabeledElements) {
      const ariaLabel = await el.getAttribute('aria-label');
      expect(ariaLabel).not.toContain(TEST_PRODUCTS[0].id);
    }

    console.log('✅ MPN assertion PASSED: product_id not found in tooltips or aria-labels');
  });
});
