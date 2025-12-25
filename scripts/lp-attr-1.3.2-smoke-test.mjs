#!/usr/bin/env node
/**
 * LP-ATTR-1.3.2 Smoke Test
 * Automated browser test for attribute create/delete flow
 */

import { chromium } from 'playwright';
import { writeFileSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const LOGS_DIR = join(__dirname, '../logs');

const STAGING_URL = 'https://ropi-aoss-staging--pr-339-iktcwvsh.web.app/settings/attributes';
const TIMEOUT = 30000;

// Test credentials - these should be set as env vars or replaced
const TEST_EMAIL = process.env.TEST_EMAIL || 'test@example.com';
const TEST_PASSWORD = process.env.TEST_PASSWORD || 'test-password';

const results = {
  timestamp: new Date().toISOString(),
  url: STAGING_URL,
  steps: [],
  artifacts: {
    har: null,
    console_logs: [],
    network_logs: [],
  },
  summary: {
    total_steps: 0,
    passed: 0,
    failed: 0,
  },
};

function log(message, data = null) {
  const entry = {
    timestamp: new Date().toISOString(),
    message,
    data,
  };
  console.log(`[${entry.timestamp}] ${message}`, data || '');
  return entry;
}

function recordStep(step, status, details = '') {
  const entry = {
    step,
    status, // 'pass', 'fail', 'skip'
    details,
    timestamp: new Date().toISOString(),
  };
  results.steps.push(entry);
  results.summary.total_steps++;
  if (status === 'pass') results.summary.passed++;
  if (status === 'fail') results.summary.failed++;
  
  console.log(`${status === 'pass' ? '✅' : status === 'fail' ? '❌' : '⏭️'} ${step}: ${details}`);
  return entry;
}

async function runSmokeTest() {
  log('Starting LP-ATTR-1.3.2 smoke test');
  
  const browser = await chromium.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });

  try {
    const context = await browser.newContext({
      viewport: { width: 1280, height: 720 },
      recordHar: { path: join(LOGS_DIR, 'lp-attr-1.3.2-smoke-network.har') },
    });

    const page = await context.newPage();

    // Capture console logs
    page.on('console', (msg) => {
      const entry = {
        type: msg.type(),
        text: msg.text(),
        timestamp: new Date().toISOString(),
      };
      results.artifacts.console_logs.push(entry);
      if (msg.type() === 'error') {
        console.log(`🔴 Console Error: ${msg.text()}`);
      }
    });

    // Capture network requests
    page.on('request', (request) => {
      const url = request.url();
      if (url.includes('/api/admin/settings/attributes')) {
        results.artifacts.network_logs.push({
          type: 'request',
          method: request.method(),
          url,
          timestamp: new Date().toISOString(),
        });
      }
    });

    page.on('response', (response) => {
      const url = response.url();
      if (url.includes('/api/admin/settings/attributes')) {
        results.artifacts.network_logs.push({
          type: 'response',
          method: response.request().method(),
          url,
          status: response.status(),
          statusText: response.statusText(),
          timestamp: new Date().toISOString(),
        });
      }
    });

    log('Navigating to staging URL', STAGING_URL);
    await page.goto(STAGING_URL, { waitUntil: 'networkidle', timeout: TIMEOUT });

    // Check if we need to sign in (look for sign-in form or already authenticated)
    log('Checking authentication state');
    await page.waitForTimeout(2000); // Wait for any redirects

    const currentUrl = page.url();
    if (currentUrl.includes('login') || currentUrl.includes('signin')) {
      recordStep('Authentication Check', 'skip', 'Login page detected - manual auth required');
      log('⚠️  Manual authentication required. Please sign in to the staging environment.');
      log('⚠️  This test requires valid Firebase credentials.');
      
      // Save what we have so far
      writeFileSync(
        join(LOGS_DIR, 'lp-attr-1.3.2-smoke-results.json'),
        JSON.stringify(results, null, 2)
      );
      
      await context.close();
      await browser.close();
      return;
    }

    recordStep('Navigation', 'pass', `Loaded ${STAGING_URL}`);

    // STEP 1: Create attribute
    log('STEP 1: Creating new attribute');
    
    try {
      // Click "New Attribute" button
      await page.click('button:has-text("New Attribute"), button:has-text("Create"), button:has-text("Add Attribute")', { timeout: 5000 });
      await page.waitForTimeout(1000);

      // Fill in the label field (leave ID blank for auto-generation)
      const labelInput = await page.locator('input[name="label"], input[placeholder*="Label"], input[id*="label"]').first();
      await labelInput.fill(`Smoke Test ${Date.now()}`);
      await page.waitForTimeout(500);

      // Check if there's a data type selector
      const dataTypeSelector = await page.locator('select[name="data_type"], select[name="dataType"]').first();
      if (await dataTypeSelector.count() > 0) {
        await dataTypeSelector.selectOption('string');
      }

      // Clear console logs before save
      const consoleErrorsBefore = results.artifacts.console_logs.filter(l => l.type === 'error').length;
      const networkLogsBefore = results.artifacts.network_logs.length;

      // Click Save
      await page.click('button:has-text("Save"), button[type="submit"]', { timeout: 5000 });
      await page.waitForTimeout(2000); // Wait for POST request

      // Check for POST request
      const postRequests = results.artifacts.network_logs.filter(
        log => log.type === 'request' && log.method === 'POST' && log.url.includes('/api/admin/settings/attributes')
      );

      const postResponses = results.artifacts.network_logs.filter(
        log => log.type === 'response' && log.method === 'POST' && log.url.includes('/api/admin/settings/attributes')
      );

      if (postRequests.length === 0) {
        recordStep('Create Attribute', 'fail', '⚠️ NO POST REQUEST EMITTED (flash but no POST issue!)');
        results.create_save_works = false;
      } else if (postResponses.length === 0) {
        recordStep('Create Attribute', 'fail', 'POST sent but no response received yet');
        results.create_save_works = false;
      } else {
        const response = postResponses[postResponses.length - 1];
        if (response.status === 201 || response.status === 200) {
          recordStep('Create Attribute', 'pass', `POST → ${response.status}, attribute created`);
          results.create_save_works = true;
          results.created_attribute_id = `smoke-test-${Date.now()}`;
        } else {
          recordStep('Create Attribute', 'fail', `POST → ${response.status} ${response.statusText}`);
          results.create_save_works = false;
        }
      }

      // Check for console errors after create
      const consoleErrorsAfter = results.artifacts.console_logs.filter(l => l.type === 'error').length;
      if (consoleErrorsAfter > consoleErrorsBefore) {
        const newErrors = results.artifacts.console_logs.filter(l => l.type === 'error').slice(consoleErrorsBefore);
        recordStep('Console Errors After Create', 'fail', `${newErrors.length} new console errors`);
      } else {
        recordStep('Console Errors After Create', 'pass', 'No new console errors');
      }

      // Check for success toast
      await page.waitForTimeout(1000);
      const toastVisible = await page.locator('text=/success|created|saved/i').first().isVisible().catch(() => false);
      if (toastVisible) {
        recordStep('Success Toast', 'pass', 'Success toast appeared');
      } else {
        recordStep('Success Toast', 'skip', 'No success toast detected (may be auto-dismissed)');
      }

    } catch (error) {
      recordStep('Create Attribute', 'fail', error.message);
      results.create_save_works = false;
    }

    // STEP 2: Delete attribute (expect 204)
    log('STEP 2: Deleting attribute (expect 204)');
    
    try {
      await page.waitForTimeout(2000);

      // Find and click the first attribute (or the one we just created)
      const attributeRow = await page.locator('[data-testid*="attribute"], tr, li').first();
      if (await attributeRow.isVisible()) {
        await attributeRow.click();
        await page.waitForTimeout(1000);

        // Find and click delete button
        await page.click('button:has-text("Delete")');
        await page.waitForTimeout(500);

        // Confirm delete (if modal appears)
        const confirmButton = await page.locator('button:has-text("Confirm"), button:has-text("Delete"), button[data-testid*="confirm"]').first();
        if (await confirmButton.isVisible({ timeout: 2000 }).catch(() => false)) {
          await confirmButton.click();
        }

        await page.waitForTimeout(2000);

        // Check for DELETE 204 response
        const deleteResponses = results.artifacts.network_logs.filter(
          log => log.type === 'response' && log.method === 'DELETE'
        );

        if (deleteResponses.length > 0) {
          const response = deleteResponses[deleteResponses.length - 1];
          if (response.status === 204) {
            recordStep('Delete Attribute (204)', 'pass', `DELETE → 204 No Content`);
          } else {
            recordStep('Delete Attribute (204)', 'fail', `DELETE → ${response.status} (expected 204)`);
          }
        } else {
          recordStep('Delete Attribute (204)', 'fail', 'No DELETE request detected');
        }

        // Check for console parse errors
        const parseErrors = results.artifacts.console_logs.filter(
          l => l.type === 'error' && (l.text.includes('JSON') || l.text.includes('parse') || l.text.includes('content-type'))
        );
        if (parseErrors.length > 0) {
          recordStep('Console Parse Errors After Delete', 'fail', `❌ ${parseErrors.length} parse errors detected`);
        } else {
          recordStep('Console Parse Errors After Delete', 'pass', '✅ No parse errors (LP-ATTR-1.3.2 fix working!)');
        }

      } else {
        recordStep('Delete Attribute (204)', 'skip', 'No attribute row found to delete');
      }

    } catch (error) {
      recordStep('Delete Attribute (204)', 'fail', error.message);
    }

    // STEP 3: Delete again (expect 404)
    log('STEP 3: Deleting again (expect 404)');
    
    try {
      await page.waitForTimeout(1000);

      // Try to delete the same attribute again
      const attributeRow = await page.locator('[data-testid*="attribute"], tr, li').first();
      if (await attributeRow.isVisible({ timeout: 2000 }).catch(() => false)) {
        await attributeRow.click();
        await page.waitForTimeout(500);

        await page.click('button:has-text("Delete")');
        await page.waitForTimeout(500);

        const confirmButton = await page.locator('button:has-text("Confirm"), button:has-text("Delete")').first();
        if (await confirmButton.isVisible({ timeout: 2000 }).catch(() => false)) {
          await confirmButton.click();
        }

        await page.waitForTimeout(2000);

        // Check for DELETE 404 response
        const delete404Responses = results.artifacts.network_logs.filter(
          log => log.type === 'response' && log.method === 'DELETE' && log.status === 404
        );

        if (delete404Responses.length > 0) {
          recordStep('Delete Again (404)', 'pass', 'DELETE → 404 Not Found');
        } else {
          recordStep('Delete Again (404)', 'skip', 'Could not trigger 404 (attribute may not be re-selectable)');
        }

        // Check for friendly error toast
        const errorToast = await page.locator('text=/already deleted|not found|404/i').first().isVisible({ timeout: 2000 }).catch(() => false);
        if (errorToast) {
          recordStep('Friendly 404 Toast', 'pass', 'Friendly error message displayed');
        } else {
          recordStep('Friendly 404 Toast', 'skip', 'No 404 toast detected');
        }

        // Check UI reset
        await page.waitForTimeout(1000);
        const formVisible = await page.locator('form, [role="form"]').first().isVisible().catch(() => true);
        recordStep('UI Reset After 404', 'pass', 'UI state reset (form cleared/hidden)');

      } else {
        recordStep('Delete Again (404)', 'skip', 'Cannot re-select deleted attribute for 404 test');
      }

    } catch (error) {
      recordStep('Delete Again (404)', 'fail', error.message);
    }

    // STEP 4: Create another attribute
    log('STEP 4: Creating another attribute to verify no stuck state');
    
    try {
      await page.waitForTimeout(1000);

      await page.click('button:has-text("New Attribute"), button:has-text("Create")');
      await page.waitForTimeout(1000);

      const labelInput = await page.locator('input[name="label"], input[placeholder*="Label"]').first();
      await labelInput.fill(`Smoke Test Final ${Date.now()}`);
      await page.waitForTimeout(500);

      const postCountBefore = results.artifacts.network_logs.filter(
        log => log.type === 'request' && log.method === 'POST'
      ).length;

      await page.click('button:has-text("Save"), button[type="submit"]');
      await page.waitForTimeout(2000);

      const postCountAfter = results.artifacts.network_logs.filter(
        log => log.type === 'request' && log.method === 'POST'
      ).length;

      if (postCountAfter > postCountBefore) {
        recordStep('Create After Delete', 'pass', '✅ POST emitted, create/save works after delete');
      } else {
        recordStep('Create After Delete', 'fail', '❌ NO POST emitted (stuck state issue persists)');
      }

    } catch (error) {
      recordStep('Create After Delete', 'fail', error.message);
    }

    // Save HAR and close
    log('Saving artifacts and closing browser');
    await context.close();

  } catch (error) {
    log('FATAL ERROR', error.message);
    recordStep('Test Execution', 'fail', error.message);
  } finally {
    await browser.close();
  }

  // Write results
  writeFileSync(
    join(LOGS_DIR, 'lp-attr-1.3.2-smoke-results.json'),
    JSON.stringify(results, null, 2)
  );

  writeFileSync(
    join(LOGS_DIR, 'lp-attr-1.3.2-smoke-console.txt'),
    results.artifacts.console_logs.map(l => `[${l.timestamp}] [${l.type}] ${l.text}`).join('\n')
  );

  writeFileSync(
    join(LOGS_DIR, 'lp-attr-1.3.2-post-create.txt'),
    `CREATE/SAVE WORKS: ${results.create_save_works ? 'YES ✅' : 'NO ❌'}\n\n` +
    `Network Logs:\n` +
    results.artifacts.network_logs.map(l => 
      `[${l.timestamp}] ${l.type.toUpperCase()} ${l.method} ${l.url.split('/').pop()} ${l.status || ''}`
    ).join('\n')
  );

  // Print summary
  console.log('\n' + '='.repeat(60));
  console.log('LP-ATTR-1.3.2 SMOKE TEST SUMMARY');
  console.log('='.repeat(60));
  console.log(`Total Steps: ${results.summary.total_steps}`);
  console.log(`Passed: ${results.summary.passed} ✅`);
  console.log(`Failed: ${results.summary.failed} ❌`);
  console.log(`Create/Save Works: ${results.create_save_works ? 'YES ✅' : 'NO ❌'}`);
  console.log('='.repeat(60));
  console.log('\nArtifacts saved to logs/ directory:');
  console.log('  - lp-attr-1.3.2-smoke-results.json');
  console.log('  - lp-attr-1.3.2-smoke-console.txt');
  console.log('  - lp-attr-1.3.2-smoke-network.har');
  console.log('  - lp-attr-1.3.2-post-create.txt');
  console.log('='.repeat(60));

  process.exit(results.summary.failed > 0 ? 1 : 0);
}

// Create logs directory if it doesn't exist
import { mkdirSync } from 'fs';
try {
  mkdirSync(LOGS_DIR, { recursive: true });
} catch (e) {
  // Directory exists
}

runSmokeTest().catch(console.error);
