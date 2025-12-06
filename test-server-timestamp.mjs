import { initializeTestEnvironment, assertSucceeds } from '@firebase/rules-unit-testing';
import { readFileSync } from 'fs';
import { serverTimestamp, doc, setDoc, Timestamp } from 'firebase/firestore';

const projectId = 'ropi-bccee';
const testUid = 'test-user-uid-12345';
const testEmail = 'theo@shiekh.com';

async function main() {
  console.log('🧪 Testing serverTimestamp() with launchSignups rules...\n');

  const rules = readFileSync('/workspaces/ROPI-V2.1/firestore.rules', 'utf8');
  const testEnv = await initializeTestEnvironment({
    projectId,
    firestore: { rules },
  });

  const authedDb = testEnv.authenticatedContext(testUid, { email: testEmail }).firestore();

  // Test with serverTimestamp() - the ACTUAL value used in production
  console.log('Test: Account-based signup with serverTimestamp()');
  
  const payload = {
    launchId: 'launch_2025_q1_test',
    productId: 'prod_test_001',
    userUid: testUid,
    createdAt: serverTimestamp(),
    source: 'aoss-web',
    status: 'active',
  };

  console.log('  Using serverTimestamp() for createdAt');
  
  try {
    const signupRef = doc(authedDb, 'launchSignups', 'test_server_timestamp');
    await assertSucceeds(setDoc(signupRef, payload));
    console.log('  ✅ PASSED: serverTimestamp() write succeeded\n');
  } catch (e) {
    console.log('  ❌ FAILED:', e.message, '\n');
  }

  await testEnv.cleanup();
  console.log('Done.');
  process.exit(0);
}

main().catch(e => {
  console.error('Error:', e);
  process.exit(1);
});
