#!/usr/bin/env node
import { readFileSync, writeFileSync } from 'fs';

console.log('=== LP-cleanup-003: PR Hygiene Analysis ===\n');

// Load PR inventory from LP-cleanup-001
const openPRs = JSON.parse(readFileSync('../LP-cleanup-001/evidence/open_prs_raw.json', 'utf8'));

console.log(`Analyzing ${openPRs.length} open PRs\n`);

// Classification rules for PR hygiene
const HYGIENE_RULES = {
  CLOSE_ABANDONED: {
    description: "Close if: no activity >180 days AND no LP label AND not approved",
    threshold_days: 180,
    requires_no_lp: true,
    requires_not_approved: true
  },
  CLOSE_SUPERSEDED: {
    description: "Close if: explicitly marked as superseded or duplicate in body/comments",
    keywords: ['superseded', 'duplicate', 'replaced by']
  },
  MIXED_INTENT: {
    description: "Flag if: PR title/body suggests multiple unrelated intents (feat+fix, docs+refactor spanning multiple packages)",
    patterns: [
      /feat.*fix/i,
      /docs.*feat/i,
      /refactor.*fix.*feat/i
    ]
  },
  NORMALIZE_TITLE: {
    description: "Ensure PR title follows conventional commits format if possible",
    check: true
  }
};

// Helper: Calculate days since date
function daysSince(dateStr) {
  const date = new Date(dateStr);
  const now = new Date();
  return Math.floor((now - date) / (1000 * 60 * 60 * 24));
}

// Helper: Check if text contains superseded/duplicate indicators
function isSuperseded(pr) {
  const text = (pr.title + ' ' + (pr.body || '')).toLowerCase();
  
  // More specific patterns that indicate PR-level superseding
  const supersededPatterns = [
    /this pr (is|has been) superseded/i,
    /superseded by #\d+/i,
    /superseded by pr/i,
    /closing.*duplicate/i,
    /duplicate of #\d+/i,
    /replaced by #\d+/i,
    /replaced by pr/i
  ];
  
  for (const pattern of supersededPatterns) {
    if (pattern.test(text)) {
      return { isSuperseded: true, keyword: pattern.toString() };
    }
  }
  
  return { isSuperseded: false };
}

// Helper: Check for mixed intent
function hasMixedIntent(pr) {
  const title = pr.title.toLowerCase();
  const body = (pr.body || '').toLowerCase();
  const text = title + ' ' + body;
  
  // Check if title has multiple conventional commit types
  const types = ['feat', 'fix', 'docs', 'refactor', 'test', 'chore', 'style', 'perf'];
  const foundTypes = types.filter(type => {
    const regex = new RegExp(`\\b${type}\\b|\\b${type}\\(|\\b${type}:`, 'i');
    return regex.test(title);
  });
  
  if (foundTypes.length > 1) {
    return {
      hasMixed: true,
      reason: `Multiple commit types in title: ${foundTypes.join(', ')}`,
      suggested: foundTypes.map(t => `${t}: <specific change>`)
    };
  }
  
  // Check if body mentions multiple packages with different intents
  const packageMentions = (text.match(/packages\/\w+/g) || []).length;
  const intentKeywords = ['feat', 'fix', 'refactor', 'breaking'].filter(k => text.includes(k)).length;
  
  if (packageMentions > 2 && intentKeywords > 1) {
    return {
      hasMixed: true,
      reason: `Multiple packages (${packageMentions}) with multiple intents (${intentKeywords})`,
      suggested: ['Split by package or by intent type']
    };
  }
  
  return { hasMixed: false };
}

// Analyze each PR
const actions = [];
let closeCount = 0;
let mixedIntentCount = 0;
let normalizeCount = 0;

for (const pr of openPRs) {
  const daysSinceUpdate = daysSince(pr.updated_at);
  const currentLabels = pr.labels.map(l => l.name);
  const hasLPLabel = currentLabels.some(l => l.startsWith('lp:'));
  const isApproved = currentLabels.includes('state:approved');
  const isDraft = pr.draft;
  
  const action = {
    pr_number: pr.number,
    title: pr.title,
    url: pr.html_url,
    days_since_update: daysSinceUpdate,
    current_labels: currentLabels,
    actions: [],
    comments: [],
    close: false,
    reason: null
  };
  
  // Rule 1: Check if abandoned (>180 days, no LP, not approved)
  if (daysSinceUpdate > HYGIENE_RULES.CLOSE_ABANDONED.threshold_days && !hasLPLabel && !isApproved) {
    action.close = true;
    action.reason = `Abandoned: no activity for ${daysSinceUpdate} days, missing LP label, not approved`;
    action.rule = 'CLOSE_ABANDONED';
    action.comments.push({
      body: `🔒 **Closed by LP-cleanup-003**\n\n` +
            `**Reason:** ${action.reason}\n` +
            `**Rule:** CLOSE_ABANDONED (>180 days inactive, no LP label, not approved)\n` +
            `**Pointer:** None (no replacement PR identified)\n` +
            `**Executor:** Homer\n\n` +
            `This PR can be reopened if work resumes. Please add appropriate LP label and update status.`
    });
    closeCount++;
  }
  
  // Rule 2: Check if explicitly superseded
  const supersededCheck = isSuperseded(pr);
  if (supersededCheck.isSuperseded && !action.close) {
    action.close = true;
    action.reason = `Superseded: PR contains keyword "${supersededCheck.keyword}"`;
    action.rule = 'CLOSE_SUPERSEDED';
    action.comments.push({
      body: `🔒 **Closed by LP-cleanup-003**\n\n` +
            `**Reason:** ${action.reason}\n` +
            `**Rule:** CLOSE_SUPERSEDED (explicitly marked as superseded/duplicate)\n` +
            `**Pointer:** Check PR body/comments for replacement reference\n` +
            `**Executor:** Homer\n\n` +
            `This PR is marked as superseded or duplicate.`
    });
    closeCount++;
  }
  
  // Rule 3: Check for mixed intent (flag only, don't close)
  const mixedCheck = hasMixedIntent(pr);
  if (mixedCheck.hasMixed && !action.close) {
    action.actions.push('add_label:mixed-intent');
    action.comments.push({
      body: `⚠️ **Mixed-intent detected by LP-cleanup-003**\n\n` +
            `**Detected issue:** ${mixedCheck.reason}\n` +
            `**Recommended action:** Split into separate PRs:\n` +
            mixedCheck.suggested.map(s => `  - ${s}`).join('\n') + '\n\n' +
            `**Executor:** Homer\n\n` +
            `This PR appears to address multiple unrelated concerns. Consider splitting for easier review and maintenance.`
    });
    mixedIntentCount++;
  }
  
  // Only add to actions if there's something to do
  if (action.close || action.actions.length > 0 || action.comments.length > 0) {
    actions.push(action);
    
    if (action.actions.includes('add_label:mixed-intent')) {
      normalizeCount++;
    }
  }
}

console.log('=== Analysis Complete ===');
console.log(`PRs to close: ${closeCount}`);
console.log(`PRs with mixed intent: ${mixedIntentCount}`);
console.log(`Total PRs requiring action: ${actions.length}`);

// Generate sample checks (first 10)
const sampleChecks = actions.slice(0, 10).map(a => ({
  pr_number: a.pr_number,
  title: a.title,
  url: a.url,
  action: a.close ? 'CLOSE' : 'COMMENT',
  reason: a.reason || a.comments[0]?.body.split('\n')[2] || 'See comments',
  rule: a.rule || 'MIXED_INTENT'
}));

// Save outputs
writeFileSync('./pr_actions.json', JSON.stringify(actions, null, 2));
writeFileSync('./sample_checks.json', JSON.stringify(sampleChecks, null, 2));
writeFileSync('./hygiene_rules.json', JSON.stringify(HYGIENE_RULES, null, 2));

// Generate CSV
const csvHeader = 'pr_number,title,action,reason,days_since_update,url\n';
const csvRows = actions.map(a => 
  `${a.pr_number},"${a.title.replace(/"/g, '""')}",${a.close ? 'CLOSE' : 'COMMENT'},"${(a.reason || 'Mixed intent detected').replace(/"/g, '""')}",${a.days_since_update},${a.url}`
).join('\n');
writeFileSync('./pr_actions.csv', csvHeader + csvRows);

console.log('\n✅ Analysis artifacts generated');
console.log('   - pr_actions.json: Full action plan');
console.log('   - pr_actions.csv: CSV export');
console.log('   - sample_checks.json: Sample evidence');
console.log('   - hygiene_rules.json: Rules applied');
