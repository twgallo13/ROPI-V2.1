#!/usr/bin/env node

/**
 * Firestore & Storage Rules Unit Tests
 * 
 * Tests firestore.rules and storage.rules using Firebase Rules Unit Testing library.
 * 
 * Related:
 * - PROMPT_015: AOSS_FIRESTORE_RULES_DEPLOY_v1.0
 * - firestore.rules: Root-level security rules for Firestore
 * - storage.rules: Root-level security rules for Storage
 * 
 * Exit Codes:
 * - 0: All tests passed
 * - 1: One or more tests failed
 */

const {
  initializeTestEnvironment,
  assertSucceeds,
  assertFails,
} = require('@firebase/rules-unit-testing');
const fs = require('fs');
const path = require('path');

// Test configuration
const PROJECT_ID = 'demo-test-project';
const FIRESTORE_RULES_PATH = path.join(__dirname, '..', 'firestore.rules');
const STORAGE_RULES_PATH = path.join(__dirname, '..', 'storage.rules');

// Test users
const TEST_USER_1 = { uid: 'user_1', name: 'Test User 1' };
const TEST_USER_2 = { uid: 'user_2', name: 'Test User 2' };

// Test results
const results = {
  passed: 0,
  failed: 0,
  tests: [],
};

/**
 * Log test result
 */
function logTest(name, passed, error = null) {
  const status = passed ? '✅ PASS' : '❌ FAIL';
  const result = { name, passed, error: error?.message || null };
  
  results.tests.push(result);
  if (passed) {
    results.passed++;
    console.log(`${status}: ${name}`);
  } else {
    results.failed++;
    console.error(`${status}: ${name}`);
    if (error) {
      console.error(`   Error: ${error.message}`);
    }
  }
}

/**
 * Main test suite
 */
async function runTests() {
  console.log('================================================================================');
  console.log('FIRESTORE & STORAGE RULES UNIT TESTS');
  console.log('================================================================================\n');
  
  let testEnv;
  
  try {
    // Initialize test environment
    console.log('📋 Loading rules files...');
    const firestoreRules = fs.readFileSync(FIRESTORE_RULES_PATH, 'utf8');
    const storageRules = fs.readFileSync(STORAGE_RULES_PATH, 'utf8');
    
    console.log(`   ✅ Loaded firestore.rules (${firestoreRules.length} bytes)`);
    console.log(`   ✅ Loaded storage.rules (${storageRules.length} bytes)\n`);
    
    console.log('🚀 Initializing test environment...');
    testEnv = await initializeTestEnvironment({
      projectId: PROJECT_ID,
      firestore: {
        rules: firestoreRules,
        host: 'localhost',
        port: 8080,
      },
      storage: {
        rules: storageRules,
        host: 'localhost',
        port: 9199,
      },
    });
    console.log('   ✅ Test environment initialized\n');
    
    // ========================================
    // FIRESTORE TESTS
    // ========================================
    console.log('================================================================================');
    console.log('FIRESTORE RULES TESTS');
    console.log('================================================================================\n');
    
    // Test 1: Unauthenticated read should be denied
    console.log('Test 1: Unauthenticated read observations');
    try {
      const unauthedDb = testEnv.unauthenticatedContext().firestore();
      await assertFails(
        unauthedDb.collection('observations').doc('test_obs_1').get()
      );
      logTest('Unauthenticated read observations', true);
    } catch (error) {
      logTest('Unauthenticated read observations', false, error);
    }
    
    // Test 2: Unauthenticated create should be denied
    console.log('Test 2: Unauthenticated create observation');
    try {
      const unauthedDb = testEnv.unauthenticatedContext().firestore();
      await assertFails(
        unauthedDb.collection('observations').doc('test_obs_2').set({
          productId: 'prod_123',
          title: 'Test Observation',
          body: 'Test body',
          severity: 'medium',
          status: 'open',
          createdBy: { uid: 'user_1', name: 'Test User' },
          createdAt: new Date(),
        })
      );
      logTest('Unauthenticated create observation', true);
    } catch (error) {
      logTest('Unauthenticated create observation', false, error);
    }
    
    // Test 3: Authenticated read should succeed
    console.log('Test 3: Authenticated read observations');
    try {
      const authedDb = testEnv.authenticatedContext(TEST_USER_1.uid).firestore();
      
      // First create a test document as admin
      await testEnv.withSecurityRulesDisabled(async (context) => {
        await context.firestore().collection('observations').doc('test_obs_3').set({
          productId: 'prod_123',
          title: 'Test Observation',
          body: 'Test body',
          severity: 'medium',
          status: 'open',
          createdBy: TEST_USER_1,
          createdAt: new Date(),
        });
      });
      
      // Now try to read it
      await assertSucceeds(
        authedDb.collection('observations').doc('test_obs_3').get()
      );
      logTest('Authenticated read observations', true);
    } catch (error) {
      logTest('Authenticated read observations', false, error);
    }
    
    // Test 4: Authenticated create with valid fields should succeed
    console.log('Test 4: Authenticated create observation (valid)');
    try {
      const authedDb = testEnv.authenticatedContext(TEST_USER_1.uid).firestore();
      await assertSucceeds(
        authedDb.collection('observations').doc('test_obs_4').set({
          productId: 'prod_123',
          title: 'Valid Observation',
          body: 'Valid body',
          severity: 'high',
          status: 'open',
          createdBy: { uid: TEST_USER_1.uid, name: TEST_USER_1.name },
          createdAt: new Date(),
          linkedField: 'attributes.color',
          images: [],
        })
      );
      logTest('Authenticated create observation (valid)', true);
    } catch (error) {
      logTest('Authenticated create observation (valid)', false, error);
    }
    
    // Test 5: Create with wrong uid should fail
    console.log('Test 5: Create observation with wrong uid');
    try {
      const authedDb = testEnv.authenticatedContext(TEST_USER_1.uid).firestore();
      await assertFails(
        authedDb.collection('observations').doc('test_obs_5').set({
          productId: 'prod_123',
          title: 'Invalid Observation',
          body: 'Invalid body',
          severity: 'medium',
          status: 'open',
          createdBy: { uid: 'different_user', name: 'Different User' },
          createdAt: new Date(),
        })
      );
      logTest('Create observation with wrong uid', true);
    } catch (error) {
      logTest('Create observation with wrong uid', false, error);
    }
    
    // Test 6: Create without required fields should fail
    console.log('Test 6: Create observation missing required fields');
    try {
      const authedDb = testEnv.authenticatedContext(TEST_USER_1.uid).firestore();
      await assertFails(
        authedDb.collection('observations').doc('test_obs_6').set({
          productId: 'prod_123',
          title: 'Incomplete Observation',
          // Missing body, severity, status, createdBy, createdAt
        })
      );
      logTest('Create observation missing required fields', true);
    } catch (error) {
      logTest('Create observation missing required fields', false, error);
    }
    
    // Test 7: Resolve observation by non-author should succeed (per rules)
    console.log('Test 7: Resolve observation by non-author');
    try {
      // Create observation as user_1
      await testEnv.withSecurityRulesDisabled(async (context) => {
        await context.firestore().collection('observations').doc('test_obs_7').set({
          productId: 'prod_123',
          title: 'Test Observation',
          body: 'Test body',
          severity: 'medium',
          status: 'open',
          createdBy: TEST_USER_1,
          createdAt: new Date(),
        });
      });
      
      // Try to resolve as user_2 (should succeed per rules: "Anyone can resolve")
      const user2Db = testEnv.authenticatedContext(TEST_USER_2.uid).firestore();
      await assertSucceeds(
        user2Db.collection('observations').doc('test_obs_7').update({
          status: 'resolved',
          resolvedBy: { uid: TEST_USER_2.uid, name: TEST_USER_2.name },
          resolvedAt: new Date(),
        })
      );
      logTest('Resolve observation by non-author', true);
    } catch (error) {
      logTest('Resolve observation by non-author', false, error);
    }
    
    // Test 8: Resolve observation by author should succeed
    console.log('Test 8: Resolve observation by author');
    try {
      // Create observation as user_1
      await testEnv.withSecurityRulesDisabled(async (context) => {
        await context.firestore().collection('observations').doc('test_obs_8').set({
          productId: 'prod_123',
          title: 'Test Observation',
          body: 'Test body',
          severity: 'medium',
          status: 'open',
          createdBy: TEST_USER_1,
          createdAt: new Date(),
        });
      });
      
      // Resolve as author (user_1)
      const user1Db = testEnv.authenticatedContext(TEST_USER_1.uid).firestore();
      await assertSucceeds(
        user1Db.collection('observations').doc('test_obs_8').update({
          status: 'resolved',
          resolvedBy: { uid: TEST_USER_1.uid, name: TEST_USER_1.name },
          resolvedAt: new Date(),
        })
      );
      logTest('Resolve observation by author', true);
    } catch (error) {
      logTest('Resolve observation by author', false, error);
    }
    
    // Test 9: Delete observation by non-creator should fail
    console.log('Test 9: Delete observation by non-creator');
    try {
      // Create observation as user_1
      await testEnv.withSecurityRulesDisabled(async (context) => {
        await context.firestore().collection('observations').doc('test_obs_9').set({
          productId: 'prod_123',
          title: 'Test Observation',
          body: 'Test body',
          severity: 'medium',
          status: 'open',
          createdBy: TEST_USER_1,
          createdAt: new Date(),
        });
      });
      
      // Try to delete as user_2
      const user2Db = testEnv.authenticatedContext(TEST_USER_2.uid).firestore();
      await assertFails(
        user2Db.collection('observations').doc('test_obs_9').delete()
      );
      logTest('Delete observation by non-creator', true);
    } catch (error) {
      logTest('Delete observation by non-creator', false, error);
    }
    
    // Test 10: Delete observation by creator should succeed
    console.log('Test 10: Delete observation by creator');
    try {
      // Create observation as user_1
      await testEnv.withSecurityRulesDisabled(async (context) => {
        await context.firestore().collection('observations').doc('test_obs_10').set({
          productId: 'prod_123',
          title: 'Test Observation',
          body: 'Test body',
          severity: 'medium',
          status: 'open',
          createdBy: TEST_USER_1,
          createdAt: new Date(),
        });
      });
      
      // Delete as creator (user_1)
      const user1Db = testEnv.authenticatedContext(TEST_USER_1.uid).firestore();
      await assertSucceeds(
        user1Db.collection('observations').doc('test_obs_10').delete()
      );
      logTest('Delete observation by creator', true);
    } catch (error) {
      logTest('Delete observation by creator', false, error);
    }
    
    // ========================================
    // STORAGE TESTS
    // ========================================
    console.log('\n================================================================================');
    console.log('STORAGE RULES TESTS');
    console.log('================================================================================\n');
    
    // Test 11: Unauthenticated read should fail
    console.log('Test 11: Unauthenticated read storage');
    try {
      const unauthedStorage = testEnv.unauthenticatedContext().storage();
      await assertFails(
        unauthedStorage.ref('observations/prod_123/test.jpg').getDownloadURL()
      );
      logTest('Unauthenticated read storage', true);
    } catch (error) {
      logTest('Unauthenticated read storage', false, error);
    }
    
    // Test 12: Unauthenticated write should fail
    console.log('Test 12: Unauthenticated write storage');
    try {
      const unauthedStorage = testEnv.unauthenticatedContext().storage();
      await assertFails(
        unauthedStorage.ref('observations/prod_123/test.jpg').put(Buffer.from('test'))
      );
      logTest('Unauthenticated write storage', true);
    } catch (error) {
      logTest('Unauthenticated write storage', false, error);
    }
    
    // Test 13: Authenticated read should succeed
    console.log('Test 13: Authenticated read storage');
    try {
      const authedStorage = testEnv.authenticatedContext(TEST_USER_1.uid).storage();
      
      // First upload a file as admin
      await testEnv.withSecurityRulesDisabled(async (context) => {
        await context.storage().ref('observations/prod_123/test_read.jpg').put(Buffer.from('test image'));
      });
      
      // Now try to read it
      await assertSucceeds(
        authedStorage.ref('observations/prod_123/test_read.jpg').getDownloadURL()
      );
      logTest('Authenticated read storage', true);
    } catch (error) {
      logTest('Authenticated read storage', false, error);
    }
    
    // Test 14: Authenticated write with valid image should succeed
    console.log('Test 14: Authenticated write storage (valid image)');
    try {
      const authedStorage = testEnv.authenticatedContext(TEST_USER_1.uid).storage();
      const imageBuffer = Buffer.from('fake-image-data');
      
      await assertSucceeds(
        authedStorage.ref('observations/prod_123/test_write.jpg').put(imageBuffer, {
          contentType: 'image/jpeg',
        })
      );
      logTest('Authenticated write storage (valid image)', true);
    } catch (error) {
      logTest('Authenticated write storage (valid image)', false, error);
    }
    
    // Test 15: Write with non-image content type should fail
    console.log('Test 15: Write storage with non-image content type');
    try {
      const authedStorage = testEnv.authenticatedContext(TEST_USER_1.uid).storage();
      const txtBuffer = Buffer.from('not an image');
      
      await assertFails(
        authedStorage.ref('observations/prod_123/test_invalid.txt').put(txtBuffer, {
          contentType: 'text/plain',
        })
      );
      logTest('Write storage with non-image content type', true);
    } catch (error) {
      logTest('Write storage with non-image content type', false, error);
    }
    
    // Test 16: Write file larger than 5MB should fail
    console.log('Test 16: Write storage file > 5MB');
    try {
      const authedStorage = testEnv.authenticatedContext(TEST_USER_1.uid).storage();
      // Create a buffer larger than 5MB
      const largeBuffer = Buffer.alloc(6 * 1024 * 1024, 'x');
      
      await assertFails(
        authedStorage.ref('observations/prod_123/large_file.jpg').put(largeBuffer, {
          contentType: 'image/jpeg',
        })
      );
      logTest('Write storage file > 5MB', true);
    } catch (error) {
      logTest('Write storage file > 5MB', false, error);
    }
    
    // Test 17: Authenticated delete should succeed
    console.log('Test 17: Authenticated delete storage');
    try {
      // First upload a file as admin
      await testEnv.withSecurityRulesDisabled(async (context) => {
        await context.storage().ref('observations/prod_123/test_delete.jpg').put(Buffer.from('test image'));
      });
      
      const authedStorage = testEnv.authenticatedContext(TEST_USER_1.uid).storage();
      await assertSucceeds(
        authedStorage.ref('observations/prod_123/test_delete.jpg').delete()
      );
      logTest('Authenticated delete storage', true);
    } catch (error) {
      logTest('Authenticated delete storage', false, error);
    }
    
  } catch (error) {
    console.error('\n❌ FATAL ERROR during test setup:');
    console.error(error);
    process.exit(1);
  } finally {
    if (testEnv) {
      await testEnv.cleanup();
    }
  }
  
  // ========================================
  // RESULTS SUMMARY
  // ========================================
  console.log('\n================================================================================');
  console.log('TEST RESULTS SUMMARY');
  console.log('================================================================================\n');
  
  console.log(`Total Tests: ${results.passed + results.failed}`);
  console.log(`✅ Passed: ${results.passed}`);
  console.log(`❌ Failed: ${results.failed}\n`);
  
  if (results.failed > 0) {
    console.log('Failed Tests:');
    results.tests
      .filter((t) => !t.passed)
      .forEach((t) => {
        console.log(`   - ${t.name}`);
        if (t.error) {
          console.log(`     Error: ${t.error}`);
        }
      });
    console.log('');
  }
  
  // Output JSON results for CI parsing
  console.log('JSON Results:');
  console.log(JSON.stringify(results, null, 2));
  
  // Exit with appropriate code
  if (results.failed > 0) {
    console.error('\n❌ TESTS FAILED');
    process.exit(1);
  } else {
    console.log('\n✅ ALL TESTS PASSED');
    process.exit(0);
  }
}

// Run tests
runTests().catch((error) => {
  console.error('Unhandled error in test suite:');
  console.error(error);
  process.exit(1);
});
