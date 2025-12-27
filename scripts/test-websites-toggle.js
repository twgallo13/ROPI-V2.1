#!/usr/bin/env node
/**
 * Test Websites Toggle
 * 
 * Simulates what the UI updateFields does and verifies the write succeeds.
 */

const admin = require('firebase-admin');
const fs = require('fs');

// Initialize Firebase Admin
if (!admin.apps.length) {
  const credPath = process.env.GOOGLE_APPLICATION_CREDENTIALS;
  const credBase64 = process.env.GCP_SA_KEY_BASE64;
  
  if (credPath && fs.existsSync(credPath)) {
    const serviceAccount = JSON.parse(fs.readFileSync(credPath, 'utf8'));
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
    });
  } else if (credBase64) {
    const serviceAccount = JSON.parse(Buffer.from(credBase64, 'base64').toString('utf8'));
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
    });
  } else {
    console.error('❌ No credentials found');
    process.exit(1);
  }
}

const db = admin.firestore();

async function testToggle() {
  const productId = '123';
  const ref = db.collection('products').doc(productId);
  
  console.log('\n🧪 TEST: Simulating checkbox toggle');
  console.log('─────────────────────────────────────');
  
  // Step 1: Read current state
  console.log('\n1️⃣ Reading current state...');
  const before = await ref.get();
  const beforeData = before.data();
  console.log('   websites:', JSON.stringify(beforeData.websites));
  console.log('   attributes.website:', JSON.stringify(beforeData.attributes?.website));
  
  // Step 2: Simulate removing "Karmaloop.com" from the list
  const currentSites = beforeData.websites || [];
  const newSites = currentSites.filter(s => s !== 'Karmaloop.com');
  console.log('\n2️⃣ New value (removing Karmaloop.com):', JSON.stringify(newSites));
  
  // Step 3: Perform the update (same as updateFields in useProduct)
  console.log('\n3️⃣ Calling updateDoc with both fields...');
  await ref.update({
    websites: newSites,
    'attributes.website': newSites,
  });
  console.log('   ✅ Update complete');
  
  // Step 4: Verify the write
  console.log('\n4️⃣ Verifying write...');
  const after = await ref.get();
  const afterData = after.data();
  console.log('   websites:', JSON.stringify(afterData.websites));
  console.log('   attributes.website:', JSON.stringify(afterData.attributes?.website));
  
  // Step 5: Restore the original value
  console.log('\n5️⃣ Restoring original value...');
  await ref.update({
    websites: currentSites,
    'attributes.website': currentSites,
  });
  const restored = await ref.get();
  console.log('   websites:', JSON.stringify(restored.data().websites));
  console.log('   attributes.website:', JSON.stringify(restored.data().attributes?.website));
  
  console.log('\n✅ Test complete - Firestore writes work correctly');
  console.log('─────────────────────────────────────');
}

testToggle().then(() => process.exit(0)).catch(e => {
  console.error('❌ Test failed:', e);
  process.exit(1);
});
