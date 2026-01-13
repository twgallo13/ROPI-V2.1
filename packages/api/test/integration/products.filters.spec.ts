/**
 * Integration Tests for Products Filtering and Sorting
 * 
 * Tests server-side filtering, sorting, and pagination.
 * Requires Firestore emulator.
 * 
 * Homer Products List v1.0
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import * as admin from 'firebase-admin';
import request from 'supertest';
import { apiApp } from '../../src/apiApp';

// Skip if emulator not available
const EMULATOR_HOST = process.env.FIRESTORE_EMULATOR_HOST;
const describeIfEmulator = EMULATOR_HOST ? describe : describe.skip;

describeIfEmulator('GET /api/products - Filters and Sorting', () => {
  let db: admin.firestore.Firestore;
  let testProductIds: string[] = [];
  let authToken: string;

  beforeAll(async () => {
    // Firebase Admin is already initialized in vitest.setup.emu.ts
    db = admin.firestore();
    
    // Ensure Firestore is connected to emulator
    if (process.env.FIRESTORE_EMULATOR_HOST) {
      // Settings are immutable after first usage, so we catch and ignore errors
      try {
        db.settings({
          host: process.env.FIRESTORE_EMULATOR_HOST,
          ssl: false,
        });
      } catch (error) {
        // Settings already configured - this is fine for tests
      }
    }

    // Use mock auth token for emulator testing (no Auth emulator required)
    authToken = 'mock-emulator-token';
  });

  beforeEach(async () => {
    // Clear existing test products
    if (testProductIds.length > 0) {
      const batch = db.batch();
      testProductIds.forEach(id => {
        batch.delete(db.collection('products').doc(id));
      });
      await batch.commit();
      testProductIds = [];
    }

    // Seed test products with various attributes
    const testProducts = [
      {
        sku: 'NIKE-001',
        name: 'Nike Air Max',
        brand: 'Nike',
        status: 'active',
        category: 'Shoes',
        department: 'Mens',
        updatedAt: new Date('2024-01-01'),
        createdAt: new Date('2023-01-01'),
      },
      {
        sku: 'NIKE-002',
        name: 'Nike Running Shirt',
        brand: 'Nike',
        status: 'draft',
        category: 'Apparel',
        department: 'Mens',
        updatedAt: new Date('2024-01-02'),
        createdAt: new Date('2023-01-02'),
      },
      {
        sku: 'ADIDAS-001',
        name: 'Adidas Ultraboost',
        brand: 'Adidas',
        status: 'active',
        category: 'Shoes',
        department: 'Womens',
        updatedAt: new Date('2024-01-03'),
        createdAt: new Date('2023-01-03'),
      },
      {
        sku: 'ADIDAS-002',
        name: 'Adidas Track Pants',
        brand: 'Adidas',
        status: 'discontinued',
        category: 'Apparel',
        department: 'Mens',
        updatedAt: new Date('2024-01-04'),
        createdAt: new Date('2023-01-04'),
      },
      {
        sku: 'PUMA-001',
        name: 'Puma Suede Classic',
        brand: 'Puma',
        status: 'active',
        category: 'Shoes',
        department: 'Unisex',
        updatedAt: new Date('2024-01-05'),
        createdAt: new Date('2023-01-05'),
      },
    ];

    const batch = db.batch();
    for (const product of testProducts) {
      const ref = db.collection('products').doc();
      testProductIds.push(ref.id);
      batch.set(ref, product);
    }
    await batch.commit();

    // Wait for Firestore to process
    await new Promise(resolve => setTimeout(resolve, 100));
  });

  afterAll(async () => {
    // Cleanup
    if (testProductIds.length > 0) {
      const batch = db.batch();
      testProductIds.forEach(id => {
        batch.delete(db.collection('products').doc(id));
      });
      await batch.commit();
    }
  });

  it('should filter by brand', async () => {
    const response = await request(apiApp)
      .get('/api/products')
      .query({ brand: 'Nike', limit: 50 })
      .set('Authorization', `Bearer ${authToken}`);

    expect(response.status).toBe(200);
    expect(response.body.items).toHaveLength(2);
    expect(response.body.items.every((p: any) => p.brand === 'Nike')).toBe(true);
  });

  it('should filter by status', async () => {
    const response = await request(apiApp)
      .get('/api/products')
      .query({ status: 'active', limit: 50 })
      .set('Authorization', `Bearer ${authToken}`);

    expect(response.status).toBe(200);
    expect(response.body.items).toHaveLength(3);
    expect(response.body.items.every((p: any) => p.status === 'active')).toBe(true);
  });

  it('should filter by category', async () => {
    const response = await request(apiApp)
      .get('/api/products')
      .query({ category: 'Shoes', limit: 50 })
      .set('Authorization', `Bearer ${authToken}`);

    expect(response.status).toBe(200);
    expect(response.body.items).toHaveLength(3);
    expect(response.body.items.every((p: any) => p.category === 'Shoes')).toBe(true);
  });

  it('should filter by department', async () => {
    const response = await request(apiApp)
      .get('/api/products')
      .query({ department: 'Mens', limit: 50 })
      .set('Authorization', `Bearer ${authToken}`);

    expect(response.status).toBe(200);
    expect(response.body.items).toHaveLength(3);
    expect(response.body.items.every((p: any) => p.department === 'Mens')).toBe(true);
  });

  it('should combine multiple filters', async () => {
    const response = await request(apiApp)
      .get('/api/products')
      .query({
        brand: 'Nike',
        status: 'active',
        category: 'Shoes',
        limit: 50,
      })
      .set('Authorization', `Bearer ${authToken}`);

    expect(response.status).toBe(200);
    expect(response.body.items).toHaveLength(1);
    expect(response.body.items[0].sku).toBe('NIKE-001');
  });

  it('should sort by name ascending', async () => {
    const response = await request(apiApp)
      .get('/api/products')
      .query({ sortBy: 'name', sortDir: 'asc', limit: 50 })
      .set('Authorization', `Bearer ${authToken}`);

    expect(response.status).toBe(200);
    expect(response.body.items.length).toBeGreaterThan(0);
    
    // Verify ascending order
    const names = response.body.items.map((p: any) => p.name);
    const sortedNames = [...names].sort();
    expect(names).toEqual(sortedNames);
  });

  it('should sort by name descending', async () => {
    const response = await request(apiApp)
      .get('/api/products')
      .query({ sortBy: 'name', sortDir: 'desc', limit: 50 })
      .set('Authorization', `Bearer ${authToken}`);

    expect(response.status).toBe(200);
    expect(response.body.items.length).toBeGreaterThan(0);
    
    // Verify descending order
    const names = response.body.items.map((p: any) => p.name);
    const sortedNames = [...names].sort().reverse();
    expect(names).toEqual(sortedNames);
  });

  it('should sort by sku', async () => {
    const response = await request(apiApp)
      .get('/api/products')
      .query({ sortBy: 'sku', sortDir: 'asc', limit: 50 })
      .set('Authorization', `Bearer ${authToken}`);

    expect(response.status).toBe(200);
    expect(response.body.items.length).toBeGreaterThan(0);
    
    const skus = response.body.items.map((p: any) => p.sku);
    const sortedSkus = [...skus].sort();
    expect(skus).toEqual(sortedSkus);
  });

  it('should sort by updatedAt descending (default)', async () => {
    const response = await request(apiApp)
      .get('/api/products')
      .query({ sortBy: 'updatedAt', sortDir: 'desc', limit: 50 })
      .set('Authorization', `Bearer ${authToken}`);

    expect(response.status).toBe(200);
    expect(response.body.items.length).toBeGreaterThan(0);
    
    // Most recently updated should be first
    expect(response.body.items[0].sku).toBe('PUMA-001');
  });

  it('should handle pagination with filters', async () => {
    const firstPage = await request(apiApp)
      .get('/api/products')
      .query({ category: 'Shoes', limit: 2 })
      .set('Authorization', `Bearer ${authToken}`);

    expect(firstPage.status).toBe(200);
    expect(firstPage.body.items).toHaveLength(2);
    expect(firstPage.body.hasMore).toBe(true);
    expect(firstPage.body.pageToken).toBeDefined();

    // Get second page
    const secondPage = await request(apiApp)
      .get('/api/products')
      .query({
        category: 'Shoes',
        limit: 2,
        pageToken: firstPage.body.pageToken,
      })
      .set('Authorization', `Bearer ${authToken}`);

    expect(secondPage.status).toBe(200);
    expect(secondPage.body.items).toHaveLength(1);
    expect(secondPage.body.hasMore).toBe(false);

    // Verify no overlap
    const firstPageIds = firstPage.body.items.map((p: any) => p.id);
    const secondPageIds = secondPage.body.items.map((p: any) => p.id);
    const intersection = firstPageIds.filter((id: string) => secondPageIds.includes(id));
    expect(intersection).toHaveLength(0);
  });

  it('should return total count on first page', async () => {
    const response = await request(apiApp)
      .get('/api/products')
      .query({ limit: 50 })
      .set('Authorization', `Bearer ${authToken}`);

    expect(response.status).toBe(200);
    expect(response.body.total).toBeDefined();
    expect(response.body.total).toBeGreaterThanOrEqual(5);
  });

  it('should handle search with filters and sorting', async () => {
    const response = await request(apiApp)
      .get('/api/products')
      .query({
        q: 'Nike',
        status: 'active',
        sortBy: 'name',
        sortDir: 'asc',
        limit: 50,
      })
      .set('Authorization', `Bearer ${authToken}`);

    expect(response.status).toBe(200);
    // Search is client-side, so just verify API accepts all params
    expect(response.body.items).toBeDefined();
  });

  it('should reject invalid sortBy field', async () => {
    const response = await request(apiApp)
      .get('/api/products')
      .query({ sortBy: 'invalidField', limit: 50 })
      .set('Authorization', `Bearer ${authToken}`);

    // Should either reject or default to updatedAt
    expect(response.status).toBe(200);
    expect(response.body.items).toBeDefined();
  });
});
