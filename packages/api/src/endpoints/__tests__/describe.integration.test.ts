/**
 * Integration Tests for Describe Endpoints
 * 
 * LP-obs-studio-cleanup-1.6.5: Tests for aggregated multi-target describe API.
 * 
 * Tests:
 * - POST /api/products/:productId/describe - Multi-target describe
 * - POST /api/products/:productId/apply - Apply candidate/SEO
 * 
 * Note: NODE_ENV=test_emulator is set in vitest.setup.unit.ts to enable emulator auth mode.
 * Note: These tests focus on input validation and error handling since the firestore mock
 *       returns exists: false by default. For full integration tests with actual data,
 *       use the emulator-based tests (*.emu.test.ts).
 * 
 * Homer v1.6.5
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import request from 'supertest';
import { apiApp } from '../../apiApp';

// Admin token (any bearer token works in emulator mode)
const ADMIN_TOKEN = 'test-admin-token';

describe('POST /api/products/:productId/describe', () => {
  const mockProductId = 'test-product-123';

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should return 400 when targets are missing', async () => {
    const response = await request(apiApp)
      .post(`/api/products/${mockProductId}/describe`)
      .set('Authorization', `Bearer ${ADMIN_TOKEN}`)
      .send({
        audience: 'Streetwear Enthusiast',
        tone: 'Professional',
        observations: [],
        attributes: {},
      });

    expect(response.status).toBe(400);
    expect(response.body.error).toBe('MISSING_TARGETS');
  });

  it('should return 400 when targets is empty array', async () => {
    const response = await request(apiApp)
      .post(`/api/products/${mockProductId}/describe`)
      .set('Authorization', `Bearer ${ADMIN_TOKEN}`)
      .send({
        targets: [],
        audience: 'Streetwear Enthusiast',
        tone: 'Professional',
        observations: [],
        attributes: {},
      });

    expect(response.status).toBe(400);
    expect(response.body.error).toBe('MISSING_TARGETS');
  });

  it('should return 400 when audience is missing', async () => {
    const response = await request(apiApp)
      .post(`/api/products/${mockProductId}/describe`)
      .set('Authorization', `Bearer ${ADMIN_TOKEN}`)
      .send({
        targets: ['shiekh.com'],
        tone: 'Professional',
        observations: [],
        attributes: {},
      });

    expect(response.status).toBe(400);
    expect(response.body.error).toBe('MISSING_AUDIENCE');
  });

  it('should return 400 when tone is missing', async () => {
    const response = await request(apiApp)
      .post(`/api/products/${mockProductId}/describe`)
      .set('Authorization', `Bearer ${ADMIN_TOKEN}`)
      .send({
        targets: ['shiekh.com'],
        audience: 'Streetwear Enthusiast',
        observations: [],
        attributes: {},
      });

    expect(response.status).toBe(400);
    expect(response.body.error).toBe('MISSING_TONE');
  });

  it('should return 404 when product is not found', async () => {
    // The mock returns exists: false by default
    const response = await request(apiApp)
      .post(`/api/products/${mockProductId}/describe`)
      .set('Authorization', `Bearer ${ADMIN_TOKEN}`)
      .send({
        targets: ['shiekh.com'],
        audience: 'Streetwear Enthusiast',
        tone: 'Professional',
        observations: [],
        attributes: {},
      });

    expect(response.status).toBe(404);
    expect(response.body.error).toBe('PRODUCT_NOT_FOUND');
  });

  it('should accept valid request body with all required fields', async () => {
    // Even though product won't be found, this validates request structure is accepted
    const response = await request(apiApp)
      .post(`/api/products/${mockProductId}/describe`)
      .set('Authorization', `Bearer ${ADMIN_TOKEN}`)
      .send({
        targets: ['shiekh.com', 'karmaloop', 'mltd'],
        audience: 'Streetwear Enthusiast',
        tone: 'Professional',
        observations: [
          { id: 'obs-1', tags: ['premium', 'leather'], text: 'High quality' },
          { id: 'obs-2', tags: ['comfortable'], text: 'Very comfortable' },
        ],
        attributes: { brand: 'TestBrand', color: 'Black' },
        options: { candidates: 3, aggregate: true },
      });

    // Should get 404 (product not found) not 400 (bad request)
    // This proves the request body was accepted
    expect(response.status).toBe(404);
    expect(response.body.error).toBe('PRODUCT_NOT_FOUND');
  });
});

describe('POST /api/products/:productId/apply', () => {
  const mockProductId = 'test-product-456';

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should return 400 when target is missing', async () => {
    const response = await request(apiApp)
      .post(`/api/products/${mockProductId}/apply`)
      .set('Authorization', `Bearer ${ADMIN_TOKEN}`)
      .send({
        action: 'description',
        payload: { text: 'New description' },
      });

    expect(response.status).toBe(400);
    expect(response.body.error).toBe('MISSING_FIELDS');
  });

  it('should return 400 when action is missing', async () => {
    const response = await request(apiApp)
      .post(`/api/products/${mockProductId}/apply`)
      .set('Authorization', `Bearer ${ADMIN_TOKEN}`)
      .send({
        target: 'shiekh.com',
        payload: { text: 'New description' },
      });

    expect(response.status).toBe(400);
    expect(response.body.error).toBe('MISSING_FIELDS');
  });

  it('should return 400 when payload is missing', async () => {
    const response = await request(apiApp)
      .post(`/api/products/${mockProductId}/apply`)
      .set('Authorization', `Bearer ${ADMIN_TOKEN}`)
      .send({
        target: 'shiekh.com',
        action: 'description',
      });

    expect(response.status).toBe(400);
    expect(response.body.error).toBe('MISSING_FIELDS');
  });

  it('should return 400 for invalid action', async () => {
    const response = await request(apiApp)
      .post(`/api/products/${mockProductId}/apply`)
      .set('Authorization', `Bearer ${ADMIN_TOKEN}`)
      .send({
        target: 'shiekh.com',
        action: 'invalid-action',
        payload: { text: 'Test' },
      });

    expect(response.status).toBe(400);
    expect(response.body.error).toBe('INVALID_ACTION');
  });

  it('should return 404 when product is not found', async () => {
    // The mock returns exists: false by default
    const response = await request(apiApp)
      .post(`/api/products/${mockProductId}/apply`)
      .set('Authorization', `Bearer ${ADMIN_TOKEN}`)
      .send({
        target: 'shiekh.com',
        action: 'description',
        payload: { text: 'New description' },
      });

    expect(response.status).toBe(404);
    expect(response.body.error).toBe('PRODUCT_NOT_FOUND');
  });

  it('should accept valid description action request', async () => {
    // Even though product won't be found, this validates request structure is accepted
    const response = await request(apiApp)
      .post(`/api/products/${mockProductId}/apply`)
      .set('Authorization', `Bearer ${ADMIN_TOKEN}`)
      .send({
        target: 'shiekh.com',
        action: 'description',
        payload: { candidateId: 'c1', text: 'This is a new description' },
      });

    // Should get 404 (product not found) not 400 (bad request)
    expect(response.status).toBe(404);
    expect(response.body.error).toBe('PRODUCT_NOT_FOUND');
  });

  it('should accept valid seo action request', async () => {
    const response = await request(apiApp)
      .post(`/api/products/${mockProductId}/apply`)
      .set('Authorization', `Bearer ${ADMIN_TOKEN}`)
      .send({
        target: 'shiekh.com',
        action: 'seo',
        payload: {
          seo: {
            title: 'New SEO Title',
            bullets: ['Bullet 1', 'Bullet 2', 'Bullet 3'],
          },
        },
      });

    // Should get 404 (product not found) not 400 (bad request)
    expect(response.status).toBe(404);
    expect(response.body.error).toBe('PRODUCT_NOT_FOUND');
  });

  it('should accept valid attribute action request', async () => {
    const response = await request(apiApp)
      .post(`/api/products/${mockProductId}/apply`)
      .set('Authorization', `Bearer ${ADMIN_TOKEN}`)
      .send({
        target: 'shiekh.com',
        action: 'attribute',
        payload: {
          attributeId: 'color',
          value: 'Navy Blue',
        },
      });

    // Should get 404 (product not found) not 400 (bad request)
    expect(response.status).toBe(404);
    expect(response.body.error).toBe('PRODUCT_NOT_FOUND');
  });
});
