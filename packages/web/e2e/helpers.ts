/**
 * E2E Test Helpers for ROPI AOSS
 * 
 * Provides utilities for:
 * - Firebase auth testing (email/password, Google OAuth)
 * - Firestore assertions
 * - Test user management
 */

import { Page, expect } from '@playwright/test';

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
 * Sign in with email/password
 */
export async function signInWithEmail(
  page: Page,
  email: string,
  password: string
) {
  // Navigate to sign-in page
  await page.goto('/');
  
  // Look for sign-in UI (adjust selectors based on actual UI)
  const signInButton = page.locator('button:has-text("Sign In"), a:has-text("Sign In")').first();
  if (await signInButton.isVisible()) {
    await signInButton.click();
  }
  
  // Fill in email/password
  await page.fill('input[type="email"], input[name="email"]', email);
  await page.fill('input[type="password"], input[name="password"]', password);
  
  // Submit form
  await page.locator('button[type="submit"]:has-text("Sign"), button:has-text("Log In")').click();
  
  // Wait for redirect to /app
  await page.waitForURL(/\/app/, { timeout: 10000 });
}

/**
 * Sign out
 */
export async function signOut(page: Page) {
  // Look for sign-out button (adjust selectors based on actual UI)
  const signOutButton = page.locator('button:has-text("Sign Out"), button:has-text("Logout")');
  
  if (await signOutButton.isVisible()) {
    await signOutButton.click();
    
    // Wait for redirect to home
    await page.waitForURL(/^\/$|\/(?!app)/, { timeout: 5000 });
  }
}

/**
 * Check if user is signed in
 */
export async function isSignedIn(page: Page): Promise<boolean> {
  // Check for presence of auth UI elements
  const signOutButton = page.locator('button:has-text("Sign Out"), button:has-text("Logout")');
  return await signOutButton.isVisible();
}

/**
 * Wait for email verification banner to appear
 */
export async function waitForEmailVerificationBanner(page: Page, timeout = 5000) {
  await page.waitForSelector(
    'text=/verify.*email|email.*verification/i',
    { timeout, state: 'visible' }
  );
}

/**
 * Check if email verification banner is visible
 */
export async function hasEmailVerificationBanner(page: Page): Promise<boolean> {
  const banner = page.locator('text=/verify.*email|email.*verification/i');
  return await banner.isVisible({ timeout: 2000 }).catch(() => false);
}

/**
 * Navigate to Launch Calendar page
 */
export async function navigateToLaunchCalendar(page: Page) {
  await page.goto('/app/launch-calendar');
  await page.waitForLoadState('networkidle');
}

/**
 * Navigate to Observations page
 */
export async function navigateToObservations(page: Page) {
  await page.goto('/app/observations');
  await page.waitForLoadState('networkidle');
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
  
  // Wait for success message
  await page.waitForSelector(
    'text=/success|registered|signed up/i',
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
 * (Polls for network idle after Firestore writes)
 */
export async function waitForFirestoreWrite(page: Page, timeout = 3000) {
  await page.waitForLoadState('networkidle', { timeout });
  // Additional wait for Firestore real-time updates
  await page.waitForTimeout(500);
}
