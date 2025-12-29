/**
 * E2E Test Helpers for ROPI AOSS
 * 
 * Provides utilities for:
 * - Firebase auth testing (email/password, Google OAuth)
 * - Firestore assertions
 * - Test user management
 */

import { Page, expect } from '@playwright/test';

// Default timeouts tuned for CI preview environments
const E2E_AUTH_TIMEOUT = 30_000; // 30s
const E2E_MODAL_TIMEOUT = 10_000; // 10s
const E2E_DEFAULT_TIMEOUT = 15_000; // 15s

/**
 * Test user credentials for E2E tests
 * Configured via environment variables for flexibility across environments
 * 
 * Required env vars:
 * - VITE_E2E_ADMIN_EMAIL / VITE_E2E_ADMIN_PASSWORD
 * - VITE_E2E_USER_EMAIL / VITE_E2E_USER_PASSWORD
 * - VITE_E2E_UNVERIFIED_EMAIL / VITE_E2E_UNVERIFIED_PASSWORD
 * 
 * These users should be created in Firebase Auth for the staging project
 */

// Fail fast if required env vars are missing
const requiredEnvVars = [
  'VITE_E2E_ADMIN_EMAIL',
  'VITE_E2E_ADMIN_PASSWORD',
  'VITE_E2E_USER_EMAIL',
  'VITE_E2E_USER_PASSWORD',
  'VITE_E2E_UNVERIFIED_EMAIL',
  'VITE_E2E_UNVERIFIED_PASSWORD',
];

for (const envVar of requiredEnvVars) {
  if (!process.env[envVar]) {
    throw new Error(
      `Missing required E2E environment variable: ${envVar}\n` +
      `See packages/web/.env.e2e.example for configuration.`
    );
  }
}

export const TEST_USERS = {
  admin: {
    email: process.env.VITE_E2E_ADMIN_EMAIL!,
    password: process.env.VITE_E2E_ADMIN_PASSWORD!,
    displayName: 'Test Admin',
    role: 'admin',
  },
  regularUser: {
    email: process.env.VITE_E2E_USER_EMAIL!,
    password: process.env.VITE_E2E_USER_PASSWORD!,
    displayName: 'Test User',
    role: undefined, // no role = regular user
  },
  unverifiedUser: {
    email: process.env.VITE_E2E_UNVERIFIED_EMAIL!,
    password: process.env.VITE_E2E_UNVERIFIED_PASSWORD!,
    displayName: 'Test Unverified',
    emailVerified: false,
  },
};

/**
 * Sign in with email/password using the SignInModal
 * 
 * Flow:
 * 1. Click the "Sign In" button in TopBar to open the modal
 * 2. Wait for modal to appear
 * 3. Fill email and password fields
 * 4. Submit the form
 * 5. Wait for modal to close and user menu to appear
 */
export async function signInWithEmail(
  page: Page,
  email: string,
  password: string
) {
  // Navigate to preview URL if provided (CI), else root
  const baseUrl = process.env.PREVIEW_URL || '/';
  await page.goto(baseUrl, { waitUntil: 'domcontentloaded' });
  // Give the preview some extra time to settle in CI
  await page.waitForLoadState('networkidle', { timeout: E2E_AUTH_TIMEOUT });
  
  // Click the Sign In button in TopBar to open modal
  const signInTrigger = page.locator('[data-testid="signin-trigger"]');
  await signInTrigger.waitFor({ state: 'visible', timeout: 10000 });
  await signInTrigger.click();
  
  // Wait for modal to appear
  const modal = page.locator('[data-testid="signin-modal"]');
  await modal.waitFor({ state: 'visible', timeout: E2E_MODAL_TIMEOUT });
  
  // Fill in email/password using data-testid selectors
  await page.locator('[data-testid="email-input"]').fill(email);
  await page.locator('[data-testid="password-input"]').fill(password);
  
  // Submit form
  await page.locator('[data-testid="signin-submit"]').click();

  // First, wait for the modal to close (UI unlock), then for auth to settle
  await modal.waitFor({ state: 'hidden', timeout: E2E_MODAL_TIMEOUT });

  // Wait for Firebase auth state to be written to localStorage (generic check)
  await page.waitForFunction(
    () => {
      try {
        for (let i = 0; i < window.localStorage.length; i++) {
          const key = window.localStorage.key(i) || '';
          if (key.startsWith('firebase:authUser:') || key.startsWith('firebase:authToken:')) {
            const v = window.localStorage.getItem(key);
            if (v && v.length > 0) return true;
          }
        }
      } catch (_) {}
      return false;
    },
    { timeout: E2E_AUTH_TIMEOUT }
  );

  // Give the app a moment to render the TopBar user menu after auth state is ready
  await page.waitForLoadState('networkidle', { timeout: E2E_DEFAULT_TIMEOUT });

  // Finally, wait for user menu to appear (indicates successful sign-in)
  await page.locator('[data-testid="user-menu-trigger"]').waitFor({ state: 'visible', timeout: E2E_AUTH_TIMEOUT });
}

/**
 * Sign out via the user dropdown menu
 */
export async function signOut(page: Page) {
  // Click user menu to open dropdown
  const userMenu = page.locator('[data-testid="user-menu-trigger"]');
  if (await userMenu.isVisible()) {
    await userMenu.click();
    
    // Wait for dropdown and click sign out
    const signOutButton = page.locator('[data-testid="signout-button"]');
    await signOutButton.waitFor({ state: 'visible', timeout: 3000 });
    await signOutButton.click();
    
    // Wait for sign-in button to appear (indicates signed out)
    await page.locator('[data-testid="signin-trigger"]').waitFor({ state: 'visible', timeout: 5000 });
  }
}

/**
 * Check if user is signed in by looking for user menu trigger
 */
export async function isSignedIn(page: Page): Promise<boolean> {
  const userMenu = page.locator('[data-testid="user-menu-trigger"]');
  return await userMenu.isVisible({ timeout: 2000 }).catch(() => false);
}

/**
 * Wait for email verification banner to appear
 */
export async function waitForEmailVerificationBanner(page: Page, timeout = 5000) {
  // First try data-testid, then fall back to text content
  const banner = page.locator('[data-testid="email-verification-banner"]');
  try {
    await banner.waitFor({ timeout, state: 'visible' });
  } catch {
    // Fallback to text-based selector
    await page.waitForSelector(
      'text=/verify.*email|email.*verification/i',
      { timeout, state: 'visible' }
    );
  }
}

/**
 * Check if email verification banner is visible
 */
export async function hasEmailVerificationBanner(page: Page): Promise<boolean> {
  const banner = page.locator('[data-testid="email-verification-banner"]');
  const hasByTestId = await banner.isVisible({ timeout: 2000 }).catch(() => false);
  if (hasByTestId) return true;
  
  // Fallback to text-based selector
  const textBanner = page.locator('text=/verify.*email|email.*verification/i');
  return await textBanner.isVisible({ timeout: 2000 }).catch(() => false);
}

/**
 * Navigate to Launch Calendar page
 */
export async function navigateToLaunchCalendar(page: Page) {
  await page.goto('/launch-calendar');
  await page.waitForLoadState('domcontentloaded');
  // Wait for the launch calendar heading to appear
  await page.locator('h1:has-text("Launch Calendar")').waitFor({ state: 'visible', timeout: 10000 });
}

/**
 * Navigate to Observations page
 */
export async function navigateToObservations(page: Page) {
  await page.goto('/observations');
  await page.waitForLoadState('domcontentloaded');
  // Wait for the observations heading to appear
  await page.locator('h1:has-text("Observations")').waitFor({ state: 'visible', timeout: 10000 });
}

/**
 * Sign up for a launch (click "NOTIFY ME" button)
 */
export async function signUpForLaunch(page: Page, launchId: string) {
  // Find launch card by launchId or name
  const launchCard = page.locator(`[data-launch-id="${launchId}"]`).first();
  
  // Click "NOTIFY ME" button
  const notifyButton = launchCard.locator('button:has-text("NOTIFY ME"), button:has-text("Notify")').first();
  await notifyButton.click();
  
  // Wait for success message - matches "You're in. We'll notify you..." or similar
  await page.waitForSelector(
    'text=/You\'re in|success|registered|signed up/i',
    { timeout: 5000 }
  );
}

/**
 * Create an observation
 */
export async function createObservation(
  page: Page,
  productId: string,
  observation: {
    title: string;
    description: string;
    severity: 'critical' | 'high' | 'medium' | 'low';
  }
) {
  // Navigate to product editor with this product
  await page.goto(`/app/products/${productId}`);
  
  // Open observations panel
  const observationsTab = page.locator('button:has-text("Observations"), [role="tab"]:has-text("Observations")');
  await observationsTab.click();
  
  // Click "Add Observation" button
  const addButton = page.locator('button:has-text("Add Observation")');
  await addButton.click();
  
  // Fill in observation form
  await page.fill('input[name="title"], input[placeholder*="title"]', observation.title);
  await page.fill(
    'textarea[name="description"], textarea[placeholder*="description"]',
    observation.description
  );
  await page.selectOption(
    'select[name="severity"], select:near(:text("severity"))',
    observation.severity
  );
  
  // Submit
  await page.locator('button[type="submit"]:has-text("Save"), button:has-text("Create")').click();
  
  // Wait for success
  await page.waitForSelector('text=/success|created/i', { timeout: 5000 });
}

/**
 * Resolve an observation
 */
export async function resolveObservation(page: Page, observationId: string) {
  // Find observation by ID
  const observation = page.locator(`[data-observation-id="${observationId}"]`);
  
  // Click resolve button
  const resolveButton = observation.locator('button:has-text("Resolve")');
  await resolveButton.click();
  
  // Confirm if needed
  const confirmButton = page.locator('button:has-text("Confirm"), button:has-text("Yes")');
  if (await confirmButton.isVisible({ timeout: 1000 })) {
    await confirmButton.click();
  }
  
  // Wait for status change
  await page.waitForSelector(`[data-observation-id="${observationId}"][data-status="resolved"]`, {
    timeout: 5000,
  });
}

/**
 * Generate unique test identifiers
 */
export function generateTestId(prefix: string): string {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Wait for Firestore operation to complete
 * (Uses timeout instead of networkidle which may hang on persistent connections)
 */
export async function waitForFirestoreWrite(page: Page, timeout = 3000) {
  // Use simple timeout instead of networkidle which can hang on WebSocket/Firestore connections
  await page.waitForTimeout(timeout > 1000 ? 1500 : timeout);
}
