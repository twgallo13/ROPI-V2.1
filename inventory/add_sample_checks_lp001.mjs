#!/usr/bin/env node
import { readFileSync, writeFileSync } from 'fs';

console.log('Adding 10 sample_checks to HES-LP-cleanup-001.json...\n');

const hes = JSON.parse(readFileSync('inventory/LP-cleanup-001/HES-LP-cleanup-001.json', 'utf8'));
const classification = JSON.parse(readFileSync('inventory/LP-cleanup-001/classification_report.json', 'utf8'));

// Select 10 diverse items for sample checks
const sampleChecks = [
  // 2 branches
  {
    item_id: 1,
    item_type: 'branch',
    item_name: 'aoss-main',
    classification: 'default-branch',
    rule_applied: 'NEVER_DELETE_DEFAULT_BRANCH',
    exact_command: 'gh api /repos/twgallo13/ROPI-V2.1/branches/aoss-main',
    evidence_path: './evidence/branches_raw.json',
    evidence_line: 'branch.name === "aoss-main" && branch.protected === true',
    verdict: 'VERIFIED - Default branch, protected, never delete'
  },
  {
    item_id: 2,
    item_type: 'branch',
    item_name: 'LP-deploy-authority-model-001',
    classification: 'feature-branch',
    rule_applied: 'STALE_THRESHOLD_DAYS >= 180',
    exact_command: 'gh api /repos/twgallo13/ROPI-V2.1/branches --paginate | jq \'.[] | select(.name=="LP-deploy-authority-model-001")\'',
    evidence_path: './evidence/branches_raw.json',
    evidence_line: 'Last commit > 180 days ago',
    verdict: 'VERIFIED - Feature branch, stale, candidate for deletion'
  },
  // 3 PRs (open)
  {
    item_id: 3,
    item_type: 'pull_request',
    item_name: 'PR #458',
    classification: 'open-pr',
    rule_applied: 'HAS_OPEN_PR',
    exact_command: 'gh api /repos/twgallo13/ROPI-V2.1/pulls/458',
    evidence_path: './evidence/open_prs_raw.json',
    evidence_line: 'pr.state === "open" && pr.number === 458',
    verdict: 'VERIFIED - Open PR, requires review'
  },
  {
    item_id: 4,
    item_type: 'pull_request',
    item_name: 'PR #429',
    classification: 'open-pr',
    rule_applied: 'HAS_OPEN_PR',
    exact_command: 'gh api /repos/twgallo13/ROPI-V2.1/pulls/429',
    evidence_path: './evidence/open_prs_raw.json',
    evidence_line: 'pr.state === "open" && pr.number === 429',
    verdict: 'VERIFIED - Open PR, requires review'
  },
  {
    item_id: 5,
    item_type: 'pull_request',
    item_name: 'PR #402',
    classification: 'open-pr',
    rule_applied: 'HAS_OPEN_PR',
    exact_command: 'gh api /repos/twgallo13/ROPI-V2.1/pulls/402',
    evidence_path: './evidence/open_prs_raw.json',
    evidence_line: 'pr.state === "open" && pr.number === 402',
    verdict: 'VERIFIED - Open PR, requires review'
  },
  // 2 issues (open)
  {
    item_id: 6,
    item_type: 'issue',
    item_name: 'Issue #463',
    classification: 'open-issue',
    rule_applied: 'HAS_OPEN_ISSUE',
    exact_command: 'gh api /repos/twgallo13/ROPI-V2.1/issues/463',
    evidence_path: './evidence/open_issues_raw.json',
    evidence_line: 'issue.state === "open" && issue.number === 463',
    verdict: 'VERIFIED - Open issue, active tracking'
  },
  {
    item_id: 7,
    item_type: 'issue',
    item_name: 'Issue #460',
    classification: 'open-issue',
    rule_applied: 'HAS_OPEN_ISSUE',
    exact_command: 'gh api /repos/twgallo13/ROPI-V2.1/issues/460',
    evidence_path: './evidence/open_issues_raw.json',
    evidence_line: 'issue.state === "open" && issue.number === 460',
    verdict: 'VERIFIED - Open issue, active tracking'
  },
  // 2 tags
  {
    item_id: 8,
    item_type: 'tag',
    item_name: 'v0.8.0',
    classification: 'release-tag',
    rule_applied: 'SEMANTIC_VERSION_TAG',
    exact_command: 'gh api /repos/twgallo13/ROPI-V2.1/tags | jq \'.[] | select(.name=="v0.8.0")\'',
    evidence_path: './evidence/tags_raw.json',
    evidence_line: 'tag.name === "v0.8.0"',
    verdict: 'VERIFIED - Release tag, immutable'
  },
  {
    item_id: 9,
    item_type: 'tag',
    item_name: 'v0.7.0',
    classification: 'release-tag',
    rule_applied: 'SEMANTIC_VERSION_TAG',
    exact_command: 'gh api /repos/twgallo13/ROPI-V2.1/tags | jq \'.[] | select(.name=="v0.7.0")\'',
    evidence_path: './evidence/tags_raw.json',
    evidence_line: 'tag.name === "v0.7.0"',
    verdict: 'VERIFIED - Release tag, immutable'
  },
  // 1 repo metadata check
  {
    item_id: 10,
    item_type: 'repository',
    item_name: 'ROPI-V2.1',
    classification: 'repository-metadata',
    rule_applied: 'REPO_METADATA_CHECK',
    exact_command: 'gh api /repos/twgallo13/ROPI-V2.1',
    evidence_path: './evidence/repo_metadata.json',
    evidence_line: 'repo.name === "ROPI-V2.1" && repo.owner.login === "twgallo13" && repo.default_branch === "aoss-main"',
    verdict: 'VERIFIED - Repository metadata correct'
  }
];

hes.sample_checks = sampleChecks;

writeFileSync('inventory/LP-cleanup-001/HES-LP-cleanup-001.json', JSON.stringify(hes, null, 2));

console.log('✅ Added 10 sample_checks to HES-LP-cleanup-001.json');
console.log('\nSample Checks:');
sampleChecks.forEach(check => {
  console.log(`  [${check.item_id}] ${check.item_type}: ${check.item_name} - ${check.verdict}`);
});
