/**
 * Attributes Service Tests
 * Tests for CRUD operations on product attributes
 * 
 * Per AOSS Section 2.2 — Attribute Validation Schema
 * Lisa v0.2.0-rc
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import * as admin from 'firebase-admin';
import {
  listAttributes,
  getAttribute,
  createAttribute,
  updateAttribute,
  deleteAttribute,
  getTopValues,
  validateAttributeData,
  ServiceError,
} from '../src/services/attributesService';

// Note: These tests require Firebase Admin SDK initialization
// and Firestore emulator running

describe('Attributes Service', () => {
  let db: admin.firestore.Firestore;
  const testAttributeId = 'test-color-primary';
  const testActor = 'test-user-123';

  beforeEach(async () => {
    // Initialize Firebase Admin if not already done
    if (!admin.apps.length) {
      admin.initializeApp({
        projectId: process.env.GCLOUD_PROJECT || 'demo-ropi-test',
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
      const attributesSnapshot = await db.collection('settings/attributes/keys').get();
      const batch = db.batch();
      attributesSnapshot.docs.forEach(doc => batch.delete(doc.ref));
      await batch.commit();
    } catch (error) {
      console.error('Cleanup error:', error);
    }
  });

  describe('validateAttributeData', () => {
    it('should validate a correct attribute', () => {
      const validAttribute = {
        attribute_id: 'color-primary',
        label: 'Primary Color',
        data_type: 'string',
      };
      
      const result = validateAttributeData(validAttribute);
      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
      expect(result.data?.attribute_id).toBe('color-primary');
    });

    it('should reject invalid attribute_id format', () => {
      const invalidAttribute = {
        attribute_id: 'Invalid ID With Spaces',
        label: 'Bad Attribute',
        data_type: 'string',
      };
      
      const result = validateAttributeData(invalidAttribute);
      expect(result.success).toBe(false);
      expect(result.errors).toBeDefined();
      expect(result.errors?.length).toBeGreaterThan(0);
    });

    it('should reject missing required fields', () => {
      const incompleteAttribute = {
        attribute_id: 'test-attr',
      };
      
      const result = validateAttributeData(incompleteAttribute);
      expect(result.success).toBe(false);
      expect(result.errors).toBeDefined();
    });

    it('should reject invalid data_type', () => {
      const invalidAttribute = {
        attribute_id: 'test-attr',
        label: 'Test',
        data_type: 'invalid_type',
      };
      
      const result = validateAttributeData(invalidAttribute);
      expect(result.success).toBe(false);
    });
  });

  describe('createAttribute', () => {
    it('should create a new attribute', async () => {
      const newAttribute = {
        attribute_id: testAttributeId,
        label: 'Color Primary',
        data_type: 'string' as const,
      };
      
      const created = await createAttribute(newAttribute, testActor);
      
      expect(created.attribute_id).toBe(testAttributeId);
      expect(created.label).toBe('Color Primary');
      expect(created.createdBy).toBe(testActor);
      expect(created.createdAt).toBeDefined();
      expect(created.updatedBy).toBe(testActor);
      expect(created.updatedAt).toBeDefined();
    });

    it('should throw 409 on duplicate attribute_id', async () => {
      const attribute = {
        attribute_id: testAttributeId,
        label: 'Color Primary',
        data_type: 'string' as const,
      };
      
      // Create first
      await createAttribute(attribute, testActor);
      
      // Try to create duplicate
      await expect(createAttribute(attribute, testActor))
        .rejects
        .toThrow(ServiceError);
      
      try {
        await createAttribute(attribute, testActor);
      } catch (error) {
        expect(error).toBeInstanceOf(ServiceError);
        expect((error as ServiceError).statusCode).toBe(409);
        expect((error as ServiceError).code).toBe('ATTRIBUTE_EXISTS');
      }
    });
  });

  describe('getAttribute', () => {
    it('should retrieve an existing attribute', async () => {
      // Create attribute first
      const attribute = {
        attribute_id: testAttributeId,
        label: 'Color Primary',
        data_type: 'string' as const,
      };
      await createAttribute(attribute, testActor);
      
      const retrieved = await getAttribute(testAttributeId);
      
      expect(retrieved.attribute_id).toBe(testAttributeId);
      expect(retrieved.label).toBe('Color Primary');
    });

    it('should throw 404 for non-existent attribute', async () => {
      await expect(getAttribute('non-existent-id'))
        .rejects
        .toThrow(ServiceError);
      
      try {
        await getAttribute('non-existent-id');
      } catch (error) {
        expect(error).toBeInstanceOf(ServiceError);
        expect((error as ServiceError).statusCode).toBe(404);
        expect((error as ServiceError).code).toBe('ATTRIBUTE_NOT_FOUND');
      }
    });
  });

  describe('updateAttribute', () => {
    it('should update an existing attribute', async () => {
      // Create attribute first
      const attribute = {
        attribute_id: testAttributeId,
        label: 'Color Primary',
        data_type: 'string' as const,
      };
      await createAttribute(attribute, testActor);
      
      // Update
      const updatedActor = 'another-user-456';
      const updated = await updateAttribute(testAttributeId, { label: 'Updated Label' }, updatedActor);
      
      expect(updated.label).toBe('Updated Label');
      expect(updated.updatedBy).toBe(updatedActor);
    });

    it('should throw 404 for non-existent attribute', async () => {
      await expect(updateAttribute('non-existent-id', { label: 'Test' }, testActor))
        .rejects
        .toThrow(ServiceError);
      
      try {
        await updateAttribute('non-existent-id', { label: 'Test' }, testActor);
      } catch (error) {
        expect(error).toBeInstanceOf(ServiceError);
        expect((error as ServiceError).statusCode).toBe(404);
      }
    });
  });

  describe('deleteAttribute', () => {
    it('should delete an existing attribute', async () => {
      // Create attribute first
      const attribute = {
        attribute_id: testAttributeId,
        label: 'Color Primary',
        data_type: 'string' as const,
      };
      await createAttribute(attribute, testActor);
      
      // Delete
      await deleteAttribute(testAttributeId, testActor);
      
      // Verify deleted
      await expect(getAttribute(testAttributeId))
        .rejects
        .toThrow(ServiceError);
    });

    it('should throw 404 for non-existent attribute', async () => {
      await expect(deleteAttribute('non-existent-id', testActor))
        .rejects
        .toThrow(ServiceError);
      
      try {
        await deleteAttribute('non-existent-id', testActor);
      } catch (error) {
        expect(error).toBeInstanceOf(ServiceError);
        expect((error as ServiceError).statusCode).toBe(404);
      }
    });
  });

  describe('listAttributes', () => {
    beforeEach(async () => {
      // Create some test attributes
      const attributes = [
        { attribute_id: 'color-primary', label: 'Primary Color', data_type: 'string' as const },
        { attribute_id: 'size-standard', label: 'Standard Size', data_type: 'enum' as const },
        { attribute_id: 'price-retail', label: 'Retail Price', data_type: 'currency' as const },
      ];
      
      for (const attr of attributes) {
        await createAttribute(attr, testActor);
      }
    });

    it('should list all attributes', async () => {
      const result = await listAttributes();
      
      expect(result.items.length).toBe(3);
      expect(result.total).toBe(3);
      expect(result.hasMore).toBe(false);
    });

    it('should respect limit parameter', async () => {
      const result = await listAttributes({ limit: 2 });
      
      expect(result.items.length).toBe(2);
      expect(result.hasMore).toBe(true);
      expect(result.pageToken).toBeDefined();
    });

    it('should filter by search query', async () => {
      const result = await listAttributes({ q: 'color' });
      
      expect(result.items.length).toBe(1);
      expect(result.items[0].attribute_id).toBe('color-primary');
    });

    it('should paginate correctly', async () => {
      const page1 = await listAttributes({ limit: 2 });
      expect(page1.items.length).toBe(2);
      expect(page1.hasMore).toBe(true);
      
      const page2 = await listAttributes({ limit: 2, pageToken: page1.pageToken });
      expect(page2.items.length).toBe(1);
      expect(page2.hasMore).toBe(false);
    });
  });

  // PVS-0.2.7: getTopValues tests
  describe('getTopValues', () => {
    beforeEach(async () => {
      // Create a test attribute
      await createAttribute(
        { attribute_id: 'department', label: 'Department', data_type: 'string' as const },
        testActor
      );
      
      // Create test products with varying department values
      const productsRef = db.collection('products');
      const testProducts = [
        { sku: 'SKU001', attributes: { department: 'Electronics' } },
        { sku: 'SKU002', attributes: { department: 'Electronics' } },
        { sku: 'SKU003', attributes: { department: 'Electronics' } },
        { sku: 'SKU004', attributes: { department: 'Clothing' } },
        { sku: 'SKU005', attributes: { department: 'Clothing' } },
        { sku: 'SKU006', attributes: { department: 'Home' } },
        { sku: 'SKU007', attributes: { department: null } }, // null value
        { sku: 'SKU008', attributes: {} }, // missing attribute
      ];
      
      const batch = db.batch();
      testProducts.forEach((product, i) => {
        batch.set(productsRef.doc(`test-product-${i}`), product);
      });
      await batch.commit();
    });

    afterEach(async () => {
      // Clean up products
      const productsSnapshot = await db.collection('products').get();
      const batch = db.batch();
      productsSnapshot.docs.forEach(doc => batch.delete(doc.ref));
      await batch.commit();
    });

    it('should return top values sorted by count', async () => {
      const result = await getTopValues('department');
      
      expect(result.sampledProducts).toBeGreaterThan(0);
      expect(result.values.length).toBe(3);
      
      // Electronics should be first (3 occurrences)
      expect(result.values[0].value).toBe('Electronics');
      expect(result.values[0].count).toBe(3);
      
      // Clothing should be second (2 occurrences)
      expect(result.values[1].value).toBe('Clothing');
      expect(result.values[1].count).toBe(2);
      
      // Home should be third (1 occurrence)
      expect(result.values[2].value).toBe('Home');
      expect(result.values[2].count).toBe(1);
    });

    it('should respect limit parameter', async () => {
      const result = await getTopValues('department', 2);
      
      expect(result.values.length).toBe(2);
      expect(result.values[0].value).toBe('Electronics');
      expect(result.values[1].value).toBe('Clothing');
    });

    it('should respect minCount parameter', async () => {
      const result = await getTopValues('department', 200, 2);
      
      // Only Electronics and Clothing have count >= 2
      expect(result.values.length).toBe(2);
      expect(result.values.every(v => v.count >= 2)).toBe(true);
    });

    it('should throw error for non-existent attribute', async () => {
      await expect(getTopValues('non-existent-attr'))
        .rejects
        .toThrow(ServiceError);
    });
  });
});
