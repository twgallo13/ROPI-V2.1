#!/usr/bin/env node
/**
 * check-cors.js - Check Firebase Storage CORS configuration
 * 
 * LP-observations-consolidation-1.1.0: Helper script to verify CORS is configured
 * correctly for observation image uploads.
 * 
 * Usage:
 *   node scripts/check-cors.js [bucket_name]
 * 
 * Arguments:
 *   bucket_name - Optional Firebase Storage bucket (default: ropi-dev.firebasestorage.app)
 * 
 * Prerequisites:
 *   - Google Cloud SDK installed with gsutil
 *   - Authenticated to the Firebase/GCP project
 * 
 * Expected CORS configuration for mobile uploads:
 *   - Origin: Allow from localhost and production domains
 *   - Methods: GET, POST, PUT, DELETE, OPTIONS
 *   - Headers: Content-Type, Authorization, x-goog-*
 *   - MaxAgeSeconds: 3600
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

// Default bucket
const BUCKET_NAME = process.argv[2] || 'ropi-dev.firebasestorage.app';

// Expected CORS configuration
const EXPECTED_CORS = {
  origin: ['http://localhost:5173', 'http://localhost:3000', 'https://*.web.app', 'https://*.firebaseapp.com'],
  method: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  responseHeader: ['Content-Type', 'Authorization', 'x-goog-*', 'x-goog-resumable'],
  maxAgeSeconds: 3600
};

console.log('🔍 Checking Firebase Storage CORS Configuration');
console.log('================================================');
console.log(`Bucket: gs://${BUCKET_NAME}`);
console.log('');

// Check if gsutil is available
function checkGsutil() {
  try {
    execSync('gsutil version', { stdio: 'pipe' });
    return true;
  } catch {
    return false;
  }
}

// Get current CORS config
function getCurrentCors() {
  try {
    const result = execSync(`gsutil cors get gs://${BUCKET_NAME}`, { 
      encoding: 'utf-8',
      stdio: ['pipe', 'pipe', 'pipe']
    });
    return JSON.parse(result);
  } catch (err) {
    if (err.stderr && err.stderr.includes('No CORS configuration')) {
      return [];
    }
    throw err;
  }
}

// Check if CORS meets requirements
function validateCors(cors) {
  if (!cors || cors.length === 0) {
    return {
      valid: false,
      issues: ['No CORS configuration found']
    };
  }

  const issues = [];
  const config = cors[0]; // Primary CORS rule

  // Check methods
  const requiredMethods = ['GET', 'POST', 'PUT', 'OPTIONS'];
  const missingMethods = requiredMethods.filter(m => !config.method?.includes(m));
  if (missingMethods.length > 0) {
    issues.push(`Missing HTTP methods: ${missingMethods.join(', ')}`);
  }

  // Check responseHeaders
  const requiredHeaders = ['Content-Type'];
  const hasHeaders = config.responseHeader || [];
  const missingHeaders = requiredHeaders.filter(h => 
    !hasHeaders.some(rh => rh.toLowerCase() === h.toLowerCase())
  );
  if (missingHeaders.length > 0) {
    issues.push(`Missing response headers: ${missingHeaders.join(', ')}`);
  }

  // Check if x-goog-resumable is allowed (needed for resumable uploads)
  const hasResumable = hasHeaders.some(h => 
    h.toLowerCase().includes('x-goog') || h === '*'
  );
  if (!hasResumable) {
    issues.push('Missing x-goog-* headers for resumable uploads');
  }

  // Check origin (should allow localhost for development)
  const origins = config.origin || [];
  const hasLocalhostOrigin = origins.some(o => 
    o.includes('localhost') || o === '*'
  );
  if (!hasLocalhostOrigin) {
    issues.push('Missing localhost origin for development');
  }

  // Check maxAgeSeconds
  if (!config.maxAgeSeconds || config.maxAgeSeconds < 600) {
    issues.push('maxAgeSeconds should be at least 600 for good caching');
  }

  return {
    valid: issues.length === 0,
    issues
  };
}

// Generate recommended CORS JSON file
function generateCorsJson() {
  const corsConfig = [
    {
      origin: [
        'http://localhost:5173',
        'http://localhost:3000',
        'https://ropi-dev.web.app',
        'https://ropi-staging.web.app',
        'https://*.firebaseapp.com'
      ],
      method: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'HEAD'],
      responseHeader: [
        'Content-Type',
        'Authorization',
        'Content-Length',
        'x-goog-resumable',
        'x-goog-*'
      ],
      maxAgeSeconds: 3600
    }
  ];

  const corsPath = path.join(__dirname, '../cors.json');
  fs.writeFileSync(corsPath, JSON.stringify(corsConfig, null, 2));
  console.log(`📄 Generated recommended CORS config at: ${corsPath}`);
  return corsPath;
}

// Main
async function main() {
  if (!checkGsutil()) {
    console.log('❌ gsutil not found. Please install Google Cloud SDK.');
    console.log('');
    console.log('Install instructions:');
    console.log('  https://cloud.google.com/sdk/docs/install');
    console.log('');
    console.log('After install, run:');
    console.log('  gcloud auth login');
    console.log('  gcloud config set project <your-project-id>');
    process.exit(1);
  }

  console.log('📋 Current CORS Configuration:');
  console.log('------------------------------');

  try {
    const currentCors = getCurrentCors();
    
    if (currentCors.length === 0) {
      console.log('  (No CORS configuration found)');
    } else {
      console.log(JSON.stringify(currentCors, null, 2));
    }

    console.log('');
    console.log('🔎 Validation Results:');
    console.log('----------------------');

    const validation = validateCors(currentCors);

    if (validation.valid) {
      console.log('✅ CORS configuration meets requirements for mobile uploads');
    } else {
      console.log('⚠️  Issues found:');
      validation.issues.forEach(issue => {
        console.log(`   • ${issue}`);
      });
      
      console.log('');
      console.log('📝 To fix CORS, run:');
      const corsPath = generateCorsJson();
      console.log(`   gsutil cors set ${corsPath} gs://${BUCKET_NAME}`);
    }

    console.log('');
    console.log('📌 LP-1.1.0 Requirements:');
    console.log('   • Methods: GET, POST, PUT, OPTIONS (for preflight)');
    console.log('   • Headers: Content-Type, x-goog-resumable (resumable uploads)');
    console.log('   • Origins: localhost:5173, production domains');
    console.log('   • maxAgeSeconds: 3600 (cache preflight responses)');

  } catch (err) {
    console.log('❌ Error checking CORS:', err.message);
    console.log('');
    console.log('Make sure you are authenticated:');
    console.log('  gcloud auth login');
    process.exit(1);
  }

  console.log('');
  console.log('🏁 Check complete.');
}

main();
