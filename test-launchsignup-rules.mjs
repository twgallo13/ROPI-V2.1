/**
 * Test script for launchSignups Firestore rules
 * Uses @firebase/rules-unit-testing to simulate writes
 */

import { initializeTestEnvironment, assertSucceeds, assertFails } from '@firebase/rules-unit-testing';
import { readFileSync } from 'fs';
import { serverTimestamp, doc, setDoc } from 'firebase/firestore';

const projectId = 'ropi-bccee';
const testUid = 'test-user-uid-12345';
const testEmail = 'theo@shiekh.com';

async function main() {
  console.log('🧪 Testing launchSignups Firestore rules...\n');

  // Read rules from file
  const rules = readFileSync('./firestore.rules', 'utf8');

  // Initialize test environment
  const testEnv = await initializeTestEnvironment({
    projectId,
    firestore: { rules },
  });

  // Test 1: Account-based signup with correct payload
  console.log('Test 1: Account-based signup (should SUCCEED)');
  const authedDb = testEnv.authenticatedContext(testUid, { email: testEmail }).firestore();
  
  const validPayload = {
    launchId: 'launch_2025_q1_test',
    productId: 'prod_test_001',
    userUid: testUid,
    createdAt: new Date(), // Note: serverTimestamp() works differently in emulator
    source: 'aoss-web',
    status: 'active',
  };

  console.log('  Payload:', JSON.stringify(validPayload, null, 2));
  
  try {
    const signupRef = doc(authedDb, 'launchSignups', 'test_signup_001');
    await assertSucceeds(setDoc(signupRef, validPayload));
    console.log('  ✅ PASSED: Account-based signup succeeded\n');
  } catch (e) {
    console.log('  ❌ FAILED:', e.message, '\n');
  }

  // Test 2: Account-based signup with mismatched userUid
  console.log('Test 2: Mismatched userUid (should FAIL)');
  const wrongUidPayload = {
    ...validPayload,
    userUid: 'different-uid',
  };

  console.log('  Payload userUid:', wrongUidPayload.userUid);
  console.log('  Auth uid:', testUid);

  try {
    const signupRef2 = doc(authedDb, 'launchSignups', 'test_signup_002');
    await assertFails(setDoc(signupRef2, wrongUidPayload));
    console.log('  ✅ PASSED: Mismatched userUid correctly rejected\n');
  } catch (e) {
    console.log('  ❌ FAILED: Write should have been rejected but was not\n');
  }

  // Test 3: Missing status field
  console.log('Test 3: Missing status field (should FAIL)');
  const noStatusPayload = {
    launchId: 'launch_2025_q1_test',
    productId: 'prod_test_001',
    userUid: testUid,
    createdAt: new Date(),
    source: 'aoss-web',
    // status missing
  };

  try {
    const signupRef3 = doc(authedDb, 'launchSignups', 'test_signup_003');
    await assertFails(setDoc(signupRef3, noStatusPayload));
    console.log('  ✅ PASSED: Missing status correctly rejected\n');
  } catch (e) {
    console.log('  ❌ FAILED: Write should have been rejected but was not\n');
  }

  // Test 4: Wrong source value
  console.log('Test 4: Wrong source value (should FAIL)');
  const wrongSourcePayload = {
    ...validPayload,
    source: 'wrong-source',
  };

  try {
    const signupRef4 = doc(authedDb, 'launchSignups', 'test_signup_004');
    await assertFails(setDoc(signupRef4, wrongSourcePayload));
    console.log('  ✅ PASSED: Wrong source correctly rejected\n');
  } catch (e) {
    console.log('  ❌ FAILED: Write should have been rejected but was not\n');
  }

  // Cleanup
  await testEnv.cleanup();
  console.log('🏁 Test complete.');
}

main().catch(console.error);
