#!/usr/bin/env node
/**
 * Identity Lock Check Script
 * 
 * Phase Workflow v2 Enforcement
 * 
 * Validates that:
 * 1. PhaseName in PR matches PHASE_LEDGER.json
 * 2. PhaseSlug in PR matches PHASE_LEDGER.json
 * 
 * Exits non-zero if identity does not match ledger.
 */

const fs = require('fs');
const path = require('path');

const LEDGER_PATH = path.join(__dirname, '..', 'PHASE_LEDGER.json');

function loadLedger() {
  try {
    const content = fs.readFileSync(LEDGER_PATH, 'utf8');
    return JSON.parse(content);
  } catch (err) {
    console.error('❌ FATAL: Cannot read PHASE_LEDGER.json');
    console.error(`   Path: ${LEDGER_PATH}`);
    console.error(`   Error: ${err.message}`);
    process.exit(1);
  }
}

function extractPhaseSlugFromLP(text) {
  // Match LP-<phaseSlug>-#NNN (numeric LP format)
  const numericMatch = text.match(/LP-([a-z0-9-]+)-#(\d+)/i);
  if (numericMatch) {
    return { slug: numericMatch[1].toLowerCase(), lpNumber: parseInt(numericMatch[2], 10) };
  }
  return null;
}

function extractPhaseNameFromBody(text) {
  // Look for "PhaseName (locked):" line
  const match = text.match(/PhaseName\s*\(locked\)\s*:\s*(.+)/i);
  if (match) {
    return match[1].trim();
  }
  return null;
}

function extractPhaseSlugFromBody(text) {
  // Look for "PhaseSlug:" line
  const match = text.match(/PhaseSlug\s*:\s*([a-z0-9-]+)/i);
  if (match) {
    return match[1].toLowerCase();
  }
  return null;
}

function main() {
  console.log('🔒 Identity Lock Check - Validating Phase Identity...\n');

  const prBody = process.env.PR_BODY || '';
  const prTitle = process.env.PR_TITLE || '';

  const ledger = loadLedger();
  const errors = [];

  console.log(`📋 Ledger Phase: "${ledger.phaseName}" (${ledger.phaseSlug})`);
  console.log(`📋 Ledger nextLp: ${ledger.nextLp}`);
  console.log('');

  // Extract LP from PR body/title
  const lpFromBody = extractPhaseSlugFromLP(prBody);
  const lpFromTitle = extractPhaseSlugFromLP(prTitle);
  const lpInfo = lpFromBody || lpFromTitle;

  if (!lpInfo) {
    errors.push({
      check: 'LP Format',
      status: '❌ FAILED',
      message: 'No valid LP identifier found in PR title or body',
      expected: `LP-${ledger.phaseSlug}-#${ledger.nextLp}`,
      found: 'No LP-<slug>-#NNN pattern found',
    });
  } else {
    // Check PhaseSlug in LP matches ledger
    if (lpInfo.slug !== ledger.phaseSlug) {
      errors.push({
        check: 'PhaseSlug Match',
        status: '❌ FAILED',
        message: 'PhaseSlug in LP does not match PHASE_LEDGER.json',
        expected: ledger.phaseSlug,
        found: lpInfo.slug,
      });
    } else {
      console.log(`✅ PhaseSlug in LP matches ledger: ${lpInfo.slug}`);
    }
  }

  // Check explicit PhaseSlug field in PR body
  const bodyPhaseSlug = extractPhaseSlugFromBody(prBody);
  if (bodyPhaseSlug) {
    if (bodyPhaseSlug !== ledger.phaseSlug) {
      errors.push({
        check: 'PhaseSlug Field',
        status: '❌ FAILED',
        message: 'PhaseSlug field in PR body does not match PHASE_LEDGER.json',
        expected: ledger.phaseSlug,
        found: bodyPhaseSlug,
      });
    } else {
      console.log(`✅ PhaseSlug field matches ledger: ${bodyPhaseSlug}`);
    }
  }

  // Check explicit PhaseName field in PR body
  const bodyPhaseName = extractPhaseNameFromBody(prBody);
  if (bodyPhaseName) {
    if (bodyPhaseName !== ledger.phaseName) {
      errors.push({
        check: 'PhaseName Field',
        status: '❌ FAILED',
        message: 'PhaseName field in PR body does not match PHASE_LEDGER.json',
        expected: ledger.phaseName,
        found: bodyPhaseName,
      });
    } else {
      console.log(`✅ PhaseName field matches ledger: ${bodyPhaseName}`);
    }
  }

  // Output results
  console.log('\n' + '━'.repeat(60));

  if (errors.length === 0) {
    console.log('✅ IDENTITY LOCK CHECK PASSED\n');
    console.log(`Phase: ${ledger.phaseName}`);
    console.log(`Slug: ${ledger.phaseSlug}`);
    console.log(`State: ${ledger.state}`);
    process.exit(0);
  } else {
    console.log('❌ IDENTITY LOCK CHECK FAILED\n');
    
    for (const error of errors) {
      console.log(`${error.status}: ${error.check}`);
      console.log(`   Message: ${error.message}`);
      console.log(`   Expected: ${error.expected}`);
      console.log(`   Found: ${error.found}`);
      console.log('');
    }

    console.log('━'.repeat(60));
    console.log('📝 Phase identity is locked. PR must reference the correct phase.');
    console.log(`   Ledger: .github/PHASE_LEDGER.json`);
    console.log(`   PhaseName: ${ledger.phaseName}`);
    console.log(`   PhaseSlug: ${ledger.phaseSlug}`);
    console.log('━'.repeat(60));
    
    process.exit(1);
  }
}

main();
