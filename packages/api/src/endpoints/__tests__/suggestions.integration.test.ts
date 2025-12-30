/**
 * Integration Tests for Products Suggestions Endpoints
 * 
 * LP-obs-studio-cleanup-1.4.0: Tests for observation-based suggestions API.
 * 
 * Tests:
 * - POST /api/products/:productId/suggestions
 * - POST /api/products/:productId/apply-suggestion
 */

import request from 'supertest';
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import * as admin from 'firebase-admin';

// Skip integration tests if emulator is not running
describe.skip('Products Suggestions Endpoints', () => {
  let mockIdToken: string;
  let testProductId: string;
  let testObservationIds: string[];
  let apiApp: any;

  beforeAll(async () => {
    // Initialize Firebase Admin with emulator
    if (!admin.apps.length) {
      admin.initializeApp({
        projectId: 'demo-ropi-test',
      });
    }

    // Import apiApp after Firebase is initialized with emulator settings
    const { apiApp: app } = await import('../../apiApp');
    apiApp = app;

    // Create mock admin token
    mockIdToken = await admin.auth().createCustomToken('test-admin-uid');

    const db = admin.firestore();

    // Seed test product
    const productRef = db.collection('products').doc();
    testProductId = productRef.id;
    await productRef.set({
      mpn: 'TEST-MPN-SUGGESTIONS',
      sku: 'TEST-SKU-001',
      name: 'Test Product for Suggestions',
      status: 'active',
      brand: 'TestBrand',
      attributes: {
        color_primary: null,
        material_primary: null,
      },
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    // Seed test observations with tags
    testObservationIds = [];
    
    const obsData = [
      {
        product_mpn: 'TEST-MPN-SUGGESTIONS',
        text: 'Color appears to be red',
        tags: ['color:red', 'style:casual'],
        status: 'open',
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        createdBy: { uid: 'test-user', name: 'Test User' },
      },
      {
        product_mpn: 'TEST-MPN-SUGGESTIONS',
        text: 'Material is leather',
        tags: ['material:leather', 'color:red'],
        status: 'open',
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        createdBy: { uid: 'test-user', name: 'Test User' },
      },
    ];

    for (const obs of obsData) {
      const obsRef = db.collection('observations').doc();
      await obsRef.set(obs);
      testObservationIds.push(obsRef.id);
    }
  });

  afterAll(async () => {
    const db = admin.firestore();

    // Clean up test product
    if (testProductId) {
      await db.collection('products').doc(testProductId).delete();
    }

    // Clean up test observations
    for (const obsId of testObservationIds || []) {
      await db.collection('observations').doc(obsId).delete();
    }
  });

  describe('POST /api/products/:productId/suggestions', () => {
    it('should require authentication', async () => {
      const response = await request(apiApp)
        .post(`/api/products/${testProductId}/suggestions`)
        .send({});

      expect(response.status).toBe(401);
    });

    it('should return 404 for non-existent product', async () => {
      const response = await request(apiApp)
        .post('/api/products/non-existent-product/suggestions')
        .set('Authorization', `Bearer ${mockIdToken}`)
        .send({});

      expect(response.status).toBe(404);
      expect(response.body.error).toBe('PRODUCT_NOT_FOUND');
    });

    it('should generate suggestions from observations', async () => {
      const response = await request(apiApp)
        .post(`/api/products/${testProductId}/suggestions`)
        .set('Authorization', `Bearer ${mockIdToken}`)
        .send({ autoResolve: false });

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('suggestions');
      expect(response.body).toHaveProperty('meta');
      expect(Array.isArray(response.body.suggestions)).toBe(true);
      expect(response.body.meta).toHaveProperty('observationsCount');
      expect(response.body.meta).toHaveProperty('tagsCount');
      expect(response.body.meta).toHaveProperty('generatedAt');
    });

    it('should return suggestions with correct structure', async () => {
      const response = await request(apiApp)
        .post(`/api/products/${testProductId}/suggestions`)
        .set('Authorization', `Bearer ${mockIdToken}`)
        .send({});

      expect(response.status).toBe(200);

      if (response.body.suggestions.length > 0) {
        const suggestion = response.body.suggestions[0];
        expect(suggestion).toHaveProperty('id');
        expect(suggestion).toHaveProperty('attributeId');
        expect(suggestion).toHaveProperty('currentValue');
        expect(suggestion).toHaveProperty('suggestedValue');
        expect(suggestion).toHaveProperty('confidence');
        expect(suggestion).toHaveProperty('rationale');
        expect(suggestion).toHaveProperty('source');
        expect(suggestion.source).toBe('observation-tags');
      }
    });

    it('should auto-apply high-confidence suggestions when autoResolve is true', async () => {
      const response = await request(apiApp)
        .post(`/api/products/${testProductId}/suggestions`)
        .set('Authorization', `Bearer ${mockIdToken}`)
        .send({ autoResolve: true });

      expect(response.status).toBe(200);
      expect(response.body.meta).toHaveProperty('autoAppliedCount');
      
      // If there were high-confidence suggestions, they should be marked as applied
      const appliedSuggestions = response.body.suggestions.filter(
        (s: any) => s.applied === true
      );
      expect(appliedSuggestions.length).toBe(response.body.meta.autoAppliedCount);
    });
  });

  describe('POST /api/products/:productId/apply-suggestion', () => {
    it('should require authentication', async () => {
      const response = await request(apiApp)
        .post(`/api/products/${testProductId}/apply-suggestion`)
        .send({
          suggestionId: 'test-suggestion',
          attributeId: 'color_primary',
          value: 'red',
        });

      expect(response.status).toBe(401);
    });

    it('should return 404 for non-existent product', async () => {
      const response = await request(apiApp)
        .post('/api/products/non-existent-product/apply-suggestion')
        .set('Authorization', `Bearer ${mockIdToken}`)
        .send({
          suggestionId: 'test-suggestion',
          attributeId: 'color_primary',
          value: 'red',
        });

      expect(response.status).toBe(404);
      expect(response.body.error).toBe('PRODUCT_NOT_FOUND');
    });

    it('should require attributeId and value', async () => {
      const response = await request(apiApp)
        .post(`/api/products/${testProductId}/apply-suggestion`)
        .set('Authorization', `Bearer ${mockIdToken}`)
        .send({
          suggestionId: 'test-suggestion',
        });

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('MISSING_FIELDS');
    });

    it('should apply a suggestion and update the product', async () => {
      const response = await request(apiApp)
        .post(`/api/products/${testProductId}/apply-suggestion`)
        .set('Authorization', `Bearer ${mockIdToken}`)
        .send({
          suggestionId: 'test-suggestion-manual',
          attributeId: 'color_primary',
          value: 'blue',
          rationale: 'Manual test application',
        });

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('id');
      expect(response.body.attributes).toHaveProperty('color_primary');
      expect(response.body.attributes.color_primary).toBe('blue');
      expect(response.body).toHaveProperty('_appliedSuggestion');
      expect(response.body._appliedSuggestion.attributeId).toBe('color_primary');
    });

    it('should record activity log entry', async () => {
      const response = await request(apiApp)
        .post(`/api/products/${testProductId}/apply-suggestion`)
        .set('Authorization', `Bearer ${mockIdToken}`)
        .send({
          suggestionId: 'test-suggestion-log',
          attributeId: 'material_primary',
          value: 'canvas',
          rationale: 'Test log entry',
        });

      expect(response.status).toBe(200);
      
      // Activity log should contain the apply_suggestion action
      const activityLog = response.body._activityLog || [];
      const applySuggestionEntry = activityLog.find(
        (entry: any) => entry.action === 'apply_suggestion'
      );
      expect(applySuggestionEntry).toBeDefined();
    });
  });
});
