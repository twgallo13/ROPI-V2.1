/**
 * Authenticated Save Verification Test
 * LP-1.4.6.4 - Verify save feedback and Firestore persistence
 */
import { chromium } from 'playwright';

const EMAIL = process.env.VITE_E2E_ADMIN_EMAIL || 'theo@shiekh.com';
const PASSWORD = process.env.VITE_E2E_ADMIN_PASSWORD || '';
const PRODUCT_ID = process.env.VERIFY_PRODUCT_ID || '211737-90h1-8';
const BASE_URL = process.env.VERIFY_BASE_URL || 'https://ropi-aoss-staging.web.app';

async function main() {
  if (!PASSWORD) {
    console.error('❌ VITE_E2E_ADMIN_PASSWORD not set');
    process.exit(1);
  }

  console.log(`\n=== Authenticated Staging Verification ===`);
  console.log(`User: ${EMAIL}`);
  console.log(`Product: ${PRODUCT_ID}`);
  console.log(`URL: ${BASE_URL}\n`);

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();

  const logs = [];
  page.on('console', msg => {
    const text = `[${msg.type()}] ${msg.text()}`;
    logs.push(text);
  });

  try {
    // 1. Navigate to app
    console.log('1. Loading app...');
    await page.goto(BASE_URL);
    await page.waitForLoadState('networkidle');
    console.log('   ✅ App loaded');

    // 2. Click sign in
    console.log('2. Opening sign in modal...');
    const signInBtn = page.locator('[data-testid="signin-trigger"], button:has-text("Sign In")').first();
    await signInBtn.waitFor({ state: 'visible', timeout: 10000 });
    await signInBtn.click();

    // 3. Wait for modal
    const modal = page.locator('[data-testid="signin-modal"], .signin-modal, .modal').first();
    await modal.waitFor({ state: 'visible', timeout: 5000 });
    console.log('   ✅ Modal visible');

    // 4. Fill credentials
    console.log('3. Filling credentials...');
    await page.locator('[data-testid="email-input"], input[type="email"]').first().fill(EMAIL);
    await page.locator('[data-testid="password-input"], input[type="password"]').first().fill(PASSWORD);

    // 5. Submit
    console.log('4. Submitting sign in...');
    await page.locator('[data-testid="signin-submit"], button[type="submit"]').first().click();

    // 6. Wait for auth
    await page.waitForTimeout(3000);
    const userMenu = page.locator('[data-testid="user-menu-trigger"], [data-testid="user-display-name"]').first();
    await userMenu.waitFor({ state: 'visible', timeout: 15000 });
    console.log('   ✅ Signed in successfully');

    // 7. Navigate to product
    console.log(`5. Navigating to product ${PRODUCT_ID}...`);
    await page.goto(`${BASE_URL}/products/${PRODUCT_ID}`);
    await page.waitForTimeout(5000); // Give time for product to load

    // 8. Wait for product to load
    await page.waitForSelector('.product-header, [data-testid="product-header"]', { timeout: 30000 });
    console.log('   ✅ Product page loaded');

    // 9. Screenshot before save
    await page.screenshot({ path: `/tmp/auth-before-save-${PRODUCT_ID}.png` });

    // 10. Click Save
    console.log('6. Clicking Save button...');
    const saveBtn = page.locator('button:has-text("Save"), button:has-text("Save Draft")').first();
    await saveBtn.waitFor({ state: 'visible', timeout: 10000 });
    
    // Set up dialog handler for alert
    let alertMessage = '';
    page.on('dialog', async dialog => {
      alertMessage = dialog.message();
      console.log(`   📢 Alert: "${alertMessage}"`);
      await dialog.accept();
    });

    await saveBtn.click();
    await page.waitForTimeout(3000);

    // 11. Screenshot after save
    await page.screenshot({ path: `/tmp/auth-after-save-${PRODUCT_ID}.png` });

    // 12. Report results
    console.log('\n=== Results ===');
    
    // Check for Firestore in alert
    if (alertMessage.includes('Firestore')) {
      console.log('✅ Save feedback shows "Firestore" - PASS');
    } else if (alertMessage.includes('localStorage')) {
      console.log('⚠️  Save feedback shows "localStorage" - may indicate auth issue');
    } else if (alertMessage) {
      console.log(`ℹ️  Save alert: "${alertMessage}"`);
    } else {
      console.log('⚠️  No save alert detected');
    }

    // Check console logs
    const authLogs = logs.filter(l => l.includes('Auth') || l.includes('auth') || l.includes('user'));
    const saveLogs = logs.filter(l => l.includes('save') || l.includes('Save') || l.includes('Firestore'));
    const errorLogs = logs.filter(l => l.includes('[error]'));

    console.log(`\nAuth-related logs: ${authLogs.length}`);
    authLogs.slice(0, 5).forEach(l => console.log(`  ${l}`));

    console.log(`\nSave-related logs: ${saveLogs.length}`);
    saveLogs.forEach(l => console.log(`  ${l}`));

    if (errorLogs.length > 0) {
      console.log(`\n⚠️  Errors detected: ${errorLogs.length}`);
      errorLogs.forEach(l => console.log(`  ${l}`));
    }

    console.log(`\nScreenshots saved to:`);
    console.log(`  /tmp/auth-before-save-${PRODUCT_ID}.png`);
    console.log(`  /tmp/auth-after-save-${PRODUCT_ID}.png`);

    console.log('\n✅ Authenticated verification complete');

  } catch (err) {
    console.error('❌ Error:', err);
    await page.screenshot({ path: `/tmp/auth-error-${PRODUCT_ID}.png` });
    console.log(`Error screenshot: /tmp/auth-error-${PRODUCT_ID}.png`);
    
    console.log('\n=== Console Logs ===');
    logs.forEach(l => console.log(l));
    
    process.exit(1);
  } finally {
    await browser.close();
  }
}

main();
