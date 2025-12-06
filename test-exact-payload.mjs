/**
 * Test exact payload that E2E sends to launchSignups
 */
import { initializeTestEnvironment, assertSucceeds, assertFails } from '@firebase/rules-unit-testing';
import { readFileSync } from 'fs';
import { doc, setDoc, Timestamp } from 'firebase/firestore';

const projectId = 'ropi-bccee';
// Use actual UID from E2E trace
const testUid = 'Fte9zU1sccNJ8ndAHvvs8QD3rLq2';
const testEmail = 'user@shiekh.com';

async function main() {
  console.log('🧪 Testing EXACT E2E payload against launchSignups rules...\n');

  const rules = readFileSync('./firestore.rules', 'utf8');
  const testEnv = await initializeTestEnvironment({
    projectId,
    firestore: { rules },
  });

  const authedDb = testEnv.authenticatedContext(testUid, { email: testEmail }).firestore();

  // Test with EXACT payload from E2E (7 fields including email)
  console.log('Test 1: Account-based signup WITH email field (7 fields)');
  
  const payloadWithEmail = {
    launchId: 'launch_2025_q1_ropi_runner',
    productId: 'prod_ropi_runner_2025',
    userUid: testUid,
    createdAt: Timestamp.now(),
    source: 'aoss-web',
    status: 'active',
    email: testEmail,  // Extra field from E2E
  };

  console.log('  Payload:', JSON.stringify(payloadWithEmail, null, 2));
  
  try {
    const signupRef = doc(authedDb, 'launchSignups', 'test_with_email');
    await assertSucceeds(setDoc(signupRef, payloadWithEmail));
    console.log('  ✅ PASSED: Signup with email succeeded\n');
  } catch (e) {
    console.log('  ❌ FAILED:', e.message, '\n');
  }

  // Test WITHOUT email field (6 fields - exact match to rules)
  console.log('Test 2: Account-based signup WITHOUT email field (6 fields)');
  
  const payloadWithoutEmail = {
    launchId: 'launch_2025_q1_ropi_runner',
    productId: 'prod_ropi_runner_2025',
    userUid: testUid,
    createdAt: Timestamp.now(),
    source: 'aoss-web',
    status: 'active',
  };

  console.log('  Payload:', JSON.stringify(payloadWithoutEmail, null, 2));
  
  try {
    const signupRef2 = doc(authedDb, 'launchSignups', 'test_without_email');
    await assertSucceeds(setDoc(signupRef2, payloadWithoutEmail));
    console.log('  ✅ PASSED: Signup without email succeeded\n');
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
