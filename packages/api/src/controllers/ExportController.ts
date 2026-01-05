// Export readiness enforcement in export API endpoints
// Integrates ExportGateEnforcer into the export flow

import { Request, Response } from 'express';
import { ExportGateEnforcer } from '../lib/export/ExportGateEnforcer';

// Mock interfaces for dependencies (to be replaced with actual imports)
interface CompletionEngine {
  evaluate(productId: string, productData: any, selectedSites: string[]): Promise<any>;
}

interface AttributeRegistry {
  getAttributeTypes(): Promise<any>;
}

// Simple mock implementations
class MockCompletionEngine implements CompletionEngine {
  async evaluate(productId: string, productData: any, selectedSites: string[]) {
    // Simple mock logic for demonstration
    const hasDescription = productData.description && productData.description.trim();
    const hasSeoTitle = productData.seo_title && productData.seo_title.trim(); 
    const hasSeoDescription = productData.seo_description && productData.seo_description.trim();
    
    const missingAttributes = [];
    if (!hasDescription) missingAttributes.push('description');
    if (!hasSeoTitle) missingAttributes.push('seo_title');
    if (!hasSeoDescription) missingAttributes.push('seo_description');
    
    const hasBlockingReasons = missingAttributes.length > 0;
    const rawCompletionPct = hasBlockingReasons ? 50 : 90;
    const totalCompletionPct = hasBlockingReasons ? 0 : rawCompletionPct;
    
    return {
      totalCompletionPct,
      siteCompletions: selectedSites.map(siteId => ({
        siteId,
        completionPct: rawCompletionPct,
        missingAttributes: hasBlockingReasons ? missingAttributes : []
      })),
      siteBlockingReasons: hasBlockingReasons ? [{ site: selectedSites[0], missingAttributes }] : []
    };
  }
}

class MockAttributeRegistry implements AttributeRegistry {
  async getAttributeTypes() {
    return {};
  }
}

export class ExportController {
  private enforcer: ExportGateEnforcer;
  private completionEngine: CompletionEngine;
  private attributeRegistry: AttributeRegistry;

  constructor() {
    this.attributeRegistry = new MockAttributeRegistry();
    this.completionEngine = new MockCompletionEngine();
    this.enforcer = new ExportGateEnforcer(this.completionEngine, this.attributeRegistry);
  }

  /**
   * Check export readiness for a product
   * GET /api/products/:productId/export-readiness
   */
  async checkExportReadiness(req: Request, res: Response) {
    try {
      const { productId } = req.params;
      const { sites } = req.query;

      if (!productId) {
        return res.status(400).json({ 
          error: 'Product ID required',
          canExport: false 
        });
      }

      if (!sites || !Array.isArray(sites)) {
        return res.status(400).json({ 
          error: 'Sites parameter required as array',
          canExport: false 
        });
      }

      // Load product data
      const productData = await this.loadProductData(productId);
      if (!productData) {
        return res.status(404).json({ 
          error: 'Product not found',
          canExport: false 
        });
      }

      // Load export settings
      const exportSettings = await this.enforcer.getExportSettings();

      // Evaluate export readiness
      const readiness = await this.enforcer.evaluateExportReadiness(
        productId,
        productData,
        sites as string[],
        exportSettings
      );

      // Format response
      const response = {
        productId,
        canExport: readiness.canExport,
        completionPct: readiness.completionPct,
        selectedSites: sites,
        siteReadiness: readiness.siteReadiness,
        blockingReasons: readiness.blockingReasons,
        explanation: this.enforcer.formatBlockingExplanation(readiness.blockingReasons),
        timestamp: new Date().toISOString()
      };

      res.json(response);

    } catch (error) {
      console.error('Export readiness check failed:', error);
      res.status(500).json({
        error: 'Internal server error',
        canExport: false,
        explanation: 'Export readiness check failed due to system error'
      });
    }
  }

  /**
   * Attempt product export with gate enforcement
   * POST /api/products/:productId/export
   */
  async exportProduct(req: Request, res: Response) {
    try {
      const { productId } = req.params;
      const { sites, force = false } = req.body;

      if (!productId) {
        return res.status(400).json({ 
          error: 'Product ID required',
          exported: false 
        });
      }

      if (!sites || !Array.isArray(sites)) {
        return res.status(400).json({ 
          error: 'Sites parameter required as array',
          exported: false 
        });
      }

      // Load product data
      const productData = await this.loadProductData(productId);
      if (!productData) {
        return res.status(404).json({ 
          error: 'Product not found',
          exported: false 
        });
      }

      // Load export settings
      const exportSettings = await this.enforcer.getExportSettings();

      // Evaluate export readiness
      const readiness = await this.enforcer.evaluateExportReadiness(
        productId,
        productData,
        sites,
        exportSettings
      );

      // Enforce export gate (unless force override)
      if (!readiness.canExport && !force) {
        return res.status(422).json({
          error: 'Export blocked by completion gate',
          exported: false,
          canExport: false,
          completionPct: readiness.completionPct,
          blockingReasons: readiness.blockingReasons,
          explanation: this.enforcer.formatBlockingExplanation(readiness.blockingReasons),
          forceOverride: 'Set force=true to override export gate'
        });
      }

      // Proceed with export
      const exportResult = await this.executeExport(productId, productData, sites);

      res.json({
        exported: true,
        canExport: readiness.canExport,
        completionPct: readiness.completionPct,
        exportResult,
        explanation: readiness.canExport 
          ? 'Product exported successfully'
          : 'Export forced despite blocking reasons',
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      console.error('Product export failed:', error);
      res.status(500).json({
        error: 'Export failed',
        exported: false,
        explanation: 'Product export failed due to system error'
      });
    }
  }

  /**
   * Batch export readiness check
   * POST /api/products/batch/export-readiness
   */
  async batchExportReadiness(req: Request, res: Response) {
    try {
      const { productIds, sites } = req.body;

      if (!productIds || !Array.isArray(productIds)) {
        return res.status(400).json({ 
          error: 'Product IDs required as array' 
        });
      }

      if (!sites || !Array.isArray(sites)) {
        return res.status(400).json({ 
          error: 'Sites parameter required as array' 
        });
      }

      const exportSettings = await this.enforcer.getExportSettings();
      const results = [];

      // Check each product
      for (const productId of productIds) {
        try {
          const productData = await this.loadProductData(productId);
          
          if (!productData) {
            results.push({
              productId,
              canExport: false,
              error: 'Product not found'
            });
            continue;
          }

          const readiness = await this.enforcer.evaluateExportReadiness(
            productId,
            productData,
            sites,
            exportSettings
          );

          results.push({
            productId,
            canExport: readiness.canExport,
            completionPct: readiness.completionPct,
            blockingReasons: readiness.blockingReasons,
            explanation: this.enforcer.formatBlockingExplanation(readiness.blockingReasons)
          });

        } catch (error) {
          results.push({
            productId,
            canExport: false,
            error: 'Readiness check failed'
          });
        }
      }

      // Summary statistics
      const totalProducts = results.length;
      const readyCount = results.filter(r => r.canExport).length;
      const blockedCount = totalProducts - readyCount;

      res.json({
        totalProducts,
        readyForExport: readyCount,
        blocked: blockedCount,
        readyPercentage: Math.round((readyCount / totalProducts) * 100),
        results,
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      console.error('Batch export readiness failed:', error);
      res.status(500).json({
        error: 'Batch readiness check failed'
      });
    }
  }

  private async loadProductData(productId: string): Promise<any | null> {
    // Implementation would load from Firestore
    // For now, return mock data
    return {
      id: productId,
      title: 'Mock Product',
      description: 'Mock Description',
      attributes: {
        brand: 'Mock Brand',
        category: 'Mock Category'
      }
    };
  }

  private async executeExport(productId: string, productData: any, sites: string[]): Promise<any> {
    // Implementation would execute actual export to channels
    // For now, return mock result
    return {
      exportId: `export_${Date.now()}`,
      sites: sites,
      status: 'completed',
      timestamp: new Date().toISOString()
    };
  }
}