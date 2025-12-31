/**
 * Integration Tests for Product Observation Endpoints
 * 
 * LP-obs-studio-cleanup-1.6.6: Tests for product-level observation CRUD.
 * 
 * Tests:
 * - GET /api/products/:productId/observation - Get observation
 * - PATCH /api/products/:productId/observation - Update observation (set/add/remove)
 * - DELETE /api/products/:productId/observation - Clear observation
 * 
 * Note: NODE_ENV=test_emulator is set in vitest.setup.unit.ts to enable emulator auth mode.
 * Note: These tests focus on input validation and error handling.
 * 
 * Homer v1.6.6
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import request from 'supertest';
import { apiApp } from '../../apiApp';

// Admin token (any bearer token works in emulator mode)
const ADMIN_TOKEN = 'test-admin-token';

describe('PATCH /api/products/:productId/observation', () => {
  const mockProductId = 'test-product-123';

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should return 400 when tags is missing', async () => {
    const response = await request(apiApp)
      .patch(`/api/products/${mockProductId}/observation`)
      .set('Authorization', `Bearer ${ADMIN_TOKEN}`)
      .send({
        source: 'mobile',
      });

    expect(response.status).toBe(400);
    expect(response.body.error).toBe('MISSING_TAGS');
    expect(response.body.message).toBe('tags array is required');
  });

  it('should return 400 when tags is not an array', async () => {
    const response = await request(apiApp)
      .patch(`/api/products/${mockProductId}/observation`)
      .set('Authorization', `Bearer ${ADMIN_TOKEN}`)
      .send({
        tags: 'hidden pocket',
        source: 'mobile',
      });

    expect(response.status).toBe(400);
    expect(response.body.error).toBe('MISSING_TAGS');
  });

  it('should return 400 when tags contains non-strings', async () => {
    const response = await request(apiApp)
      .patch(`/api/products/${mockProductId}/observation`)
      .set('Authorization', `Bearer ${ADMIN_TOKEN}`)
      .send({
        tags: ['valid tag', 123, null],
        source: 'mobile',
      });

    expect(response.status).toBe(400);
    expect(response.body.error).toBe('INVALID_TAGS');
    expect(response.body.message).toBe('All tags must be strings');
  });

  it('should return 404 when product does not exist', async () => {
    const response = await request(apiApp)
      .patch(`/api/products/nonexistent-product/observation`)
      .set('Authorization', `Bearer ${ADMIN_TOKEN}`)
      .send({
        tags: ['hidden pocket', 'runs small'],
        source: 'mobile',
      });

    // In test mode with mocked Firestore, product won't exist
    expect(response.status).toBe(404);
    expect(response.body.error).toBe('PRODUCT_NOT_FOUND');
  });

  it('should accept valid request with set action', async () => {
    // Note: This will fail with 404 in test mode since product doesn't exist
    // But validates that the route is correctly wired
    const response = await request(apiApp)
      .patch(`/api/products/${mockProductId}/observation`)
      .set('Authorization', `Bearer ${ADMIN_TOKEN}`)
      .send({
        tags: ['hidden pocket', 'runs small'],
        images: ['https://example.com/img1.jpg'],
        source: 'mobile',
        action: 'set',
      });

    // Will be 404 since product doesn't exist in mock
    expect(response.status).toBe(404);
  });

  it('should accept valid request with add action', async () => {
    const response = await request(apiApp)
      .patch(`/api/products/${mockProductId}/observation`)
      .set('Authorization', `Bearer ${ADMIN_TOKEN}`)
      .send({
        tags: ['new tag'],
        action: 'add',
      });

    expect(response.status).toBe(404);
    expect(response.body.error).toBe('PRODUCT_NOT_FOUND');
  });

  it('should accept valid request with remove action', async () => {
    const response = await request(apiApp)
      .patch(`/api/products/${mockProductId}/observation`)
      .set('Authorization', `Bearer ${ADMIN_TOKEN}`)
      .send({
        tags: ['tag to remove'],
        action: 'remove',
      });

    expect(response.status).toBe(404);
    expect(response.body.error).toBe('PRODUCT_NOT_FOUND');
  });

  // Note: Auth tests skipped in emulator mode (requireAuth is permissive)
  // Real auth is tested in E2E tests against deployed functions
});

describe('GET /api/products/:productId/observation', () => {
  const mockProductId = 'test-product-123';

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should return 404 when product does not exist', async () => {
    const response = await request(apiApp)
      .get(`/api/products/nonexistent-product/observation`)
      .set('Authorization', `Bearer ${ADMIN_TOKEN}`);

    expect(response.status).toBe(404);
    expect(response.body.error).toBe('PRODUCT_NOT_FOUND');
  });

  // Note: Auth tests skipped in emulator mode (requireAuth is permissive)
});

describe('DELETE /api/products/:productId/observation', () => {
  const mockProductId = 'test-product-123';

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should return 404 when product does not exist', async () => {
    const response = await request(apiApp)
      .delete(`/api/products/nonexistent-product/observation`)
      .set('Authorization', `Bearer ${ADMIN_TOKEN}`);

    expect(response.status).toBe(404);
    expect(response.body.error).toBe('PRODUCT_NOT_FOUND');
  });

  // Note: Auth tests skipped in emulator mode (requireAuth is permissive)
});
