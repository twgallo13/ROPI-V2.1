#!/usr/bin/env node
import { readFileSync, writeFileSync } from 'fs';

console.log('Adding rules_version metadata to classification reports...\n');

// Define classification rules version
const rulesVersion = {
  version: "1.0.0",
  generated_at: "2025-01-08T00:00:00.000Z",
  lp: "LP-cleanup-001",
  rules: {
    branch: {
      DEFAULT_BRANCH: "Never delete default branch (aoss-main, main, master)",
      PROTECTED_BRANCH: "Never delete protected branches",
      ACTIVE_PR_OPEN: "Branch has open PR - keep (low risk)",
      RECENT_NO_PR: "Last commit < 30 days, no PR - keep (low risk)",
      STALE_NO_PR: "Last commit > 90 days, no PR - review for deletion (medium risk)",
      RECENT_PR_MERGED: "PR merged recently (< 30 days) - delete soon (low risk)",
      OLD_PR_MERGED: "PR merged > 30 days ago - delete candidate (medium risk)"
    },
    pull_request: {
      OPEN_PR: "Open PR - requires attention",
      DRAFT_PR: "Draft PR - in progress",
      REVIEW_REQUESTED: "Review requested - active",
      CHANGES_REQUESTED: "Changes requested - blocked",
      APPROVED: "Approved - ready to merge",
      STALE_PR: "No activity > 90 days - review for closure"
    },
    issue: {
      OPEN_ISSUE: "Open issue - active tracking",
      STALE_ISSUE: "No activity > 90 days - review for closure",
      BLOCKED_ISSUE: "Blocked by external dependency"
    },
    tag: {
      RELEASE_TAG: "Release tag (semantic version) - immutable",
      OTHER_TAG: "Non-release tag - review retention policy"
    }
  },
  thresholds: {
    RECENT_ACTIVITY_DAYS: 30,
    STALE_THRESHOLD_DAYS: 90,
    BRANCH_DELETE_AFTER_MERGE_DAYS: 30
  }
};

// Update classification_report.json
console.log('[1/2] Updating classification_report.json...');
const classificationPath = 'inventory/LP-cleanup-001/classification_report.json';
const classification = JSON.parse(readFileSync(classificationPath, 'utf8'));

// Wrap in object with metadata
const classificationWithMeta = {
  classification_rules_version: rulesVersion,
  generated_at: "2025-01-08T00:00:00.000Z",
  total_items: classification.length,
  items: classification
};

writeFileSync(classificationPath, JSON.stringify(classificationWithMeta, null, 2));
console.log('  ✅ Added rules_version to classification_report.json\n');

// Save rules to separate file for reference by branch_proposals.csv
console.log('[2/2] Creating classification_rules.json for reference...');
writeFileSync('inventory/LP-cleanup-001/classification_rules.json', JSON.stringify(rulesVersion, null, 2));
console.log('  ✅ Created classification_rules.json\n');

// Update branch hygiene rules in LP-cleanup-004 to reference LP-001 rules
console.log('[3/3] Updating branch_proposals.csv metadata reference...');
const hygieneRulesPath = 'inventory/LP-cleanup-004/hygiene_rules.json';
const hygieneRules = JSON.parse(readFileSync(hygieneRulesPath, 'utf8'));

hygieneRules.classification_rules_reference = {
  source: "LP-cleanup-001",
  file: "../LP-cleanup-001/classification_rules.json",
  version: rulesVersion.version
};

writeFileSync(hygieneRulesPath, JSON.stringify(hygieneRules, null, 2));
console.log('  ✅ Updated hygiene_rules.json with classification_rules_reference\n');

console.log('='.repeat(60));
console.log('✅ All classification reports updated with rules_version');
console.log(`Rules Version: ${rulesVersion.version}`);
console.log('='.repeat(60));
