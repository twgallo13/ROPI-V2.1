/**
 * Detailed test of launchSignups rules
 * Tests various edge cases
 */
import { initializeTestEnvironment, assertSucceeds, assertFails } from '@firebase/rules-unit-testing';
import { doc, setDoc, serverTimestamp, Timestamp } from 'firebase/firestore';
import { readFileSync } from 'fs';

const PROJECT_ID = 'rules-test-project';

const rules = readFileSync('./firestore.rules', 'utf8');

const TEST_UID = 'Fte9zU1sccNJ8ndAHvvs8QD3rLq2'; // Same as E2E test user
const TEST_EMAIL = 'user@shiekh.com';

async function runTests() {
  console.log('=== Detailed launchSignups Rules Test ===\n');
  
  const testEnv = await initializeTestEnvironment({
    projectId: PROJECT_ID,
    firestore: { rules },
  });
  
  try {
    // Test 1: Basic valid payload (same as E2E)
    console.log('Test 1: Basic valid payload (same as E2E)');
    const auth1 = testEnv.authenticatedContext(TEST_UID, { email: TEST_EMAIL });
    const db1 = auth1.firestore();
    const payload1 = {
      launchId: 'launch_2025_q1_ropi_runner',
      productId: 'prod_ropi_runner_2025',
      userUid: TEST_UID,
      createdAt: Timestamp.now(),
      source: 'aoss-web',
      status: 'active',
      email: TEST_EMAIL,
    };
    await assertSucceeds(setDoc(doc(db1, 'launchSignups', 'test1'), payload1));
    console.log('✅ PASSED\n');
    
    // Test 2: Without email field
    console.log('Test 2: Without email field');
    const auth2 = testEnv.authenticatedContext(TEST_UID, { email: TEST_EMAIL });
    const db2 = auth2.firestore();
    const payload2 = {
      launchId: 'launch_test',
      productId: 'prod_test',
      userUid: TEST_UID,
      createdAt: Timestamp.now(),
      source: 'aoss-web',
      status: 'active',
    };
    await assertSucceeds(setDoc(doc(db2, 'launchSignups', 'test2'), payload2));
    console.log('✅ PASSED\n');
    
    // Test 3: Mismatched userUid (should FAIL)
    console.log('Test 3: Mismatched userUid (should FAIL)');
    const auth3 = testEnv.authenticatedContext(TEST_UID, { email: TEST_EMAIL });
    const db3 = auth3.firestore();
    const payload3 = {
      launchId: 'launch_test',
      productId: 'prod_test',
      userUid: 'different_uid',
      createdAt: Timestamp.now(),
      source: 'aoss-web',
      status: 'active',
    };
    await assertFails(setDoc(doc(db3, 'launchSignups', 'test3'), payload3));
    console.log('✅ PASSED (correctly rejected)\n');
    
    // Test 4: Wrong source (should FAIL)
    console.log('Test 4: Wrong source (should FAIL)');
    const auth4 = testEnv.authenticatedContext(TEST_UID, { email: TEST_EMAIL });
    const db4 = auth4.firestore();
    const payload4 = {
      launchId: 'launch_test',
      productId: 'prod_test',
      userUid: TEST_UID,
      createdAt: Timestamp.now(),
      source: 'wrong-source',
      status: 'active',
    };
    await assertFails(setDoc(doc(db4, 'launchSignups', 'test4'), payload4));
    console.log('✅ PASSED (correctly rejected)\n');
    
    // Test 5: Wrong status (should FAIL)
    console.log('Test 5: Wrong status (should FAIL)');
    const auth5 = testEnv.authenticatedContext(TEST_UID, { email: TEST_EMAIL });
    const db5 = auth5.firestore();
    const payload5 = {
      launchId: 'launch_test',
      productId: 'prod_test',
      userUid: TEST_UID,
      createdAt: Timestamp.now(),
      source: 'aoss-web',
      status: 'inactive',
    };
    await assertFails(setDoc(doc(db5, 'launchSignups', 'test5'), payload5));
    console.log('✅ PASSED (correctly rejected)\n');
    
    // Test 6: No auth (should FAIL)
    console.log('Test 6: No auth (should FAIL)');
    const unauth = testEnv.unauthenticatedContext();
    const dbUnauth = unauth.firestore();
    const payload6 = {
      launchId: 'launch_test',
      productId: 'prod_test',
      userUid: TEST_UID,
      createdAt: Timestamp.now(),
      source: 'aoss-web',
      status: 'active',
    };
    await assertFails(setDoc(doc(dbUnauth, 'launchSignups', 'test6'), payload6));
    console.log('✅ PASSED (correctly rejected)\n');
    
    // Test 7: Missing required field (no productId)
    console.log('Test 7: Missing required field (no productId)');
    const auth7 = testEnv.authenticatedContext(TEST_UID, { email: TEST_EMAIL });
    const db7 = auth7.firestore();
    const payload7 = {
      launchId: 'launch_test',
      // Missing productId
      userUid: TEST_UID,
      createdAt: Timestamp.now(),
      source: 'aoss-web',
      status: 'active',
    };
    await assertFails(setDoc(doc(db7, 'launchSignups', 'test7'), payload7));
    console.log('✅ PASSED (correctly rejected)\n');
    
    console.log('=== ALL TESTS PASSED ===');
    
  } finally {
    await testEnv.cleanup();
  }
}

runTests().catch(err => {
  console.error('Test error:', err);
  process.exit(1);
});
