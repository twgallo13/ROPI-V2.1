/**
 * Integration Tests for Products Endpoints
 * 
 * Tests /api/products list with pagination and search.
 * Requires Firestore emulator.
 * 
 * Homer Products List v1.0
 */

import request from 'supertest';
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import * as admin from 'firebase-admin';

// Skip integration tests if emulator is not running
// TODO: Enable when Auth emulator is available in CI
// const EMULATOR_HOST = process.env.FIRESTORE_EMULATOR_HOST;
// const describeIfEmulator = EMULATOR_HOST ? describe : describe.skip;

describe.skip('GET /api/products', () => {
  let mockIdToken: string;
  let testProductIds: string[];
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

    // Seed test products
    const db = admin.firestore();
    const batch = db.batch();

    const testProducts = [
      {
        sku: 'TEST-001',
        mpn: 'MPN-001',
        name: 'Test Product Alpha',
        status: 'active',
        brand: 'TestBrand',
        category: 'Electronics',
        department: 'Tech',
        class: 'Gadgets',
      },
      {
        sku: 'TEST-002',
        mpn: 'MPN-002',
        name: 'Test Product Beta',
        status: 'draft',
        brand: 'TestBrand',
        category: 'Accessories',
        department: 'Tech',
        class: 'Cables',
      },
      {
        sku: 'SEARCH-001',
        mpn: 'MPN-SEARCH',
        name: 'Searchable Product',
        status: 'active',
        brand: 'SearchCo',
        category: 'Tools',
        department: 'Workshop',
        class: 'Hand Tools',
      },
    ];

    testProductIds = [];
    for (const product of testProducts) {
      const ref = db.collection('products').doc();
      batch.set(ref, {
        ...product,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      });
      testProductIds.push(ref.id);
    }

    await batch.commit();
  });

  afterAll(async () => {
    // Clean up test products
    const db = admin.firestore();
    const batch = db.batch();

    for (const id of testProductIds) {
      batch.delete(db.collection('products').doc(id));
    }

    await batch.commit();

    // Clean up Firebase Admin
    await admin.app().delete();
  });

  it('should return 401 without auth token', async () => {
    const response = await request(apiApp).get('/api/products');

    expect(response.status).toBe(401);
  });

  it('should return products list with auth', async () => {
    const response = await request(apiApp)
      .get('/api/products')
      .set('Authorization', `Bearer ${mockIdToken}`);

    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty('items');
    expect(Array.isArray(response.body.items)).toBe(true);
    expect(response.body).toHaveProperty('hasMore');
  });

  it('should respect limit parameter', async () => {
    const response = await request(apiApp)
      .get('/api/products?limit=2')
      .set('Authorization', `Bearer ${mockIdToken}`);

    expect(response.status).toBe(200);
    expect(response.body.items.length).toBeLessThanOrEqual(2);
  });

  it('should enforce max limit of 100', async () => {
    const response = await request(apiApp)
      .get('/api/products?limit=500')
      .set('Authorization', `Bearer ${mockIdToken}`);

    expect(response.status).toBe(200);
    // Should be capped at 100
    expect(response.body.items.length).toBeLessThanOrEqual(100);
  });

  it('should return pageToken when hasMore is true', async () => {
    const response = await request(apiApp)
      .get('/api/products?limit=1')
      .set('Authorization', `Bearer ${mockIdToken}`);

    expect(response.status).toBe(200);

    if (response.body.hasMore) {
      expect(response.body).toHaveProperty('pageToken');
      expect(typeof response.body.pageToken).toBe('string');
    }
  });

  it('should paginate with pageToken', async () => {
    // Get first page
    const page1 = await request(apiApp)
      .get('/api/products?limit=1')
      .set('Authorization', `Bearer ${mockIdToken}`);

    expect(page1.status).toBe(200);

    if (page1.body.hasMore && page1.body.pageToken) {
      // Get second page
      const page2 = await request(apiApp)
        .get(`/api/products?limit=1&pageToken=${page1.body.pageToken}`)
        .set('Authorization', `Bearer ${mockIdToken}`);

      expect(page2.status).toBe(200);
      expect(page2.body.items).toHaveLength(1);

      // Should be different products
      expect(page2.body.items[0].id).not.toBe(page1.body.items[0].id);
    }
  });

  it('should search by SKU', async () => {
    const response = await request(apiApp)
      .get('/api/products?q=SEARCH-001')
      .set('Authorization', `Bearer ${mockIdToken}`);

    expect(response.status).toBe(200);
    expect(response.body.items.length).toBeGreaterThan(0);

    const found = response.body.items.find((p: any) => p.sku === 'SEARCH-001');
    expect(found).toBeDefined();
  });

  it('should search by product name', async () => {
    const response = await request(apiApp)
      .get('/api/products?q=Searchable')
      .set('Authorization', `Bearer ${mockIdToken}`);

    expect(response.status).toBe(200);

    const found = response.body.items.find((p: any) => p.name.includes('Searchable'));
    expect(found).toBeDefined();
  });

  it('should search by brand', async () => {
    const response = await request(apiApp)
      .get('/api/products?q=SearchCo')
      .set('Authorization', `Bearer ${mockIdToken}`);

    expect(response.status).toBe(200);

    const found = response.body.items.find((p: any) => p.brand === 'SearchCo');
    expect(found).toBeDefined();
  });

  it('should search by category', async () => {
    const response = await request(apiApp)
      .get('/api/products?q=Tools')
      .set('Authorization', `Bearer ${mockIdToken}`);

    expect(response.status).toBe(200);

    const found = response.body.items.find((p: any) => p.category === 'Tools');
    expect(found).toBeDefined();
  });

  it('should search case-insensitively', async () => {
    const response = await request(apiApp)
      .get('/api/products?q=searchable')
      .set('Authorization', `Bearer ${mockIdToken}`);

    expect(response.status).toBe(200);

    const found = response.body.items.find((p: any) =>
      p.name.toLowerCase().includes('searchable')
    );
    expect(found).toBeDefined();
  });

  it('should return empty array for no matches', async () => {
    const response = await request(apiApp)
      .get('/api/products?q=NONEXISTENT-QUERY-12345')
      .set('Authorization', `Bearer ${mockIdToken}`);

    expect(response.status).toBe(200);
    expect(response.body.items).toEqual([]);
    expect(response.body.hasMore).toBe(false);
  });

  it('should include product fields in response', async () => {
    const response = await request(apiApp)
      .get('/api/products?limit=1')
      .set('Authorization', `Bearer ${mockIdToken}`);

    expect(response.status).toBe(200);

    if (response.body.items.length > 0) {
      const product = response.body.items[0];

      expect(product).toHaveProperty('id');
      expect(product).toHaveProperty('sku');
      expect(product).toHaveProperty('name');
      expect(product).toHaveProperty('status');
      // Optional fields may or may not be present
    }
  });

  it('should handle empty products collection gracefully', async () => {
    // This test assumes collection might be empty in some test scenarios
    const response = await request(apiApp)
      .get('/api/products')
      .set('Authorization', `Bearer ${mockIdToken}`);

    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty('items');
    expect(Array.isArray(response.body.items)).toBe(true);
    expect(response.body).toHaveProperty('hasMore');
    expect(typeof response.body.hasMore).toBe('boolean');
  });
});
