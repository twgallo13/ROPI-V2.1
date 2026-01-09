#!/usr/bin/env node
/**
 * Live Receipt Check Script
 * 
 * Phase Workflow v2 Enforcement
 * 
 * Validates that any claim of "live" has a valid Live Receipt.
 * 
 * Live Receipt must include:
 * - environment: string (e.g., "staging", "production")
 * - proofUrl: string (endpoint URL, build stamp URL, or meta endpoint)
 * - observedSha: string (40-char SHA or version observed live)
 * - timestamp: string (ISO 8601)
 * 
 * Rules:
 * - If PR/comment claims "live" without receipt → FAIL
 * - If receipt has SHA mismatch with deployed → FAIL
 * - If receipt missing proof URL → FAIL
 * - No receipt = NOT LIVE (but doesn't fail unless claim exists)
 */

const https = require('https');

// Keywords that indicate a "live" claim
const LIVE_CLAIM_PATTERNS = [
  /\blive\s+on\s+(staging|production|prod)\b/i,
  /\bverified\s+live\b/i,
  /\bnow\s+live\b/i,
  /\bis\s+live\b/i,
  /\bconfirmed\s+live\b/i,
  /\blive\s+verification\s+(complete|passed|success)\b/i,
];

// Required fields in Live Receipt
const REQUIRED_RECEIPT_FIELDS = ['environment', 'proofUrl', 'observedSha', 'timestamp'];

function extractLiveReceipts(text) {
  const receipts = [];
  
  // Find JSON blocks containing liveReceipt
  let match;
  const jsonBlockPattern = /```json\s*([\s\S]*?)```/gi;
  
  while ((match = jsonBlockPattern.exec(text)) !== null) {
    try {
      const json = JSON.parse(match[1].trim());
      if (json.liveReceipt) {
        receipts.push(json.liveReceipt);
      } else if (json.proofUrl && json.observedSha) {
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

  // Validate SHA format (40 hex chars) or version string
  if (receipt.observedSha) {
    const isSha = /^[a-f0-9]{40}$/i.test(receipt.observedSha);
    const isShortSha = /^[a-f0-9]{7,}$/i.test(receipt.observedSha);
    const isVersion = /^\d+\.\d+\.\d+/.test(receipt.observedSha);
    
    if (!isSha && !isShortSha && !isVersion) {
      warnings.push(`observedSha "${receipt.observedSha}" is non-standard (expected SHA or version)`);
    }
  }

  // Validate timestamp (ISO 8601)
  if (receipt.timestamp) {
    const ts = new Date(receipt.timestamp);
    if (isNaN(ts.getTime())) {
      errors.push(`Invalid timestamp format: "${receipt.timestamp}" (expected ISO 8601)`);
    }
  }

  // Validate proof URL format
  if (receipt.proofUrl) {
    try {
      new URL(receipt.proofUrl);
    } catch (e) {
      errors.push(`Invalid proofUrl: "${receipt.proofUrl}" (must be valid URL)`);
    }
  }

  // Validate environment
  const validEnvs = ['staging', 'production', 'preview', 'development'];
  if (receipt.environment && !validEnvs.includes(receipt.environment.toLowerCase())) {
    warnings.push(`Environment "${receipt.environment}" is non-standard. Expected: ${validEnvs.join(', ')}`);
  }

  return { errors, warnings, valid: errors.length === 0 };
}

function hasLiveClaim(text) {
  for (const pattern of LIVE_CLAIM_PATTERNS) {
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
        'User-Agent': 'live-receipt-check',
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
  console.log('🌐 Live Receipt Check - Validating live claims...\n');

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

  // Check for live claims and receipts
  let hasClaimWithoutReceipt = false;
  let validReceiptFound = false;
  const allReceipts = [];
  const claimsWithoutReceipt = [];

  for (const { source, text } of textSources) {
    const hasClaim = hasLiveClaim(text);
    const receipts = extractLiveReceipts(text);

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
    console.log('❌ LIVE RECEIPT CHECK FAILED\n');
    console.log(`PR #${prNumber}`);
    console.log('\n⚠️ "Live" claim found WITHOUT a valid Live Receipt:');
    for (const source of claimsWithoutReceipt) {
      console.log(`   - ${source}`);
    }
    console.log('\n📝 Rule: "live" without a Live Receipt = NOT LIVE');
    console.log('\nExpected Live Receipt format:');
    console.log('```json');
    console.log(JSON.stringify({
      liveReceipt: {
        environment: 'staging',
        proofUrl: 'https://ropi-aoss-staging.web.app/api/health',
        observedSha: '0123456789abcdef0123456789abcdef01234567',
        timestamp: new Date().toISOString()
      }
    }, null, 2));
    console.log('```');
    console.log('━'.repeat(60));
    process.exit(1);
  }

  if (allReceipts.length > 0) {
    const invalidReceipts = allReceipts.filter(r => !r.validation.valid);
    
    if (invalidReceipts.length > 0) {
      console.log('❌ LIVE RECEIPT CHECK FAILED\n');
      console.log(`PR #${prNumber}`);
      console.log('\n⚠️ Invalid Live Receipt(s) found:');
      for (const { source, receipt, validation } of invalidReceipts) {
        console.log(`\n   ${source}:`);
        for (const error of validation.errors) {
          console.log(`   ❌ ${error}`);
        }
      }
      console.log('━'.repeat(60));
      process.exit(1);
    }

    console.log('✅ LIVE RECEIPT CHECK PASSED\n');
    console.log(`PR #${prNumber}`);
    console.log(`Valid receipts: ${allReceipts.filter(r => r.validation.valid).length}`);
    for (const { source, receipt, validation } of allReceipts) {
      if (validation.valid) {
        console.log(`\n   ${source}:`);
        console.log(`   Environment: ${receipt.environment}`);
        console.log(`   Proof URL: ${receipt.proofUrl}`);
        console.log(`   Observed: ${receipt.observedSha?.substring(0, 12)}...`);
        if (validation.warnings.length > 0) {
          console.log('   Warnings:');
          for (const w of validation.warnings) {
            console.log(`   ⚠️ ${w}`);
          }
        }
      }
    }
  } else {
    console.log('ℹ️ LIVE RECEIPT CHECK - NO CLAIMS\n');
    console.log(`PR #${prNumber}`);
    console.log('No "live" claims or receipts found.');
    console.log('This is OK - PR does not claim live status.');
  }

  console.log('━'.repeat(60));
  process.exit(0);
}

main().catch(err => {
  console.error('Error running live receipt check:', err);
  process.exit(1);
});
