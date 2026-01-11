const admin = require('firebase-admin');
const serviceAccount = require('./service-account.json');

if (!admin.apps.length) {
  admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
}

async function testCompletionAPI() {
  try {
    // Get an ID token for API authentication
    const token = await admin.auth().createCustomToken('admin-test-user');
    
    // Call the completion API endpoint
    const productId = '18'; // Use a test product
    const url = `https://ropi-bccee.web.app/api/products/${productId}/completion`;
    
    console.log(`Fetching completion for product ${productId}...`);
    console.log(`URL: ${url}\n`);
    
    const response = await fetch(url, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    
    if (!response.ok) {
      console.error('API Error:', response.status, response.statusText);
      const text = await response.text();
      console.error('Response:', text);
      process.exit(1);
    }
    
    const data = await response.json();
    
    console.log('=== COMPLETION BREAKDOWN ===\n');
    console.log(`Total segments: ${data.operatorExplanation?.completionBreakdown?.length || 0}\n`);
    
    if (data.operatorExplanation?.completionBreakdown) {
      data.operatorExplanation.completionBreakdown.forEach((seg, idx) => {
        console.log(`${idx + 1}. Segment:`);
        console.log(`   segmentId: "${seg.segmentId}"`);
        console.log(`   segmentName: "${seg.segmentName}"`);
        console.log(`   score: ${seg.score}`);
        console.log(`   weightPct: ${seg.weightPct}`);
        console.log(`   missingAttributes: ${seg.missingAttributes?.length || 0}`);
        console.log('');
      });
    }
    
    console.log('\n=== FULL RESPONSE ===');
    console.log(JSON.stringify(data, null, 2));
    
    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

testCompletionAPI();
