#!/usr/bin/env node
import { readFileSync, writeFileSync } from 'fs';
import { execSync } from 'child_process';

const actions = JSON.parse(readFileSync('./pr_actions.json', 'utf8'));

console.log('=== LP-cleanup-003: Applying PR Hygiene Actions ===\n');
console.log(`Total PRs to process: ${actions.length}\n`);

const results = [];
let closureCount = 0;
let commentCount = 0;
let labelCount = 0;
let errorCount = 0;

// Generate closure comments markdown
let closureCommentsMd = '# PR Closure Comments — LP-cleanup-003\n\n';
closureCommentsMd += `Generated: ${new Date().toISOString()}\n\n`;

for (const action of actions) {
  console.log(`\nProcessing PR #${action.pr_number}: ${action.title.substring(0, 60)}...`);
  
  const result = {
    pr: action.pr_number,
    success: true,
    labels_added: [],
    comments_added: [],
    closed: false,
    errors: []
  };
  
  // Add labels
  for (const labelAction of action.actions) {
    if (labelAction.startsWith('add_label:')) {
      const label = labelAction.replace('add_label:', '');
      
      // First create the label if it doesn't exist
      try {
        console.log(`  Creating/verifying label: ${label}`);
        execSync(
          `gh api -X POST /repos/twgallo13/ROPI-V2.1/labels -f name="${label}" -f color="fbca04" -f description="Mixed-intent PR (LP-cleanup-003)" 2>&1 || true`,
          { encoding: 'utf8' }
        );
      } catch (error) {
        // Label might already exist, continue
      }
      
      try {
        console.log(`  Adding label: ${label}`);
        execSync(
          `gh api -X POST /repos/twgallo13/ROPI-V2.1/issues/${action.pr_number}/labels -f labels[]="${label}" 2>&1`,
          { encoding: 'utf8' }
        );
        result.labels_added.push(label);
        labelCount++;
        console.log(`  ✅ Label added: ${label}`);
      } catch (error) {
        console.log(`  ❌ Failed to add label ${label}: ${error.message}`);
        result.errors.push({ label, error: error.message });
        result.success = false;
        errorCount++;
      }
    }
  }
  
  // Add comments
  for (const comment of action.comments) {
    try {
      console.log(`  Adding comment...`);
      const escapedBody = comment.body.replace(/"/g, '\\"').replace(/\n/g, '\\n');
      execSync(
        `gh api -X POST /repos/twgallo13/ROPI-V2.1/issues/${action.pr_number}/comments -f body="${escapedBody}" 2>&1`,
        { encoding: 'utf8' }
      );
      result.comments_added.push('hygiene_comment');
      commentCount++;
      console.log(`  ✅ Comment added`);
    } catch (error) {
      console.log(`  ❌ Failed to add comment: ${error.message}`);
      result.errors.push({ comment: true, error: error.message });
      result.success = false;
      errorCount++;
    }
  }
  
  // Close PR if needed
  if (action.close) {
    try {
      console.log(`  Closing PR...`);
      execSync(
        `gh pr close ${action.pr_number} --repo twgallo13/ROPI-V2.1 2>&1`,
        { encoding: 'utf8' }
      );
      result.closed = true;
      closureCount++;
      console.log(`  ✅ PR closed`);
      
      // Add to closure comments markdown
      closureCommentsMd += `## PR #${action.pr_number}: ${action.title}\n\n`;
      closureCommentsMd += `**URL:** ${action.url}\n\n`;
      closureCommentsMd += `**Reason:** ${action.reason}\n\n`;
      closureCommentsMd += `**Rule:** ${action.rule}\n\n`;
      closureCommentsMd += `**Comment Posted:**\n\`\`\`\n${action.comments[0].body}\n\`\`\`\n\n`;
      closureCommentsMd += `---\n\n`;
    } catch (error) {
      console.log(`  ❌ Failed to close PR: ${error.message}`);
      result.errors.push({ close: true, error: error.message });
      result.success = false;
      errorCount++;
    }
  }
  
  results.push(result);
  
  // Rate limiting: pause between PRs
  if (actions.indexOf(action) < actions.length - 1) {
    console.log('  Pausing 2s to respect rate limits...');
    execSync('sleep 2');
  }
}

console.log(`\n=== Application Complete ===`);
console.log(`PRs closed: ${closureCount}`);
console.log(`Comments added: ${commentCount}`);
console.log(`Labels added: ${labelCount}`);
console.log(`Errors encountered: ${errorCount}`);

writeFileSync('./application_results.json', JSON.stringify(results, null, 2));
writeFileSync('./pr_closure_comments.md', closureCommentsMd);

console.log(`\n✅ Results saved`);
console.log('   - application_results.json');
console.log('   - pr_closure_comments.md');
