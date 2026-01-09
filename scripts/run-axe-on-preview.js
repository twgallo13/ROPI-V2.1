#!/usr/bin/env node
/**
 * LP-phase2b-001: Axe Accessibility Audit on Preview
 * 
 * Runs axe-core accessibility audit against preview/staging deployment.
 * Tests all Phase 2B UI components for WCAG AA compliance.
 * 
 * Requirements:
 * - Playwright installed
 * - axe-core installed
 * - Preview URL accessible
 * 
 * Target: 0 critical failures, 0 serious failures
 * 
 * Output: axe_report.json with violations categorized by severity
 */

import { chromium } from 'playwright';
import AxeBuilder from '@axe-core/playwright';
import { writeFileSync } from 'fs';

const PREVIEW_URL = process.argv[2] || process.env.PREVIEW_URL || 'http://localhost:5173';
const EMAIL = process.env.VITE_E2E_ADMIN_EMAIL || 'theo@shiekh.com';
const PASSWORD = process.env.VITE_E2E_ADMIN_PASSWORD || '';

// Pages/components to audit
const AUDIT_TARGETS = [
  {
    name: 'product_page_completion_card',
    path: '/products/product-0001',
    waitFor: '[data-testid="completion-card-mpn"]',
    description: 'Product page with CompletionCard'
  },
  {
    name: 'product_page_export_gate',
    path: '/products/product-0001',
    waitFor: '[data-testid="export-gate-mpn"]',
    description: 'Product page with ExportGatePanel'
  },
  {
    name: 'admin_completion_rules',
    path: '/admin/completion-rules',
    waitFor: '.completion-rules-page',
    description: 'Admin completion rules page'
  }
];

async function runAxeAudit() {
  console.log('========================================');
  console.log('LP-phase2b-001: Axe Accessibility Audit');
  console.log('========================================');
  console.log(`Preview URL: ${PREVIEW_URL}`);
  console.log(`Targets: ${AUDIT_TARGETS.length}`);
  console.log('');
  
  if (!PASSWORD) {
    console.error('ERROR: VITE_E2E_ADMIN_PASSWORD not set');
    process.exit(1);
  }
  
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();
  
  const allResults = [];
  
  try {
    // Sign in first
    console.log('Signing in...');
    await page.goto(PREVIEW_URL);
    await page.waitForLoadState('networkidle');
    
    const signInBtn = page.locator('[data-testid="signin-trigger"], button:has-text("Sign In")').first();
    if (await signInBtn.count() > 0) {
      await signInBtn.click();
      const modal = page.locator('[data-testid="signin-modal"], .signin-modal, .modal').first();
      await modal.waitFor({ state: 'visible', timeout: 5000 });
      
      await page.fill('input[type="email"]', EMAIL);
      await page.fill('input[type="password"]', PASSWORD);
      await page.click('button[type="submit"]:has-text("Sign In")');
      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(1000);
    }
    
    // Audit each target
    for (const target of AUDIT_TARGETS) {
      console.log(`\nAuditing: ${target.name}`);
      console.log(`  Path: ${target.path}`);
      console.log(`  Description: ${target.description}`);
      
      await page.goto(`${PREVIEW_URL}${target.path}`);
      await page.waitForLoadState('networkidle');
      
      // Wait for target element
      try {
        await page.waitForSelector(target.waitFor, { timeout: 5000 });
      } catch (e) {
        console.log(`  ⚠️  Warning: Target element not found: ${target.waitFor}`);
      }
      
      // Run axe audit
      const axeResults = await new AxeBuilder({ page })
        .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
        .analyze();
      
      // Categorize violations
      const critical = axeResults.violations.filter(v => v.impact === 'critical');
      const serious = axeResults.violations.filter(v => v.impact === 'serious');
      const moderate = axeResults.violations.filter(v => v.impact === 'moderate');
      const minor = axeResults.violations.filter(v => v.impact === 'minor');
      
      console.log(`  Critical: ${critical.length}`);
      console.log(`  Serious: ${serious.length}`);
      console.log(`  Moderate: ${moderate.length}`);
      console.log(`  Minor: ${minor.length}`);
      
      if (critical.length > 0) {
        console.log('  ❌ CRITICAL violations found:');
        critical.forEach(v => {
          console.log(`     - ${v.id}: ${v.description}`);
        });
      }
      
      if (serious.length > 0) {
        console.log('  ⚠️  SERIOUS violations found:');
        serious.forEach(v => {
          console.log(`     - ${v.id}: ${v.description}`);
        });
      }
      
      allResults.push({
        target: target.name,
        path: target.path,
        description: target.description,
        timestamp: new Date().toISOString(),
        violations: {
          critical: critical.length,
          serious: serious.length,
          moderate: moderate.length,
          minor: minor.length,
          total: axeResults.violations.length
        },
        details: axeResults.violations,
        passes: axeResults.passes.length,
        incomplete: axeResults.incomplete.length
      });
    }
    
  } finally {
    await browser.close();
  }
  
  // Generate summary
  const totalCritical = allResults.reduce((sum, r) => sum + r.violations.critical, 0);
  const totalSerious = allResults.reduce((sum, r) => sum + r.violations.serious, 0);
  const totalViolations = allResults.reduce((sum, r) => sum + r.violations.total, 0);
  
  console.log('\n========================================');
  console.log('Summary');
  console.log('========================================');
  console.log(`Total targets audited: ${allResults.length}`);
  console.log(`Total violations: ${totalViolations}`);
  console.log(`  Critical: ${totalCritical}`);
  console.log(`  Serious: ${totalSerious}`);
  console.log('');
  
  const passed = totalCritical === 0 && totalSerious === 0;
  if (passed) {
    console.log('✅ ACCESSIBILITY AUDIT PASSED');
    console.log('   0 critical failures, 0 serious failures');
  } else {
    console.log('❌ ACCESSIBILITY AUDIT FAILED');
    console.log(`   ${totalCritical} critical, ${totalSerious} serious violations`);
  }
  
  // Save report
  const report = {
    meta: {
      previewUrl: PREVIEW_URL,
      timestamp: new Date().toISOString(),
      targetsAudited: allResults.length,
      passed,
      wcagLevel: 'AA'
    },
    summary: {
      totalViolations,
      critical: totalCritical,
      serious: totalSerious,
      moderate: allResults.reduce((sum, r) => sum + r.violations.moderate, 0),
      minor: allResults.reduce((sum, r) => sum + r.violations.minor, 0)
    },
    results: allResults
  };
  
  const outputPath = 'inventory/LP-phase2b-001/evidence/axe_report.json';
  writeFileSync(outputPath, JSON.stringify(report, null, 2));
  console.log(`\nReport saved to: ${outputPath}`);
  
  process.exit(passed ? 0 : 1);
}

runAxeAudit().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
