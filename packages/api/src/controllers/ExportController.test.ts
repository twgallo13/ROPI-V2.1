// Export Controller Integration Tests
// Tests proving export gate enforcement in the API layer

import { describe, it, expect, beforeEach, vi } from 'vitest';
import express from 'express';
import { ExportController } from './ExportController';

// Simple request/response simulation for testing
function createMockRequest(method: string, path: string, data: any = {}) {
  return {
    method,
    path,
    params: {},
    query: {},
    body: {},
    ...data
  };
}

function createMockResponse() {
  const res: any = {
    statusCode: 200,
    headers: {},
    data: null
  };
  
  res.status = vi.fn().mockReturnValue(res);
  res.json = vi.fn().mockImplementation((data) => {
    res.data = data;
    return res;
  });
  
  return res;
}

describe('ExportController Integration', () => {
  let controller: ExportController;

  beforeEach(() => {
    controller = new ExportController();
  });

  describe('checkExportReadiness method', () => {
    it('blocks export when completion below threshold', async () => {
      // Mock incomplete product data
      vi.spyOn(controller as any, 'loadProductData').mockResolvedValue({
        id: 'prod_test',
        title: 'Incomplete Product',
        // Missing description, SEO fields
      });

      const req = createMockRequest('GET', '/api/products/prod_test/export-readiness', {
        params: { productId: 'prod_test' },
        query: { sites: ['amazon', 'shopify'] }
      });
      const res = createMockResponse();

      await controller.checkExportReadiness(req as any, res as any);

      expect(res.json).toHaveBeenCalled();
      const responseData = res.data;
      
      expect(responseData).toMatchObject({
        productId: 'prod_test',
        canExport: false,
        selectedSites: ['amazon', 'shopify']
      });

      expect(responseData.blockingReasons).toBeDefined();
      expect(responseData.explanation).toContain('Export blocked:');
    });

    it('allows export when completion meets requirements', async () => {
      // Mock complete product data
      vi.spyOn(controller as any, 'loadProductData').mockResolvedValue({
        id: 'prod_complete',
        title: 'Complete Product',
        description: 'Full description',
        seo_title: 'SEO Title',
        seo_description: 'SEO Description',
        attributes: {
          brand: 'Test Brand',
          category: 'Test Category'
        }
      });

      const req = createMockRequest('GET', '/api/products/prod_complete/export-readiness', {
        params: { productId: 'prod_complete' },
        query: { sites: ['amazon'] }
      });
      const res = createMockResponse();

      await controller.checkExportReadiness(req as any, res as any);

      expect(res.json).toHaveBeenCalled();
      const responseData = res.data;

      expect(responseData).toMatchObject({
        productId: 'prod_complete',
        canExport: true,
        blockingReasons: []
      });

      expect(responseData.explanation).toBe('Product is ready for export');
    });

    it('returns 400 for missing product ID', async () => {
      const req = createMockRequest('GET', '/api/products//export-readiness', {
        params: {},
        query: { sites: ['amazon'] }
      });
      const res = createMockResponse();

      await controller.checkExportReadiness(req as any, res as any);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.data).toMatchObject({
        error: 'Product ID required',
        canExport: false
      });
    });
  });

  describe('deterministic behavior', () => {
    it('returns consistent results for same input', async () => {
      const productData = {
        id: 'prod_test',
        title: 'Test Product'
        // Consistently missing description and SEO
      };

      vi.spyOn(controller as any, 'loadProductData').mockResolvedValue(productData);

      const req = createMockRequest('GET', '/api/products/prod_test/export-readiness', {
        params: { productId: 'prod_test' },
        query: { sites: ['amazon'] }
      });

      // Make multiple requests
      const res1 = createMockResponse();
      await controller.checkExportReadiness(req as any, res1 as any);

      const res2 = createMockResponse();
      await controller.checkExportReadiness(req as any, res2 as any);

      // Should be identical
      expect(res1.data.blockingReasons).toEqual(res2.data.blockingReasons);
      expect(res1.data.explanation).toBe(res2.data.explanation);
      expect(res1.data.canExport).toBe(res2.data.canExport);
    });

    it('never blocks for media or pricing attributes', async () => {
      vi.spyOn(controller as any, 'loadProductData').mockResolvedValue({
        id: 'prod_no_media',
        title: 'Product Without Media',
        description: 'Has description',
        seo_title: 'SEO Title',
        seo_description: 'SEO Description'
        // Missing: images, videos, price, cost - should not block
      });

      const req = createMockRequest('GET', '/api/products/prod_no_media/export-readiness', {
        params: { productId: 'prod_no_media' },
        query: { sites: ['amazon'] }
      });
      const res = createMockResponse();

      await controller.checkExportReadiness(req as any, res as any);

      expect(res.data.canExport).toBe(true);
      expect(res.data.blockingReasons).toHaveLength(0);
    });
  });
});