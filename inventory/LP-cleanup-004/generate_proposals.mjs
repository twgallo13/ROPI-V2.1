#!/usr/bin/env node
import { readFileSync, writeFileSync } from 'fs';

const classification = JSON.parse(readFileSync('./branch_classification.json', 'utf8'));

// Filter delete candidates
const deleteCandidates = classification.filter(b => b.delete_candidate);

// Sort by last activity (oldest first)
deleteCandidates.sort((a, b) => b.last_activity_days - a.last_activity_days);

// Generate CSV
const headers = [
  'branch_name',
  'delete_candidate',
  'classification',
  'reason',
  'last_activity_days',
  'last_commit_date',
  'last_commit_author',
  'last_commit_sha',
  'protection_status',
  'protection_error',
  'recommendation'
];

function escapeCSV(val) {
  if (val === null || val === undefined) return '';
  const str = String(val);
  if (str.includes(',') || str.includes('"') || str.includes('\n')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

const csvLines = [headers.join(',')];

deleteCandidates.forEach(b => {
  const row = headers.map(h => escapeCSV(b[h]));
  csvLines.push(row.join(','));
});

writeFileSync('./branch_proposals.csv', csvLines.join('\n'));

console.log(`✅ Generated branch_proposals.csv with ${deleteCandidates.length} delete candidates`);

// Also generate detailed proposals JSON
writeFileSync('./branch_proposals.json', JSON.stringify(deleteCandidates, null, 2));
console.log(`✅ Generated branch_proposals.json`);
