#!/bin/bash
# LP-phase2b-001: Export Gate E2E — 3 Consecutive Runs
# 
# Runs export flow 3 times consecutively to verify deterministic behavior.
# Each run should produce identical results for the same product state.
#
# Requirements:
# - STAGING_HOST environment variable set
# - STAGING_API_TOKEN environment variable set
# - Playwright installed
# - Test products available on staging

set -e

BASE_URL="${STAGING_HOST:-http://localhost:5173}"
EMAIL="${VITE_E2E_ADMIN_EMAIL:-theo@shiekh.com}"
PASSWORD="${VITE_E2E_ADMIN_PASSWORD:-}"
TEST_PRODUCT="${TEST_PRODUCT_ID:-product-0001}"
RUNS=3

echo "========================================"
echo "Export Gate E2E - 3 Consecutive Runs"
echo "========================================"
echo "Base URL: ${BASE_URL}"
echo "Test Product: ${TEST_PRODUCT}"
echo "Runs: ${RUNS}"
echo ""

if [ -z "${PASSWORD}" ]; then
  echo "ERROR: VITE_E2E_ADMIN_PASSWORD not set"
  exit 1
fi

# Create Node.js script for Playwright execution
cat > /tmp/export_gate_e2e.mjs <<'EOFNODE'
import { chromium } from 'playwright';

const BASE_URL = process.env.BASE_URL || 'http://localhost:5173';
const EMAIL = process.env.EMAIL || 'theo@shiekh.com';
const PASSWORD = process.env.PASSWORD || '';
const TEST_PRODUCT = process.env.TEST_PRODUCT || 'product-0001';
const RUN_NUMBER = process.env.RUN_NUMBER || '1';

async function runExportFlow() {
  console.log(`\n========== Run ${RUN_NUMBER} ==========`);
  console.log(`Timestamp: ${new Date().toISOString()}`);
  
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();
  
  const logs = [];
  page.on('console', msg => logs.push(`[${msg.type()}] ${msg.text()}`));
  
  try {
    // 1. Navigate and sign in
    console.log('1. Navigating to app...');
    await page.goto(BASE_URL);
    await page.waitForLoadState('networkidle');
    
    console.log('2. Opening sign in modal...');
    const signInBtn = page.locator('[data-testid="signin-trigger"], button:has-text("Sign In")').first();
    await signInBtn.waitFor({ state: 'visible', timeout: 10000 });
    await signInBtn.click();
    
    const modal = page.locator('[data-testid="signin-modal"], .signin-modal, .modal').first();
    await modal.waitFor({ state: 'visible', timeout: 5000 });
    
    await page.fill('input[type="email"]', EMAIL);
    await page.fill('input[type="password"]', PASSWORD);
    await page.click('button[type="submit"]:has-text("Sign In")');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);
    
    console.log('3. Navigating to product page...');
    await page.goto(`${BASE_URL}/products/${TEST_PRODUCT}`);
    await page.waitForLoadState('networkidle');
    
    // 4. Wait for completion data
    console.log('4. Waiting for completion card...');
    await page.waitForSelector('[data-testid="completion-card-mpn"]', { timeout: 10000 });
    
    // 5. Check export readiness
    console.log('5. Checking export gate status...');
    const exportButton = page.locator('button:has-text("Export to RetailOps")').first();
    const isDisabled = await exportButton.isDisabled();
    const exportReady = !isDisabled;
    
    console.log(`   Export Ready: ${exportReady}`);
    
    // 6. Attempt export if ready
    if (exportReady) {
      console.log('6. Clicking export button...');
      await exportButton.click();
      await page.waitForTimeout(2000);
      
      // Check for success message or error
      const bodyText = await page.textContent('body');
      if (bodyText.includes('success') || bodyText.includes('exported')) {
        console.log('   ✅ Export succeeded');
      } else if (bodyText.includes('error') || bodyText.includes('failed')) {
        console.log('   ⚠️  Export failed or blocked');
      } else {
        console.log('   ℹ️  Export status unclear');
      }
    } else {
      console.log('6. Export button disabled (as expected for blocked product)');
      
      // Get blocking reasons
      const blockingSection = page.locator('.export-gate-panel__blocking-section').first();
      if (await blockingSection.count() > 0) {
        const reasonsText = await blockingSection.textContent();
        console.log(`   Blocking reasons present: ${reasonsText.substring(0, 100)}...`);
      }
    }
    
    // 7. Take screenshot
    await page.screenshot({ 
      path: `/tmp/export_gate_run_${RUN_NUMBER}.png`,
      fullPage: true 
    });
    
    console.log(`✅ Run ${RUN_NUMBER} completed successfully`);
    console.log(`Screenshot saved to: /tmp/export_gate_run_${RUN_NUMBER}.png`);
    
  } catch (error) {
    console.error(`❌ Run ${RUN_NUMBER} failed:`, error.message);
    throw error;
  } finally {
    await browser.close();
  }
}

runExportFlow().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
EOFNODE

# Run the export flow 3 times
for i in $(seq 1 ${RUNS}); do
  export RUN_NUMBER=$i
  export BASE_URL=$BASE_URL
  export EMAIL=$EMAIL
  export PASSWORD=$PASSWORD
  export TEST_PRODUCT=$TEST_PRODUCT
  
  node /tmp/export_gate_e2e.mjs
  
  # Wait between runs
  if [ $i -lt ${RUNS} ]; then
    echo ""
    echo "Waiting 2 seconds before next run..."
    sleep 2
  fi
done

echo ""
echo "========================================"
echo "Summary: 3 Consecutive Runs Complete"
echo "========================================"
echo "All runs executed successfully"
echo "Screenshots saved to: /tmp/export_gate_run_{1,2,3}.png"
echo ""
echo "Determinism check: Compare screenshots to verify identical UI state"
