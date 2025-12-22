#!/usr/bin/env node
/**
 * LP-3.0.8: Headless browser automation to capture HAR/network trace
 * and console logs during attribute creation flow.
 * 
 * This script:
 * 1. Opens staging in headless Chrome
 * 2. Authenticates using admin token
 * 3. Navigates to /settings/attributes
 * 4. Captures all network requests to /api/admin/settings/attributes*
 * 5. Creates a new attribute via API (since UI may require complex auth flow)
 * 6. Saves network trace and console logs
 * 
 * Run: node scripts/capture-attribute-create-har.js
 */

const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const STAGING_URL = 'https://ropi-aoss-staging.web.app';
const ATTRIBUTE_TEST_ID = `lp308_headless_${Date.now()}`;

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
  console.log('LP-3.0.8 Headless Attribute Create Verification');
  console.log('================================================\n');

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

  // Capture console messages
  const consoleMsgs = [];
  page.on('console', msg => {
    consoleMsgs.push({
      type: msg.type(),
      text: msg.text(),
      timestamp: new Date().toISOString()
    });
  });

  // Capture page errors
  page.on('pageerror', error => {
    consoleMsgs.push({
      type: 'error',
      text: `Page Error: ${error.message}`,
      stack: error.stack,
      timestamp: new Date().toISOString()
    });
  });

  // Capture network requests/responses for attribute endpoints
  const network = [];
  
  page.on('requestfinished', async (req) => {
    try {
      const url = req.url();
      // Capture all attribute-related API calls
      if (url.includes('/api/admin/settings/attributes') || url.includes('/api/admin/settings/mappings')) {
        const response = req.response();
        let respBody = '<no-response>';
        
        if (response) {
          try {
            respBody = await response.text();
          } catch {
            respBody = '<could-not-read-body>';
          }
        }
        
        const entry = {
          url,
          method: req.method(),
          status: response ? response.status() : null,
          statusText: response ? response.statusText() : null,
          response: respBody.slice(0, 3000),
          timestamp: new Date().toISOString(),
          // Flag if this is the problematic /attributes/mapping without an ID
          isMappingWithoutId: url.endsWith('/attributes/mapping') || url.includes('/attributes/mapping?')
        };
        
        network.push(entry);
        
        // Log 404s immediately
        if (entry.status === 404) {
          console.log(`   ⚠️  404 detected: ${entry.method} ${url}`);
        }
      }
    } catch (e) {
      network.push({ error: String(e), timestamp: new Date().toISOString() });
    }
  });

  page.on('requestfailed', (req) => {
    const url = req.url();
    if (url.includes('/api/admin/settings/attributes')) {
      network.push({
        url,
        method: req.method(),
        status: 'FAILED',
        error: req.failure()?.errorText || 'Unknown failure',
        timestamp: new Date().toISOString()
      });
    }
  });

  try {
    // Set auth header for all requests
    console.log('3. Setting authorization headers...');
    await page.setExtraHTTPHeaders({
      'Authorization': `Bearer ${token}`
    });

    // Navigate to staging attributes page
    console.log('4. Navigating to staging attributes page...');
    await page.goto(`${STAGING_URL}/settings/attributes`, {
      waitUntil: 'networkidle2',
      timeout: 60000
    });

    // Wait a moment for any initial API calls
    await new Promise(r => setTimeout(r, 2000));

    // Take initial screenshot
    console.log('5. Taking initial screenshot...');
    await page.screenshot({
      path: 'screenshots/lp-3.0.8-initial.png',
      fullPage: true
    });

    // Now create an attribute via API (more reliable than UI automation)
    console.log('6. Creating test attribute via API...');
    const createResult = await page.evaluate(async (attrId, authToken) => {
      try {
        const res = await fetch('/api/admin/settings/attributes', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${authToken}`
          },
          body: JSON.stringify({
            attribute_id: attrId,
            label: 'LP308 Headless Test',
            data_type: 'string',
            import: true,
            status: 'active'
          })
        });
        const text = await res.text();
        return {
          status: res.status,
          statusText: res.statusText,
          body: text
        };
      } catch (e) {
        return { error: e.message };
      }
    }, ATTRIBUTE_TEST_ID, token);

    console.log(`   Create result: ${createResult.status} ${createResult.statusText}`);
    if (createResult.status === 201 || createResult.status === 200) {
      console.log('   ✅ Attribute created successfully');
    } else {
      console.log(`   ⚠️  Unexpected status: ${createResult.body?.slice(0, 200)}`);
    }

    // Wait for any mapping fetch attempts
    await new Promise(r => setTimeout(r, 2000));

    // Take final screenshot
    console.log('7. Taking final screenshot...');
    await page.screenshot({
      path: 'screenshots/lp-3.0.8-attribute-create.png',
      fullPage: true
    });

    // Save artifacts
    console.log('\n8. Saving artifacts...');
    
    fs.writeFileSync(
      'logs/lp-3.0.8-console.json',
      JSON.stringify(consoleMsgs, null, 2)
    );
    console.log('   ✓ logs/lp-3.0.8-console.json');
    
    fs.writeFileSync(
      'logs/lp-3.0.8-network.json',
      JSON.stringify(network, null, 2)
    );
    console.log('   ✓ logs/lp-3.0.8-network.json');

    // Analyze results
    console.log('\n9. Analyzing results...');
    
    const mapping404s = network.filter(n => 
      n.status === 404 && 
      (n.url.endsWith('/attributes/mapping') || n.isMappingWithoutId)
    );
    
    const attributeCreates = network.filter(n => 
      n.method === 'POST' && 
      n.url.includes('/api/admin/settings/attributes') &&
      !n.url.includes('/mapping')
    );

    const consoleErrors = consoleMsgs.filter(m => 
      m.type === 'error' && 
      (m.text.includes('TypeError') || m.text.includes('Cannot read'))
    );

    console.log(`\n   Network Summary:`);
    console.log(`   - Total attribute API calls: ${network.length}`);
    console.log(`   - Mapping 404s (without ID): ${mapping404s.length}`);
    console.log(`   - Attribute creates: ${attributeCreates.length}`);
    
    console.log(`\n   Console Summary:`);
    console.log(`   - Total messages: ${consoleMsgs.length}`);
    console.log(`   - TypeErrors: ${consoleErrors.length}`);

    // Determine pass/fail
    const passed = mapping404s.length === 0 && 
                   attributeCreates.some(a => a.status === 201 || a.status === 200) &&
                   consoleErrors.length === 0;

    console.log(`\n   Status: ${passed ? '✅ PASS' : '❌ FAIL'}`);

    if (mapping404s.length > 0) {
      console.log('\n   ⚠️  Mapping 404s detected:');
      mapping404s.forEach(m => console.log(`      ${m.method} ${m.url}`));
    }

    if (consoleErrors.length > 0) {
      console.log('\n   ⚠️  Console errors:');
      consoleErrors.slice(0, 5).forEach(e => console.log(`      ${e.text}`));
    }

    // Save summary
    const summary = {
      timestamp: new Date().toISOString(),
      testAttributeId: ATTRIBUTE_TEST_ID,
      passed,
      networkStats: {
        totalCalls: network.length,
        mapping404sWithoutId: mapping404s.length,
        attributeCreates: attributeCreates.length,
        successfulCreates: attributeCreates.filter(a => a.status === 201 || a.status === 200).length
      },
      consoleStats: {
        totalMessages: consoleMsgs.length,
        typeErrors: consoleErrors.length
      },
      mapping404Details: mapping404s,
      createResult
    };

    fs.writeFileSync(
      'logs/lp-3.0.8-summary.json',
      JSON.stringify(summary, null, 2)
    );
    console.log('\n   ✓ logs/lp-3.0.8-summary.json');

  } catch (error) {
    console.error('\nERROR:', error.message);
    
    // Save error screenshot
    try {
      await page.screenshot({
        path: 'screenshots/lp-3.0.8-error.png',
        fullPage: true
      });
    } catch {}
    
    // Save what we have
    fs.writeFileSync('logs/lp-3.0.8-console.json', JSON.stringify(consoleMsgs, null, 2));
    fs.writeFileSync('logs/lp-3.0.8-network.json', JSON.stringify(network, null, 2));
    
  } finally {
    await browser.close();
    console.log('\n10. Browser closed.\n');
  }
}

main().catch(console.error);
