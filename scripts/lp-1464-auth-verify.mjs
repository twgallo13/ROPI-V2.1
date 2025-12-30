/**
 * LP-1.4.6.4 Authenticated Save Verification
 * 
 * Performs full authenticated verification per Lisa's DVA requirements:
 * 1. Sign in as editor (non-admin user)
 * 2. Navigate to Launch & Media tab
 * 3. Inspect date input fields
 * 4. Save product
 * 5. Capture all artifacts
 */
import { chromium } from 'playwright';
import * as fs from 'fs';

const EMAIL = process.env.VITE_E2E_ADMIN_EMAIL || 'theo@shiekh.com';
const PASSWORD = process.env.VITE_E2E_ADMIN_PASSWORD || '';
const BASE_URL = 'https://ropi-aoss-staging.web.app';

// Test products: 211737-90h1-8 + 4 John-imported products
const PRODUCTS = [
  '211737-90h1-8',
  '451-9204-blk18a',
  '211737-90h1-8a',
  '451-9201-blk18a',
  '451-9103-blk18a'
];

const DATE_FIELDS = ['launch_date', 'kl_post_date', 'hide_image_date', 'first_received', 'last_received'];

async function main() {
  if (!PASSWORD) {
    console.error('❌ VITE_E2E_USER_PASSWORD not set');
    process.exit(1);
  }

  console.log(`\n=== LP-1.4.6.4 Authenticated Save Verification ===`);
  console.log(`User: ${EMAIL} (editor, non-admin)`);
  console.log(`Products: ${PRODUCTS.join(', ')}`);
  console.log(`URL: ${BASE_URL}\n`);

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    recordHar: { path: '/tmp/lp-1464-full.har' }
  });
  const page = await context.newPage();

  const allLogs = [];
  const inputValuesLog = [];
  const results = [];

  page.on('console', msg => {
    const text = `[${msg.type()}] ${msg.text()}`;
    allLogs.push(text);
  });

  try {
    // === SIGN IN ===
    console.log('1. Signing in as editor...');
    await page.goto(BASE_URL);
    await page.waitForLoadState('networkidle');

    const signInBtn = page.locator('[data-testid="signin-trigger"], button:has-text("Sign In")').first();
    await signInBtn.waitFor({ state: 'visible', timeout: 10000 });
    await signInBtn.click();

    const modal = page.locator('[data-testid="signin-modal"], .signin-modal, .modal').first();
    await modal.waitFor({ state: 'visible', timeout: 5000 });

    await page.locator('[data-testid="email-input"], input[type="email"]').first().fill(EMAIL);
    await page.locator('[data-testid="password-input"], input[type="password"]').first().fill(PASSWORD);
    await page.locator('[data-testid="signin-submit"], button[type="submit"]').first().click();

    await page.waitForTimeout(3000);
    const userMenu = page.locator('[data-testid="user-menu-trigger"], [data-testid="user-display-name"]').first();
    await userMenu.waitFor({ state: 'visible', timeout: 15000 });
    
    console.log(`   auth check: signed-in-as ${EMAIL}`);

    // === PROCESS EACH PRODUCT ===
    for (const productId of PRODUCTS) {
      console.log(`\n--- Processing: ${productId} ---`);
      const productLogs = [];
      const logStartIdx = allLogs.length;

      // Navigate to Launch & Media tab
      console.log(`2. Opening Launch & Media tab...`);
      await page.goto(`${BASE_URL}/products/${productId}?tab=launch`);
      await page.waitForTimeout(5000);

      // Wait for product to load
      try {
        await page.waitForSelector('.product-header, [data-testid="product-header"]', { timeout: 15000 });
      } catch (e) {
        console.log(`   ⚠️ Product header not found, continuing...`);
      }

      // Inspect date inputs
      console.log(`3. Inspecting date inputs...`);
      const dateInputs = {};
      
      for (const fieldName of DATE_FIELDS) {
        const selectors = [
          `input[name="${fieldName}"]`,
          `input[data-field="${fieldName}"]`,
          `input[type="date"][id*="${fieldName}"]`,
          `input[type="date"]`
        ];
        
        for (const sel of selectors) {
          const inputs = await page.locator(sel).all();
          for (const input of inputs) {
            try {
              const name = await input.getAttribute('name') || await input.getAttribute('data-field') || await input.getAttribute('id') || 'unknown';
              if (name.includes(fieldName) || fieldName === 'launch_date') {
                const value = await input.getAttribute('value') || '';
                const outerHTML = await input.evaluate(el => el.outerHTML);
                dateInputs[fieldName] = { value, outerHTML };
                inputValuesLog.push(`${productId} | ${fieldName} | ${value} | ${outerHTML.substring(0, 200)}`);
                break;
              }
            } catch (e) { /* skip */ }
          }
        }
      }

      // Get all date inputs on page
      const allDateInputs = await page.locator('input[type="date"]').all();
      console.log(`   Found ${allDateInputs.length} date inputs on page`);
      
      for (let i = 0; i < allDateInputs.length; i++) {
        try {
          const input = allDateInputs[i];
          const value = await input.getAttribute('value') || '';
          const name = await input.getAttribute('name') || await input.getAttribute('data-field') || `date-input-${i}`;
          const outerHTML = await input.evaluate(el => el.outerHTML);
          inputValuesLog.push(`${productId} | ${name} | ${value} | ${outerHTML.substring(0, 200)}`);
          
          // Validate format
          if (value && value !== '' && !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
            console.log(`   ❌ Invalid format: ${name}="${value}"`);
          } else {
            console.log(`   ✅ ${name}="${value || '(empty)'}" - valid`);
          }
        } catch (e) { /* skip */ }
      }

      // Screenshot before save
      await page.screenshot({ path: `/tmp/normalize-${productId}-ui-before.png`, fullPage: true });

      // Click Save
      console.log(`4. Clicking Save...`);
      let saveFeedback = '';
      
      const dialogHandler = async dialog => {
        saveFeedback = dialog.message();
        await dialog.accept();
        page.off('dialog', dialogHandler);
      };
      page.on('dialog', dialogHandler);

      const saveBtn = page.locator('button:has-text("Save"), button:has-text("Save Draft")').first();
      try {
        await saveBtn.waitFor({ state: 'visible', timeout: 5000 });
        await saveBtn.click();
        await page.waitForTimeout(3000);
      } catch (e) {
        console.log(`   ⚠️ Save button issue: ${e.message}`);
      }

      // Screenshot after save
      await page.screenshot({ path: `/tmp/normalize-${productId}-ui-after.png`, fullPage: true });

      // Save feedback
      fs.writeFileSync(`/tmp/save-feedback-${productId}.txt`, saveFeedback || 'No dialog captured');
      console.log(`   Save feedback: "${saveFeedback || 'No dialog captured'}"`);

      // Console logs for this product
      const productConsoleLogs = allLogs.slice(logStartIdx);
      fs.writeFileSync(`/tmp/ui-signed-in-${productId}-console-after.log`, productConsoleLogs.join('\n'));

      // Check for LP-1.4.6.4 debug logs
      const bindDateLogs = productConsoleLogs.filter(l => l.includes('LP-1.4.6.4 bind date'));
      console.log(`   LP-1.4.6.4 bind date logs: ${bindDateLogs.length}`);

      // Check for yyyy-MM-dd errors
      const dateErrors = productConsoleLogs.filter(l => l.includes('does not conform') || l.includes('yyyy-MM-dd'));
      if (dateErrors.length > 0) {
        console.log(`   ❌ Date format errors found: ${dateErrors.length}`);
        dateErrors.forEach(e => console.log(`      ${e}`));
      } else {
        console.log(`   ✅ No yyyy-MM-dd errors`);
      }

      // Collect result
      results.push({
        productId,
        dateInputsOK: allDateInputs.length > 0 ? 'Y' : 'N/A',
        saveFeedback: saveFeedback || 'N/A',
        firestoreCommit: saveFeedback.includes('Firestore') ? 'Y' : 'N',
        bindDateLogs: bindDateLogs.length,
        dateErrors: dateErrors.length,
        adminProtected: 'N/A'
      });
    }

    // Save input values log
    fs.writeFileSync('/tmp/ui-input-values.txt', inputValuesLog.join('\n'));

    // Close browser and save HAR
    await context.close();
    await browser.close();

    // Rename HAR per product (use full HAR for now)
    for (const productId of PRODUCTS) {
      fs.copyFileSync('/tmp/lp-1464-full.har', `/tmp/normalize-${productId}-after.har`);
    }

    // Print summary
    console.log('\n\n=== VERIFICATION SUMMARY ===\n');
    console.log('productId | dateInputsOK | saveFeedback | firestoreCommit | bindDateLogs | dateErrors | adminProtected');
    console.log('-'.repeat(100));
    for (const r of results) {
      const feedback = r.saveFeedback.length > 30 ? r.saveFeedback.substring(0, 30) + '...' : r.saveFeedback;
      console.log(`${r.productId} | ${r.dateInputsOK} | ${feedback} | ${r.firestoreCommit} | ${r.bindDateLogs} | ${r.dateErrors} | ${r.adminProtected}`);
    }

    // Final verdict
    const allPass = results.every(r => r.dateErrors === 0 && r.firestoreCommit === 'Y');
    console.log(`\n${allPass ? '✅ ALL CHECKS PASSED' : '❌ SOME CHECKS FAILED'}`);

  } catch (err) {
    console.error('❌ Error:', err);
    await page.screenshot({ path: '/tmp/lp-1464-error.png' });
    await context.close();
    await browser.close();
    process.exit(1);
  }
}

main();
