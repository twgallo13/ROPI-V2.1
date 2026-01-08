#!/usr/bin/env node
import { readFileSync, writeFileSync } from 'fs';
import { execSync } from 'child_process';

const actions = JSON.parse(readFileSync('./label_actions.json', 'utf8'));

console.log('=== LP-cleanup-002: Applying Labels ===\n');
console.log(`Total PRs to update: ${actions.length}\n`);

const results = [];
let successCount = 0;
let errorCount = 0;

for (const action of actions) {
  console.log(`\nProcessing PR #${action.number}: ${action.title.substring(0, 60)}...`);
  
  const result = {
    pr: action.number,
    success: true,
    labels_added: [],
    comments_added: [],
    errors: []
  };
  
  // Add labels
  for (const label of action.labels_to_add) {
    try {
      console.log(`  Adding label: ${label}`);
      execSync(
        `gh api -X POST /repos/twgallo13/ROPI-V2.1/issues/${action.number}/labels -f labels[]="${label}" 2>&1`,
        { encoding: 'utf8' }
      );
      result.labels_added.push(label);
      console.log(`  ✅ Added: ${label}`);
    } catch (error) {
      console.log(`  ❌ Failed to add ${label}: ${error.message}`);
      result.errors.push({ label, error: error.message });
      result.success = false;
      errorCount++;
    }
  }
  
  // Add comments (for stale markers)
  for (const comment of action.comments_to_add) {
    try {
      console.log(`  Adding comment about label application...`);
      execSync(
        `gh api -X POST /repos/twgallo13/ROPI-V2.1/issues/${action.number}/comments -f body="${comment.body.replace(/"/g, '\\"')}" 2>&1`,
        { encoding: 'utf8' }
      );
      result.comments_added.push('closure_note');
      console.log(`  ✅ Comment added`);
    } catch (error) {
      console.log(`  ❌ Failed to add comment: ${error.message}`);
      result.errors.push({ comment: true, error: error.message });
      result.success = false;
      errorCount++;
    }
  }
  
  if (result.success) {
    successCount++;
  }
  
  results.push(result);
  
  // Rate limiting: pause between PRs
  if (actions.indexOf(action) < actions.length - 1) {
    console.log('  Pausing 1s to respect rate limits...');
    execSync('sleep 1');
  }
}

console.log(`\n=== Application Complete ===`);
console.log(`Successfully updated: ${successCount}/${actions.length} PRs`);
console.log(`Errors encountered: ${errorCount}`);

writeFileSync('./application_results.json', JSON.stringify(results, null, 2));
console.log(`\n✅ Results saved to application_results.json`);
