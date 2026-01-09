#!/usr/bin/env node
/**
 * Exchange custom token for ID token and call readiness API
 */

const CUSTOM_TOKEN = process.argv[2];
const API_KEY = 'AIzaSyD1aYB4AfqU5n1YfSOtLX5nbEYbnlTfcZ8';
const STAGING_URL = 'https://ropi-aoss-staging.web.app';

if (!CUSTOM_TOKEN) {
  console.error('Usage: node get_readiness.js <CUSTOM_TOKEN>');
  process.exit(1);
}

(async () => {
  try {
    // Exchange custom token for ID token
    console.log('Exchanging custom token for ID token...');
    const response = await fetch(
      `https://identitytoolkit.googleapis.com/v1/accounts:signInWithCustomToken?key=${API_KEY}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          token: CUSTOM_TOKEN,
          returnSecureToken: true
        })
      }
    );
    
    const data = await response.json();
    
    if (!response.ok) {
      throw new Error(`Token exchange failed: ${JSON.stringify(data)}`);
    }
    
    if (!data.idToken) {
      throw new Error(`No idToken in response: ${JSON.stringify(data)}`);
    }
    
    const idToken = data.idToken;
    console.log('✓ ID token obtained\n');
    
    // Call readiness API
    console.log('Calling export readiness API...');
    const readinessResp = await fetch(
      `${STAGING_URL}/api/admin/exports/readiness`,
      {
        headers: {
          'Authorization': `Bearer ${idToken}`,
          'Content-Type': 'application/json'
        }
      }
    );
    
    const readinessData = await readinessResp.json();
    
    console.log(`\nStatus: ${readinessResp.status}`);
    console.log('Response:');
    console.log(JSON.stringify(readinessData, null, 2));
    
    // Save to file
    const fs = require('fs');
    const path = require('path');
    const evidenceDir = path.join(__dirname, 'evidence/lp-export-ui-attr-fix');
    
    if (readinessResp.ok) {
      // Determine if GLOBAL or baseline based on mode field
      const isGlobal = readinessData.mode === 'GLOBAL';
      const filename = isGlobal ? 'readiness-global-admin.json' : 'readiness-baseline-admin.json';
      const targetDir = isGlobal ? 'global-mode' : 'baseline';
      const filepath = path.join(evidenceDir, targetDir, filename);
      
      fs.writeFileSync(filepath, JSON.stringify(readinessData, null, 2));
      console.log(`\n✓ Saved: ${filepath}`);
    } else {
      console.error('\n✗ API call failed');
    }
    
    process.exit(readinessResp.ok ? 0 : 1);
  } catch (error) {
    console.error('\n✗ Error:', error.message);
    process.exit(2);
  }
})();
