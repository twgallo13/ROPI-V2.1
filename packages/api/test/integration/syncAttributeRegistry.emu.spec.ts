/**
 * Sync Attribute Registry Emulator Integration Tests
 * End-to-end tests for the attribute registry sync task
 * 
 * Lisa v1.0.0
 * 
 * Prerequisites:
 * - Firebase emulator running: firebase emulators:start --only firestore
 * - FIRESTORE_EMULATOR_HOST environment variable set (e.g., localhost:8080)
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import * as admin from 'firebase-admin';
import { runSyncAttributeRegistry } from '../../src/tasks/syncAttributeRegistry';
import { getAttribute, listAttributes } from '../../src/services/attributesService';

// Skip integration tests if emulator is not running
const EMULATOR_HOST = process.env.FIRESTORE_EMULATOR_HOST;
const describeIfEmulator = EMULATOR_HOST ? describe : describe.skip;

describeIfEmulator('Sync Attribute Registry Integration Tests', () => {
  let db: admin.firestore.Firestore;

  beforeAll(async () => {
    // Initialize Firebase Admin with emulator
    // Use demo-ropi-test to match CI workflow (api-integration-emulator.yml)
    if (!admin.apps.length) {
      admin.initializeApp({
        projectId: 'demo-ropi-test',
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

  describe('runSyncAttributeRegistry', () => {
    it('should sync attributes from JSON file to Firestore', async () => {
      // Run the sync
      const result = await runSyncAttributeRegistry();

      // Verify result structure
      expect(result).toHaveProperty('created');
      expect(result).toHaveProperty('updated');
      expect(result).toHaveProperty('errors');
      expect(result).toHaveProperty('attributes');
      expect(result.errors).toHaveLength(0);

      // Verify at least some attributes were created
      expect(result.created).toBeGreaterThan(0);
      expect(result.attributes.length).toBeGreaterThan(0);
    });

    it('should create expected core attributes', async () => {
      // Run the sync
      await runSyncAttributeRegistry();

      // Verify specific expected attributes exist
      const genderAttr = await getAttribute('gender');
      expect(genderAttr).toBeDefined();
      expect(genderAttr.label).toBe('Gender');
      expect(genderAttr.data_type).toBe('enum');
      expect(genderAttr.required_for_completion).toBe(true);
      expect(genderAttr.allowed_values).toContain('Men');
      expect(genderAttr.allowed_values).toContain('Women');

      const ageGroupAttr = await getAttribute('age_group');
      expect(ageGroupAttr).toBeDefined();
      expect(ageGroupAttr.label).toBe('Age Group');

      const primaryColorAttr = await getAttribute('primary_color');
      expect(primaryColorAttr).toBeDefined();
      expect(primaryColorAttr.data_type).toBe('enum');
      expect(primaryColorAttr.required_for_completion).toBe(true);
    });

    it('should be idempotent - running twice should update instead of fail', async () => {
      // First sync
      const firstResult = await runSyncAttributeRegistry();
      expect(firstResult.errors).toHaveLength(0);

      const firstCreated = firstResult.created;
      const firstUpdated = firstResult.updated;

      // Second sync should update, not create
      const secondResult = await runSyncAttributeRegistry();
      expect(secondResult.errors).toHaveLength(0);
      expect(secondResult.created).toBe(0);
      expect(secondResult.updated).toBeGreaterThanOrEqual(firstCreated);

      // Total attributes should remain the same
      const { items } = await listAttributes({ limit: 100 });
      expect(items.length).toBe(firstResult.attributes.length);
    });

    it('should set createdBy and updatedBy to system', async () => {
      await runSyncAttributeRegistry();

      const attr = await getAttribute('gender');
      expect(attr.createdBy).toBe('system');
      expect(attr.updatedBy).toBe('system');
      expect(attr.createdAt).toBeDefined();
      expect(attr.updatedAt).toBeDefined();
    });

    it('should preserve all attribute properties from JSON', async () => {
      await runSyncAttributeRegistry();

      const materialAttr = await getAttribute('material');
      expect(materialAttr).toBeDefined();
      expect(materialAttr.label).toBe('Material');
      expect(materialAttr.external_header).toBe('Material');
      expect(materialAttr.category).toBe('Construction');
      expect(materialAttr.data_type).toBe('enum');
      expect(materialAttr.synonyms).toContain('upper_material');
      expect(materialAttr.ai_usage_notes).toBeDefined();
      expect(materialAttr.status).toBe('active');
    });

    it('should handle different data types correctly', async () => {
      await runSyncAttributeRegistry();

      // Check boolean type
      const waterproofAttr = await getAttribute('waterproof');
      expect(waterproofAttr.data_type).toBe('boolean');

      // Check multiSelect type
      const occasionAttr = await getAttribute('occasion');
      expect(occasionAttr.data_type).toBe('multiSelect');
      expect(occasionAttr.allowed_values).toBeInstanceOf(Array);

      // Check date type
      const launchDateAttr = await getAttribute('launch_date');
      expect(launchDateAttr.data_type).toBe('date');

      // Check number type
      const weightAttr = await getAttribute('weight');
      expect(weightAttr.data_type).toBe('number');
    });
  });

  describe('Attribute listing after sync', () => {
    it('should list all synced attributes with pagination', async () => {
      await runSyncAttributeRegistry();

      const { items, total, hasMore } = await listAttributes({ limit: 10 });
      
      expect(items.length).toBeLessThanOrEqual(10);
      expect(total).toBeGreaterThan(0);
      
      // If there are more than 10 attributes, hasMore should be true
      if (total > 10) {
        expect(hasMore).toBe(true);
      }
    });

    it('should support searching synced attributes', async () => {
      await runSyncAttributeRegistry();

      const { items } = await listAttributes({ q: 'color' });
      
      // Should find primary_color and secondary_color
      const colorAttrs = items.filter(a => a.attribute_id.includes('color'));
      expect(colorAttrs.length).toBeGreaterThanOrEqual(1);
    });
  });
});
