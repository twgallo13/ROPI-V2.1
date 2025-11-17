/**
 * Validate handler tests with legacy product schema
 */
import { describe, it, expect } from 'vitest';
import { validateProduct } from '../validator';
import { legacyToNew } from '../utils/schemaAdapter';

describe('validate handler - legacy product support', () => {
  it('should handle legacy product without throwing', () => {
    const legacyProduct = {
      id: 'TEST-LEGACY-001',
      mpn: 'TEST-MPN-123',
      name: 'Test Legacy Product',
      brand: 'Nike',
      department: 'Footwear',
      class: 'Athletic',
      category: 'Running Shoes',
      ageGroup: 'Adult',
      gender: "Men's",
      materialFabric: 'Mesh',
      primaryColor: 'Black',
      descriptiveColor: 'Midnight Black',
      pricing: {
        retail_price: 129.99,
      },
      launch: {
        date: '2025-01-15',
      },
      hype: false,
      fastfashion: false,
      familySizing: false,
      ricsCategory: 'M|FTW|RUNNING',
      ricsLongDesc: 'Premium running shoe with mesh upper',
      websites: ['nike.com'],
      status: 'active',
    };

    // Convert legacy to new schema
    const convertedProduct = legacyToNew(legacyProduct);

    // Should not throw
    expect(() => {
      validateProduct(convertedProduct);
    }).not.toThrow();
  });

  it('should return ValidationResult with ropiScore and issues for legacy product', () => {
    const legacyProduct = {
      id: 'TEST-LEGACY-002',
      mpn: 'TEST-MPN-456',
      name: 'Test Shoe',
      brand: 'Adidas',
      department: 'Footwear',
      class: 'Athletic',
      category: 'Training',
      ageGroup: 'Adult',
      gender: "Women's",
      materials: ['Synthetic', 'Rubber'],
      primaryColor: 'White',
      pricing: {
        retail_price: 89.99,
      },
      status: 'active',
    };

    const convertedProduct = legacyToNew(legacyProduct);
    const result = validateProduct(convertedProduct);

    // Should return validation result
    expect(result).toBeDefined();
    expect(result).toHaveProperty('ropiScore');
    expect(result).toHaveProperty('issues');

    // ropiScore should be numeric between 0-100
    expect(typeof result.ropiScore).toBe('number');
    expect(result.ropiScore).toBeGreaterThanOrEqual(0);
    expect(result.ropiScore).toBeLessThanOrEqual(100);

    // issues should be an array
    expect(Array.isArray(result.issues)).toBe(true);
  });

  it('should validate required fields and return critical issues for incomplete legacy product', () => {
    const incompleteLegacyProduct = {
      id: 'TEST-LEGACY-003',
      // Missing mpn, name, brand - should trigger critical issues
      department: 'Footwear',
      category: 'Sneakers',
      status: 'intake',
    };

    const convertedProduct = legacyToNew(incompleteLegacyProduct);
    const result = validateProduct(convertedProduct);

    expect(result).toBeDefined();
    expect(result.issues).toBeDefined();
    expect(result.issues.length).toBeGreaterThan(0);

    // Should have critical issues for missing required fields
    const criticalIssues = result.issues.filter(issue => issue.severity === 'critical');
    expect(criticalIssues.length).toBeGreaterThan(0);

    // Check for specific missing field issues
    const issueCodes = result.issues.map(issue => issue.code);
    expect(issueCodes).toContain('MISSING_MPN');
    expect(issueCodes).toContain('MISSING_BRAND');
    expect(issueCodes).toContain('MISSING_NAME');
  });

  it('should preserve product ID after conversion', () => {
    const legacyProduct = {
      id: 'PRESERVE-ID-TEST',
      mpn: 'MPN-999',
      name: 'ID Preservation Test',
      brand: 'TestBrand',
      status: 'active',
    };

    const convertedProduct = legacyToNew(legacyProduct);

    expect(convertedProduct.id).toBe('PRESERVE-ID-TEST');
  });
});
