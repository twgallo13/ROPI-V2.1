#!/usr/bin/env node
import { readFileSync, writeFileSync } from 'fs';
import { execSync } from 'child_process';

console.log('Starting LP-cleanup-004 branch hygiene analysis...\n');

// Read branch data from LP-cleanup-001
const branchesData = JSON.parse(readFileSync('../LP-cleanup-001/evidence/branches_raw.json', 'utf8'));
const protectionData = JSON.parse(readFileSync('./evidence/branch_protection_manual.json', 'utf8'));

console.log(`Total branches: ${branchesData.length}`);
console.log(`Protected branches data: ${protectionData.length}\n`);

// Create protection lookup
const protectionMap = new Map();
protectionData.forEach(p => {
  protectionMap.set(p.branch, p);
});

// Define deterministic delete-candidate rules
const RULES = {
  STALE_THRESHOLD_DAYS: 180,  // 6 months
  MERGED_THRESHOLD_DAYS: 90,   // 3 months after merge
  NEVER_DELETE_PATTERNS: [
    /^main$/i,
    /^master$/i,
    /^aoss-main$/i,
    /^develop$/i,
    /^development$/i,
    /^staging$/i,
    /^production$/i,
    /^release\//i,
    /^hotfix\//i
  ],
  KEEP_IF_RECENT_ACTIVITY_DAYS: 30
};

const now = new Date();
const msPerDay = 24 * 60 * 60 * 1000;

function daysSince(dateStr) {
  const date = new Date(dateStr);
  return Math.floor((now - date) / msPerDay);
}

function matchesNeverDeletePattern(branchName) {
  return RULES.NEVER_DELETE_PATTERNS.some(pattern => pattern.test(branchName));
}

function classifyBranch(branch) {
  const name = branch.name;
  const commit = branch.commit;
  
  // Get protection status
  const protection = protectionMap.get(name);
  const isProtected = protection && !protection.error;
  const protectionError = protection?.error || null;
  
  // Rule 1: Never delete protected branches
  if (isProtected) {
    return {
      classification: 'PROTECTED',
      delete_candidate: false,
      reason: 'Branch is protected',
      protection_status: 'protected',
      protection_error: null
    };
  }
  
  // Rule 2: Never delete if matches never-delete patterns
  if (matchesNeverDeletePattern(name)) {
    return {
      classification: 'NEVER_DELETE',
      delete_candidate: false,
      reason: `Matches never-delete pattern: ${name}`,
      protection_status: protectionError ? 'unknown' : 'not_protected',
      protection_error: protectionError
    };
  }
  
  // Get last commit date
  const lastActivityDays = commit?.commit?.committer?.date 
    ? daysSince(commit.commit.committer.date)
    : 9999;
  
  // Rule 3: Keep if recent activity (< 30 days)
  if (lastActivityDays < RULES.KEEP_IF_RECENT_ACTIVITY_DAYS) {
    return {
      classification: 'ACTIVE',
      delete_candidate: false,
      reason: `Recent activity (${lastActivityDays} days ago)`,
      last_activity_days: lastActivityDays,
      protection_status: protectionError ? 'unknown' : 'not_protected',
      protection_error: protectionError
    };
  }
  
  // Rule 4: Stale candidate (> 180 days, no merge data available)
  if (lastActivityDays >= RULES.STALE_THRESHOLD_DAYS) {
    return {
      classification: 'STALE_CANDIDATE',
      delete_candidate: true,
      reason: `No activity for ${lastActivityDays} days (threshold: ${RULES.STALE_THRESHOLD_DAYS})`,
      last_activity_days: lastActivityDays,
      protection_status: protectionError ? 'unknown' : 'not_protected',
      protection_error: protectionError,
      recommendation: 'Review for deletion - stale branch with no recent activity'
    };
  }
  
  // Rule 5: Moderate age (30-180 days) - keep but monitor
  return {
    classification: 'MODERATE_AGE',
    delete_candidate: false,
    reason: `Moderate age (${lastActivityDays} days) - keep and monitor`,
    last_activity_days: lastActivityDays,
    protection_status: protectionError ? 'unknown' : 'not_protected',
    protection_error: protectionError
  };
}

// Classify all branches
const results = branchesData.map(branch => {
  const classification = classifyBranch(branch);
  return {
    branch_name: branch.name,
    ...classification,
    last_commit_sha: branch.commit?.sha || null,
    last_commit_date: branch.commit?.commit?.committer?.date || null,
    last_commit_author: branch.commit?.commit?.author?.name || null
  };
});

// Generate summary statistics
const summary = {
  total_branches: results.length,
  protected: results.filter(r => r.classification === 'PROTECTED').length,
  never_delete: results.filter(r => r.classification === 'NEVER_DELETE').length,
  active: results.filter(r => r.classification === 'ACTIVE').length,
  moderate_age: results.filter(r => r.classification === 'MODERATE_AGE').length,
  stale_candidates: results.filter(r => r.classification === 'STALE_CANDIDATE').length,
  total_delete_candidates: results.filter(r => r.delete_candidate).length
};

console.log('Classification Summary:');
console.log(`  Protected: ${summary.protected}`);
console.log(`  Never Delete (pattern match): ${summary.never_delete}`);
console.log(`  Active (< 30 days): ${summary.active}`);
console.log(`  Moderate Age (30-180 days): ${summary.moderate_age}`);
console.log(`  Stale Candidates (> 180 days): ${summary.stale_candidates}`);
console.log(`  Total Delete Candidates: ${summary.total_delete_candidates}\n`);

// Save results
writeFileSync('./branch_classification.json', JSON.stringify(results, null, 2));
writeFileSync('./branch_classification_summary.json', JSON.stringify(summary, null, 2));

// Save rules documentation
writeFileSync('./hygiene_rules.json', JSON.stringify(RULES, null, 2));

console.log('✅ Classification complete');
console.log('   - branch_classification.json');
console.log('   - branch_classification_summary.json');
console.log('   - hygiene_rules.json');
