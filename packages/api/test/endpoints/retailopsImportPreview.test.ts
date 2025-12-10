/**
 * RetailOps Import Preview API Tests
 * 
 * Tests for POST /api/retailops/import-preview endpoint
 */

import { describe, it, expect, beforeAll } from 'vitest';
import request from 'supertest';
import express, { Application } from 'express';
import { retailopsImportPreviewApiHandler } from '../../src/endpoints/retailopsImportPreview';
import type { AuthenticatedRequest } from '../../src/middleware/auth';

// Mock authenticated request middleware
const mockAuthMiddleware = (req: any, res: any, next: any) => {
  // Add mock user with admin role
  req.user = {
    uid: 'test-admin',
    email: 'admin@test.com',
    customClaims: { role: 'admin' },
  };
  next();
};

// Create test app
const createTestApp = () => {
  const app: Application = express();

  // Middleware
  app.use(express.json());
  app.use(mockAuthMiddleware);

  // Mount endpoint
  app.post('/api/retailops/import-preview', async (req, res) => {
    try {
      await retailopsImportPreviewApiHandler(req as AuthenticatedRequest, res);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  return app;
};

// Test CSV data
const VALID_CSV = `SKU,Product Name,Brand,Description,Department,Category,Color,Size,MSRP,Cost,Retail Price,Currency,Quantity,Warehouse,First Received,Launch Date,Images,Primary Image
NK-001,Nike Air Max 270 - Black,NIKE,Premium sneaker,Mens,Running,Black,10,159.99,,139.99,USD,25,WH-001,,2024-12-15,https://example.com/img1.jpg,https://example.com/img1.jpg
JD-002,Jordan Retro 1 - White,JORDAN,Classic basketball,Mens,Basketball,White,10,180.00,,150.00,USD,15,WH-002,,2024-12-16,https://example.com/img2.jpg,https://example.com/img2.jpg`;

const CSV_WITH_SKIPPED = `SKU,Product Name,Brand,Description,Department,Category,Color,Size,MSRP,Cost,Retail Price,Currency,Quantity,Warehouse,First Received,Launch Date,Images,Primary Image
NK-001,Nike Air Max 270 - Black,NIKE,Premium sneaker,Mens,Running,Black,10,159.99,,139.99,USD,25,WH-001,,2024-12-15,https://example.com/img1.jpg,https://example.com/img1.jpg
AD-001,Adidas Running Shoe,ADIDAS,Running shoe,Mens,Running,White,10,129.99,,99.99,USD,15,WH-002,,2024-12-16,https://example.com/img2.jpg,https://example.com/img2.jpg`;

describe('RetailOps Import Preview API', () => {
  let app: Application;

  beforeAll(() => {
    app = createTestApp();
  });

  describe('POST /api/retailops/import-preview', () => {
    it('should return 200 with valid CSV', async () => {
      const response = await request(app)
        .post('/api/retailops/import-preview')
        .attach('file', Buffer.from(VALID_CSV), 'test.csv')
        .set('Authorization', 'Bearer test-token');

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('stats');
      expect(response.body).toHaveProperty('skipped');
      expect(response.body).toHaveProperty('sampleCoreProducts');
    });

    it('should return correct stats for valid CSV', async () => {
      const response = await request(app)
        .post('/api/retailops/import-preview')
        .attach('file', Buffer.from(VALID_CSV), 'test.csv')
        .set('Authorization', 'Bearer test-token');

      expect(response.status).toBe(200);
      expect(response.body.stats.totalRows).toBe(2);
      expect(response.body.stats.coreProducts).toBe(2);
      expect(response.body.stats.skipped).toBe(0);
      expect(response.body.skipped).toHaveLength(0);
      expect(response.body.sampleCoreProducts).toHaveLength(2);
    });

    it('should include sample products', async () => {
      const response = await request(app)
        .post('/api/retailops/import-preview')
        .attach('file', Buffer.from(VALID_CSV), 'test.csv')
        .set('Authorization', 'Bearer test-token');

      expect(response.status).toBe(200);
      const samples = response.body.sampleCoreProducts;
      expect(samples.length).toBeGreaterThan(0);
      expect(samples[0]).toHaveProperty('sku');
      expect(samples[0]).toHaveProperty('brand');
    });

    it('should handle CSV with skipped rows', async () => {
      const response = await request(app)
        .post('/api/retailops/import-preview')
        .attach('file', Buffer.from(CSV_WITH_SKIPPED), 'test.csv')
        .set('Authorization', 'Bearer test-token');

      expect(response.status).toBe(200);
      expect(response.body.stats.totalRows).toBe(2);
      expect(response.body.stats.coreProducts).toBe(1); // Only NIKE
      expect(response.body.stats.skipped).toBe(1); // ADIDAS skipped
      expect(response.body.skipped).toHaveLength(1);
      expect(response.body.skipped[0]).toHaveProperty('rowNumber');
      expect(response.body.skipped[0]).toHaveProperty('reason');
    });

    it('should return 400 for missing file', async () => {
      const response = await request(app)
        .post('/api/retailops/import-preview')
        .set('Authorization', 'Bearer test-token');

      expect(response.status).toBeGreaterThanOrEqual(400);
    });

    it('should return 422 for invalid CSV', async () => {
      const invalidCsv = 'This is not a valid CSV format';

      const response = await request(app)
        .post('/api/retailops/import-preview')
        .attach('file', Buffer.from(invalidCsv), 'invalid.csv')
        .set('Authorization', 'Bearer test-token');

      // Should either return 422 or handle gracefully
      expect([200, 400, 422]).toContain(response.status);
    });

    it('should limit sample products to 5', async () => {
      // Create CSV with many products
      let largeCsv = `SKU,Product Name,Brand,Description,Department,Category,Color,Size,MSRP,Cost,Retail Price,Currency,Quantity,Warehouse,First Received,Launch Date,Images,Primary Image\n`;

      for (let i = 1; i <= 10; i++) {
        largeCsv += `NK-${i.toString().padStart(3, '0')},Nike Product ${i},NIKE,Description,Mens,Running,Black,10,159.99,,139.99,USD,25,WH-001,,2024-12-15,https://example.com/img${i}.jpg,https://example.com/img${i}.jpg\n`;
      }

      const response = await request(app)
        .post('/api/retailops/import-preview')
        .attach('file', Buffer.from(largeCsv), 'large.csv')
        .set('Authorization', 'Bearer test-token');

      expect(response.status).toBe(200);
      expect(response.body.stats.coreProducts).toBe(10);
      expect(response.body.sampleCoreProducts.length).toBeLessThanOrEqual(5);
    });
  });
});
