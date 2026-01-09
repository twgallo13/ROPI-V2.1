#!/usr/bin/env node
import { readFileSync, writeFileSync } from 'fs';

const classification = JSON.parse(readFileSync('./branch_classification.json', 'utf8'));

// Select 10 diverse sample checks
const samples = [];

// 2 protected/never-delete
const protectedBranches = classification.filter(c => c.classification === 'PROTECTED' || c.classification === 'NEVER_DELETE');
samples.push(...protectedBranches.slice(0, 2));

// 2 stale candidates (oldest)
const staleCandidates = classification.filter(c => c.classification === 'STALE_CANDIDATE')
  .sort((a, b) => b.last_activity_days - a.last_activity_days);
samples.push(...staleCandidates.slice(0, 2));

// 2 stale candidates (newest of the stale)
samples.push(...staleCandidates.slice(-2));

// 4 more diverse stale candidates (middle range)
const middleRange = staleCandidates.slice(
  Math.floor(staleCandidates.length * 0.25),
  Math.floor(staleCandidates.length * 0.75)
);
samples.push(...middleRange.slice(0, 4));

// Ensure exactly 10 samples
const sampleChecks = samples.slice(0, 10).map((branch, idx) => ({
  sample_id: idx + 1,
  branch_name: branch.branch_name,
  classification: branch.classification,
  delete_candidate: branch.delete_candidate,
  reason: branch.reason,
  last_activity_days: branch.last_activity_days || null,
  last_commit_date: branch.last_commit_date,
  last_commit_sha: branch.last_commit_sha,
  protection_status: branch.protection_status,
  protection_error: branch.protection_error,
  recommendation: branch.recommendation || 'Keep - matches never-delete criteria',
  verification: {
    rule_applied: branch.classification === 'STALE_CANDIDATE' 
      ? 'STALE_THRESHOLD_DAYS >= 180'
      : branch.classification === 'PROTECTED'
      ? 'PROTECTED_BRANCH'
      : 'NEVER_DELETE_PATTERN',
    threshold_met: branch.delete_candidate,
    manual_review_required: branch.protection_status === 'unknown'
  }
}));

writeFileSync('./sample_checks.json', JSON.stringify(sampleChecks, null, 2));
console.log(`✅ Generated sample_checks.json with ${sampleChecks.length} samples`);

sampleChecks.forEach(s => {
  console.log(`  [${s.sample_id}] ${s.branch_name}: ${s.classification} (${s.last_activity_days || 'N/A'} days)`);
});
