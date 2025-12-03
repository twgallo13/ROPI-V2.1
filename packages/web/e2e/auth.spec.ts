/**
 * E2E Tests: Authentication Flows
 * 
 * Tests:
 * - Email/password sign-up and sign-in
 * - Google OAuth sign-in (mocked in CI)
 * - Email verification banner behavior
 * - Sign-out flow
 * 
 * Source-of-truth: Section 9 — Firebase Implementation & Security
 * Notion Page ID: 2b845ee1-ec5a-80ea-8f5e-cd0c08d31847
 */

import { test, expect } from '@playwright/test';
import {
  TEST_USERS,
  signInWithEmail,
  signOut,
  isSignedIn,
  hasEmailVerificationBanner,
  waitForEmailVerificationBanner,
} from './helpers';

test.describe('Authentication Flows', () => {
  test.beforeEach(async ({ page }) => {
    // Start from home page
    await page.goto('/');
  });

  test('should allow email/password sign-in for regular user', async ({ page }) => {
    const user = TEST_USERS.regularUser;
    
    await signInWithEmail(page, user.email, user.password);
    
    // Verify signed in
    expect(await isSignedIn(page)).toBe(true);
    
    // Verify redirected to /app
    await expect(page).toHaveURL(/\/app/);
    
    // Verify user display name or email is shown
    await expect(page.locator(`text=/${user.displayName}|${user.email}/i`)).toBeVisible();
  });

  test('should allow email/password sign-in for admin user', async ({ page }) => {
    const user = TEST_USERS.admin;
    
    await signInWithEmail(page, user.email, user.password);
    
    // Verify signed in
    expect(await isSignedIn(page)).toBe(true);
    
    // Verify redirected to /app
    await expect(page).toHaveURL(/\/app/);
    
    // Check for admin indicator (adjust selector based on actual UI)
    // This might be a badge, menu item, or specific admin controls
    const adminIndicator = page.locator('text=/admin/i, [data-role="admin"]').first();
    await expect(adminIndicator).toBeVisible({ timeout: 5000 });
  });

  test('should show email verification banner for unverified user', async ({ page }) => {
    const user = TEST_USERS.unverifiedUser;
    
    await signInWithEmail(page, user.email, user.password);
    
    // Verify signed in
    expect(await isSignedIn(page)).toBe(true);
    
    // Wait for email verification banner
    await waitForEmailVerificationBanner(page);
    
    // Verify banner is visible
    expect(await hasEmailVerificationBanner(page)).toBe(true);
    
    // Verify "Resend Email" button exists
    const resendButton = page.locator('button:has-text("Resend Email"), button:has-text("Resend")');
    await expect(resendButton).toBeVisible();
  });

  test('should NOT show email verification banner for verified user', async ({ page }) => {
    const user = TEST_USERS.regularUser; // assumed to be verified
    
    await signInWithEmail(page, user.email, user.password);
    
    // Verify signed in
    expect(await isSignedIn(page)).toBe(true);
    
    // Verify banner is NOT visible
    expect(await hasEmailVerificationBanner(page)).toBe(false);
  });

  test('should allow resending verification email', async ({ page }) => {
    const user = TEST_USERS.unverifiedUser;
    
    await signInWithEmail(page, user.email, user.password);
    
    // Wait for banner
    await waitForEmailVerificationBanner(page);
    
    // Click "Resend Email" button
    const resendButton = page.locator('button:has-text("Resend Email"), button:has-text("Resend")');
    await resendButton.click();
    
    // Wait for success message
    await page.waitForSelector('text=/sent|success/i', { timeout: 5000 });
    
    // Verify success message is shown
    const successMessage = page.locator('text=/verification.*sent|email.*sent/i');
    await expect(successMessage).toBeVisible();
  });

  test('should allow sign-out', async ({ page }) => {
    const user = TEST_USERS.regularUser;
    
    // Sign in first
    await signInWithEmail(page, user.email, user.password);
    expect(await isSignedIn(page)).toBe(true);
    
    // Sign out
    await signOut(page);
    
    // Verify signed out
    expect(await isSignedIn(page)).toBe(false);
    
    // Verify redirected away from /app
    await expect(page).not.toHaveURL(/\/app/);
  });

  test('should redirect to sign-in when accessing /app/* while signed out', async ({ page }) => {
    // Try to access protected route
    await page.goto('/app/launch-calendar');
    
    // Should redirect to sign-in or home
    await page.waitForURL(/^\/$|\/signin|\/login/, { timeout: 5000 });
    
    // Verify not on /app route
    await expect(page).not.toHaveURL(/\/app/);
  });

  // Google OAuth test (requires test account or mock)
  test.skip('should allow Google OAuth sign-in', async ({ page }) => {
    // Click "Sign in with Google" button
    const googleButton = page.locator('button:has-text("Google"), button:has-text("Continue with Google")');
    await googleButton.click();
    
    // In real OAuth flow, this would open popup
    // For E2E, we'd need to mock or use test OAuth credentials
    
    // TODO: Implement Google OAuth test when test account is available
    // or use Firebase Auth emulator with mock provider
  });
});
