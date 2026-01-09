/**
 * Extract Firebase Auth Token from Staging
 * 
 * This script signs in to staging using Playwright and extracts the Firebase ID token
 * from localStorage. The token can then be used for API authentication in verification scripts.
 * 
 * Usage:
 *   node scripts/extract-staging-token.js
 * 
 * Environment Variables:
 *   STAGING_HOST - Staging hostname (default: ropi-aoss-staging.web.app)
 *   VITE_E2E_ADMIN_EMAIL - Admin email (default: theo@shiekh.com)
 *   VITE_E2E_ADMIN_PASSWORD - Admin password (required)
 */

const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

const STAGING_HOST = process.env.STAGING_HOST || 'ropi-aoss-staging.web.app';
const BASE_URL = `https://${STAGING_HOST}`;
const EMAIL = process.env.VITE_E2E_ADMIN_EMAIL || 'theo@shiekh.com';
const PASSWORD = process.env.VITE_E2E_ADMIN_PASSWORD;

if (!PASSWORD) {
  console.error('❌ ERROR: VITE_E2E_ADMIN_PASSWORD not set');
  console.error('Set it with: export VITE_E2E_ADMIN_PASSWORD="<password>"');
  process.exit(1);
}

async function extractToken() {
  console.log('🚀 Launching browser to extract Firebase token from staging...');
  console.log(`📍 Staging URL: ${BASE_URL}`);
  console.log(`👤 User: ${EMAIL}`);

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();

  try {
    // Navigate to staging
    console.log('🌐 Navigating to staging...');
    await page.goto(BASE_URL, { waitUntil: 'networkidle', timeout: 30000 });

    // Wait for page to load
    await page.waitForTimeout(2000);

    // Check if already signed in (look for sign out button or user indicator)
    const isSignedIn = await page.locator('button:has-text("Sign Out"), [data-testid="user-menu"]').count() > 0;

    if (!isSignedIn) {
      console.log('🔐 Signing in...');

      // Look for sign in button/link (data-testid="signin-trigger")
      const signInButton = page.locator('[data-testid="signin-trigger"], a:has-text("Sign In"), button:has-text("Sign In")').first();
      if (await signInButton.count() > 0) {
        await signInButton.click();
        await page.waitForTimeout(2000);
      }

      // Wait for modal to appear
      await page.waitForSelector('[data-testid="signin-modal"], .signin-modal-overlay', { timeout: 5000 }).catch(() => {});

      // Fill in credentials in the modal
      const emailInput = page.locator('input[type="email"], input[name="email"]').first();
      const passwordInput = page.locator('input[type="password"], input[name="password"]').first();

      await emailInput.waitFor({ state: 'visible', timeout: 5000 });
      await emailInput.fill(EMAIL);
      await passwordInput.fill(PASSWORD);

      // Click submit button within modal (more specific selector)
      const submitButton = page.locator('[data-testid="signin-modal"] button[type="submit"], .signin-modal button[type="submit"], button[type="submit"]:has-text("Sign In")').first();
      await submitButton.waitFor({ state: 'visible', timeout: 5000 });
      await submitButton.click();

      console.log('⏳ Waiting for authentication...');
      await page.waitForTimeout(5000);

      // Take a screenshot to see current state
      await page.screenshot({ path: '/tmp/after-signin.png', fullPage: true });
      console.log('📸 Screenshot saved to /tmp/after-signin.png');

      // Wait for navigation or success indicator
      try {
        await page.waitForURL(url => !url.pathname.includes('login') && !url.pathname.includes('signin'), { timeout: 10000 });
        console.log('✅ URL changed after sign in');
      } catch (e) {
        console.warn('⚠️  URL did not change after sign in (may already be on app page)');
        console.warn(`Current URL: ${page.url()}`);
      }

      // Check if there's an error message
      const errorMsg = await page.locator('.error, .alert-error, [role="alert"]').textContent().catch(() => null);
      if (errorMsg) {
        console.error(`🚨 Sign in error message: ${errorMsg}`);
      }
    } else {
      console.log('✅ Already signed in');
    }

    // Wait a bit more to ensure Firebase has initialized
    await page.waitForTimeout(3000);

    // Extract Firebase token from localStorage OR IndexedDB
    console.log('🔍 Extracting Firebase ID token...');
    
    // First, try IndexedDB (Firebase v9+ uses IndexedDB)
    const tokenFromIDB = await page.evaluate(async () => {
      return new Promise((resolve) => {
        try {
          const request = indexedDB.open('firebaseLocalStorageDb');
          
          request.onsuccess = (event) => {
            const db = event.target.result;
            const transaction = db.transaction(['firebaseLocalStorage'], 'readonly');
            const store = transaction.objectStore('firebaseLocalStorage');
            const getAllRequest = store.getAll();
            
            getAllRequest.onsuccess = () => {
              const allData = getAllRequest.result;
              console.log(`Found ${allData.length} items in firebaseLocalStorage`);
              
              // Look for auth data
              for (const item of allData) {
                if (item.value && item.value.stsTokenManager) {
                  const token = item.value.stsTokenManager.accessToken;
                  if (token) {
                    console.log(`Found token in IndexedDB (length: ${token.length})`);
                    resolve(token);
                    return;
                  }
                }
              }
              resolve(null);
            };
            
            getAllRequest.onerror = () => {
              console.error('Error reading firebaseLocalStorage');
              resolve(null);
            };
          };
          
          request.onerror = () => {
            console.error('Error opening firebaseLocalStorageDb');
            resolve(null);
          };
        } catch (e) {
          console.error('IndexedDB error:', e);
          resolve(null);
        }
      });
    });

    let token = tokenFromIDB;

    if (!token) {
      console.log('⚠️  Token not found in IndexedDB, trying localStorage...');
      
      // Fallback: try localStorage
      token = await page.evaluate(() => {
        const keys = Object.keys(localStorage);
        const firebaseKeys = keys.filter(k => k.startsWith('firebase:auth'));
        
        if (firebaseKeys.length === 0) {
          return null;
        }

        const authKey = firebaseKeys[0];
        const authData = localStorage.getItem(authKey);
        
        if (!authData) {
          return null;
        }

        try {
          const parsed = JSON.parse(authData);
          return parsed.stsTokenManager?.accessToken || parsed.accessToken || null;
        } catch (e) {
          console.error('Failed to parse auth data:', e);
          return null;
        }
      });
    }

    if (!token) {
      console.error('❌ ERROR: Could not extract Firebase token from localStorage');
      console.error('Possible reasons:');
      console.error('  - Sign in failed');
      console.error('  - Firebase not initialized');
      console.error('  - Token stored in different location');
      await browser.close();
      process.exit(1);
    }

    console.log('✅ Token extracted successfully!');
    console.log(`📏 Token length: ${token.length} characters`);
    console.log(`🔑 Token prefix: ${token.substring(0, 20)}...`);

    // Save token to file
    const tokenFilePath = path.join(__dirname, '..', 'inventory', 'LP-phase2b-001', 'evidence', '.staging-token');
    fs.writeFileSync(tokenFilePath, token, 'utf8');
    console.log(`💾 Token saved to: ${tokenFilePath}`);

    // Print export command
    console.log('\n✅ SUCCESS! Set token with:');
    console.log(`export STAGING_API_TOKEN="${token}"`);
    console.log('\nOr load from file:');
    console.log(`export STAGING_API_TOKEN="$(cat ${tokenFilePath})"`);

    // Test token with a simple API call
    console.log('\n🧪 Testing token with API call...');
    const response = await page.request.get(`${BASE_URL}/api/products?limit=5`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Accept': 'application/json'
      }
    });

    if (response.ok()) {
      const data = await response.json();
      console.log(`✅ Token valid! Retrieved ${Array.isArray(data) ? data.length : 'N/A'} products`);
    } else {
      console.warn(`⚠️  API call returned status ${response.status()}`);
      const text = await response.text();
      console.warn(`Response: ${text.substring(0, 200)}`);
    }

    await browser.close();
    return token;

  } catch (error) {
    console.error('❌ ERROR during token extraction:', error.message);
    await browser.close();
    process.exit(1);
  }
}

// Run extraction
extractToken()
  .then(token => {
    console.log('\n✅ Token extraction complete');
    console.log('Next steps:');
    console.log('1. Set token: export STAGING_API_TOKEN="$(cat inventory/LP-phase2b-001/evidence/.staging-token)"');
    console.log('2. Discover products: ./scripts/verify-api-mpn.sh (or run product discovery)');
    console.log('3. Run full verification sequence');
    process.exit(0);
  })
  .catch(error => {
    console.error('❌ Fatal error:', error);
    process.exit(1);
  });
