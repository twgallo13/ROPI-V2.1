#!/usr/bin/env node
import { readFileSync, writeFileSync } from 'fs';
import { execSync } from 'child_process';

// Load inventory from LP-cleanup-001
const openPRsRaw = JSON.parse(readFileSync('../LP-cleanup-001/evidence/open_prs_raw.json', 'utf8'));
const labelReport = JSON.parse(readFileSync('../LP-cleanup-001/label_report.json', 'utf8'));

console.log('=== LP-cleanup-002: Label Application ===\n');
console.log(`Processing ${openPRsRaw.length} open PRs\n`);

// Helper: Extract LP from PR body or title
function extractLPFromText(text) {
  if (!text) return null;
  
  // Match patterns like: LP-<slug>-<number> or LP-<slug>-<semver>
  const lpPatterns = [
    /LP-[\w-]+-\d{3}/gi,  // LP-slug-001
    /LP-[\w-]+-\d+\.\d+\.\d+/gi,  // LP-slug-1.0.0
    /lp:[\w-]+-\d+\.\d+\.\d+/gi,  // lp:slug-1.0.0 (existing label format)
  ];
  
  for (const pattern of lpPatterns) {
    const matches = text.match(pattern);
    if (matches && matches.length > 0) {
      let lp = matches[0];
      // Convert to label format: lowercase, preserve structure
      if (lp.startsWith('LP-')) {
        lp = 'lp:' + lp.substring(3);
      }
      return lp.toLowerCase();
    }
  }
  
  return null;
}

// Helper: Infer state from PR data
function inferState(pr) {
  const currentLabels = pr.labels.map(l => l.name);
  const hasStateLabel = currentLabels.some(l => l.startsWith('state:'));
  
  if (hasStateLabel) {
    return null; // Already has state
  }
  
  // Heuristics:
  // - If draft: state:planned
  // - If approved (review_decision): state:approved
  // - If changes requested: state:changes-requested  
  // - If has reviews: state:review
  // - Default: state:in-progress
  
  if (pr.draft) {
    return { label: 'state:planned', reason: 'PR is in draft mode' };
  }
  
  // Check if recently updated (< 7 days) - active
  const daysSinceUpdate = Math.floor((Date.now() - new Date(pr.updated_at)) / (1000 * 60 * 60 * 24));
  
  if (daysSinceUpdate < 7) {
    return { label: 'state:in-progress', reason: 'PR updated within last 7 days, assumed active' };
  } else if (daysSinceUpdate >= 14) {
    return { label: 'state:review', reason: 'PR older than 14 days, assumed awaiting review' };
  }
  
  return { label: 'state:in-progress', reason: 'Default state for active PR' };
}

// Helper: Check if PR needs stale markers
function needsStaleMarker(pr) {
  const daysSinceUpdate = Math.floor((Date.now() - new Date(pr.updated_at)) / (1000 * 60 * 60 * 24));
  const currentLabels = pr.labels.map(l => l.name);
  const hasLPLabel = currentLabels.some(l => l.startsWith('lp:'));
  
  // Rule: PR older than 90 days with no activity and missing lp:
  if (daysSinceUpdate > 90 && !hasLPLabel) {
    return {
      shouldMark: true,
      reason: `No activity for ${daysSinceUpdate} days and missing lp: label`,
      daysSinceUpdate
    };
  }
  
  return { shouldMark: false };
}

// Process each PR
const actions = [];
const sampleChecks = [];
let prProcessed = 0;

for (const pr of openPRsRaw) {
  prProcessed++;
  const currentLabels = pr.labels.map(l => l.name);
  const prActions = {
    number: pr.number,
    title: pr.title,
    url: pr.html_url,
    current_labels: currentLabels,
    labels_to_add: [],
    comments_to_add: [],
    rationale: []
  };
  
  // Rule 1: Add LP label if missing but found in body/title
  const hasLPLabel = currentLabels.some(l => l.startsWith('lp:'));
  if (!hasLPLabel) {
    const lpFromText = extractLPFromText(pr.title + ' ' + (pr.body || ''));
    if (lpFromText) {
      prActions.labels_to_add.push(lpFromText);
      prActions.rationale.push(`LP label extracted from PR text: ${lpFromText}`);
    }
  }
  
  // Rule 2: Add state label if missing
  const stateInference = inferState(pr);
  if (stateInference) {
    prActions.labels_to_add.push(stateInference.label);
    prActions.rationale.push(`State inferred: ${stateInference.label} (${stateInference.reason})`);
  }
  
  // Rule 3: Check if needs stale markers
  const staleCheck = needsStaleMarker(pr);
  if (staleCheck.shouldMark) {
    prActions.labels_to_add.push('stale-candidate', 'needs-info');
    prActions.rationale.push(`Stale marker applied: ${staleCheck.reason}`);
    prActions.comments_to_add.push({
      body: `⚠️ **Label applied by LP-cleanup-002**\n\n` +
            `**Reason:** ${staleCheck.reason}\n` +
            `**Rule:** PRs older than 90 days with no activity and missing lp: label receive stale-candidate + needs-info markers\n` +
            `**Executor:** Homer\n` +
            `**Action required:** Please add appropriate lp: label or provide status update\n\n` +
            `This PR is NOT being closed, just marked for review.`
    });
  }
  
  // Only track actions if there are changes to make
  if (prActions.labels_to_add.length > 0 || prActions.comments_to_add.length > 0) {
    actions.push(prActions);
    
    // Add to sample checks (first 10 with actions)
    if (sampleChecks.length < 10) {
      sampleChecks.push({
        type: 'pr',
        number: pr.number,
        title: pr.title,
        url: pr.html_url,
        actions: prActions.labels_to_add,
        rationale: prActions.rationale.join('; ')
      });
    }
  }
}

console.log(`\n=== Processing Summary ===`);
console.log(`PRs processed: ${prProcessed}`);
console.log(`PRs requiring label changes: ${actions.length}`);
console.log(`Sample checks collected: ${sampleChecks.length}\n`);

// Save action plan
writeFileSync('./label_actions.json', JSON.stringify(actions, null, 2));
writeFileSync('./sample_checks.json', JSON.stringify(sampleChecks, null, 2));

console.log('✅ Action plan generated');
console.log('   - label_actions.json: Full action plan');
console.log('   - sample_checks.json: Sample evidence');
console.log(`\nReady to apply ${actions.length} label updates`);
