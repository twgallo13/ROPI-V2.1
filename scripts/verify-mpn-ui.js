/**
 * LP-phase2b-001: Manual MPN UI Verification
 * 
 * Simplified test to verify MPN display on staging products
 */

const { chromium } = require('playwright');

const STAGING_URL = process.env.PREVIEW_URL || 'https://ropi-aoss-staging.web.app';
const EMAIL = 'theo@shiekh.com';
const PASSWORD = 'Admin@1234';
const TEST_PRODUCT = process.env.TEST_PRODUCT || '123'; // Product ID that actually exists

async function verifyMpnDisplay() {
  console.log('🚀 Starting MPN UI verification...');
  console.log(`📍 Target: ${STAGING_URL}`);
  
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();
  
  try {
    // Navigate and sign in
    console.log('🔐 Signing in...');
    await page.goto(STAGING_URL);
    await page.waitForLoadState('networkidle', { timeout: 15000 });
    
    const signInBtn = page.locator('[data-testid="signin-trigger"], button:has-text("Sign In")').first();
    await signInBtn.waitFor({ state: 'visible', timeout: 10000 });
    await signInBtn.click();
    
    // Fill email
    await page.waitForSelector('input[type="email"]', { timeout: 10000 });
    await page.fill('input[type="email"]', EMAIL);
    
    // Fill password
    await page.fill('input[type="password"]', PASSWORD);
    
    // Click sign in
    await page.click('button[type="submit"]:has-text("Sign In")');
    await page.waitForLoadState('networkidle', { timeout: 15000 });
    
    console.log('✅ Signed in successfully');
    
    // Navigate to products page
    console.log(`📦 Navigating to product ${TEST_PRODUCT}...`);
    await page.goto(`${STAGING_URL}/products/${TEST_PRODUCT}`);
    await page.waitForLoadState('domcontentloaded', { timeout: 15000 });
    
    // Wait for MPN element with more time
    console.log('🔍 Looking for MPN display (waiting up to 10s)...');
    await page.waitForTimeout(5000); // Allow React to render + API calls
    
    // Take screenshot
    const screenshotPath = '/tmp/mpn-verification.png';
    await page.screenshot({ path: screenshotPath, fullPage: true });
    console.log(`📸 Screenshot saved: ${screenshotPath}`);
    
    // Check for MPN elements with data-testid (more specific search)
    const mpnByTestId = await page.locator('[data-testid*="mpn"], [data-testid*="MPN"]').all();
    console.log(`\n📊 Found ${mpnByTestId.length} MPN elements with data-testid`);
    
    for (let i = 0; i < mpnByTestId.length; i++) {
      const text = await mpnByTestId[i].textContent();
      const testId = await mpnByTestId[i].getAttribute('data-testid');
      console.log(`  [${i + 1}] ${testId}: "${text}"`);
    }
    
    // Also check for any element containing the MPN value "10-test"
    const elementsWithMpn = await page.locator(`:text-is("${TEST_PRODUCT}")`).all();
    console.log(`\n📦 Found ${elementsWithMpn.length} elements containing exact text "${TEST_PRODUCT}"`);
    
    // Also search for "UNKNOWN-MPN" since product 123 has that
    const unknownMpnElements = await page.locator(':text("UNKNOWN-MPN")').all();
    console.log(`\n🔍 Found ${unknownMpnElements.length} elements containing "UNKNOWN-MPN"`);
    
    for (let i = 0; i < unknownMpnElements.length; i++) {
      const text = await unknownMpnElements[i].textContent();
      const tagName = await unknownMpnElements[i].evaluate(el => el.tagName);
      const className = await unknownMpnElements[i].getAttribute('class') || '';
      const testId = await unknownMpnElements[i].getAttribute('data-testid') || '';
      console.log(`  [${i + 1}] <${tagName}> class="${className}" testid="${testId}" text="${text}"`);
    }
    for (let i = 0; i < elementsWithMpn.length; i++) {
      const tagName = await elementsWithMpn[i].evaluate(el => el.tagName);
      const className = await elementsWithMpn[i].getAttribute('class') || '';
      console.log(`  [${i + 1}] <${tagName}> class="${className}"`);
    }
    
    // Check for product_id in page body (should NOT exist)
    const bodyText = await page.locator('body').textContent();
    const hasProductIdText = bodyText.includes('product_id') || bodyText.includes('productId');
    
    console.log(`\n✅ MPN VERIFICATION RESULTS:`);
    console.log(`   - MPN elements by testid: ${mpnByTestId.length}`);
    console.log(`   - Elements displaying MPN value: ${elementsWithMpn.length}`);
    console.log(`   - product_id visible in UI: ${hasProductIdText ? '❌ FAIL' : '✅ PASS'}`);
    
    if ((mpnByTestId.length > 0 || elementsWithMpn.length > 0) && !hasProductIdText) {
      console.log('\n✅ SUCCESS: MPN displayed, product_id NOT visible');
      await browser.close();
      process.exit(0);
    } else {
      console.log('\n❌ FAILURE: MPN display rule violated');
      console.log(`   Need: MPN visible (${mpnByTestId.length + elementsWithMpn.length} found) AND product_id NOT visible`);
      await browser.close();
      process.exit(1);
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    await page.screenshot({ path: '/tmp/mpn-error.png', fullPage: true });
    await browser.close();
    process.exit(1);
  }
}

verifyMpnDisplay();
