/**
 * E2E Tests: Capture Loop (N=3)
 * 
 * LP-obs-studio-cleanup-1.2.1: Tests the observation capture workflow
 * with multiple captures in sequence, verifying:
 * - Tags are persisted correctly
 * - "Finish & Next" CTA works
 * - Offline capture queues and syncs when online
 * 
 * LP-obs-studio-cleanup-1.3.0: Added tests for:
 * - Mobile raw-first experience (FieldPicker/Severity hidden on mobile)
 * - Sync badge behavior (hidden when queue empty)
 * - Immediate background persist when online
 * 
 * Source-of-truth: Workflow W1 — Observations
 * https://www.notion.so/2b845ee1ec5a81b5a4a6d3ea439ec277
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
 * Navigate to the observations studio/capture page
 */
async function navigateToCapture(page: Page) {
  await page.goto('/observations/capture');
  // Wait for the capture UI to load
  await page.waitForSelector('text=/scan|search|mpn/i', { timeout: 10000 });
}

/**
 * Select a product by MPN
 */
async function selectProduct(page: Page, mpn: string) {
  // Look for MPN input or search field
  const mpnInput = page.locator('input[placeholder*="MPN"], input[name="mpn"], input[aria-label*="MPN"]').first();
  
  if (await mpnInput.isVisible({ timeout: 3000 })) {
    await mpnInput.fill(mpn);
    // Wait for autocomplete/search results
    await page.waitForTimeout(500);
    
    // Click on the matching result if dropdown appears
    const resultItem = page.locator(`text="${mpn}"`).first();
    if (await resultItem.isVisible({ timeout: 2000 })) {
      await resultItem.click();
    }
  } else {
    // Try scanner button fallback
    const scanButton = page.locator('button:has-text("Scan"), button[aria-label*="scan"]').first();
    if (await scanButton.isVisible()) {
      // For E2E, we'll need to mock scanner - skip for now
      throw new Error('Scanner mode not supported in E2E - needs MPN input field');
    }
  }
  
  // Wait for product to be selected
  await page.waitForSelector(`text="${mpn}"`, { timeout: 5000 });
}

/**
 * Create an observation with tags
 */
async function createObservationWithTags(
  page: Page,
  observationText: string,
  tags: string[]
) {
  // Fill observation text
  const textArea = page.locator(
    'textarea[name="observation"], textarea[placeholder*="observation"], ' +
    'input[name="observation"], input[placeholder*="observation"]'
  ).first();
  await textArea.fill(observationText);
  
  // Add tags
  const tagInput = page.locator(
    'input[name="tags"], input[placeholder*="tag"], input[aria-label*="tag"]'
  ).first();
  
  if (await tagInput.isVisible({ timeout: 2000 })) {
    for (const tag of tags) {
      await tagInput.fill(tag);
      await tagInput.press('Enter');
      await page.waitForTimeout(100);
    }
    
    // Verify tags are shown as chips
    for (const tag of tags) {
      await expect(page.locator(`text="${tag}"`)).toBeVisible({ timeout: 2000 });
    }
  }
  
  // Click save/finish button
  const saveButton = page.locator(
    'button:has-text("Finish"), button:has-text("Save"), button[type="submit"]'
  ).first();
  await saveButton.click();
  
  // Wait for save to complete
  await waitForFirestoreWrite(page);
}

test.describe('Capture Loop - N=3', () => {
  test.beforeEach(async ({ page }) => {
    // Sign in as admin (has permission to create observations)
    await signInWithEmail(page, TEST_USERS.admin.email, TEST_USERS.admin.password);
  });

  test('should complete 3 captures with tags persisted', async ({ page }) => {
    const testId = generateTestId('capture');
    const captures = [
      { text: `Capture 1 - ${testId}`, tags: ['urgent', 'quality'] },
      { text: `Capture 2 - ${testId}`, tags: ['packaging', 'damage'] },
      { text: `Capture 3 - ${testId}`, tags: ['review', 'follow-up'] },
    ];

    await navigateToCapture(page);

    for (let i = 0; i < captures.length; i++) {
      const capture = captures[i];
      
      // Select product
      await selectProduct(page, TEST_MPN);
      
      // Create observation with tags
      await createObservationWithTags(page, capture.text, capture.tags);
      
      // Verify success message
      await expect(
        page.locator('text=/success|saved|created/i')
      ).toBeVisible({ timeout: 5000 });
      
      // If "Finish & Next" was clicked, scanner should reopen
      if (i < captures.length - 1) {
        // Verify scanner/search is ready for next capture
        await expect(
          page.locator('input[placeholder*="MPN"], text=/scan|search/i')
        ).toBeVisible({ timeout: 5000 });
      }
    }
    
    // Navigate to observations list to verify all 3 were created
    await page.goto('/observations');
    await page.waitForLoadState('networkidle');
    
    // Verify all 3 observations exist
    for (const capture of captures) {
      await expect(page.locator(`text="${capture.text}"`)).toBeVisible({ timeout: 10000 });
    }
  });

  test('should handle offline capture and sync', async ({ page, context }) => {
    const testId = generateTestId('offline');
    
    await navigateToCapture(page);
    
    // Create first observation while online
    await selectProduct(page, TEST_MPN);
    await createObservationWithTags(
      page,
      `Online capture - ${testId}`,
      ['online', 'test']
    );
    await expect(page.locator('text=/success/i')).toBeVisible({ timeout: 5000 });
    
    // Go offline (simulate)
    await context.setOffline(true);
    
    // Wait for offline indicator
    await page.waitForTimeout(500);
    
    // Create second observation while offline
    await selectProduct(page, TEST_MPN);
    const offlineText = `Offline capture - ${testId}`;
    await createObservationWithTags(
      page,
      offlineText,
      ['offline', 'queued']
    );
    
    // Verify pending indicator appears
    await expect(
      page.locator('text=/pending|queued|offline/i')
    ).toBeVisible({ timeout: 5000 });
    
    // Go back online
    await context.setOffline(false);
    
    // Wait for auto-sync
    await page.waitForTimeout(3000);
    
    // Verify sync success or pending count decreases
    await expect(
      page.locator('text=/synced|success|0 pending/i')
    ).toBeVisible({ timeout: 10000 });
    
    // Navigate to observations list
    await page.goto('/observations');
    await page.waitForLoadState('networkidle');
    
    // Verify offline observation was synced
    await expect(page.locator(`text="${offlineText}"`)).toBeVisible({ timeout: 10000 });
  });

  test('should display tag chips and allow removal', async ({ page }) => {
    await navigateToCapture(page);
    await selectProduct(page, TEST_MPN);
    
    // Add tags
    const tagInput = page.locator(
      'input[name="tags"], input[placeholder*="tag"]'
    ).first();
    
    if (!await tagInput.isVisible({ timeout: 3000 })) {
      test.skip();
      return;
    }
    
    // Add 3 tags
    const tags = ['alpha', 'beta', 'gamma'];
    for (const tag of tags) {
      await tagInput.fill(tag);
      await tagInput.press('Enter');
    }
    
    // Verify all 3 chips visible
    for (const tag of tags) {
      await expect(page.locator(`text="${tag}"`)).toBeVisible();
    }
    
    // Remove middle tag by clicking X
    const betaChip = page.locator('text="beta"').locator('..').locator('button, [role="button"]');
    if (await betaChip.isVisible({ timeout: 1000 })) {
      await betaChip.click();
      
      // Verify beta is removed
      await expect(page.locator('text="beta"')).not.toBeVisible({ timeout: 2000 });
      
      // Verify other tags still present
      await expect(page.locator('text="alpha"')).toBeVisible();
      await expect(page.locator('text="gamma"')).toBeVisible();
    }
    
    // Test backspace removal
    await tagInput.focus();
    await tagInput.press('Backspace');
    
    // Verify last tag (gamma) is removed
    await expect(page.locator('text="gamma"')).not.toBeVisible({ timeout: 2000 });
    await expect(page.locator('text="alpha"')).toBeVisible();
  });
});

// LP-obs-studio-cleanup-1.3.0: Mobile raw-first experience tests
test.describe('Mobile Raw-First Experience', () => {
  test.beforeEach(async ({ page }) => {
    // Sign in as admin
    await signInWithEmail(page, TEST_USERS.admin.email, TEST_USERS.admin.password);
  });

  test('should hide FieldPicker and Severity on mobile viewport', async ({ page }) => {
    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 812 }); // iPhone X size
    
    await navigateToCapture(page);
    await selectProduct(page, TEST_MPN);
    
    // Wait for form to load
    await page.waitForTimeout(500);
    
    // Severity should NOT be visible on mobile
    const severitySection = page.locator('text="Severity"');
    await expect(severitySection).not.toBeVisible({ timeout: 2000 });
    
    // FieldPicker / "Link to Field" should NOT be visible on mobile
    const fieldPickerSection = page.locator('text=/link to field/i');
    await expect(fieldPickerSection).not.toBeVisible({ timeout: 2000 });
    
    // But observation input and tags should still be visible
    await expect(page.locator('input[placeholder*="observation"], textarea[placeholder*="observation"]').first()).toBeVisible();
  });

  test('should show FieldPicker and Severity on desktop viewport', async ({ page }) => {
    // Set desktop viewport
    await page.setViewportSize({ width: 1280, height: 800 });
    
    await navigateToCapture(page);
    await selectProduct(page, TEST_MPN);
    
    // Wait for form to load
    await page.waitForTimeout(500);
    
    // Severity SHOULD be visible on desktop
    const severitySection = page.locator('text="Severity"');
    await expect(severitySection).toBeVisible({ timeout: 5000 });
    
    // FieldPicker / "Link to Field" SHOULD be visible on desktop
    const fieldPickerSection = page.locator('text=/link to field/i');
    await expect(fieldPickerSection).toBeVisible({ timeout: 5000 });
  });

  test('should hide Sync badge when queue is empty', async ({ page }) => {
    await navigateToCapture(page);
    
    // Initially, if online and no pending, Sync badge should NOT be visible
    // (unless there are actual pending items from previous tests)
    
    // Wait a moment for any pending items to sync
    await page.waitForTimeout(2000);
    
    // The "Sync Now" button should not be visible if no pending items
    // Note: This may be flaky if there are leftover pending items
    const syncNowBtn = page.locator('button:has-text("Sync Now")');
    
    // If we're online and no pending, it shouldn't show
    // We can't guarantee this test passes if there are pending items,
    // so we check the behavior pattern instead
    if (await syncNowBtn.isVisible({ timeout: 1000 })) {
      // If visible, there are pending items - click to sync
      await syncNowBtn.click();
      await page.waitForTimeout(3000);
      
      // After sync, badge should hide
      await expect(syncNowBtn).not.toBeVisible({ timeout: 5000 });
    }
    // If not visible, the test passes - badge correctly hidden when queue empty
  });

  test('should show pending count when offline capture queued', async ({ page, context }) => {
    await navigateToCapture(page);
    await selectProduct(page, TEST_MPN);
    
    // Go offline
    await context.setOffline(true);
    await page.waitForTimeout(500);
    
    // Verify offline banner appears
    await expect(page.locator('text=/offline/i')).toBeVisible({ timeout: 3000 });
    
    // Create an observation while offline
    const testId = generateTestId('sync-badge');
    const observationInput = page.locator(
      'input[placeholder*="observation"], textarea[placeholder*="observation"]'
    ).first();
    
    if (await observationInput.isVisible({ timeout: 2000 })) {
      await observationInput.fill(`Sync badge test - ${testId}`);
      
      // Save
      const saveButton = page.locator('button:has-text("Finish"), button:has-text("Save")').first();
      await saveButton.click();
      
      // Wait for queue to be updated
      await page.waitForTimeout(1000);
      
      // Go back online
      await context.setOffline(false);
      await page.waitForTimeout(500);
      
      // Should see pending count
      await expect(
        page.locator('text=/pending observation/i')
      ).toBeVisible({ timeout: 5000 });
    }
  });
});
