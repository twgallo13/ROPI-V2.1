/**
 * LP-1.4.6.4 Staging Verification Script
 * Uses Playwright to verify date input bindings in staging
 */
const { chromium } = require('playwright');
const fs = require('fs');

const STAGING_URL = 'https://ropi-aoss-staging.web.app';
const PRODUCTS = ['211737-90h1-8', '451-9204-blk18a', '211737-90h1-8a'];

async function verifyProduct(page, productId) {
  const results = {
    productId,
    url: `${STAGING_URL}/products/${productId}?tab=launch`,
    dateInputs: [],
    consoleErrors: [],
    debugLogs: [],
    passed: true
  };

  // Collect console messages
  const consoleMessages = [];
  page.on('console', msg => {
    const text = msg.text();
    consoleMessages.push({ type: msg.type(), text });
    
    if (text.includes('LP-1.4.6.4 bind date')) {
      results.debugLogs.push(text);
    }
    if (text.includes('does not conform to the required format')) {
      results.consoleErrors.push(text);
      results.passed = false;
    }
  });

  try {
    console.log(`\n=== Verifying ${productId} ===`);
    await page.goto(results.url, { waitUntil: 'domcontentloaded', timeout: 60000 });
    
    // Wait for page to render
    await page.waitForTimeout(5000);
    
    // Find all date inputs
    const dateInputs = await page.locator('input[type="date"]').all();
    console.log(`  Found ${dateInputs.length} date inputs`);
    
    for (const input of dateInputs) {
      const name = await input.getAttribute('name') || await input.getAttribute('data-field') || 'unknown';
      const value = await input.getAttribute('value') || '';
      const outerHTML = await input.evaluate(el => el.outerHTML);
      
      results.dateInputs.push({
        name,
        value,
        outerHTML: outerHTML.substring(0, 200) + '...',
        valid: value === '' || /^\d{4}-\d{2}-\d{2}$/.test(value)
      });
      
      // Check if value is valid YYYY-MM-DD or empty
      if (value && !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
        console.log(`  ❌ Invalid date value: ${name} = "${value}"`);
        results.passed = false;
      } else {
        console.log(`  ✅ Valid date value: ${name} = "${value || '(empty)'}"`);
      }
    }
    
    // Take screenshot
    const screenshotPath = `/tmp/normalize-${productId}-ui-after.png`;
    await page.screenshot({ path: screenshotPath, fullPage: true });
    console.log(`  Screenshot saved: ${screenshotPath}`);
    
  } catch (error) {
    console.error(`  Error verifying ${productId}:`, error.message);
    results.error = error.message;
    results.passed = false;
  }
  
  // Save console log
  const consoleLogPath = `/tmp/ui-signed-in-${productId}-console-after.log`;
  fs.writeFileSync(consoleLogPath, consoleMessages.map(m => `[${m.type}] ${m.text}`).join('\n'));
  
  return results;
}

async function main() {
  console.log('LP-1.4.6.4 Staging Verification');
  console.log('================================\n');
  
  const browser = await chromium.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  
  const context = await browser.newContext({
    viewport: { width: 1920, height: 1080 }
  });
  
  const page = await context.newPage();
  
  const allResults = [];
  const inputValuesLines = [];
  
  for (const productId of PRODUCTS) {
    const result = await verifyProduct(page, productId);
    allResults.push(result);
    
    // Add to input values file
    for (const input of result.dateInputs) {
      inputValuesLines.push(`${productId} | ${input.name} | ${input.value} | ${input.outerHTML}`);
    }
  }
  
  await browser.close();
  
  // Save combined input values
  fs.writeFileSync('/tmp/ui-input-values.txt', inputValuesLines.join('\n'));
  
  // Summary
  console.log('\n\n=== VERIFICATION SUMMARY ===\n');
  
  let allPassed = true;
  for (const result of allResults) {
    const status = result.passed ? '✅ PASS' : '❌ FAIL';
    console.log(`${result.productId}: ${status}`);
    
    if (result.debugLogs.length > 0) {
      console.log(`  Debug logs: ${result.debugLogs.length} LP-1.4.6.4 entries`);
    }
    if (result.consoleErrors.length > 0) {
      console.log(`  Console errors: ${result.consoleErrors.length}`);
      result.consoleErrors.forEach(e => console.log(`    - ${e}`));
    }
    if (!result.passed) allPassed = false;
  }
  
  console.log('\n' + (allPassed ? '✅ ALL PRODUCTS PASSED' : '❌ SOME PRODUCTS FAILED'));
  
  // Save full results
  fs.writeFileSync('/tmp/verification-results.json', JSON.stringify(allResults, null, 2));
  
  process.exit(allPassed ? 0 : 1);
}

main().catch(e => {
  console.error('Fatal error:', e);
  process.exit(1);
});
