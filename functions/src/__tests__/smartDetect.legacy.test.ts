/**
 * SmartDetect handler tests with legacy product schema
 */
import { describe, it, expect } from 'vitest';
import { runSmartDetect } from '../smartDetect';
import { legacyToNew } from '../utils/schemaAdapter';

describe('smartDetect handler - legacy product support', () => {
  it('should handle legacy product without throwing', () => {
    const legacyProduct = {
      id: 'TEST-LEGACY-SD-001',
      mpn: 'SD-MPN-123',
      name: 'Test Legacy Smart Detect Product',
      brand: 'Nike',
      department: 'Footwear',
      class: 'Athletic',
      category: 'Basketball',
      ageGroup: 'Adult',
      gender: "Men's",
      materialFabric: 'Leather',
      primaryColor: 'Red',
      ricsCategory: 'M|FTW|BASKETBALL|HIGH',
      ricsLongDesc: 'Premium basketball shoe with leather upper and high-top design',
      status: 'active',
    };

    // Convert legacy to new schema
    const convertedProduct = legacyToNew(legacyProduct);

    // Should not throw
    expect(() => {
      runSmartDetect(convertedProduct);
    }).not.toThrow();
  });

  it('should return SmartDetectResult with suggestions array for legacy product', () => {
    const legacyProduct = {
      id: 'TEST-LEGACY-SD-002',
      mpn: 'SD-MPN-456',
      name: 'Basketball Shoe Test',
      brand: 'Jordan',
      // Missing department and class - should trigger suggestions from RICS
      category: 'Basketball',
      ageGroup: 'Adult',
      gender: "Men's",
      ricsCategory: 'M|FTW|BASKETBALL|HIGH',
      ricsLongDesc: 'High-performance basketball sneaker',
      status: 'active',
    };

    const convertedProduct = legacyToNew(legacyProduct);
    
    // Add RICS data to converted product (simulate Firestore structure)
    convertedProduct.rics = {
      category: legacyProduct.ricsCategory,
      longDescription: legacyProduct.ricsLongDesc,
    };

    const result = runSmartDetect(convertedProduct);

    // Should return smart detect result
    expect(result).toBeDefined();
    expect(result).toHaveProperty('suggestions');
    expect(result).toHaveProperty('summary');

    // suggestions should be an array
    expect(Array.isArray(result.suggestions)).toBe(true);
  });

  it('should generate department suggestion from RICS category for legacy product', () => {
    const legacyProduct = {
      id: 'TEST-LEGACY-SD-003',
      mpn: 'SD-MPN-789',
      name: 'Running Shoe',
      brand: 'Adidas',
      // No department - should be suggested from RICS
      category: 'Running',
      ricsCategory: 'M|FTW|RUNNING|LOW',
      ricsLongDesc: 'Lightweight running shoe',
      status: 'active',
    };

    const convertedProduct = legacyToNew(legacyProduct);
    
    // Add RICS data to converted product
    convertedProduct.rics = {
      category: legacyProduct.ricsCategory,
      longDescription: legacyProduct.ricsLongDesc,
    };

    const result = runSmartDetect(convertedProduct);

    expect(result.suggestions).toBeDefined();
    
    // Should suggest department from RICS category
    const deptSuggestion = result.suggestions.find(s => s.fieldPath === 'sku_core.department');
    expect(deptSuggestion).toBeDefined();
    if (deptSuggestion) {
      expect(deptSuggestion.suggestedValue).toBe('Footwear');
      expect(deptSuggestion.confidence).toBeGreaterThan(0);
    }
  });

  it('should handle legacy product with minimal data gracefully', () => {
    const minimalLegacyProduct = {
      id: 'TEST-LEGACY-SD-004',
      mpn: 'MINIMAL-001',
      name: 'Minimal Product',
      brand: 'TestBrand',
      status: 'intake',
    };

    const convertedProduct = legacyToNew(minimalLegacyProduct);
    const result = runSmartDetect(convertedProduct);

    // Should not throw and return valid result
    expect(result).toBeDefined();
    expect(result.suggestions).toBeDefined();
    expect(Array.isArray(result.suggestions)).toBe(true);
    expect(result.summary).toBeDefined();
    expect(typeof result.summary).toBe('string');
  });

  it('should preserve RICS source data after conversion', () => {
    const legacyProduct = {
      id: 'RICS-PRESERVE-TEST',
      mpn: 'RICS-001',
      name: 'RICS Data Test',
      brand: 'TestBrand',
      ricsCategory: 'M|APP|TSHIRT',
      ricsLongDesc: 'Cotton t-shirt with graphic print',
      status: 'active',
    };

    const convertedProduct = legacyToNew(legacyProduct);

    expect(convertedProduct.source).toBeDefined();
    expect(convertedProduct.source.rics).toBeDefined();
    expect(convertedProduct.source.rics.category).toBe('M|APP|TSHIRT');
    expect(convertedProduct.source.rics.longDescription).toBe('Cotton t-shirt with graphic print');
  });
});
