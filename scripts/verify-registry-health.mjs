#!/usr/bin/env node
/**
 * verify-registry-health.mjs
 * LP-registry-health-1.0.0
 * 
 * Deploy-time verification script for registry health.
 * Run after deployment to confirm registry bridge is functioning correctly.
 * 
 * Usage:
 *   node scripts/verify-registry-health.mjs [--url <api_url>]
 *   
 * Options:
 *   --url    API base URL (default: https://us-central1-ropi-bccee.cloudfunctions.net/api)
 *   --verbose  Show full response details
 *   --ci       Exit with non-zero code on failure (for CI integration)
 * 
 * Exit codes:
 *   0 - Health check passed
 *   1 - Health check failed or unreachable
 */

import https from 'https';
import http from 'http';

// Parse command line arguments
const args = process.argv.slice(2);
const getArg = (name) => {
  const idx = args.indexOf(`--${name}`);
  return idx >= 0 && args[idx + 1] ? args[idx + 1] : null;
};
const hasFlag = (name) => args.includes(`--${name}`);

const API_URL = getArg('url') || 'https://ropi-bccee.web.app/api';
const VERBOSE = hasFlag('verbose');
const CI_MODE = hasFlag('ci');

console.log('╔════════════════════════════════════════════════════════════════╗');
console.log('║           Registry Health Verification Script                   ║');
console.log('║                   LP-registry-health-1.0.0                      ║');
console.log('╚════════════════════════════════════════════════════════════════╝\n');

console.log(`📍 Target API: ${API_URL}`);
console.log(`🔧 Mode: ${CI_MODE ? 'CI (strict)' : 'Interactive'}\n`);

/**
 * Make HTTP(S) GET request
 */
function fetchUrl(url) {
  return new Promise((resolve, reject) => {
    const client = url.startsWith('https') ? https : http;
    const req = client.get(url, { timeout: 30000 }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          resolve({
            status: res.statusCode,
            data: JSON.parse(data)
          });
        } catch (e) {
          resolve({
            status: res.statusCode,
            data: data,
            parseError: e.message
          });
        }
      });
    });
    
    req.on('error', reject);
    req.on('timeout', () => {
      req.destroy();
      reject(new Error('Request timeout (30s)'));
    });
  });
}

/**
 * Run health verification
 */
async function verifyRegistryHealth() {
  const healthUrl = `${API_URL}/registry/health`;
  console.log(`🔍 Checking: ${healthUrl}\n`);
  
  try {
    const startTime = Date.now();
    const response = await fetchUrl(healthUrl);
    const elapsed = Date.now() - startTime;
    
    console.log(`⏱️  Response time: ${elapsed}ms`);
    console.log(`📊 HTTP Status: ${response.status}\n`);
    
    if (response.parseError) {
      console.error('❌ Failed to parse response as JSON');
      console.error(`   Parse error: ${response.parseError}`);
      console.error(`   Raw response: ${response.data.substring(0, 200)}`);
      return false;
    }
    
    const health = response.data;
    
    // Display results
    console.log('┌──────────────────────────────────────────────────────────────┐');
    console.log('│                    Health Check Results                       │');
    console.log('├──────────────────────────────────────────────────────────────┤');
    console.log(`│ Status:            ${formatValue(health.status, 20, health.status === 'ok' ? '✅' : '❌')} │`);
    console.log(`│ Registry Version:  ${formatValue(health.registry_version, 20)} │`);
    console.log(`│ Last Loaded:       ${formatValue(health.lastLoadedAt || 'N/A', 20)} │`);
    console.log(`│ Firestore Count:   ${formatValue(health.firestoreCount, 20)} │`);
    console.log(`│ Version Match:     ${formatValue(health.versionMatch, 20, health.versionMatch ? '✅' : '⚠️')} │`);
    console.log('└──────────────────────────────────────────────────────────────┘');
    
    // Show errors if any
    if (health.errors && health.errors.length > 0) {
      console.log('\n⚠️  Errors detected:');
      health.errors.forEach((err, i) => {
        console.log(`   ${i + 1}. ${err}`);
      });
    }
    
    // Verbose output
    if (VERBOSE) {
      console.log('\n📋 Full response:');
      console.log(JSON.stringify(health, null, 2));
    }
    
    // Determine success
    const isHealthy = health.status === 'ok';
    const hasAttributes = (health.firestoreCount || 0) > 0;
    
    console.log('\n┌──────────────────────────────────────────────────────────────┐');
    if (isHealthy && hasAttributes) {
      console.log('│ ✅ VERIFICATION PASSED                                       │');
      console.log('│    Registry bridge is healthy and loaded with attributes.    │');
    } else if (isHealthy && !hasAttributes) {
      console.log('│ ⚠️  WARNING: Registry healthy but no attributes loaded       │');
      console.log('│    Check Firestore product_attribute_definitions collection. │');
    } else {
      console.log('│ ❌ VERIFICATION FAILED                                       │');
      console.log('│    Registry bridge is not healthy. Check errors above.       │');
    }
    console.log('└──────────────────────────────────────────────────────────────┘');
    
    return isHealthy && hasAttributes;
    
  } catch (error) {
    console.error('❌ Failed to reach health endpoint');
    console.error(`   Error: ${error.message}`);
    
    if (error.code === 'ENOTFOUND') {
      console.error('   The API URL could not be resolved. Check the URL.');
    } else if (error.code === 'ECONNREFUSED') {
      console.error('   Connection refused. Is the API deployed and running?');
    }
    
    return false;
  }
}

/**
 * Format value for table display
 */
function formatValue(value, width = 20, icon = '') {
  const str = String(value ?? 'N/A');
  const truncated = str.length > width - 3 ? str.substring(0, width - 3) + '...' : str;
  const iconPart = icon ? ` ${icon}` : '';
  return (truncated + iconPart).padEnd(width + (icon ? 3 : 0));
}

/**
 * Main entry point
 */
async function main() {
  const success = await verifyRegistryHealth();
  
  console.log('\n───────────────────────────────────────────────────────────────');
  console.log(`📅 Verification completed at: ${new Date().toISOString()}`);
  
  if (CI_MODE) {
    process.exit(success ? 0 : 1);
  } else {
    console.log('\n💡 Tip: Use --ci flag for CI integration (non-zero exit on failure)');
    console.log('         Use --verbose flag for full response details');
  }
}

main().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
