/**
 * LP-1.4.6.7 Simple Header Verification
 * Captures header display and console logs for product 211737-90h1-8ab
 */
import { chromium } from 'playwright';
import * as fs from 'fs';

const BASE_URL = 'https://ropi-aoss-staging.web.app';
const PRODUCT_ID = '211737-90h1-8ab';
const PRODUCT_URL = `${BASE_URL}/products/${PRODUCT_ID}?tab=launch`;

async function main() {
  console.log(`\n=== LP-1.4.6.7 Header Verification ===`);
  console.log(`Product: ${PRODUCT_ID}`);
  console.log(`URL: ${PRODUCT_URL}\n`);

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    recordHar: { path: '/tmp/normalize-211737-90h1-8ab-after.har' }
  });
  const page = await context.newPage();

  const consoleLogs = [];
  page.on('console', msg => {
    const text = `[${msg.type()}] ${msg.text()}`;
    consoleLogs.push(text);
    console.log(text);
  });

  try {
    console.log('Navigating to product page...');
    await page.goto(PRODUCT_URL, { waitUntil: 'domcontentloaded', timeout: 60000 });
    await page.waitForTimeout(8000); // Wait for rendering

    // Capture screenshot
    await page.screenshot({ 
      path: '/tmp/normalize-211737-90h1-8ab-ui-after-headerfix.png',
      fullPage: true 
    });
    console.log('✓ Screenshot captured');

    // Find and capture header last_received element
    const headerElement = page.locator('[data-testid="header-last-received"]').first();
    const isVisible = await headerElement.isVisible().catch(() => false);
    
    let headerValue = '—';
    let headerHTML = 'NOT FOUND';
    
    if (isVisible) {
      headerValue = await headerElement.textContent();
      headerHTML = await headerElement.evaluate(el => el.parentElement.outerHTML);
      console.log(`✓ Header last_received found: "${headerValue}"`);
    } else {
      console.log('⚠ Header last_received element not found');
    }

    // Save header HTML
    fs.writeFileSync('/tmp/product-header-211737-90h1-8ab-after.html', headerHTML);
    console.log('✓ Header HTML saved');

    // Save console logs
    fs.writeFileSync('/tmp/ui-signed-in-211737-90h1-8ab-console-after.log', consoleLogs.join('\n'));
    console.log('✓ Console logs saved');

    // Save input values summary
    const summary = `211737-90h1-8ab | last_received_header | ${headerValue} | ${headerHTML.substring(0, 200)}`;
    fs.writeFileSync('/tmp/ui-input-values.txt', summary);
    console.log('✓ Input values summary saved');

    // Check for errors
    const hasBindLog = consoleLogs.some(log => log.includes('LP-1.4.6.4 bind date'));
    const hasErrorLog = consoleLogs.some(log => log.includes('does not conform to yyyy-MM-dd'));

    console.log('\n=== Verification Results ===');
    console.log(`Header displays: ${headerValue}`);
    console.log(`Expected: 2025-12-18`);
    console.log(`Match: ${headerValue.trim() === '2025-12-18' ? '✅ PASS' : '❌ FAIL'}`);
    console.log(`Debug logs present: ${hasBindLog ? '✅ YES' : '❌ NO'}`);
    console.log(`Error logs present: ${hasErrorLog ? '❌ YES' : '✅ NO'}`);

    const passed = headerValue.trim() === '2025-12-18' && !hasErrorLog;
    
    const result = {
      productId: PRODUCT_ID,
      url: PRODUCT_URL,
      headerValue,
      expected: '2025-12-18',
      passed,
      hasBindLog,
      hasErrorLog,
      artifactsSaved: [
        '/tmp/normalize-211737-90h1-8ab-ui-after-headerfix.png',
        '/tmp/product-header-211737-90h1-8ab-after.html',
        '/tmp/ui-signed-in-211737-90h1-8ab-console-after.log',
        '/tmp/normalize-211737-90h1-8ab-after.har',
        '/tmp/ui-input-values.txt'
      ]
    };

    console.log('\n=== Final Result ===');
    console.log(JSON.stringify(result, null, 2));

    process.exit(passed ? 0 : 1);

  } catch (error) {
    console.error('❌ Error:', error.message);
    fs.writeFileSync('/tmp/verify-error.log', error.stack);
    process.exit(1);
  } finally {
    await context.close();
    await browser.close();
  }
}

main();
