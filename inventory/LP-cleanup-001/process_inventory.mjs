#!/usr/bin/env node
import { readFileSync, writeFileSync } from 'fs';
import { parse } from 'json2csv';

// Read raw data
const branches = JSON.parse(readFileSync('./evidence/branches_raw.json', 'utf8'));
const openPRs = JSON.parse(readFileSync('./evidence/open_prs_raw.json', 'utf8'));
const openIssuesRaw = JSON.parse(readFileSync('./evidence/open_issues_raw.json', 'utf8'));
const tags = JSON.parse(readFileSync('./evidence/tags_raw.json', 'utf8'));
const repoMeta = JSON.parse(readFileSync('./evidence/repo_metadata.json', 'utf8'));
const branchProtection = JSON.parse(readFileSync('./evidence/branch_protection.json', 'utf8'));

// Filter issues (exclude PRs)
const openIssues = openIssuesRaw.filter(item => !item.pull_request);

console.log('=== Processing Inventory Data ===');
console.log(`Branches: ${branches.length}`);
console.log(`Open PRs: ${openPRs.length}`);
console.log(`Open Issues: ${openIssues.length}`);
console.log(`Tags: ${tags.length}`);

// Classification rules
const CLASSIFICATION_RULES = {
  branch: {
    'ACTIVE_MAIN': 'Branch is default branch (aoss-main)',
    'ACTIVE_PROTECTED': 'Branch is protected and not default',
    'ACTIVE_PR_OPEN': 'Branch has open PR associated',
    'STALE_NO_PR': 'Branch has no open PR and last commit > 30 days ago',
    'RECENT_NO_PR': 'Branch has no open PR but last commit < 30 days ago',
    'ORPHANED': 'Branch author inactive or pattern suggests abandonment'
  },
  pr: {
    'ACTIVE_IN_PROGRESS': 'PR has state:in-progress label or recent activity < 7 days',
    'ACTIVE_REVIEW': 'PR has state:review or state:approved label',
    'STALE_NO_ACTIVITY': 'PR has no activity > 14 days',
    'BLOCKED': 'PR has blocked:* label',
    'MISSING_LP': 'PR missing lp:* label',
    'READY_TO_MERGE': 'PR approved and no blocking labels'
  },
  issue: {
    'ACTIVE_ASSIGNED': 'Issue is assigned and updated < 14 days',
    'STALE_ASSIGNED': 'Issue is assigned but no activity > 14 days',
    'UNASSIGNED_RECENT': 'Issue unassigned but created/updated < 14 days',
    'STALE_UNASSIGNED': 'Issue unassigned and no activity > 14 days',
    'TRACKING_ISSUE': 'Issue used for phase tracking (label pattern)'
  },
  tag: {
    'RELEASE_TAG': 'Tag associated with GitHub release',
    'LIGHTWEIGHT_TAG': 'Lightweight tag (no annotation)',
    'ORPHANED_TAG': 'Tag points to commit not in main branch history'
  }
};

// Helper: Calculate days since date
function daysSince(dateStr) {
  const date = new Date(dateStr);
  const now = new Date();
  return Math.floor((now - date) / (1000 * 60 * 60 * 24));
}

// Helper: Extract LP label
function extractLPLabel(labels) {
  const lpLabel = labels.find(l => l.name && l.name.startsWith('lp:'));
  return lpLabel ? lpLabel.name : null;
}

// Helper: Extract state label
function extractStateLabel(labels) {
  const stateLabel = labels.find(l => l.name && l.name.startsWith('state:'));
  return stateLabel ? stateLabel.name : null;
}

// Helper: Check if has blocked label
function hasBlockedLabel(labels) {
  return labels.some(l => l.name && l.name.startsWith('blocked:'));
}

// Classify branches
const branchClassifications = branches.map(branch => {
  const hasOpenPR = openPRs.some(pr => pr.head.ref === branch.name);
  const isProtected = branch.protected || false;
  const isDefault = branch.name === repoMeta.default_branch;

  let classification, riskLevel, rationale;

  if (isDefault) {
    classification = 'ACTIVE_MAIN';
    riskLevel = 'NONE';
    rationale = CLASSIFICATION_RULES.branch.ACTIVE_MAIN;
  } else if (isProtected) {
    classification = 'ACTIVE_PROTECTED';
    riskLevel = 'LOW';
    rationale = CLASSIFICATION_RULES.branch.ACTIVE_PROTECTED;
  } else if (hasOpenPR) {
    classification = 'ACTIVE_PR_OPEN';
    riskLevel = 'LOW';
    rationale = CLASSIFICATION_RULES.branch.ACTIVE_PR_OPEN;
  } else {
    // Cannot determine age without full commit data, classify as RECENT_NO_PR
    classification = 'RECENT_NO_PR';
    riskLevel = 'LOW';
    rationale = CLASSIFICATION_RULES.branch.RECENT_NO_PR + ' (age unknown)';
  }

  return {
    type: 'branch',
    name: branch.name,
    classification,
    riskLevel,
    rationale,
    ruleReference: `CLASSIFICATION_RULES.branch.${classification}`,
    riskNotes: '',
    metadata: {
      lastCommitSHA: branch.commit.sha,
      lastCommitURL: branch.commit.url,
      isProtected
    }
  };
});

// Classify PRs
const prClassifications = openPRs.map(pr => {
  const daysSinceUpdate = daysSince(pr.updated_at);
  const lpLabel = extractLPLabel(pr.labels);
  const stateLabel = extractStateLabel(pr.labels);
  const isBlocked = hasBlockedLabel(pr.labels);

  let classification, riskLevel, rationale;

  if (!lpLabel) {
    classification = 'MISSING_LP';
    riskLevel = 'HIGH';
    rationale = CLASSIFICATION_RULES.pr.MISSING_LP;
  } else if (isBlocked) {
    classification = 'BLOCKED';
    riskLevel = 'MEDIUM';
    rationale = CLASSIFICATION_RULES.pr.BLOCKED;
  } else if (stateLabel === 'state:approved') {
    classification = 'READY_TO_MERGE';
    riskLevel = 'LOW';
    rationale = CLASSIFICATION_RULES.pr.READY_TO_MERGE;
  } else if (stateLabel === 'state:review') {
    classification = 'ACTIVE_REVIEW';
    riskLevel = 'LOW';
    rationale = CLASSIFICATION_RULES.pr.ACTIVE_REVIEW;
  } else if (daysSinceUpdate > 14) {
    classification = 'STALE_NO_ACTIVITY';
    riskLevel = 'MEDIUM';
    rationale = CLASSIFICATION_RULES.pr.STALE_NO_ACTIVITY;
  } else {
    classification = 'ACTIVE_IN_PROGRESS';
    riskLevel = 'LOW';
    rationale = CLASSIFICATION_RULES.pr.ACTIVE_IN_PROGRESS;
  }

  return {
    type: 'pr',
    number: pr.number,
    title: pr.title,
    classification,
    riskLevel,
    rationale,
    ruleReference: `CLASSIFICATION_RULES.pr.${classification}`,
    riskNotes: riskLevel !== 'LOW' ? `Updated ${daysSinceUpdate}d ago` : '',
    metadata: {
      headBranch: pr.head.ref,
      baseBranch: pr.base.ref,
      author: pr.user.login,
      lpLabel,
      stateLabel,
      labels: pr.labels.map(l => l.name),
      createdAt: pr.created_at,
      updatedAt: pr.updated_at,
      daysSinceUpdate
    }
  };
});

// Classify Issues
const issueClassifications = openIssues.map(issue => {
  const daysSinceUpdate = daysSince(issue.updated_at);
  const isAssigned = issue.assignees && issue.assignees.length > 0;
  const hasTrackingLabel = issue.labels.some(l => l.name && (l.name.includes('phase') || l.name.includes('tracking')));

  let classification, riskLevel, rationale;

  if (hasTrackingLabel) {
    classification = 'TRACKING_ISSUE';
    riskLevel = 'NONE';
    rationale = CLASSIFICATION_RULES.issue.TRACKING_ISSUE;
  } else if (isAssigned && daysSinceUpdate < 14) {
    classification = 'ACTIVE_ASSIGNED';
    riskLevel = 'LOW';
    rationale = CLASSIFICATION_RULES.issue.ACTIVE_ASSIGNED;
  } else if (isAssigned && daysSinceUpdate >= 14) {
    classification = 'STALE_ASSIGNED';
    riskLevel = 'MEDIUM';
    rationale = CLASSIFICATION_RULES.issue.STALE_ASSIGNED;
  } else if (!isAssigned && daysSinceUpdate < 14) {
    classification = 'UNASSIGNED_RECENT';
    riskLevel = 'LOW';
    rationale = CLASSIFICATION_RULES.issue.UNASSIGNED_RECENT;
  } else {
    classification = 'STALE_UNASSIGNED';
    riskLevel = 'MEDIUM';
    rationale = CLASSIFICATION_RULES.issue.STALE_UNASSIGNED;
  }

  return {
    type: 'issue',
    number: issue.number,
    title: issue.title,
    classification,
    riskLevel,
    rationale,
    ruleReference: `CLASSIFICATION_RULES.issue.${classification}`,
    riskNotes: riskLevel === 'MEDIUM' ? `No activity for ${daysSinceUpdate}d` : '',
    metadata: {
      labels: issue.labels.map(l => l.name),
      assignees: issue.assignees.map(a => a.login),
      createdAt: issue.created_at,
      updatedAt: issue.updated_at,
      commentsCount: issue.comments,
      daysSinceUpdate
    }
  };
});

// Classify Tags
const tagClassifications = tags.map(tag => {
  const hasRelease = false; // Would need separate API call to check
  const isAnnotated = tag.commit.sha !== tag.commit.sha; // Simplified

  let classification, riskLevel, rationale;

  if (hasRelease) {
    classification = 'RELEASE_TAG';
    riskLevel = 'NONE';
    rationale = CLASSIFICATION_RULES.tag.RELEASE_TAG;
  } else {
    classification = 'LIGHTWEIGHT_TAG';
    riskLevel = 'LOW';
    rationale = CLASSIFICATION_RULES.tag.LIGHTWEIGHT_TAG;
  }

  return {
    type: 'tag',
    name: tag.name,
    classification,
    riskLevel,
    rationale,
    ruleReference: `CLASSIFICATION_RULES.tag.${classification}`,
    riskNotes: '',
    metadata: {
      commitSHA: tag.commit.sha,
      commitURL: tag.commit.url
    }
  };
});

// Combine all classifications
const allClassifications = [
  ...branchClassifications,
  ...prClassifications,
  ...issueClassifications,
  ...tagClassifications
];

// Label validation report
const labelReport = {
  prs_missing_lp: openPRs.filter(pr => !extractLPLabel(pr.labels)).map(pr => ({
    number: pr.number,
    title: pr.title,
    url: pr.html_url,
    missing: ['lp:*']
  })),
  prs_missing_state: openPRs.filter(pr => !extractStateLabel(pr.labels)).map(pr => ({
    number: pr.number,
    title: pr.title,
    url: pr.html_url,
    missing: ['state:*']
  })),
  issues_with_no_labels: openIssues.filter(issue => issue.labels.length === 0).map(issue => ({
    number: issue.number,
    title: issue.title,
    url: issue.html_url
  }))
};

// Top risk items
const riskItems = allClassifications
  .filter(item => item.riskLevel === 'HIGH' || item.riskLevel === 'MEDIUM')
  .sort((a, b) => {
    const riskOrder = { HIGH: 0, MEDIUM: 1, LOW: 2, NONE: 3 };
    return riskOrder[a.riskLevel] - riskOrder[b.riskLevel];
  })
  .slice(0, 10);

// Generate CSV files
const branchesCSV = parse(branches.map(b => ({
  name: b.name,
  last_commit_sha: b.commit.sha.substring(0, 8),
  is_protected: b.protected || false,
  commit_url: b.commit.url
})));

const prsCSV = parse(openPRs.map(pr => ({
  number: pr.number,
  title: pr.title,
  head_branch: pr.head.ref,
  base_branch: pr.base.ref,
  author: pr.user.login,
  lp_label: extractLPLabel(pr.labels) || 'MISSING',
  state_label: extractStateLabel(pr.labels) || 'MISSING',
  created_at: pr.created_at,
  updated_at: pr.updated_at,
  url: pr.html_url
})));

const issuesCSV = parse(openIssues.map(issue => ({
  number: issue.number,
  title: issue.title,
  labels: issue.labels.map(l => l.name).join(';'),
  assignees: issue.assignees.map(a => a.login).join(';'),
  created_at: issue.created_at,
  updated_at: issue.updated_at,
  comments_count: issue.comments,
  url: issue.html_url
})));

const tagsCSV = parse(tags.map(tag => ({
  name: tag.name,
  commit_sha: tag.commit.sha.substring(0, 8),
  commit_url: tag.commit.url
})));

// Write all outputs
writeFileSync('./branches.csv', branchesCSV);
writeFileSync('./open_prs.csv', prsCSV);
writeFileSync('./open_issues.csv', issuesCSV);
writeFileSync('./tags.csv', tagsCSV);

writeFileSync('./classification_report.json', JSON.stringify(allClassifications, null, 2));
writeFileSync('./label_report.json', JSON.stringify(labelReport, null, 2));

// Generate summary markdown
const summary = `# Repository State Summary — LP-cleanup-001

**Generated:** ${new Date().toISOString()}

## Inventory Counts

| Category | Count |
|----------|-------|
| Branches | ${branches.length} |
| Open PRs | ${openPRs.length} |
| Open Issues | ${openIssues.length} |
| Tags | ${tags.length} |

## Risk Distribution

| Risk Level | Count |
|------------|-------|
| HIGH | ${allClassifications.filter(c => c.riskLevel === 'HIGH').length} |
| MEDIUM | ${allClassifications.filter(c => c.riskLevel === 'MEDIUM').length} |
| LOW | ${allClassifications.filter(c => c.riskLevel === 'LOW').length} |
| NONE | ${allClassifications.filter(c => c.riskLevel === 'NONE').length} |

## Label Issues

- PRs missing lp:* label: **${labelReport.prs_missing_lp.length}**
- PRs missing state:* label: **${labelReport.prs_missing_state.length}**
- Issues with no labels: **${labelReport.issues_with_no_labels.length}**

## Top 10 Risk Items

${riskItems.map((item, i) => `${i + 1}. **[${item.riskLevel}]** ${item.type} ${item.name || item.number} - ${item.classification}
   - ${item.rationale}
   - ${item.riskNotes}`).join('\n\n')}

## Repository Metadata

- **Default branch:** ${repoMeta.default_branch}
- **Visibility:** ${repoMeta.visibility}
- **Protected branches:** ${branchProtection.error ? 'Insufficient permissions to check' : 'Configured'}
- **Required reviews:** N/A (permissions limited)

## Classification Rules Applied

${Object.entries(CLASSIFICATION_RULES).map(([category, rules]) => 
  `### ${category}\n${Object.entries(rules).map(([key, desc]) => `- **${key}**: ${desc}`).join('\n')}`
).join('\n\n')}
`;

writeFileSync('./current_repo_state_summary.md', summary);

// Generate master inventory JSON
const masterInventory = {
  generated_at: new Date().toISOString(),
  lp: 'LP-cleanup-001',
  phase: 'cleanup',
  repository: {
    owner: 'twgallo13',
    name: 'ROPI-V2.1',
    default_branch: repoMeta.default_branch,
    visibility: repoMeta.visibility
  },
  counts: {
    branches: branches.length,
    open_prs: openPRs.length,
    open_issues: openIssues.length,
    tags: tags.length
  },
  classifications: {
    total: allClassifications.length,
    by_risk: {
      HIGH: allClassifications.filter(c => c.riskLevel === 'HIGH').length,
      MEDIUM: allClassifications.filter(c => c.riskLevel === 'MEDIUM').length,
      LOW: allClassifications.filter(c => c.riskLevel === 'LOW').length,
      NONE: allClassifications.filter(c => c.riskLevel === 'NONE').length
    }
  },
  classification_rules: CLASSIFICATION_RULES,
  evidence_files: {
    branches_raw: './evidence/branches_raw.json',
    open_prs_raw: './evidence/open_prs_raw.json',
    open_issues_raw: './evidence/open_issues_raw.json',
    tags_raw: './evidence/tags_raw.json',
    repo_metadata: './evidence/repo_metadata.json',
    branch_protection: './evidence/branch_protection.json'
  },
  artifact_files: {
    branches_csv: './branches.csv',
    open_prs_csv: './open_prs.csv',
    open_issues_csv: './open_issues.csv',
    tags_csv: './tags.csv',
    classification_report: './classification_report.json',
    label_report: './label_report.json',
    summary: './current_repo_state_summary.md'
  }
};

writeFileSync('./LP-cleanup-001-inventory.json', JSON.stringify(masterInventory, null, 2));

console.log('\n=== Processing Complete ===');
console.log('Generated files:');
console.log('  - LP-cleanup-001-inventory.json');
console.log('  - branches.csv, open_prs.csv, open_issues.csv, tags.csv');
console.log('  - classification_report.json');
console.log('  - label_report.json');
console.log('  - current_repo_state_summary.md');
console.log(`\nTotal items classified: ${allClassifications.length}`);
console.log(`High risk items: ${allClassifications.filter(c => c.riskLevel === 'HIGH').length}`);
console.log(`Medium risk items: ${allClassifications.filter(c => c.riskLevel === 'MEDIUM').length}`);
