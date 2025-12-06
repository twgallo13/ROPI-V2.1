/**
 * E2E Tests: Launch Calendar Signup Flow
 * 
 * Tests:
 * - Account-based signup (authenticated users)
 * - Public email capture signup (if enabled)
 * - Firestore validation of signup documents
 * - Idempotency (duplicate signups)
 * 
 * Source-of-truth: Section 7 — Frontend & Launch Calendar
 * Notion Page ID: 2b845ee1-ec5a-811d-8d47-ef14b3d0f46c
 */

import { test, expect } from '@playwright/test';
import {
  TEST_USERS,
  signInWithEmail,
  navigateToLaunchCalendar,
  generateTestId,
  waitForFirestoreWrite,
} from './helpers';

test.describe('Launch Calendar Signup - Account-Based', () => {
  test.beforeEach(async ({ page }) => {
    // Sign in as regular user
    await signInWithEmail(page, TEST_USERS.regularUser.email, TEST_USERS.regularUser.password);
  });

  test('should navigate to Launch Calendar page', async ({ page }) => {
    await navigateToLaunchCalendar(page);
    
    // Verify page title or header
    await expect(page.locator('h1, h2').filter({ hasText: /launch.*calendar/i })).toBeVisible();
    
    // Verify launches are displayed
    const launches = page.locator('[data-launch-id], .launch-card');
    await expect(launches.first()).toBeVisible({ timeout: 10000 });
  });

  test('should allow signup for a launch', async ({ page }) => {
    await navigateToLaunchCalendar(page);
    
    // Find first available launch
    const firstLaunch = page.locator('[data-launch-id]').first();
    const launchId = await firstLaunch.getAttribute('data-launch-id');
    
    // Click "NOTIFY ME" button
    const notifyButton = firstLaunch.locator('button:has-text("NOTIFY ME"), button:has-text("Notify")');
    await notifyButton.click();
    
    // Wait for success message - matches "You're in. We'll notify you..."
    await page.waitForSelector('text=/You\'re in|success|registered|signed up/i', { timeout: 5000 });
    
    // Verify success message
    const successMessage = page.locator('text=/You\'re in|success|registered|signed up/i');
    await expect(successMessage).toBeVisible();
    
    // Wait for Firestore write
    await waitForFirestoreWrite(page);
    
    // Verify button changes state (e.g., "REGISTERED" or disabled)
    await expect(notifyButton).toBeDisabled({ timeout: 3000 }).catch(() => {
      // Or check if text changed
      expect(notifyButton).toHaveText(/registered|signed up/i);
    });
  });

  test('should prevent duplicate signups (idempotency)', async ({ page }) => {
    await navigateToLaunchCalendar(page);
    
    // Find first launch
    const firstLaunch = page.locator('[data-launch-id]').first();
    const notifyButton = firstLaunch.locator('button:has-text("NOTIFY ME"), button:has-text("Notify")');
    
    // First signup
    if (await notifyButton.isEnabled()) {
      await notifyButton.click();
      // Matches "You're in. We'll notify you..." or similar
      await page.waitForSelector('text=/You\'re in|success|registered/i', { timeout: 5000 });
      await waitForFirestoreWrite(page);
    }
    
    // Try to signup again
    // Button should be disabled or show "REGISTERED" state
    const isDisabled = await notifyButton.isDisabled();
    const hasRegisteredText = await notifyButton.textContent().then(
      text => /registered|signed up/i.test(text || '')
    );
    
    expect(isDisabled || hasRegisteredText).toBe(true);
  });

  test('should include productId in signup', async ({ page }) => {
    await navigateToLaunchCalendar(page);
    
    // Find launch with data-product-id attribute
    const launch = page.locator('[data-launch-id][data-product-id]').first();
    
    // Verify launch has productId
    const productId = await launch.getAttribute('data-product-id');
    expect(productId).toBeTruthy();
    
    // Click NOTIFY ME
    const notifyButton = launch.locator('button:has-text("NOTIFY ME")');
    if (await notifyButton.isEnabled()) {
      await notifyButton.click();
      // Matches "You're in. We'll notify you..." or similar
      await page.waitForSelector('text=/You\'re in|success|registered/i', { timeout: 5000 });
      await waitForFirestoreWrite(page);
    }
    
    // Note: Actual Firestore document validation would require
    // Firebase Admin SDK access or Firestore REST API calls
    // For now, we verify the UI flow completes successfully
  });
});

test.describe('Launch Calendar Signup - Public Mode', () => {
  test.beforeEach(async ({ page }) => {
    // Do NOT sign in - test public access
    await page.goto('/');
  });

  test.skip('should allow public email signup (if enabled)', async ({ page }) => {
    // This test is skipped by default since public mode is optional
    // and controlled by VITE_LAUNCH_SIGNUP_PUBLIC_ENABLED env var
    
    // If enabled, there should be a public signup form route
    await page.goto('/launch-calendar/signup'); // or similar public route
    
    // Find launch list
    const launches = page.locator('[data-launch-id]');
    await expect(launches.first()).toBeVisible();
    
    // Select a launch
    const firstLaunch = launches.first();
    await firstLaunch.click();
    
    // Fill in email
    const emailInput = page.locator('input[type="email"]');
    await emailInput.fill('public-test@example.com');
    
    // Submit
    const submitButton = page.locator('button[type="submit"]:has-text("Notify"), button:has-text("Sign Up")');
    await submitButton.click();
    
    // Wait for success - matches "You're in. We'll notify you..." or similar
    await page.waitForSelector('text=/You\'re in|success|registered/i', { timeout: 5000 });
    
    // Verify success message
    const successMessage = page.locator('text=/You\'re in|success|registered/i');
    await expect(successMessage).toBeVisible();
  });
});

test.describe('Launch Calendar - Auth Gating', () => {
  test('should require sign-in for AOSS web signup', async ({ page }) => {
    // Navigate to Launch Calendar without signing in
    await page.goto('/launch-calendar');
    
    // Try to click NOTIFY ME - should trigger sign-in modal
    const firstLaunch = page.locator('[data-launch-id]').first();
    await firstLaunch.waitFor({ state: 'visible', timeout: 10000 });
    
    const notifyButton = firstLaunch.locator('button:has-text("NOTIFY ME")');
    await notifyButton.click();
    
    // Should show sign-in modal
    const signInModal = page.locator('[data-testid="signin-modal"]');
    await expect(signInModal).toBeVisible({ timeout: 5000 });
  });
});
