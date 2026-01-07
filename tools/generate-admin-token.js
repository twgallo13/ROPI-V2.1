// Generate admin ID token for staging testing
// Usage: node tools/generate-admin-token.js > /tmp/admin_token.txt

const admin = require('firebase-admin');
const https = require('https');
const path = require('path');

// Load service account
const serviceAccount = require(path.resolve(__dirname, '../service-account.json'));

// Initialize Firebase Admin SDK
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  projectId: serviceAccount.project_id || 'ropi-bccee'
});

async function main() {
  try {
    // Create custom token for homer-admin
    const customToken = await admin.auth().createCustomToken('homer-admin', { 
      role: 'admin',
      scope: 'admin'
    });
    
    // Exchange for ID token via Firebase REST API
    const data = JSON.stringify({ 
      token: customToken, 
      returnSecureToken: true 
    });
    
    const apiKey = serviceAccount.apiKey || 'AIzaSyD1aYB4AfqU5n1YfSOtLX5nbEYbnlTfcZ8';
    const options = {
      hostname: 'identitytoolkit.googleapis.com',
      path: `/v1/accounts:signInWithCustomToken?key=${apiKey}`,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': data.length
      }
    };
    
    return new Promise((resolve, reject) => {
      const req = https.request(options, (res) => {
        let body = '';
        res.on('data', (d) => body += d);
        res.on('end', () => {
          const result = JSON.parse(body);
          if (result.idToken) {
            console.log(result.idToken);
            resolve(result.idToken);
          } else {
            console.error('Token exchange failed:', JSON.stringify(result, null, 2));
            reject(new Error('Token exchange failed'));
          }
        });
      });
      req.on('error', reject);
      req.write(data);
      req.end();
    });
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

main().catch(e => {
  console.error('Fatal error:', e.message);
  process.exit(1);
});
