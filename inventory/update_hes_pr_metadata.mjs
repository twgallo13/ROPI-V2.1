#!/usr/bin/env node
import { readFileSync, writeFileSync } from 'fs';
import { execSync } from 'child_process';

const PR_NUMBER = 465;
const PR_URL = 'https://github.com/twgallo13/ROPI-V2.1/pull/465';

// Get files changed in PR
const filesChangedRaw = execSync('git diff --name-status aoss-main...docs/lp-cleanup-inventory-001-005', { 
  encoding: 'utf8',
  cwd: '/workspaces/ROPI-V2.1'
});

const filesChanged = filesChangedRaw.trim().split('\n').map(line => {
  const [status, file] = line.split('\t');
  return {
    action: status === 'A' ? 'created' : status === 'M' ? 'modified' : status === 'D' ? 'deleted' : status,
    path: file
  };
});

console.log(`Updating 5 HES files with PR #${PR_NUMBER} metadata...\n`);

const hesFiles = [
  'inventory/LP-cleanup-001/HES-LP-cleanup-001.json',
  'inventory/LP-cleanup-002/HES-LP-cleanup-002.json',
  'inventory/LP-cleanup-003/HES-LP-cleanup-003.json',
  'inventory/LP-cleanup-004/HES-LP-cleanup-004.json',
  'inventory/LP-cleanup-005/HES-LP-cleanup-005.json'
];

hesFiles.forEach((hesPath, idx) => {
  console.log(`[${idx + 1}/5] Updating ${hesPath}...`);
  
  const hes = JSON.parse(readFileSync(hesPath, 'utf8'));
  
  // Add PR metadata
  hes.prNumber = PR_NUMBER;
  hes.prUrl = PR_URL;
  hes.filesChanged = filesChanged;
  
  // Add branch info
  hes.branch = 'docs/lp-cleanup-inventory-001-005';
  
  // Add commit SHA from PR branch
  const commitSha = execSync('git rev-parse docs/lp-cleanup-inventory-001-005', {
    encoding: 'utf8',
    cwd: '/workspaces/ROPI-V2.1'
  }).trim();
  
  if (!hes.commitShas) {
    hes.commitShas = [commitSha];
  }
  
  writeFileSync(hesPath, JSON.stringify(hes, null, 2));
  console.log(`  ✅ Updated with prNumber: ${PR_NUMBER}, filesChanged: ${filesChanged.length} files\n`);
});

console.log('='.repeat(60));
console.log('All HES files updated with PR metadata');
console.log(`PR: #${PR_NUMBER}`);
console.log(`URL: ${PR_URL}`);
console.log(`Files Changed: ${filesChanged.length}`);
console.log('='.repeat(60));
