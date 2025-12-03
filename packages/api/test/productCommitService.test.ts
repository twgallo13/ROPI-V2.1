/**
 * Product Commit Service Tests
 * Tests for converting import rows to products
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as admin from 'firebase-admin';
import { processImportBatch, getBatchStatus } from '../src/services/productCommitService';
import type { ImportEngineRow, ImportBatch } from '@ropi-aoss/sdk';

// Note: These tests require Firebase Admin SDK initialization
// and Firestore emulator running

describe('Product Commit Service', () => {
  const testBatchId = 'test-batch-001';
  const testUserId = 'test-user-123';
  let db: admin.firestore.Firestore;

  beforeEach(async () => {
    // Initialize Firebase Admin if not already done
    if (!admin.apps.length) {
      admin.initializeApp({
        projectId: 'demo-test-project',
      });
    }
    
    db = admin.firestore();
    
    // Use emulator for tests
    if (process.env.FIRESTORE_EMULATOR_HOST) {
      console.log('Using Firestore emulator');
    }
  });

  afterEach(async () => {
    // Clean up test data
    try {
      const batchRef = db.collection('import_batches').doc(testBatchId);
      const rowsSnapshot = await batchRef.collection('rows').get();
      
      const batch = db.batch();
      rowsSnapshot.docs.forEach(doc => batch.delete(doc.ref));
      await batch.commit();
      
      await batchRef.delete();
      
      // Clean up products
      const productsSnapshot = await db.collection('products').get();
      const productsBatch = db.batch();
      productsSnapshot.docs.forEach(doc => productsBatch.delete(doc.ref));
      await productsBatch.commit();
    } catch (error) {
      console.error('Cleanup error:', error);
    }
  });

  describe('processImportBatch', () => {
    it('should create product from valid row', async () => {
      // Create test batch
      const batch: ImportBatch = {
        batchId: testBatchId,
        fileName: 'test.csv',
        createdAt: new Date().toISOString(),
        createdBy: testUserId,
        rowCount: 1,
        status: 'pending',
      };
      
      await db.collection('import_batches').doc(testBatchId).set(batch);

      // Create valid row
      const row: ImportEngineRow = {
        rowId: 'row-001',
        batchId: testBatchId,
        source: {
          columns: { SKU: 'TEST-001', 'Product Name': 'Test Product' },
          lineNumber: 1,
        },
        normalized: {
          sku: 'TEST-001',
          title: 'Test Product',
          brand: 'Test Brand',
          msrp: 99.99,
        },
        validation: {
          isValid: true,
          errors: [],
          warnings: [],
        },
        meta: {
          rowId: 'row-001',
          batchId: testBatchId,
          productId: 'test-001',
          importedAt: new Date().toISOString(),
          importedBy: testUserId,
          status: 'pending',
        },
      };

      await db
        .collection('import_batches')
        .doc(testBatchId)
        .collection('rows')
        .doc('row-001')
        .set(row);

      // Process batch
      const result = await processImportBatch(testBatchId, testUserId);

      // Verify result
      expect(result.createdCount).toBe(1);
      expect(result.updatedCount).toBe(0);
      expect(result.blockedCount).toBe(0);

      // Verify product was created
      const productDoc = await db.collection('products').doc('test-001').get();
      expect(productDoc.exists).toBe(true);
      
      const product = productDoc.data();
      expect(product?.core.sku).toBe('TEST-001');
      expect(product?.core.title).toBe('Test Product');
      expect(product?.statusFlags).toBeDefined();
      expect(product?.statusFlags.ready_for_export).toBe(false);
      expect(product?.statusFlags.uploaded_to_ro).toBe(false);
      expect(product?.statusFlags.validation_status).toBe('valid');
    });

    it('should skip row with blocking validation errors', async () => {
      // Create test batch
      const batch: ImportBatch = {
        batchId: testBatchId,
        fileName: 'test.csv',
        createdAt: new Date().toISOString(),
        createdBy: testUserId,
        rowCount: 1,
        status: 'pending',
      };
      
      await db.collection('import_batches').doc(testBatchId).set(batch);

      // Create invalid row (missing required fields)
      const row: ImportEngineRow = {
        rowId: 'row-002',
        batchId: testBatchId,
        source: {
          columns: { SKU: '' },
          lineNumber: 1,
        },
        normalized: {},
        validation: {
          isValid: false,
          errors: [
            {
              code: 'MISSING_REQUIRED_FIELD',
              severity: 'error',
              field: 'sku',
              message: 'SKU is required',
            },
          ],
          warnings: [],
        },
        meta: {
          rowId: 'row-002',
          batchId: testBatchId,
          productId: 'test-002',
          importedAt: new Date().toISOString(),
          importedBy: testUserId,
          status: 'failed',
        },
      };

      await db
        .collection('import_batches')
        .doc(testBatchId)
        .collection('rows')
        .doc('row-002')
        .set(row);

      // Process batch
      const result = await processImportBatch(testBatchId, testUserId);

      // Verify result
      expect(result.createdCount).toBe(0);
      expect(result.updatedCount).toBe(0);
      expect(result.blockedCount).toBe(1);

      // Verify product was NOT created
      const productDoc = await db.collection('products').doc('test-002').get();
      expect(productDoc.exists).toBe(false);

      // Verify row meta was updated
      const rowDoc = await db
        .collection('import_batches')
        .doc(testBatchId)
        .collection('rows')
        .doc('row-002')
        .get();
      
      const rowData = rowDoc.data() as ImportEngineRow;
      expect(rowData.meta.importOutcome).toBe('skipped_validation_error');
    });

    it('should update existing product', async () => {
      // Create test batch
      const batch: ImportBatch = {
        batchId: testBatchId,
        fileName: 'test.csv',
        createdAt: new Date().toISOString(),
        createdBy: testUserId,
        rowCount: 1,
        status: 'pending',
      };
      
      await db.collection('import_batches').doc(testBatchId).set(batch);

      // Create existing product
      await db.collection('products').doc('test-003').set({
        core: {
          sku: 'TEST-003',
          title: 'Old Title',
          brand: 'Old Brand',
          status: 'draft',
          createdAt: '2025-01-01T00:00:00Z',
          updatedAt: '2025-01-01T00:00:00Z',
        },
        attributes: {},
      });

      // Create row with updated data
      const row: ImportEngineRow = {
        rowId: 'row-003',
        batchId: testBatchId,
        source: {
          columns: { SKU: 'TEST-003', 'Product Name': 'New Title' },
          lineNumber: 1,
        },
        normalized: {
          sku: 'TEST-003',
          title: 'New Title',
          brand: 'New Brand',
        },
        validation: {
          isValid: true,
          errors: [],
          warnings: [],
        },
        meta: {
          rowId: 'row-003',
          batchId: testBatchId,
          productId: 'test-003',
          importedAt: new Date().toISOString(),
          importedBy: testUserId,
          status: 'pending',
        },
      };

      await db
        .collection('import_batches')
        .doc(testBatchId)
        .collection('rows')
        .doc('row-003')
        .set(row);

      // Process batch
      const result = await processImportBatch(testBatchId, testUserId);

      // Verify result
      expect(result.createdCount).toBe(0);
      expect(result.updatedCount).toBe(1);
      expect(result.blockedCount).toBe(0);

      // Verify product was updated
      const productDoc = await db.collection('products').doc('test-003').get();
      expect(productDoc.exists).toBe(true);
      
      const product = productDoc.data();
      expect(product?.core.title).toBe('New Title');
      expect(product?.core.brand).toBe('New Brand');
      expect(product?.core.createdAt).toBe('2025-01-01T00:00:00Z'); // Preserved
    });

    it('should update batch counters', async () => {
      // Create test batch
      const batch: ImportBatch = {
        batchId: testBatchId,
        fileName: 'test.csv',
        createdAt: new Date().toISOString(),
        createdBy: testUserId,
        rowCount: 3,
        status: 'pending',
      };
      
      await db.collection('import_batches').doc(testBatchId).set(batch);

      // Create 3 rows: 1 created, 1 updated, 1 blocked
      const rows: ImportEngineRow[] = [
        {
          rowId: 'row-create',
          batchId: testBatchId,
          source: { columns: {}, lineNumber: 1 },
          normalized: { sku: 'CREATE-001', title: 'Product 1', brand: 'Brand' },
          validation: { isValid: true, errors: [], warnings: [] },
          meta: {
            rowId: 'row-create',
            batchId: testBatchId,
            productId: 'create-001',
            importedAt: new Date().toISOString(),
            importedBy: testUserId,
            status: 'pending',
          },
        },
        {
          rowId: 'row-update',
          batchId: testBatchId,
          source: { columns: {}, lineNumber: 2 },
          normalized: { sku: 'UPDATE-001', title: 'Product 2', brand: 'Brand' },
          validation: { isValid: true, errors: [], warnings: [] },
          meta: {
            rowId: 'row-update',
            batchId: testBatchId,
            productId: 'update-001',
            importedAt: new Date().toISOString(),
            importedBy: testUserId,
            status: 'pending',
          },
        },
        {
          rowId: 'row-blocked',
          batchId: testBatchId,
          source: { columns: {}, lineNumber: 3 },
          normalized: {},
          validation: {
            isValid: false,
            errors: [{ code: 'MISSING_REQUIRED_FIELD', severity: 'error', field: 'sku', message: 'Missing SKU' }],
            warnings: [],
          },
          meta: {
            rowId: 'row-blocked',
            batchId: testBatchId,
            productId: 'blocked-001',
            importedAt: new Date().toISOString(),
            importedBy: testUserId,
            status: 'failed',
          },
        },
      ];

      // Create existing product for update test
      await db.collection('products').doc('update-001').set({
        core: {
          sku: 'UPDATE-001',
          title: 'Old Title',
          brand: 'Old Brand',
          status: 'draft',
          createdAt: '2025-01-01T00:00:00Z',
          updatedAt: '2025-01-01T00:00:00Z',
        },
        attributes: {},
      });

      // Save rows
      for (const row of rows) {
        await db
          .collection('import_batches')
          .doc(testBatchId)
          .collection('rows')
          .doc(row.rowId)
          .set(row);
      }

      // Process batch
      const result = await processImportBatch(testBatchId, testUserId);

      // Verify counters
      expect(result.createdCount).toBe(1);
      expect(result.updatedCount).toBe(1);
      expect(result.blockedCount).toBe(1);

      // Verify batch document was updated
      const batchDoc = await db.collection('import_batches').doc(testBatchId).get();
      const batchData = batchDoc.data() as ImportBatch;
      expect(batchData.status).toBe('processed');
      expect(batchData.createdCount).toBe(1);
      expect(batchData.updatedCount).toBe(1);
      expect(batchData.blockedCount).toBe(1);
      expect(batchData.processedAt).toBeDefined();
      expect(batchData.processedBy).toBe(testUserId);
    });
  });

  describe('getBatchStatus', () => {
    it('should return batch status', async () => {
      // Create test batch
      const batch: ImportBatch = {
        batchId: testBatchId,
        fileName: 'test.csv',
        createdAt: new Date().toISOString(),
        createdBy: testUserId,
        rowCount: 10,
        status: 'processed',
        createdCount: 5,
        updatedCount: 3,
        blockedCount: 2,
        processedAt: new Date().toISOString(),
        processedBy: testUserId,
      };
      
      await db.collection('import_batches').doc(testBatchId).set(batch);

      // Get status
      const status = await getBatchStatus(testBatchId);

      // Verify
      expect(status.status).toBe('processed');
      expect(status.createdCount).toBe(5);
      expect(status.updatedCount).toBe(3);
      expect(status.blockedCount).toBe(2);
      expect(status.processedAt).toBeDefined();
    });

    it('should throw error for non-existent batch', async () => {
      await expect(getBatchStatus('non-existent')).rejects.toThrow('not found');
    });
  });
});
