/**
 * Verify URL routing - check if /products/18-test stays on that URL or redirects
 */

const { chromium } = require('playwright');

const STAGING_URL = process.env.PREVIEW_URL || 'https://ropi-aoss-staging.web.app';
const EMAIL = 'theo@shiekh.com';
const PASSWORD = 'Admin@1234';
const TEST_PRODUCT = process.env.TEST_PRODUCT || '18-test';

async function verifyRouting() {
  console.log('🚀 Verifying URL routing...');
  console.log(`📍 Target: ${STAGING_URL}`);
  console.log(`📦 Product: ${TEST_PRODUCT}`);
  
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();
  
  try {
    // Sign in
    console.log('\n🔐 Signing in...');
    await page.goto(STAGING_URL);
    await page.waitForLoadState('networkidle', { timeout: 15000 });
    
    const signInBtn = page.locator('[data-testid="signin-trigger"], button:has-text("Sign In")').first();
    await signInBtn.waitFor({ state: 'visible', timeout: 10000 });
    await signInBtn.click();
    
    await page.waitForSelector('input[type="email"]', { timeout: 10000 });
    await page.fill('input[type="email"]', EMAIL);
    await page.fill('input[type="password"]', PASSWORD);
    await page.click('button[type="submit"]:has-text("Sign In")');
    await page.waitForLoadState('networkidle', { timeout: 15000 });
    
    console.log('✅ Signed in successfully');
    
    // Navigate to product page
    const targetUrl = `${STAGING_URL}/products/${TEST_PRODUCT}`;
    console.log(`\n📦 Navigating to: ${targetUrl}`);
    await page.goto(targetUrl);
    await page.waitForLoadState('domcontentloaded', { timeout: 15000 });
    await page.waitForTimeout(2000); // Wait for any redirects
    
    const finalUrl = page.url();
    console.log(`📍 Final URL: ${finalUrl}`);
    
    if (finalUrl === targetUrl) {
      console.log('✅ URL stayed the same - no redirect');
    } else {
      console.log('⚠️  URL CHANGED - possible redirect!');
      console.log(`   Expected: ${targetUrl}`);
      console.log(`   Got:      ${finalUrl}`);
    }
    
    // Check what the page title shows
    const title = await page.title();
    console.log(`\n📄 Page title: ${title}`);
    
    // Take screenshot
    await page.screenshot({ path: '/tmp/routing-test.png', fullPage: false });
    console.log('📸 Screenshot: /tmp/routing-test.png');
    
    await browser.close();
    process.exit(0);
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    await browser.close();
    process.exit(1);
  }
}

verifyRouting();
