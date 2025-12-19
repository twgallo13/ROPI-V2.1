/**
 * Lean Admin Login Helper for E2E Tests
 * LP-1.1.7: Provides robust login with retries and diagnostics capture
 *
 * Features:
 * - Configurable retry attempts with exponential backoff
 * - Timeout-based waits instead of arbitrary delays
 * - Diagnostic capture on failure for debugging
 * - Fail-fast on auth errors
 */

import { Page } from '@playwright/test';

export interface AdminLoginOptions {
  /** Maximum number of login attempts (default: 3) */
  maxAttempts?: number;
  /** Timeout for selector operations in ms (default: 30000) */
  selectorTimeout?: number;
  /** Timeout waiting for auth response in ms (default: 15000) */
  authResponseTimeout?: number;
  /** Timeout waiting for spinner to disappear in ms (default: 5000) */
  spinnerTimeout?: number;
  /** Base backoff time between retries in ms (default: 1000) */
  backoffMs?: number;
}

export interface LoginDiagnostics {
  attempt: number;
  timestamp: string;
  error?: string;
  pageUrl?: string;
  pageTitle?: string;
  visibleText?: string;
  screenshot?: string;
}

/**
 * Login as admin with retries and diagnostics capture
 *
 * @param page - Playwright page instance
 * @param options - Configuration options
 * @returns Promise that resolves when login succeeds
 * @throws Error with diagnostics if all attempts fail
 */
export async function loginAsAdminWithRetries(
  page: Page,
  options: AdminLoginOptions = {}
): Promise<void> {
  const {
    maxAttempts = 3,
    selectorTimeout = 30000,
    authResponseTimeout = 15000,
    spinnerTimeout = 5000,
    backoffMs = 1000,
  } = options;

  const adminEmail = process.env.VITE_E2E_ADMIN_EMAIL || process.env.E2E_ADMIN_EMAIL;
  const adminPassword = process.env.VITE_E2E_ADMIN_PASSWORD || process.env.E2E_ADMIN_PASSWORD;

  if (!adminEmail || !adminPassword) {
    throw new Error(
      'Admin credentials not configured. Set VITE_E2E_ADMIN_EMAIL and VITE_E2E_ADMIN_PASSWORD'
    );
  }

  const diagnostics: LoginDiagnostics[] = [];

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    const attemptDiag: LoginDiagnostics = {
      attempt,
      timestamp: new Date().toISOString(),
    };

    try {
      console.log(`[adminAuth] Attempt ${attempt}/${maxAttempts}: Starting login...`);

      // Navigate to home page
      await page.goto('/', { waitUntil: 'networkidle', timeout: selectorTimeout });
      attemptDiag.pageUrl = page.url();

      // Wait for sign-in trigger to be visible
      const signInTrigger = page.locator('[data-testid="signin-trigger"]');
      await signInTrigger.waitFor({ state: 'visible', timeout: selectorTimeout });

      // Check if already logged in (user menu visible)
      const userMenu = page.locator('[data-testid="user-menu-trigger"]');
      const isLoggedIn = await userMenu.isVisible().catch(() => false);

      if (isLoggedIn) {
        console.log(`[adminAuth] Already logged in, verifying admin role...`);
        // Verify admin access by checking for admin nav items
        const adminNav = page.locator('[data-testid="admin-nav"], [href*="/admin"]');
        const hasAdminAccess = await adminNav.first().isVisible().catch(() => false);
        if (hasAdminAccess) {
          console.log(`[adminAuth] Admin access confirmed`);
          return;
        }
        // Not admin - need to logout and login as admin
        console.log(`[adminAuth] Not admin, logging out...`);
        await userMenu.click();
        const signOutBtn = page.locator('[data-testid="signout-button"], button:has-text("Sign Out")');
        await signOutBtn.click();
        await signInTrigger.waitFor({ state: 'visible', timeout: selectorTimeout });
      }

      // Click sign-in trigger to open modal
      await signInTrigger.click();

      // Wait for modal to appear
      const modal = page.locator('[data-testid="signin-modal"]');
      await modal.waitFor({ state: 'visible', timeout: selectorTimeout });

      // Fill credentials
      const emailInput = page.locator('[data-testid="email-input"]');
      const passwordInput = page.locator('[data-testid="password-input"]');

      await emailInput.waitFor({ state: 'visible', timeout: selectorTimeout });
      await emailInput.fill(adminEmail);

      await passwordInput.waitFor({ state: 'visible', timeout: selectorTimeout });
      await passwordInput.fill(adminPassword);

      // Submit form
      const submitBtn = page.locator('[data-testid="signin-submit"]');
      await submitBtn.click();

      // Wait for auth response - either success (user menu) or error
      const authResult = await Promise.race([
        userMenu
          .waitFor({ state: 'visible', timeout: authResponseTimeout })
          .then(() => 'success' as const),
        page
          .locator('[data-testid="auth-error"], .error-message, [role="alert"]')
          .waitFor({ state: 'visible', timeout: authResponseTimeout })
          .then(() => 'error' as const),
        new Promise<'timeout'>((resolve) =>
          setTimeout(() => resolve('timeout'), authResponseTimeout)
        ),
      ]);

      if (authResult === 'error') {
        const errorText = await page
          .locator('[data-testid="auth-error"], .error-message, [role="alert"]')
          .textContent()
          .catch(() => 'Unknown auth error');
        throw new Error(`Auth error: ${errorText}`);
      }

      if (authResult === 'timeout') {
        throw new Error('Auth response timeout - neither success nor error shown');
      }

      // Wait for any loading spinner to disappear
      const spinner = page.locator('[data-testid="loading-spinner"], .loading, .spinner');
      await spinner
        .waitFor({ state: 'hidden', timeout: spinnerTimeout })
        .catch(() => {
          /* spinner may not exist */
        });

      // Verify admin access
      console.log(`[adminAuth] Login successful, verifying admin access...`);

      // Navigate to admin area to confirm access
      await page.goto('/admin', { waitUntil: 'networkidle', timeout: selectorTimeout });

      // Check we're not redirected away from admin
      const currentUrl = page.url();
      if (!currentUrl.includes('/admin')) {
        throw new Error(`Admin access denied - redirected to ${currentUrl}`);
      }

      console.log(`[adminAuth] Admin login successful on attempt ${attempt}`);
      return;
    } catch (error) {
      attemptDiag.error = error instanceof Error ? error.message : String(error);
      attemptDiag.pageUrl = page.url();
      attemptDiag.pageTitle = await page.title().catch(() => 'unknown');

      // Capture visible text for debugging
      attemptDiag.visibleText = await page
        .locator('body')
        .textContent()
        .then((text) => text?.slice(0, 500) || '')
        .catch(() => '');

      diagnostics.push(attemptDiag);

      console.error(
        `[adminAuth] Attempt ${attempt}/${maxAttempts} failed: ${attemptDiag.error}`
      );

      if (attempt < maxAttempts) {
        const waitTime = backoffMs * Math.pow(2, attempt - 1);
        console.log(`[adminAuth] Waiting ${waitTime}ms before retry...`);
        await page.waitForTimeout(waitTime);
      }
    }
  }

  // All attempts failed
  const diagSummary = diagnostics
    .map(
      (d) =>
        `Attempt ${d.attempt} @ ${d.timestamp}: ${d.error}\n  URL: ${d.pageUrl}\n  Title: ${d.pageTitle}`
    )
    .join('\n\n');

  throw new Error(
    `Admin login failed after ${maxAttempts} attempts.\n\nDiagnostics:\n${diagSummary}`
  );
}

/**
 * Quick admin login without retries - use for tests that don't need robustness
 */
export async function loginAsAdmin(page: Page): Promise<void> {
  return loginAsAdminWithRetries(page, { maxAttempts: 1 });
}

/**
 * Logout from current session
 */
export async function logout(page: Page): Promise<void> {
  const userMenu = page.locator('[data-testid="user-menu-trigger"]');
  const isLoggedIn = await userMenu.isVisible().catch(() => false);

  if (!isLoggedIn) {
    console.log('[adminAuth] Not logged in, nothing to do');
    return;
  }

  await userMenu.click();
  const signOutBtn = page.locator('[data-testid="signout-button"], button:has-text("Sign Out")');
  await signOutBtn.click();

  // Wait for sign-in trigger to reappear
  const signInTrigger = page.locator('[data-testid="signin-trigger"]');
  await signInTrigger.waitFor({ state: 'visible', timeout: 10000 });

  console.log('[adminAuth] Logged out successfully');
}
