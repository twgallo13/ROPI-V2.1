/**
 * LP-2.0.1: Firestore Rules - Products Collection Lockdown Tests
 * 
 * Tests:
 * - Test A: Non-admin client write rejection
 * - Test B: Admin write success (via custom claims)
 * - Test C: Admin via metadata write success
 */

import {
  assertFails,
  assertSucceeds,
  initializeTestEnvironment,
  RulesTestEnvironment,
} from '@firebase/rules-unit-testing';
import { doc, setDoc, getDoc, updateDoc, deleteDoc } from 'firebase/firestore';
import * as fs from 'fs';
import * as path from 'path';

const PROJECT_ID = 'ropi-bccee-test';

describe('LP-2.0.1: Products Collection Lockdown', () => {
  let testEnv: RulesTestEnvironment;

  beforeAll(async () => {
    const rulesPath = path.resolve(__dirname, '../../firestore.rules');
    const rules = fs.readFileSync(rulesPath, 'utf8');

    testEnv = await initializeTestEnvironment({
      projectId: PROJECT_ID,
      firestore: {
        rules,
        host: 'localhost',
        port: 8080,
      },
    });
  });

  afterAll(async () => {
    await testEnv.cleanup();
  });

  beforeEach(async () => {
    await testEnv.clearFirestore();
  });

  describe('Test A: Non-admin client write rejection', () => {
    it('should REJECT write from authenticated non-admin user', async () => {
      // Simulate a non-admin authenticated user (role: viewer)
      const nonAdminUser = testEnv.authenticatedContext('user123', {
        email: 'viewer@test.com',
        email_verified: true,
        role: 'viewer',
      });

      const db = nonAdminUser.firestore();
      const productRef = doc(db, 'products', 'test-product-001');

      // Attempt to create a product - should be REJECTED
      console.log('Test A: Attempting non-admin write to products collection...');
      await assertFails(
        setDoc(productRef, {
          sku: 'TEST-SKU-001',
          mpn: 'TEST-MPN-001',
          title: 'Test Product',
          attributes: {},
        })
      );
      console.log('Test A: ✅ PASS - Non-admin write was correctly rejected');
    });

    it('should REJECT write from authenticated user with no role', async () => {
      const noRoleUser = testEnv.authenticatedContext('user456', {
        email: 'norole@test.com',
        email_verified: true,
      });

      const db = noRoleUser.firestore();
      const productRef = doc(db, 'products', 'test-product-002');

      console.log('Test A.2: Attempting write from user with no role...');
      await assertFails(
        setDoc(productRef, {
          sku: 'TEST-SKU-002',
          title: 'Another Test Product',
        })
      );
      console.log('Test A.2: ✅ PASS - No-role user write was correctly rejected');
    });

    it('should REJECT update from non-admin user', async () => {
      // First, set up a product as admin
      await testEnv.withSecurityRulesDisabled(async (context) => {
        const adminDb = context.firestore();
        await setDoc(doc(adminDb, 'products', 'existing-product'), {
          sku: 'EXISTING-SKU',
          title: 'Existing Product',
        });
      });

      // Now try to update as non-admin
      const nonAdminUser = testEnv.authenticatedContext('user789', {
        email: 'merch@test.com',
        email_verified: true,
        role: 'merch', // merch role, not admin
      });

      const db = nonAdminUser.firestore();
      const productRef = doc(db, 'products', 'existing-product');

      console.log('Test A.3: Attempting non-admin update...');
      await assertFails(
        updateDoc(productRef, { title: 'Updated Title' })
      );
      console.log('Test A.3: ✅ PASS - Non-admin update was correctly rejected');
    });
  });

  describe('Test B: Admin write success (via custom claims)', () => {
    it('should ALLOW write from admin user (role: admin)', async () => {
      // Simulate an admin user with custom claims
      const adminUser = testEnv.authenticatedContext('admin123', {
        email: 'admin@test.com',
        email_verified: true,
        role: 'admin',
      });

      const db = adminUser.firestore();
      const productRef = doc(db, 'products', 'admin-product-001');

      console.log('Test B: Attempting admin write to products collection...');
      await assertSucceeds(
        setDoc(productRef, {
          sku: 'ADMIN-SKU-001',
          mpn: 'ADMIN-MPN-001',
          title: 'Admin Created Product',
          attributes: {
            brand: 'Test Brand',
          },
        })
      );
      console.log('Test B: ✅ PASS - Admin write succeeded');
    });

    it('should ALLOW update from admin user', async () => {
      // Set up initial product
      await testEnv.withSecurityRulesDisabled(async (context) => {
        const adminDb = context.firestore();
        await setDoc(doc(adminDb, 'products', 'update-test-product'), {
          sku: 'UPDATE-SKU',
          title: 'Original Title',
        });
      });

      const adminUser = testEnv.authenticatedContext('admin456', {
        email: 'admin2@test.com',
        email_verified: true,
        role: 'admin',
      });

      const db = adminUser.firestore();
      const productRef = doc(db, 'products', 'update-test-product');

      console.log('Test B.2: Attempting admin update...');
      await assertSucceeds(
        updateDoc(productRef, { title: 'Updated Title by Admin' })
      );
      console.log('Test B.2: ✅ PASS - Admin update succeeded');
    });

    it('should ALLOW delete from admin user', async () => {
      // Set up product to delete
      await testEnv.withSecurityRulesDisabled(async (context) => {
        const adminDb = context.firestore();
        await setDoc(doc(adminDb, 'products', 'delete-test-product'), {
          sku: 'DELETE-SKU',
          title: 'To Be Deleted',
        });
      });

      const adminUser = testEnv.authenticatedContext('admin789', {
        email: 'admin3@test.com',
        email_verified: true,
        role: 'admin',
      });

      const db = adminUser.firestore();
      const productRef = doc(db, 'products', 'delete-test-product');

      console.log('Test B.3: Attempting admin delete...');
      await assertSucceeds(deleteDoc(productRef));
      console.log('Test B.3: ✅ PASS - Admin delete succeeded');
    });
  });

  describe('Test C: Admin via metadata fallback', () => {
    it('should ALLOW write from admin via metadata (staging fallback)', async () => {
      // Set up metadata/admins document with allow-list
      await testEnv.withSecurityRulesDisabled(async (context) => {
        const adminDb = context.firestore();
        await setDoc(doc(adminDb, 'metadata', 'admins'), {
          emails: ['metadataadmin@test.com', 'otheradmin@test.com'],
        });
      });

      // Simulate user whose email is in metadata/admins (no role claim)
      const metadataAdminUser = testEnv.authenticatedContext('metaadmin123', {
        email: 'metadataadmin@test.com',
        email_verified: true,
        // No role claim - relies on metadata fallback
      });

      const db = metadataAdminUser.firestore();
      const productRef = doc(db, 'products', 'metadata-admin-product');

      console.log('Test C: Attempting write via metadata admin fallback...');
      await assertSucceeds(
        setDoc(productRef, {
          sku: 'META-ADMIN-SKU',
          title: 'Created by Metadata Admin',
        })
      );
      console.log('Test C: ✅ PASS - Metadata admin write succeeded');
    });
  });

  describe('Read access tests', () => {
    it('should ALLOW read from any authenticated user', async () => {
      // Set up a product
      await testEnv.withSecurityRulesDisabled(async (context) => {
        const adminDb = context.firestore();
        await setDoc(doc(adminDb, 'products', 'readable-product'), {
          sku: 'READ-SKU',
          title: 'Readable Product',
        });
      });

      // Non-admin should be able to read
      const viewerUser = testEnv.authenticatedContext('viewer123', {
        email: 'viewer@test.com',
        email_verified: true,
        role: 'viewer',
      });

      const db = viewerUser.firestore();
      const productRef = doc(db, 'products', 'readable-product');

      console.log('Read Test: Attempting read as non-admin...');
      await assertSucceeds(getDoc(productRef));
      console.log('Read Test: ✅ PASS - Non-admin read succeeded');
    });

    it('should REJECT read from unauthenticated user', async () => {
      // Set up a product
      await testEnv.withSecurityRulesDisabled(async (context) => {
        const adminDb = context.firestore();
        await setDoc(doc(adminDb, 'products', 'private-product'), {
          sku: 'PRIVATE-SKU',
          title: 'Private Product',
        });
      });

      const unauthenticatedUser = testEnv.unauthenticatedContext();
      const db = unauthenticatedUser.firestore();
      const productRef = doc(db, 'products', 'private-product');

      console.log('Read Test 2: Attempting unauthenticated read...');
      await assertFails(getDoc(productRef));
      console.log('Read Test 2: ✅ PASS - Unauthenticated read was correctly rejected');
    });
  });
});
