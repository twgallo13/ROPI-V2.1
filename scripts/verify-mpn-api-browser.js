/**
 * LP-phase2b-001: Verify API Response in Browser Context
 * 
 * Captures actual API response that the UI component receives
 */

const { chromium } = require('playwright');

const STAGING_URL = process.env.PREVIEW_URL || 'https://ropi-aoss-staging.web.app';
const EMAIL = 'theo@shiekh.com';
const PASSWORD = 'Admin@1234';
const TEST_PRODUCT = process.env.TEST_PRODUCT || '3-test';

async function captureApiResponse() {
  console.log('🚀 Capturing API response in browser context...');
  console.log(`📍 Target: ${STAGING_URL}`);
  console.log(`📦 Product: ${TEST_PRODUCT}`);
  
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    // Clear any caches
    ignoreHTTPSErrors: true,
  });
  const page = await context.newPage();
  
  // Disable cache
  await context.route('**/*', (route) => {
    route.continue({
      headers: {
        ...route.request().headers(),
        'Cache-Control': 'no-cache, no-store, must-revalidate',
      },
    });
  });
  
  // Capture API responses
  const apiResponses = [];
  const apiRequests = [];
  
  page.on('request', request => {
    const url = request.url();
    if (url.includes('/api/products/') && url.includes('/completion')) {
      apiRequests.push({ url, method: request.method() });
      console.log(`\n📤 API Request: ${request.method()} ${url}`);
    }
  });
  
  page.on('response', async (response) => {
    const url = response.url();
    if (url.includes('/api/products/') && url.includes('/completion')) {
      try {
        const json = await response.json();
        apiResponses.push({
          url,
          status: response.status(),
          body: json
        });
        console.log(`\n📡 API Response captured:`);
        console.log(`   URL: ${url}`);
        console.log(`   Status: ${response.status()}`);
        console.log(`   Has productIdentifiers: ${json.productIdentifiers ? '✅ YES' : '❌ NO'}`);
        if (json.productIdentifiers) {
          console.log(`   MPN: ${json.productIdentifiers.mpn}`);
          console.log(`   productId: ${json.productIdentifiers.productId}`);
        }
      } catch (e) {
        console.log(`   Error parsing response: ${e.message}`);
      }
    }
  });
  
  // Capture console logs
  page.on('console', msg => {
    const text = msg.text();
    if (text.includes('CompletionPanel') || text.includes('productIdentifiers')) {
      console.log(`🖥️  Browser Console: ${text}`);
    }
  });
  
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
    console.log(`\n📦 Navigating to /products/${TEST_PRODUCT}...`);
    await page.goto(`${STAGING_URL}/products/${TEST_PRODUCT}`);
    
    // Wait for API call
    console.log('⏳ Waiting for completion API call...');
    await page.waitForTimeout(8000); // Give plenty of time for API call
    
    console.log(`\n📊 RESULTS:`);
    console.log(`   API requests made: ${apiRequests.length}`);
    console.log(`   API responses captured: ${apiResponses.length}`);
    
    if (apiRequests.length > 0) {
      console.log(`\n📤 Requests:`);
      apiRequests.forEach((req, i) => {
        console.log(`   ${i + 1}. ${req.method} ${req.url}`);
      });
    }
    
    if (apiResponses.length > 0) {
      const completionResponse = apiResponses[apiResponses.length - 1];
      console.log(`\n✅ Full API Response Body:`);
      console.log(JSON.stringify(completionResponse.body, null, 2));
      
      if (completionResponse.body.productIdentifiers) {
        console.log(`\n✅ SUCCESS: productIdentifiers field present in API response`);
        await browser.close();
        process.exit(0);
      } else {
        console.log(`\n❌ FAILURE: productIdentifiers field MISSING from API response`);
        await browser.close();
        process.exit(1);
      }
    } else {
      console.log(`\n❌ FAILURE: No API calls captured`);
      await browser.close();
      process.exit(1);
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    await browser.close();
    process.exit(1);
  }
}

captureApiResponse();
