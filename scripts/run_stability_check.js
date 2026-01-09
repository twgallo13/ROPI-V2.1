#!/usr/bin/env node
/**
 * LP-phase2b-001: Stability Check — 3 Identical Runs × 5 Flows
 * 
 * Runs the 5 sample flows (ready, partial, blocked, admin, toggle) 3 times
 * and verifies that all runs produce identical results (deterministic behavior).
 * 
 * Requirements:
 * - Playwright installed
 * - STAGING_HOST or BASE_URL set
 * - Test credentials available
 * - Test products available (product-0001, product-0004, product-0007)
 * 
 * Output: JSON file with 3 runs, each containing results for 5 flows
 * Exit code 0 = all runs identical, non-zero = variance detected
 */

import { chromium } from 'playwright';
import { createHash } from 'crypto';
import { writeFileSync } from 'fs';

const BASE_URL = process.env.BASE_URL || process.env.STAGING_HOST || 'http://localhost:5173';
const EMAIL = process.env.VITE_E2E_ADMIN_EMAIL || 'theo@shiekh.com';
const PASSWORD = process.env.VITE_E2E_ADMIN_PASSWORD || '';
const RUNS = parseInt(process.argv.find(arg => arg.startsWith('--runs='))?.split('=')[1] || '3');
const OUTPUT = process.argv.find(arg => arg.startsWith('--output='))?.split('=')[1] || 'stability_runs.json';

// Test flows configuration
const FLOWS = [
  {
    name: 'ready_product',
    productId: 'product-0001',
    expectedStatus: 'ready',
    description: 'Product with ≥80% completion, export allowed'
  },
  {
    name: 'partial_product',
    productId: 'product-0004',
    expectedStatus: 'partial',
    description: 'Product with 40-80% completion, export blocked'
  },
  {
    name: 'blocked_product',
    productId: 'product-0007',
    expectedStatus: 'blocked',
    description: 'Product with <40% completion, export blocked'
  },
  {
    name: 'admin_rules',
    path: '/admin/completion-rules',
    description: 'Admin view of completion rules versions'
  },
  {
    name: 'global_toggle',
    productId: 'product-0001',
    description: 'Global mode toggle for site details'
  }
];

async function runFlow(browser, flow, runNumber, flowNumber) {
  console.log(`\n  [Run ${runNumber}, Flow ${flowNumber}] ${flow.name}: ${flow.description}`);
  
  const context = await browser.newContext();
  const page = await context.newPage();
  
  const result = {
    flow: flow.name,
    timestamp: new Date().toISOString(),
    runNumber,
    flowNumber,
    status: 'unknown',
    data: {}
  };
  
  try {
    // Sign in
    await page.goto(BASE_URL);
    await page.waitForLoadState('networkidle');
    
    const signInBtn = page.locator('[data-testid="signin-trigger"], button:has-text("Sign In")').first();
    await signInBtn.waitFor({ state: 'visible', timeout: 10000 });
    await signInBtn.click();
    
    const modal = page.locator('[data-testid="signin-modal"], .signin-modal, .modal').first();
    await modal.waitFor({ state: 'visible', timeout: 5000 });
    
    await page.fill('input[type="email"]', EMAIL);
    await page.fill('input[type="password"]', PASSWORD);
    await page.click('button[type="submit"]:has-text("Sign In")');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1000);
    
    // Execute flow-specific logic
    if (flow.productId) {
      // Product flows (ready, partial, blocked, toggle)
      await page.goto(`${BASE_URL}/products/${flow.productId}`);
      await page.waitForLoadState('networkidle');
      
      // Get completion data
      const mpnElement = page.locator('[data-testid="completion-card-mpn"]').first();
      if (await mpnElement.count() > 0) {
        result.data.mpn = await mpnElement.textContent();
      }
      
      const completionCard = page.locator('.completion-card').first();
      if (await completionCard.count() > 0) {
        const cardText = await completionCard.textContent();
        const percentMatch = cardText.match(/(\d+)%/);
        if (percentMatch) {
          result.data.completionPct = parseInt(percentMatch[1]);
        }
        
        // Detect status from badge
        if (cardText.includes('Ready')) result.data.status = 'ready';
        else if (cardText.includes('Needs Attention') || cardText.includes('Partial')) result.data.status = 'partial';
        else if (cardText.includes('Blocked')) result.data.status = 'blocked';
      }
      
      // Check export button state
      const exportButton = page.locator('button:has-text("Export to RetailOps")').first();
      if (await exportButton.count() > 0) {
        result.data.exportEnabled = !(await exportButton.isDisabled());
      }
      
      // For toggle flow, click toggle if present
      if (flow.name === 'global_toggle') {
        const toggleButton = page.locator('button:has-text("Advanced"), button:has-text("Site details")').first();
        if (await toggleButton.count() > 0) {
          await toggleButton.click();
          await page.waitForTimeout(500);
          result.data.toggleClicked = true;
        }
      }
      
      result.status = 'success';
      
    } else if (flow.path) {
      // Admin flow
      await page.goto(`${BASE_URL}${flow.path}`);
      await page.waitForLoadState('networkidle');
      
      // Count versions in list
      const versionRows = page.locator('table tbody tr, .version-list-item');
      result.data.versionCount = await versionRows.count();
      
      // Verify read-only (no edit buttons)
      const editButtons = page.locator('button:has-text("Edit"), button:has-text("Modify")');
      result.data.editButtonsPresent = await editButtons.count() > 0;
      
      result.status = 'success';
    }
    
    // Take screenshot
    const screenshotPath = `/tmp/stability_run${runNumber}_flow${flowNumber}_${flow.name}.png`;
    await page.screenshot({ path: screenshotPath, fullPage: false });
    result.data.screenshot = screenshotPath;
    
    console.log(`    ✅ ${flow.name}: status=${result.data.status || result.status}, data=${JSON.stringify(result.data).substring(0, 100)}`);
    
  } catch (error) {
    console.error(`    ❌ ${flow.name} failed:`, error.message);
    result.status = 'error';
    result.error = error.message;
  } finally {
    await context.close();
  }
  
  return result;
}

async function runStabilityCheck() {
  console.log('========================================');
  console.log('LP-phase2b-001: Stability Check');
  console.log('========================================');
  console.log(`Base URL: ${BASE_URL}`);
  console.log(`Runs: ${RUNS}`);
  console.log(`Flows per run: ${FLOWS.length}`);
  console.log('');
  
  if (!PASSWORD) {
    console.error('ERROR: VITE_E2E_ADMIN_PASSWORD not set');
    process.exit(1);
  }
  
  const browser = await chromium.launch({ headless: true });
  const allRuns = [];
  
  try {
    for (let runNumber = 1; runNumber <= RUNS; runNumber++) {
      console.log(`\n========== Run ${runNumber}/${RUNS} ==========`);
      const runResults = [];
      
      for (let flowNumber = 0; flowNumber < FLOWS.length; flowNumber++) {
        const flow = FLOWS[flowNumber];
        const result = await runFlow(browser, flow, runNumber, flowNumber + 1);
        runResults.push(result);
      }
      
      allRuns.push({
        runNumber,
        timestamp: new Date().toISOString(),
        results: runResults
      });
    }
  } finally {
    await browser.close();
  }
  
  // Generate deterministic hashes for each run
  console.log('\n========================================');
  console.log('Determinism Analysis');
  console.log('========================================');
  
  const runHashes = allRuns.map((run, index) => {
    // Create deterministic representation (exclude timestamps and screenshots)
    const deterministicData = run.results.map(r => ({
      flow: r.flow,
      status: r.status,
      data: {
        ...r.data,
        screenshot: undefined // Exclude non-deterministic path
      }
    }));
    
    const hash = createHash('sha256').update(JSON.stringify(deterministicData)).digest('hex');
    console.log(`Run ${index + 1} hash: ${hash}`);
    return hash;
  });
  
  // Check if all hashes are identical
  const allIdentical = runHashes.every(h => h === runHashes[0]);
  
  console.log('');
  if (allIdentical) {
    console.log('✅ DETERMINISM VERIFIED: All runs produced identical results');
  } else {
    console.log('❌ DETERMINISM FAILURE: Runs produced different results');
    console.log('');
    console.log('Hash comparison:');
    runHashes.forEach((hash, i) => {
      console.log(`  Run ${i + 1}: ${hash} ${hash === runHashes[0] ? '✓' : '✗'}`);
    });
  }
  
  // Save results
  const output = {
    meta: {
      baseUrl: BASE_URL,
      runs: RUNS,
      flowsPerRun: FLOWS.length,
      timestamp: new Date().toISOString(),
      deterministic: allIdentical
    },
    runHashes,
    runs: allRuns
  };
  
  writeFileSync(OUTPUT, JSON.stringify(output, null, 2));
  console.log('');
  console.log(`Results saved to: ${OUTPUT}`);
  
  // Generate equality proof file
  const proofFile = OUTPUT.replace('.json', '_equality_proof.txt');
  const proofContent = `LP-phase2b-001 Stability Equality Proof
Generated: ${new Date().toISOString()}

Run Hashes:
${runHashes.map((h, i) => `Run ${i + 1}: ${h}`).join('\n')}

Deterministic: ${allIdentical ? 'YES' : 'NO'}

${allIdentical 
  ? 'All runs produced identical results. System behavior is deterministic.'
  : 'Runs produced different results. System behavior is NON-deterministic.'}
`;
  
  writeFileSync(proofFile, proofContent);
  console.log(`Equality proof saved to: ${proofFile}`);
  
  process.exit(allIdentical ? 0 : 1);
}

runStabilityCheck().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
