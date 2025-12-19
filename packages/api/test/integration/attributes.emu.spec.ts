/**
 * Attributes Emulator Integration Tests
 * End-to-end tests against Firebase Emulator
 * 
 * Per AOSS Section 2.2 — Attribute Validation Schema
 * Lisa v0.2.0-rc
 * 
 * Prerequisites:
 * - Firebase emulator running: firebase emulators:start --only firestore
 * - FIRESTORE_EMULATOR_HOST environment variable set (e.g., localhost:8080)
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import * as admin from 'firebase-admin';
import {
  listAttributes,
  getAttribute,
  createAttribute,
  updateAttribute,
  deleteAttribute,
  ServiceError,
} from '../../src/services/attributesService';

// Skip integration tests if emulator is not running
const EMULATOR_HOST = process.env.FIRESTORE_EMULATOR_HOST;
const describeIfEmulator = EMULATOR_HOST ? describe : describe.skip;

describeIfEmulator('Attributes Emulator Integration Tests', () => {
  let db: admin.firestore.Firestore;
  const testActor = 'integration-test-user';

  beforeAll(async () => {
    // Initialize Firebase Admin with emulator
    if (!admin.apps.length) {
      admin.initializeApp({
        projectId: process.env.GCLOUD_PROJECT || 'demo-ropi-test',
      });
    }
    
    db = admin.firestore();
    console.log(`Connected to Firestore emulator at ${EMULATOR_HOST}`);
  });

  afterAll(async () => {
    // Final cleanup
    try {
      const attributesSnapshot = await db.collection('settings/attributes/keys').get();
      const batch = db.batch();
      attributesSnapshot.docs.forEach(doc => batch.delete(doc.ref));
      await batch.commit();
    } catch (error) {
      console.error('Final cleanup error:', error);
    }
  });

  beforeEach(async () => {
    // Clean up before each test
    try {
      const attributesSnapshot = await db.collection('settings/attributes/keys').get();
      const batch = db.batch();
      attributesSnapshot.docs.forEach(doc => batch.delete(doc.ref));
      await batch.commit();
    } catch (error) {
      // Ignore cleanup errors
    }
  });

  describe('Full CRUD Lifecycle', () => {
    it('should complete create -> read -> update -> delete flow', async () => {
      const attributeId = 'lifecycle-test-attr';
      
      // CREATE
      const created = await createAttribute({
        attribute_id: attributeId,
        label: 'Lifecycle Test Attribute',
        data_type: 'string',
        category: 'test-category',
      }, testActor);
      
      expect(created.attribute_id).toBe(attributeId);
      expect(created.label).toBe('Lifecycle Test Attribute');
      expect(created.createdBy).toBe(testActor);
      expect(created.createdAt).toBeDefined();
      
      // READ
      const read = await getAttribute(attributeId);
      expect(read.attribute_id).toBe(attributeId);
      expect(read.label).toBe('Lifecycle Test Attribute');
      expect(read.category).toBe('test-category');
      
      // UPDATE
      const updateActor = 'another-test-user';
      const updated = await updateAttribute(attributeId, {
        label: 'Updated Label',
        category: 'updated-category',
      }, updateActor);
      
      expect(updated.label).toBe('Updated Label');
      expect(updated.category).toBe('updated-category');
      expect(updated.updatedBy).toBe(updateActor);
      expect(updated.createdBy).toBe(testActor); // Original creator preserved
      
      // DELETE
      await deleteAttribute(attributeId);
      
      // Verify deleted
      await expect(getAttribute(attributeId))
        .rejects
        .toThrow(ServiceError);
    });
  });

  describe('Uniqueness Constraint', () => {
    it('should enforce unique attribute_id (409 on duplicate)', async () => {
      const attributeId = 'unique-test-attr';
      
      // Create first attribute
      await createAttribute({
        attribute_id: attributeId,
        label: 'First Attribute',
        data_type: 'string',
      }, testActor);
      
      // Attempt to create duplicate
      try {
        await createAttribute({
          attribute_id: attributeId,
          label: 'Duplicate Attribute',
          data_type: 'number',
        }, testActor);
        
        // Should not reach here
        expect.fail('Should have thrown ServiceError');
      } catch (error) {
        expect(error).toBeInstanceOf(ServiceError);
        const serviceError = error as ServiceError;
        expect(serviceError.statusCode).toBe(409);
        expect(serviceError.code).toBe('ATTRIBUTE_EXISTS');
        expect(serviceError.message).toContain(attributeId);
      }
    });
  });

  describe('Pagination', () => {
    beforeEach(async () => {
      // Create multiple attributes for pagination testing
      const attributes = [];
      for (let i = 1; i <= 15; i++) {
        attributes.push({
          attribute_id: `pagination-attr-${String(i).padStart(2, '0')}`,
          label: `Pagination Attribute ${i}`,
          data_type: 'string' as const,
        });
      }
      
      for (const attr of attributes) {
        await createAttribute(attr, testActor);
      }
    });

    it('should paginate through all results', async () => {
      let allItems: any[] = [];
      let pageToken: string | undefined;
      let iterations = 0;
      const maxIterations = 10; // Safety limit
      
      do {
        const result = await listAttributes({ limit: 5, pageToken });
        allItems = [...allItems, ...result.items];
        pageToken = result.pageToken;
        iterations++;
      } while (pageToken && iterations < maxIterations);
      
      expect(allItems.length).toBe(15);
      expect(iterations).toBe(3); // 15 items / 5 per page = 3 pages
    });

    it('should return correct hasMore flag', async () => {
      const page1 = await listAttributes({ limit: 10 });
      expect(page1.hasMore).toBe(true);
      expect(page1.items.length).toBe(10);
      
      const page2 = await listAttributes({ limit: 10, pageToken: page1.pageToken });
      expect(page2.hasMore).toBe(false);
      expect(page2.items.length).toBe(5);
    });
  });

  describe('Search Functionality', () => {
    beforeEach(async () => {
      const attributes = [
        { attribute_id: 'color-primary', label: 'Primary Color', data_type: 'string' as const },
        { attribute_id: 'color-secondary', label: 'Secondary Color', data_type: 'string' as const },
        { attribute_id: 'size-standard', label: 'Standard Size', data_type: 'enum' as const },
        { attribute_id: 'price-retail', label: 'Retail Price', data_type: 'currency' as const },
        { attribute_id: 'price-wholesale', label: 'Wholesale Price', data_type: 'currency' as const },
      ];
      
      for (const attr of attributes) {
        await createAttribute(attr, testActor);
      }
    });

    it('should filter by label (case-insensitive)', async () => {
      const result = await listAttributes({ q: 'COLOR' });
      
      expect(result.items.length).toBe(2);
      const ids = result.items.map(a => a.attribute_id);
      expect(ids).toContain('color-primary');
      expect(ids).toContain('color-secondary');
    });

    it('should filter by attribute_id', async () => {
      const result = await listAttributes({ q: 'price' });
      
      expect(result.items.length).toBe(2);
      const ids = result.items.map(a => a.attribute_id);
      expect(ids).toContain('price-retail');
      expect(ids).toContain('price-wholesale');
    });

    it('should return empty for no matches', async () => {
      const result = await listAttributes({ q: 'nonexistent' });
      
      expect(result.items.length).toBe(0);
    });
  });

  describe('Data Type Validation', () => {
    it('should store and retrieve all valid data types', async () => {
      const dataTypes = ['string', 'number', 'boolean', 'enum', 'currency', 'json'] as const;
      
      for (const dataType of dataTypes) {
        const attributeId = `type-test-${dataType}`;
        await createAttribute({
          attribute_id: attributeId,
          label: `Test ${dataType}`,
          data_type: dataType,
        }, testActor);
        
        const retrieved = await getAttribute(attributeId);
        expect(retrieved.data_type).toBe(dataType);
      }
    });
  });

  describe('Metadata Fields', () => {
    it('should preserve all optional fields', async () => {
      const fullAttribute = {
        attribute_id: 'full-attr-test',
        label: 'Full Attribute',
        data_type: 'enum' as const,
        external_header: 'External Header Name',
        category: 'classification',
        allowed_values: ['value1', 'value2', 'value3'],
        synonyms: ['alt1', 'alt2'],
        required_for_completion: true,
        required_for_export: false,
        import_required: true,
        ai_usage_notes: 'Use for color classification',
        status: 'active' as const,
      };
      
      const created = await createAttribute(fullAttribute, testActor);
      const retrieved = await getAttribute(fullAttribute.attribute_id);
      
      expect(retrieved.external_header).toBe(fullAttribute.external_header);
      expect(retrieved.category).toBe(fullAttribute.category);
      expect(retrieved.allowed_values).toEqual(fullAttribute.allowed_values);
      expect(retrieved.synonyms).toEqual(fullAttribute.synonyms);
      expect(retrieved.required_for_completion).toBe(true);
      expect(retrieved.required_for_export).toBe(false);
      expect(retrieved.import_required).toBe(true);
      expect(retrieved.ai_usage_notes).toBe(fullAttribute.ai_usage_notes);
      expect(retrieved.status).toBe('active');
    });
  });
});
