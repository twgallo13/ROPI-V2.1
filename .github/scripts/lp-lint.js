#!/usr/bin/env node
/**
 * LP Lint Script
 * 
 * LP-workflow-fix-#001: Validates PR format
 * 
 * Checks:
 * 1. PR body first line contains: LP: LP-<PhaseSlug>-#NNN (numeric LP ID)
 * 2. PR labels include: lp:<phaseSlug>-NNN (no # in labels - GitHub limitation)
 * 
 * Note: GitHub labels cannot contain '#', so label format omits it.
 * 
 * Exits non-zero if either check fails.
 */

// LP body format: LP: LP-<phase-slug>-#NNN (e.g., LP: LP-governance-alignment-#001)
// Also accepts markdown heading: ## LP: LP-<phase-slug>-#NNN
const LP_PATTERN = /^(?:##\s*)?LP:\s*LP-([a-z0-9-]+)-#(\d+)/i;

// LP label format: lp:<phase-slug>-NNN (no # - GitHub limitation)
const LP_LABEL_PATTERN = /^lp:([a-z0-9-]+)-(\d+)$/i;

function main() {
  console.log('🔍 LP Lint - Validating PR format...\n');

  const prBody = process.env.PR_BODY || '';
  const prLabels = JSON.parse(process.env.PR_LABELS || '[]');
  const prNumber = process.env.PR_NUMBER || 'unknown';
  const prTitle = process.env.PR_TITLE || '';

  const errors = [];
  let lpFromBody = null;
  let lpFromLabel = null;

  // Check 1: PR body first line contains LP identifier
  const firstLine = prBody.split('\n')[0]?.trim() || '';
  const lpMatch = firstLine.match(LP_PATTERN);

  if (!lpMatch) {
    errors.push({
      check: 'LP in PR Body',
      status: '❌ FAILED',
      message: `First line of PR body must contain: LP: LP-<PhaseSlug>-#NNN`,
      found: firstLine ? `"${firstLine.substring(0, 80)}..."` : '(empty)',
      example: 'LP: LP-workflow-fix-#001',
    });
  } else {
    lpFromBody = `LP-${lpMatch[1]}-#${lpMatch[2]}`;
    console.log(`✅ LP in PR Body: ${lpFromBody}`);
  }

  // Check 2: PR labels include lp:<phaseSlug>-NNN (no # in labels)
  const lpLabels = prLabels
    .map(label => label.name)
    .filter(name => LP_LABEL_PATTERN.test(name));

  if (lpLabels.length === 0) {
    errors.push({
      check: 'LP Label',
      status: '❌ FAILED',
      message: `PR must have a label matching: lp:<phaseSlug>-NNN (no # in label)`,
      found: prLabels.length > 0 
        ? `Labels: ${prLabels.map(l => l.name).join(', ')}`
        : '(no labels)',
      example: 'lp:workflow-fix-001',
    });
  } else {
    lpFromLabel = lpLabels[0];
    console.log(`✅ LP Label: ${lpFromLabel}`);
  }

  // Check 3: LP in body and label should match (if both present)
  if (lpFromBody && lpFromLabel) {
    // Body has #NNN, label has NNN (no #)
    const bodySlug = lpFromBody.toLowerCase().replace('lp-', '').replace('#', '');
    const labelSlug = lpFromLabel.toLowerCase().replace('lp:', '');
    
    if (bodySlug !== labelSlug) {
      errors.push({
        check: 'LP Consistency',
        status: '⚠️ WARNING',
        message: 'LP in body and label do not match (ignoring # difference)',
        found: `Body: ${lpFromBody}, Label: ${lpFromLabel}`,
        example: 'Body: LP-workflow-fix-#001, Label: lp:workflow-fix-001',
      });
    } else {
      console.log(`✅ LP Consistency: Body and label match`);
    }
  }

  // Output results
  console.log('\n' + '━'.repeat(60));
  
  if (errors.length === 0) {
    console.log('✅ LP LINT PASSED\n');
    console.log(`PR #${prNumber}: ${prTitle}`);
    console.log(`LP: ${lpFromBody}`);
    console.log(`Label: ${lpFromLabel}`);
    process.exit(0);
  } else {
    console.log('❌ LP LINT FAILED\n');
    console.log(`PR #${prNumber}: ${prTitle}\n`);
    
    for (const error of errors) {
      console.log(`${error.status}: ${error.check}`);
      console.log(`   Message: ${error.message}`);
      console.log(`   Found: ${error.found}`);
      console.log(`   Example: ${error.example}`);
      console.log('');
    }

    console.log('━'.repeat(60));
    console.log('📝 How to fix:');
    console.log('1. Edit PR description - first line must be: LP: LP-<PhaseSlug>-#NNN');
    console.log('   Example: LP: LP-workflow-fix-#001');
    console.log('2. Add label: lp:<phaseSlug>-NNN (no # in label - GitHub limitation)');
    console.log('   Example: lp:workflow-fix-001');
    console.log('━'.repeat(60));
    
    process.exit(1);
  }
}

main();
