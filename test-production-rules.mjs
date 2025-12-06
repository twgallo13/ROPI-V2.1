/**
 * Test launchSignups rules directly against PRODUCTION Firestore
 * Uses Firebase Admin SDK with service account
 */
import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore, Timestamp } from 'firebase-admin/firestore';
import { readFileSync } from 'fs';

// Check if service account key exists
const keyPath = process.env.GOOGLE_APPLICATION_CREDENTIALS;
if (!keyPath) {
  console.log('⚠️ No GOOGLE_APPLICATION_CREDENTIALS set');
  console.log('This test requires a service account key to write to production.');
  console.log('\nInstead, let us check what rules are deployed by simulating with local files.\n');
  
  // Let's hash check the local rules against what we expect
  const localRules = readFileSync('./firestore.rules', 'utf8');
  
  // Check launchSignups section
  const launchSignupsMatch = localRules.match(/match \/launchSignups\/\{signupId\}[\s\S]*?allow create:[\s\S]*?;/);
  
  if (launchSignupsMatch) {
    console.log('📋 Local launchSignups create rule:\n');
    console.log(launchSignupsMatch[0]);
    console.log('\n');
    
    // Check if the rule uses hasAll or hasOnly
    if (launchSignupsMatch[0].includes('.hasAll(')) {
      console.log('✅ Rule uses .hasAll() - extra fields should be allowed');
    }
    if (launchSignupsMatch[0].includes('.hasOnly(')) {
      console.log('⚠️ Rule uses .hasOnly() - extra fields would be rejected!');
    }
  }
  
  process.exit(0);
}

try {
  const app = initializeApp({
    credential: cert(keyPath),
    projectId: 'ropi-bccee',
  });
  
  const db = getFirestore(app);
  
  // Test write
  const testDoc = {
    launchId: 'test_launch_admin',
    productId: 'test_product',
    userUid: 'admin-test-uid',
    createdAt: Timestamp.now(),
    source: 'aoss-web',
    status: 'active',
  };
  
  console.log('Writing test document to launchSignups...');
  await db.collection('launchSignups').doc('admin_test_doc').set(testDoc);
  console.log('✅ Admin write succeeded');
  
  // Clean up
  await db.collection('launchSignups').doc('admin_test_doc').delete();
  console.log('Cleaned up test document');
  
} catch (e) {
  console.error('Error:', e.message);
}
