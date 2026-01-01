#!/usr/bin/env node
/**
 * PR HES Checker Script
 * 
 * LP-observations-consolidation-1.5.0: Validates Homer Execution Summary
 * 
 * Checks PR body and comments for valid HES JSON block.
 * HES JSON must include required fields:
 * - from: string (e.g., "Homer")
 * - to: string (e.g., "Lisa")
 * - lp: string (LP identifier)
 * - actions: array of strings
 * - outcome: string (e.g., "VERIFIED SUCCESS", "PENDING")
 * 
 * Optional but recommended:
 * - artifacts: object with pr, ci_runs, etc.
 * 
 * Exits non-zero if HES is missing or invalid.
 */

const https = require('https');

// HES JSON Schema (simplified validation)
const REQUIRED_FIELDS = ['from', 'to', 'lp', 'actions', 'outcome'];
const VALID_OUTCOMES = ['VERIFIED SUCCESS', 'SUCCESS', 'PENDING', 'IN PROGRESS', 'FAILED', 'BLOCKED'];

// Regex to find JSON blocks in markdown
const JSON_BLOCK_PATTERN = /```json\s*([\s\S]*?)```/gi;
const HES_INDICATOR_PATTERN = /"from"\s*:\s*"Homer"|Homer Execution Summary|HES.*JSON/i;

async function fetchPRComments(owner, repo, prNumber, token) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'api.github.com',
      path: `/repos/${owner}/${repo}/issues/${prNumber}/comments`,
      method: 'GET',
      headers: {
        'User-Agent': 'pr-hes-checker',
        'Authorization': `Bearer ${token}`,
        'Accept': 'application/vnd.github.v3+json',
      },
    };

    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        if (res.statusCode === 200) {
          resolve(JSON.parse(data));
        } else {
          resolve([]); // Return empty on error
        }
      });
    });

    req.on('error', () => resolve([]));
    req.end();
  });
}

function extractJSONBlocks(text) {
  const blocks = [];
  let match;
  
  // Find JSON code blocks
  while ((match = JSON_BLOCK_PATTERN.exec(text)) !== null) {
    try {
      const json = JSON.parse(match[1].trim());
      blocks.push(json);
    } catch (e) {
      // Invalid JSON, skip
    }
  }
  
  // Also try to find inline JSON objects that look like HES
  const inlinePattern = /\{[^{}]*"from"\s*:\s*"[^"]*"[^{}]*\}/g;
  while ((match = inlinePattern.exec(text)) !== null) {
    try {
      const json = JSON.parse(match[0]);
      if (json.from && json.lp) {
        blocks.push(json);
      }
    } catch (e) {
      // Invalid JSON, skip
    }
  }
  
  return blocks;
}

function validateHES(json) {
  const errors = [];
  const warnings = [];

  // Check required fields
  for (const field of REQUIRED_FIELDS) {
    if (!(field in json)) {
      errors.push(`Missing required field: "${field}"`);
    }
  }

  // Validate field types
  if (json.from && typeof json.from !== 'string') {
    errors.push(`Field "from" must be a string`);
  }
  if (json.to && typeof json.to !== 'string') {
    errors.push(`Field "to" must be a string`);
  }
  if (json.lp && typeof json.lp !== 'string') {
    errors.push(`Field "lp" must be a string`);
  }
  if (json.actions && !Array.isArray(json.actions)) {
    errors.push(`Field "actions" must be an array`);
  }
  if (json.outcome && typeof json.outcome !== 'string') {
    errors.push(`Field "outcome" must be a string`);
  }

  // Validate outcome value
  if (json.outcome && !VALID_OUTCOMES.some(v => json.outcome.toUpperCase().includes(v))) {
    warnings.push(`Outcome "${json.outcome}" is non-standard. Expected one of: ${VALID_OUTCOMES.join(', ')}`);
  }

  // Check LP format
  if (json.lp && !/^LP-[a-z0-9-]+-\d+\.\d+\.\d+$/i.test(json.lp)) {
    warnings.push(`LP format "${json.lp}" may be non-standard. Expected: LP-<PhaseSlug>-<SemVer>`);
  }

  // Check for artifacts (recommended)
  if (!json.artifacts) {
    warnings.push('Missing recommended field: "artifacts" (should include pr, ci_runs)');
  }

  return { errors, warnings, valid: errors.length === 0 };
}

function isHESCandidate(json) {
  // Check if this JSON object looks like an HES
  return (
    (json.from && json.from.toLowerCase().includes('homer')) ||
    (json.lp && /^LP-/i.test(json.lp)) ||
    (json.outcome && VALID_OUTCOMES.some(v => json.outcome.toUpperCase().includes(v)))
  );
}

async function main() {
  console.log('🔍 PR HES Checker - Validating Homer Execution Summary...\n');

  const prBody = process.env.PR_BODY || '';
  const prNumber = process.env.PR_NUMBER || 'unknown';
  const owner = process.env.REPO_OWNER || '';
  const repo = process.env.REPO_NAME || '';
  const token = process.env.GITHUB_TOKEN || '';

  // Collect all text sources to check
  const textSources = [{ source: 'PR Body', text: prBody }];

  // Fetch PR comments
  if (owner && repo && prNumber && token) {
    console.log('📥 Fetching PR comments...');
    const comments = await fetchPRComments(owner, repo, prNumber, token);
    comments.forEach((comment, idx) => {
      textSources.push({ source: `Comment #${idx + 1}`, text: comment.body || '' });
    });
    console.log(`   Found ${comments.length} comments\n`);
  }

  // Search for HES JSON in all sources
  let foundHES = null;
  let hesSource = null;

  for (const { source, text } of textSources) {
    // Check if this source might contain HES
    if (!HES_INDICATOR_PATTERN.test(text)) {
      continue;
    }

    const jsonBlocks = extractJSONBlocks(text);
    
    for (const json of jsonBlocks) {
      if (isHESCandidate(json)) {
        const validation = validateHES(json);
        if (validation.valid) {
          foundHES = json;
          hesSource = source;
          break;
        }
      }
    }

    if (foundHES) break;
  }

  // Output results
  console.log('━'.repeat(60));

  if (foundHES) {
    const validation = validateHES(foundHES);
    
    console.log('✅ HES CHECKER PASSED\n');
    console.log(`PR #${prNumber}`);
    console.log(`HES Found In: ${hesSource}`);
    console.log(`LP: ${foundHES.lp}`);
    console.log(`From: ${foundHES.from} → To: ${foundHES.to}`);
    console.log(`Outcome: ${foundHES.outcome}`);
    console.log(`Actions: ${foundHES.actions?.length || 0} action(s)`);
    
    if (validation.warnings.length > 0) {
      console.log('\n⚠️ Warnings:');
      validation.warnings.forEach(w => console.log(`   - ${w}`));
    }
    
    console.log('━'.repeat(60));
    process.exit(0);
  } else {
    console.log('⚠️ HES CHECKER - NO HES FOUND\n');
    console.log(`PR #${prNumber}`);
    console.log('\n📝 A Homer Execution Summary (HES) JSON block is required for merge.');
    console.log('\nExpected format (in PR body or comment):');
    console.log('```json');
    console.log(JSON.stringify({
      from: 'Homer',
      to: 'Lisa',
      lp: 'LP-<PhaseSlug>-<SemVer>',
      actions: ['Action 1', 'Action 2'],
      artifacts: { pr: '#123', ci_runs: [] },
      outcome: 'VERIFIED SUCCESS',
    }, null, 2));
    console.log('```');
    console.log('\nRequired fields: from, to, lp, actions, outcome');
    console.log('━'.repeat(60));
    
    // For now, exit with warning (0) - change to 1 to enforce
    // This allows PRs without HES during the transition period
    console.log('\n⚠️ NOTE: HES check is currently advisory. Will become required in future.');
    process.exit(0);
  }
}

main().catch(err => {
  console.error('Error running HES checker:', err);
  process.exit(1);
});
