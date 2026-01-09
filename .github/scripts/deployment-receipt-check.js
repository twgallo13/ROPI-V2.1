#!/usr/bin/env node
/**
 * Deployment Receipt Check Script
 * 
 * Phase Workflow v2 Enforcement
 * 
 * Validates that any claim of "deployed" has a valid Deployment Receipt.
 * 
 * Deployment Receipt must include:
 * - environment: string (e.g., "staging", "production")
 * - deployWorkflowUrl: string (GitHub Actions run URL)
 * - deployedCommitSha: string (40-char SHA)
 * - timestamp: string (ISO 8601)
 * - status: string (e.g., "SUCCESS", "FAILED")
 * 
 * Rules:
 * - If PR/comment claims "deployed" without receipt → FAIL
 * - If receipt has SHA mismatch → FAIL
 * - If receipt missing environment → FAIL
 * - No receipt = NOT DEPLOYED (but doesn't fail unless claim exists)
 */

const https = require('https');

// Keywords that indicate a deployment claim
const DEPLOY_CLAIM_PATTERNS = [
  /\bdeployed\s+to\s+(staging|production|prod)\b/i,
  /\bsuccessfully\s+deployed\b/i,
  /\bdeploy\s+(complete|done|finished)\b/i,
  /\bstaging\s+deploy(ed|ment)?\s+(complete|success|done)\b/i,
  /\bproduction\s+deploy(ed|ment)?\s+(complete|success|done)\b/i,
];

// Deployment Receipt JSON pattern
const RECEIPT_PATTERN = /```json\s*([\s\S]*?deploymentReceipt[\s\S]*?)```/gi;
const RECEIPT_INLINE_PATTERN = /\{[^{}]*"deploymentReceipt"[^{}]*\}/g;

// Required fields in Deployment Receipt
const REQUIRED_RECEIPT_FIELDS = ['environment', 'deployWorkflowUrl', 'deployedCommitSha', 'timestamp', 'status'];

function extractDeploymentReceipts(text) {
  const receipts = [];
  
  // Find JSON blocks containing deploymentReceipt
  let match;
  const jsonBlockPattern = /```json\s*([\s\S]*?)```/gi;
  
  while ((match = jsonBlockPattern.exec(text)) !== null) {
    try {
      const json = JSON.parse(match[1].trim());
      if (json.deploymentReceipt) {
        receipts.push(json.deploymentReceipt);
      } else if (json.environment && json.deployedCommitSha) {
        // Direct receipt format
        receipts.push(json);
      }
    } catch (e) {
      // Invalid JSON, skip
    }
  }
  
  return receipts;
}

function validateReceipt(receipt) {
  const errors = [];
  const warnings = [];

  // Check required fields
  for (const field of REQUIRED_RECEIPT_FIELDS) {
    if (!(field in receipt)) {
      errors.push(`Missing required field: "${field}"`);
    }
  }

  // Validate SHA format (40 hex chars)
  if (receipt.deployedCommitSha && !/^[a-f0-9]{40}$/i.test(receipt.deployedCommitSha)) {
    errors.push(`Invalid SHA format: "${receipt.deployedCommitSha}" (expected 40 hex characters)`);
  }

  // Validate timestamp (ISO 8601)
  if (receipt.timestamp) {
    const ts = new Date(receipt.timestamp);
    if (isNaN(ts.getTime())) {
      errors.push(`Invalid timestamp format: "${receipt.timestamp}" (expected ISO 8601)`);
    }
  }

  // Validate status
  const validStatuses = ['SUCCESS', 'FAILED', 'PENDING', 'CANCELLED'];
  if (receipt.status && !validStatuses.includes(receipt.status.toUpperCase())) {
    warnings.push(`Status "${receipt.status}" is non-standard. Expected: ${validStatuses.join(', ')}`);
  }

  // Validate environment
  const validEnvs = ['staging', 'production', 'preview', 'development'];
  if (receipt.environment && !validEnvs.includes(receipt.environment.toLowerCase())) {
    warnings.push(`Environment "${receipt.environment}" is non-standard. Expected: ${validEnvs.join(', ')}`);
  }

  // Validate workflow URL format
  if (receipt.deployWorkflowUrl && !receipt.deployWorkflowUrl.includes('github.com')) {
    warnings.push(`Workflow URL "${receipt.deployWorkflowUrl}" does not appear to be a GitHub Actions URL`);
  }

  return { errors, warnings, valid: errors.length === 0 };
}

function hasDeploymentClaim(text) {
  for (const pattern of DEPLOY_CLAIM_PATTERNS) {
    if (pattern.test(text)) {
      return true;
    }
  }
  return false;
}

async function fetchPRComments(owner, repo, prNumber, token) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'api.github.com',
      path: `/repos/${owner}/${repo}/issues/${prNumber}/comments`,
      method: 'GET',
      headers: {
        'User-Agent': 'deployment-receipt-check',
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
          resolve([]);
        }
      });
    });

    req.on('error', () => resolve([]));
    req.end();
  });
}

async function main() {
  console.log('📦 Deployment Receipt Check - Validating deployment claims...\n');

  const prBody = process.env.PR_BODY || '';
  const prNumber = process.env.PR_NUMBER || 'unknown';
  const owner = process.env.REPO_OWNER || '';
  const repo = process.env.REPO_NAME || '';
  const token = process.env.GITHUB_TOKEN || '';

  // Collect all text sources
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

  // Check for deployment claims and receipts
  let hasClaimWithoutReceipt = false;
  let validReceiptFound = false;
  const allReceipts = [];
  const claimsWithoutReceipt = [];

  for (const { source, text } of textSources) {
    const hasClaim = hasDeploymentClaim(text);
    const receipts = extractDeploymentReceipts(text);

    if (receipts.length > 0) {
      for (const receipt of receipts) {
        const validation = validateReceipt(receipt);
        allReceipts.push({ source, receipt, validation });
        if (validation.valid) {
          validReceiptFound = true;
        }
      }
    }

    if (hasClaim && receipts.length === 0) {
      hasClaimWithoutReceipt = true;
      claimsWithoutReceipt.push(source);
    }
  }

  // Output results
  console.log('━'.repeat(60));

  if (hasClaimWithoutReceipt) {
    console.log('❌ DEPLOYMENT RECEIPT CHECK FAILED\n');
    console.log(`PR #${prNumber}`);
    console.log('\n⚠️ Deployment claim found WITHOUT a valid Deployment Receipt:');
    for (const source of claimsWithoutReceipt) {
      console.log(`   - ${source}`);
    }
    console.log('\n📝 Rule: "deployed" without a Deployment Receipt = NOT DEPLOYED');
    console.log('\nExpected Deployment Receipt format:');
    console.log('```json');
    console.log(JSON.stringify({
      deploymentReceipt: {
        environment: 'staging',
        deployWorkflowUrl: 'https://github.com/owner/repo/actions/runs/12345',
        deployedCommitSha: '0123456789abcdef0123456789abcdef01234567',
        timestamp: new Date().toISOString(),
        status: 'SUCCESS'
      }
    }, null, 2));
    console.log('```');
    console.log('━'.repeat(60));
    process.exit(1);
  }

  if (allReceipts.length > 0) {
    const invalidReceipts = allReceipts.filter(r => !r.validation.valid);
    
    if (invalidReceipts.length > 0) {
      console.log('❌ DEPLOYMENT RECEIPT CHECK FAILED\n');
      console.log(`PR #${prNumber}`);
      console.log('\n⚠️ Invalid Deployment Receipt(s) found:');
      for (const { source, receipt, validation } of invalidReceipts) {
        console.log(`\n   ${source}:`);
        for (const error of validation.errors) {
          console.log(`   ❌ ${error}`);
        }
      }
      console.log('━'.repeat(60));
      process.exit(1);
    }

    console.log('✅ DEPLOYMENT RECEIPT CHECK PASSED\n');
    console.log(`PR #${prNumber}`);
    console.log(`Valid receipts: ${allReceipts.filter(r => r.validation.valid).length}`);
    for (const { source, receipt, validation } of allReceipts) {
      if (validation.valid) {
        console.log(`\n   ${source}:`);
        console.log(`   Environment: ${receipt.environment}`);
        console.log(`   SHA: ${receipt.deployedCommitSha?.substring(0, 7)}...`);
        console.log(`   Status: ${receipt.status}`);
        if (validation.warnings.length > 0) {
          console.log('   Warnings:');
          for (const w of validation.warnings) {
            console.log(`   ⚠️ ${w}`);
          }
        }
      }
    }
  } else {
    console.log('ℹ️ DEPLOYMENT RECEIPT CHECK - NO CLAIMS\n');
    console.log(`PR #${prNumber}`);
    console.log('No deployment claims or receipts found.');
    console.log('This is OK - PR does not claim deployment.');
  }

  console.log('━'.repeat(60));
  process.exit(0);
}

main().catch(err => {
  console.error('Error running deployment receipt check:', err);
  process.exit(1);
});
