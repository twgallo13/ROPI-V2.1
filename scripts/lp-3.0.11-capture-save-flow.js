#!/usr/bin/env node
/**
 * LP-3.0.11: Capture network/console during Attribute Manager Save click
 * 
 * This script:
 * 1. Opens staging in headless Chrome
 * 2. Signs in as admin
 * 3. Navigates to /settings/attributes
 * 4. Opens "New Attribute" form
 * 5. Fills label field (leaves ID blank to test auto-generation)
 * 6. Clicks Save
 * 7. Captures all network requests and console logs
 * 
 * Run: node scripts/lp-3.0.11-capture-save-flow.js
 */

const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const STAGING_URL = 'https://ropi-aoss-staging.web.app';

async function getAdminToken() {
  try {
    const token = execSync('node scripts/get-admin-token.js 2>/dev/null', {
      encoding: 'utf8',
      cwd: path.resolve(__dirname, '..')
    }).trim();
    return token;
  } catch (e) {
    console.error('Failed to get admin token:', e.message);
    return null;
  }
}

async function main() {
  console.log('LP-3.0.11 Attribute Create/Save Flow Capture');
  console.log('=============================================\n');

  // Get admin token
  console.log('1. Getting admin token...');
  const token = await getAdminToken();
  if (!token) {
    console.error('ERROR: Could not obtain admin token');
    process.exit(1);
  }
  console.log(`   Token obtained (length: ${token.length})\n`);

  // Launch browser
  console.log('2. Launching headless browser...');
  const browser = await puppeteer.launch({
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage']
  });

  const context = await browser.createBrowserContext();
  const page = await context.newPage();

  // Set viewport
  await page.setViewport({ width: 1920, height: 1080 });

  // Capture ALL console messages
  const consoleMsgs = [];
  page.on('console', msg => {
    consoleMsgs.push({
      type: msg.type(),
      text: msg.text(),
      location: msg.location(),
      timestamp: new Date().toISOString()
    });
  });

  // Capture page errors
  page.on('pageerror', error => {
    consoleMsgs.push({
      type: 'pageerror',
      text: `Page Error: ${error.message}`,
      stack: error.stack,
      timestamp: new Date().toISOString()
    });
  });

  // Capture ALL network requests/responses
  const network = [];
  
  page.on('request', req => {
    network.push({
      type: 'request',
      url: req.url(),
      method: req.method(),
      headers: req.headers(),
      postData: req.postData(),
      timestamp: new Date().toISOString()
    });
  });

  page.on('response', async resp => {
    try {
      const url = resp.url();
      // Only capture API responses in detail
      if (url.includes('/api/')) {
        let body = '<not-read>';
        try {
          body = await resp.text();
        } catch {}
        network.push({
          type: 'response',
          url: url,
          status: resp.status(),
          headers: resp.headers(),
          body: body,
          timestamp: new Date().toISOString()
        });
      } else {
        network.push({
          type: 'response',
          url: url,
          status: resp.status(),
          timestamp: new Date().toISOString()
        });
      }
    } catch {}
  });

  page.on('requestfailed', req => {
    network.push({
      type: 'requestfailed',
      url: req.url(),
      method: req.method(),
      failure: req.failure()?.errorText,
      timestamp: new Date().toISOString()
    });
  });

  try {
    // Set authorization header for all requests
    console.log('3. Setting authorization headers...');
    await page.setExtraHTTPHeaders({
      'Authorization': `Bearer ${token}`
    });

    // Navigate to home first (for Firebase auth)
    console.log('4. Navigating to staging...');
    await page.goto(STAGING_URL, { waitUntil: 'networkidle2', timeout: 60000 });
    await page.screenshot({ path: 'screenshots/lp-3.0.11-01-home.png' });

    // Inject token into localStorage for Firebase auth
    console.log('5. Setting Firebase auth token...');
    await page.evaluate((tok) => {
      // Store token for potential auth usage
      localStorage.setItem('firebase:authUser:AIzaSyD1aYB4AfqU5n1YfSOtLX5nbEYbnlTfcZ8:[DEFAULT]', JSON.stringify({
        uid: 'zmAn8kKTE3ZW3fM386d8tiWW97U2',
        email: 'theo@shiekh.com',
        stsTokenManager: {
          accessToken: tok
        }
      }));
    }, token);

    // Navigate to attributes page
    console.log('6. Navigating to /settings/attributes...');
    await page.goto(`${STAGING_URL}/settings/attributes`, { waitUntil: 'networkidle2', timeout: 60000 });
    await new Promise(r => setTimeout(r, 3000));
    await page.screenshot({ path: 'screenshots/lp-3.0.11-02-attributes-page.png' });

    // Look for New Attribute button
    console.log('7. Looking for New Attribute button...');
    const newBtnSelector = '[data-testid="new-attribute-button"]';
    const newBtn = await page.$(newBtnSelector);
    
    if (!newBtn) {
      console.log('   New Attribute button not found - checking if sign-in required...');
      await page.screenshot({ path: 'screenshots/lp-3.0.11-03-no-button.png' });
      
      // Try to sign in via UI
      const signInTrigger = await page.$('[data-testid="signin-trigger"]');
      if (signInTrigger) {
        console.log('   Found sign-in trigger, attempting sign-in...');
        await signInTrigger.click();
        await new Promise(r => setTimeout(r, 2000));
        
        // Fill email/password from env
        const emailInput = await page.$('[data-testid="email-input"]');
        const pwdInput = await page.$('[data-testid="password-input"]');
        if (emailInput && pwdInput) {
          await emailInput.type('theo@shiekh.com');
          await pwdInput.type(process.env.VITE_E2E_ADMIN_PASSWORD || 'test');
          const submitBtn = await page.$('[data-testid="signin-submit"]');
          if (submitBtn) {
            await submitBtn.click();
            await new Promise(r => setTimeout(r, 5000));
          }
        }
        await page.screenshot({ path: 'screenshots/lp-3.0.11-04-after-signin.png' });
        
        // Navigate to attributes again
        await page.goto(`${STAGING_URL}/settings/attributes`, { waitUntil: 'networkidle2', timeout: 60000 });
        await new Promise(r => setTimeout(r, 3000));
      }
    }

    // Try again to find button
    const newBtnRetry = await page.$(newBtnSelector);
    if (!newBtnRetry) {
      console.log('   ERROR: Still cannot find New Attribute button');
      await page.screenshot({ path: 'screenshots/lp-3.0.11-05-final-state.png' });
    } else {
      console.log('   Found New Attribute button, clicking...');
      await newBtnRetry.click();
      await new Promise(r => setTimeout(r, 2000));
      await page.screenshot({ path: 'screenshots/lp-3.0.11-06-new-attr-modal.png' });

      // Fill label field (leave ID blank)
      console.log('8. Filling label field...');
      const labelInput = await page.$('[data-testid="attribute-label-input"]');
      if (labelInput) {
        await labelInput.type(`LP3011 Test Attr ${Date.now()}`);
        await new Promise(r => setTimeout(r, 500));
      }

      // Select data type
      const dataTypeSelect = await page.$('[data-testid="data-type-select"]');
      if (dataTypeSelect) {
        await dataTypeSelect.select('string');
      }

      // Fill category
      const categoryInput = await page.$('[data-testid="category-input"]');
      if (categoryInput) {
        await categoryInput.type('testing');
      }

      await page.screenshot({ path: 'screenshots/lp-3.0.11-07-form-filled.png' });

      // Clear network/console before Save to focus on save flow
      console.log('9. Clearing logs before Save...');
      const preSaveNetworkCount = network.length;
      const preSaveConsoleCount = consoleMsgs.length;

      // Click Save
      console.log('10. Clicking Save button...');
      const saveBtn = await page.$('[data-testid="save-attribute-button"]');
      if (saveBtn) {
        await saveBtn.click();
        console.log('    Save clicked, waiting for response...');
        await new Promise(r => setTimeout(r, 5000));
      } else {
        console.log('    ERROR: Save button not found');
      }

      await page.screenshot({ path: 'screenshots/lp-3.0.11-08-after-save.png' });

      // Capture final state
      console.log('11. Capturing final state...');
      await new Promise(r => setTimeout(r, 2000));
      await page.screenshot({ path: 'screenshots/lp-3.0.11-09-final.png' });
    }

    // Save artifacts
    console.log('\n12. Saving artifacts...');
    
    // Filter network to just post-save and attribute-related
    const saveNetwork = network.slice(Math.max(0, network.length - 50));
    const attributeNetwork = network.filter(n => 
      n.url && (n.url.includes('/attributes') || n.url.includes('/mapping'))
    );

    fs.writeFileSync(
      path.join(__dirname, '../logs/lp-3.0.11-network.json'),
      JSON.stringify(attributeNetwork, null, 2)
    );
    console.log('    ✓ logs/lp-3.0.11-network.json');

    fs.writeFileSync(
      path.join(__dirname, '../logs/lp-3.0.11-network-full.json'),
      JSON.stringify(network, null, 2)
    );
    console.log('    ✓ logs/lp-3.0.11-network-full.json');

    fs.writeFileSync(
      path.join(__dirname, '../logs/lp-3.0.11-console.json'),
      JSON.stringify(consoleMsgs, null, 2)
    );
    console.log('    ✓ logs/lp-3.0.11-console.json');

    // Console txt format
    const consoleTxt = consoleMsgs.map(m => 
      `[${m.timestamp}] [${m.type}] ${m.text}`
    ).join('\n');
    fs.writeFileSync(
      path.join(__dirname, '../logs/lp-3.0.11-console.txt'),
      consoleTxt
    );
    console.log('    ✓ logs/lp-3.0.11-console.txt');

    // Summary
    const postRequests = attributeNetwork.filter(n => n.method === 'POST');
    const putRequests = attributeNetwork.filter(n => n.method === 'PUT');
    const responses = attributeNetwork.filter(n => n.type === 'response');
    const errors = consoleMsgs.filter(m => m.type === 'error' || m.type === 'pageerror');
    const warnings = consoleMsgs.filter(m => m.type === 'warning');

    console.log('\n13. Analysis Summary:');
    console.log(`    Total network events: ${network.length}`);
    console.log(`    Attribute API calls: ${attributeNetwork.length}`);
    console.log(`    POST requests: ${postRequests.length}`);
    console.log(`    PUT requests: ${putRequests.length}`);
    console.log(`    Console errors: ${errors.length}`);
    console.log(`    Console warnings: ${warnings.length}`);

    if (postRequests.length > 0) {
      console.log('\n    POST requests found:');
      postRequests.forEach(p => {
        console.log(`      ${p.method} ${p.url}`);
        if (p.headers?.authorization) {
          console.log(`        Auth header: present (${p.headers.authorization.substring(0, 20)}...)`);
        } else {
          console.log(`        Auth header: MISSING`);
        }
      });
    }

    const summary = {
      timestamp: new Date().toISOString(),
      totalNetworkEvents: network.length,
      attributeApiCalls: attributeNetwork.length,
      postRequests: postRequests.length,
      putRequests: putRequests.length,
      consoleErrors: errors.length,
      consoleWarnings: warnings.length,
      postDetails: postRequests.map(p => ({
        url: p.url,
        hasAuthHeader: !!p.headers?.authorization,
        postData: p.postData
      })),
      status: postRequests.length > 0 ? 'POST_ATTEMPTED' : 'NO_POST_FOUND'
    };

    fs.writeFileSync(
      path.join(__dirname, '../logs/lp-3.0.11-summary.json'),
      JSON.stringify(summary, null, 2)
    );
    console.log('    ✓ logs/lp-3.0.11-summary.json');

  } catch (error) {
    console.error('Error during capture:', error);
    await page.screenshot({ path: 'screenshots/lp-3.0.11-error.png' });
  } finally {
    console.log('\n14. Closing browser...');
    await browser.close();
  }
}

main().catch(console.error);
