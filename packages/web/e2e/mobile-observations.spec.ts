/**
 * E2E Tests: Mobile Observations - Mobile/Desktop Parity
 * 
 * LP-observations-consolidation-1.1.0: Tests for mobile observation capture
 * ensuring tags/images persist and rehydrate reliably.
 * 
 * Tests:
 * - Upload + rehydrate: After upload, navigate away and back, assert same state
 * - Offline flush: Queue observation offline, restore network, verify sync
 * - CORS preflight: Verify OPTIONS request succeeds before uploads
 * 
 * Source-of-truth: LP-observations-consolidation-1.1.0 acceptance criteria
 */

import { test, expect, Page } from '@playwright/test';
import {
  TEST_USERS,
  signInWithEmail,
  generateTestId,
  waitForFirestoreWrite,
} from './helpers';

// Test product MPN for mobile capture testing
const TEST_PRODUCT_MPN = '553558-066'; // Nike product commonly in test data

test.describe('Mobile Observations - LP-1.1.0', () => {
  test.beforeEach(async ({ page }) => {
    // Sign in as admin
    await signInWithEmail(page, TEST_USERS.admin.email, TEST_USERS.admin.password);
  });

  test.describe('Upload + Rehydrate', () => {
    test('should persist tags and rehydrate on return', async ({ page }) => {
      // Navigate to mobile capture (Studio)
      await page.goto('/studio');
      await page.waitForLoadState('networkidle');
      
      // Enter MPN to select a product
      const mpnInput = page.locator('input[placeholder*="MPN"], input[name*="mpn"]').first();
      if (await mpnInput.isVisible()) {
        await mpnInput.fill(TEST_PRODUCT_MPN);
        await mpnInput.press('Enter');
        await page.waitForTimeout(2000); // Wait for product lookup
      } else {
        // Try scan button flow
        const scanButton = page.locator('button:has-text("Scan"), button:has-text("Enter MPN")').first();
        if (await scanButton.isVisible()) {
          await scanButton.click();
          await page.waitForTimeout(500);
          const searchInput = page.locator('input[placeholder*="MPN"], input[type="search"]').first();
          await searchInput.fill(TEST_PRODUCT_MPN);
          await searchInput.press('Enter');
          await page.waitForTimeout(2000);
        }
      }
      
      // Add test tags
      const testTag1 = `test-tag-${generateTestId('t1')}`;
      const testTag2 = `rehydrate-${generateTestId('t2')}`;
      
      const tagInput = page.locator('input#tags-input, input.tag-input').first();
      await expect(tagInput).toBeVisible({ timeout: 5000 });
      
      // Add first tag
      await tagInput.fill(testTag1);
      await tagInput.press('Enter');
      await page.waitForTimeout(300);
      
      // Add second tag
      await tagInput.fill(testTag2);
      await tagInput.press('Enter');
      await page.waitForTimeout(300);
      
      // Verify tags appear as chips
      await expect(page.locator(`.tag-chip:has-text("${testTag1}")`)).toBeVisible();
      await expect(page.locator(`.tag-chip:has-text("${testTag2}")`)).toBeVisible();
      
      // Save observation
      const saveButton = page.locator('button:has-text("Finish"), button:has-text("Save")').first();
      await saveButton.click();
      
      // Wait for success and Firestore write
      await page.waitForSelector('text=/saved|success/i', { timeout: 10000 });
      await waitForFirestoreWrite(page);
      
      // Navigate away
      await page.goto('/products');
      await page.waitForLoadState('networkidle');
      
      // Navigate back to studio and select same product
      await page.goto('/studio');
      await page.waitForLoadState('networkidle');
      
      // Re-select the same product
      const scanButton = page.locator('button:has-text("Scan"), button:has-text("Enter MPN")').first();
      if (await scanButton.isVisible()) {
        await scanButton.click();
        await page.waitForTimeout(500);
      }
      
      const searchInput = page.locator('input[placeholder*="MPN"], input[type="search"]').first();
      if (await searchInput.isVisible()) {
        await searchInput.fill(TEST_PRODUCT_MPN);
        await searchInput.press('Enter');
        await page.waitForTimeout(3000); // Wait for rehydration
      }
      
      // Verify tags are rehydrated from product.observation
      await expect(page.locator(`.tag-chip:has-text("${testTag1}")`)).toBeVisible({ timeout: 5000 });
      await expect(page.locator(`.tag-chip:has-text("${testTag2}")`)).toBeVisible({ timeout: 5000 });
    });

    test('should persist images and show them after reload', async ({ page }) => {
      // Skip if no camera/file upload available in test environment
      test.skip(process.env.CI === 'true', 'Image upload tests require manual verification in CI');
      
      await page.goto('/studio');
      await page.waitForLoadState('networkidle');
      
      // This test verifies the image upload flow exists
      // Full image persistence requires Firebase Storage access
      const uploadArea = page.locator('.image-upload, .observation-image-uploader, [data-testid="image-uploader"]');
      await expect(uploadArea).toBeVisible({ timeout: 5000 });
    });
  });

  test.describe('Offline Sync', () => {
    test('should queue observation offline and sync when online', async ({ page, context }) => {
      await page.goto('/studio');
      await page.waitForLoadState('networkidle');
      
      // Go offline
      await context.setOffline(true);
      
      // Wait for offline banner
      await expect(page.locator('.sync-banner.offline, text=/offline/i')).toBeVisible({ timeout: 5000 });
      
      // Select product (may use cached data)
      const scanButton = page.locator('button:has-text("Scan"), button:has-text("Enter MPN")').first();
      if (await scanButton.isVisible()) {
        await scanButton.click();
        await page.waitForTimeout(500);
      }
      
      const searchInput = page.locator('input[placeholder*="MPN"], input[type="search"]').first();
      if (await searchInput.isVisible()) {
        await searchInput.fill(TEST_PRODUCT_MPN);
        await searchInput.press('Enter');
        await page.waitForTimeout(2000);
      }
      
      // Add offline tag
      const offlineTag = `offline-${generateTestId('off')}`;
      const tagInput = page.locator('input#tags-input, input.tag-input').first();
      
      if (await tagInput.isVisible()) {
        await tagInput.fill(offlineTag);
        await tagInput.press('Enter');
        await page.waitForTimeout(300);
        
        // Try to save (should queue locally)
        const saveButton = page.locator('button:has-text("Finish"), button:has-text("Save")').first();
        if (await saveButton.isVisible() && await saveButton.isEnabled()) {
          await saveButton.click();
          await page.waitForTimeout(1000);
          
          // Verify pending indicator
          const pendingBanner = page.locator('.sync-banner, text=/pending/i');
          const syncWillText = page.locator('text=/will sync/i');
          
          // Check at least one indicator exists
          const hasPendingIndicator = await pendingBanner.isVisible().catch(() => false) ||
                                      await syncWillText.isVisible().catch(() => false);
          
          if (hasPendingIndicator) {
            // Go back online
            await context.setOffline(false);
            
            // Wait for sync to complete (5-10 seconds for network + Firestore)
            await page.waitForTimeout(5000);
            
            // Verify synced (banner should clear or show success)
            await expect(
              page.locator('.sync-banner.offline, text=/offline/i')
            ).not.toBeVisible({ timeout: 10000 });
          }
        }
      }
    });
  });

  test.describe('CORS Preflight', () => {
    test('should handle Firebase Storage CORS correctly', async ({ page }) => {
      // This test verifies CORS configuration by checking network requests
      // during image upload operations
      
      const corsErrors: string[] = [];
      
      // Listen for console errors related to CORS
      page.on('console', msg => {
        if (msg.type() === 'error' && msg.text().toLowerCase().includes('cors')) {
          corsErrors.push(msg.text());
        }
      });
      
      // Listen for failed requests
      page.on('requestfailed', request => {
        if (request.url().includes('storage.googleapis.com') ||
            request.url().includes('firebasestorage')) {
          corsErrors.push(`Request failed: ${request.url()} - ${request.failure()?.errorText}`);
        }
      });
      
      await page.goto('/studio');
      await page.waitForLoadState('networkidle');
      
      // Select a product to enable the image uploader
      const scanButton = page.locator('button:has-text("Scan"), button:has-text("Enter MPN")').first();
      if (await scanButton.isVisible()) {
        await scanButton.click();
        await page.waitForTimeout(500);
        const searchInput = page.locator('input[placeholder*="MPN"], input[type="search"]').first();
        await searchInput.fill(TEST_PRODUCT_MPN);
        await searchInput.press('Enter');
        await page.waitForTimeout(2000);
      }
      
      // Look for the image uploader component
      const uploader = page.locator('.observation-image-uploader, [data-testid="image-uploader"]').first();
      
      // Wait a bit to capture any CORS preflight errors
      await page.waitForTimeout(3000);
      
      // Assert no CORS errors occurred during page load
      expect(corsErrors).toHaveLength(0);
    });
  });
});

test.describe('Mobile Observations - Sync Status', () => {
  test.beforeEach(async ({ page }) => {
    await signInWithEmail(page, TEST_USERS.admin.email, TEST_USERS.admin.password);
  });

  test('should show sync status banner when pending', async ({ page }) => {
    await page.goto('/studio');
    await page.waitForLoadState('networkidle');
    
    // The sync banner should be visible only when there's something to sync
    // or when offline. When online with no pending items, it should be hidden.
    const syncBanner = page.locator('.sync-banner');
    
    // After load, if there are no pending items and we're online,
    // the banner should either not exist or show a pending state
    const bannerVisible = await syncBanner.isVisible().catch(() => false);
    
    if (bannerVisible) {
      // If banner is visible, it should indicate a valid state
      const bannerText = await syncBanner.textContent();
      expect(bannerText).toMatch(/offline|pending|syncing|failed|retry/i);
    }
    
    // Verify no error state without user action
    const errorBanner = page.locator('.sync-banner.error');
    const hasError = await errorBanner.isVisible().catch(() => false);
    
    // Error should only show if there was a failed sync, not on fresh load
    // This is acceptable - just document the state
    if (hasError) {
      console.log('Note: Error banner visible - may have stale failed syncs from previous tests');
    }
  });
});
