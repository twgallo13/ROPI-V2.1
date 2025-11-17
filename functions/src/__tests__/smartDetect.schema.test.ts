/**
 * Smart Detect Schema Test - Verify canonical schema support
 */

import { describe, it, expect } from 'vitest';
import { runSmartDetect } from '../smartDetect';

describe('runSmartDetect - Canonical Schema Support', () => {
  it('should handle product with canonical schema (source.rics.category)', () => {
    const product = {
      sku_core: {
        mpn: 'TEST-001',
        brand: '',
        name: 'Test Shoe',
        department: '',
        class: '',
        category: '',
        styleId: 'TEST-001',
      },
      descriptive: {
        ageGroup: '',
        gender: '',
        material: [],
        primaryColor: '',
        sportsTeam: '',
      },
      source: {
        rics: {
          category: 'M|FTW|BASKETBALL|YOUTH',
          longDescription: 'High-performance leather basketball shoe with mesh panels',
          vendorStyleName: 'Nike Air Jordan Youth',
        },
      },
    };

    const result = runSmartDetect(product);

    expect(result).toBeDefined();
    expect(result.suggestions).toBeDefined();
    expect(Array.isArray(result.suggestions)).toBe(true);
    expect(result.suggestions.length).toBeGreaterThan(0);
  });

  it('should generate suggestions with canonical fieldPaths (sku_core.*, descriptive.*)', () => {
    const product = {
      sku_core: {
        mpn: 'TEST-002',
        brand: '',
        name: 'Test Apparel',
        department: '',
        class: '',
        category: '',
        styleId: 'TEST-002',
      },
      descriptive: {
        ageGroup: '',
        gender: '',
        material: [],
        primaryColor: '',
        sportsTeam: '',
      },
      source: {
        rics: {
          category: 'W|APP|CASUAL|ADULT',
          longDescription: 'Cotton blend casual shirt in blue',
        },
      },
    };

    const result = runSmartDetect(product);

    expect(result).toBeDefined();
    expect(result.suggestions).toBeDefined();
    
    // Check that suggestions use canonical field paths
    const fieldPaths = result.suggestions.map(s => s.fieldPath);
    const hasSkuCoreFields = fieldPaths.some(path => path.startsWith('sku_core.'));
    const hasDescriptiveFields = fieldPaths.some(path => path.startsWith('descriptive.'));
    
    expect(hasSkuCoreFields || hasDescriptiveFields).toBe(true);
  });

  it('should suggest department, class, and ageGroup from RICS category', () => {
    const product = {
      sku_core: {
        mpn: 'TEST-003',
        brand: '',
        name: 'Youth Basketball Shoe',
        department: '',
        class: '',
        category: '',
        styleId: 'TEST-003',
      },
      descriptive: {
        ageGroup: '',
        gender: '',
        material: [],
        primaryColor: '',
      },
      source: {
        rics: {
          category: 'M|FTW|BASKETBALL|YOUTH',
        },
      },
    };

    const result = runSmartDetect(product);

    expect(result).toBeDefined();
    expect(result.suggestions).toBeDefined();
    expect(result.suggestions.length).toBeGreaterThan(0);
    
    // Should suggest department from FTW
    const deptSuggestion = result.suggestions.find(s => s.fieldPath === 'sku_core.department');
    expect(deptSuggestion).toBeDefined();
    expect(deptSuggestion?.suggestedValue).toBe('Footwear');
    expect(deptSuggestion?.confidence).toBeGreaterThan(0.9);
    
    // Should suggest class from BASKETBALL
    const classSuggestion = result.suggestions.find(s => s.fieldPath === 'sku_core.class');
    expect(classSuggestion).toBeDefined();
    expect(classSuggestion?.suggestedValue).toBe('Athletic');
    
    // Should suggest ageGroup from YOUTH
    const ageSuggestion = result.suggestions.find(s => s.fieldPath === 'descriptive.ageGroup');
    expect(ageSuggestion).toBeDefined();
    expect(ageSuggestion?.suggestedValue).toBe('Grade School');
  });

  it('should suggest gender from RICS category first letter', () => {
    const product = {
      sku_core: {
        mpn: 'TEST-004',
        brand: '',
        name: 'Running Shoe',
        department: '',
        class: '',
        category: '',
        styleId: 'TEST-004',
      },
      descriptive: {
        ageGroup: '',
        gender: '',
        material: [],
      },
      source: {
        rics: {
          category: 'W|FTW|RUNNING|ADULT',
        },
      },
    };

    const result = runSmartDetect(product);

    expect(result).toBeDefined();
    
    // Should suggest gender from W (Women's)
    const genderSuggestion = result.suggestions.find(s => s.fieldPath === 'descriptive.gender');
    expect(genderSuggestion).toBeDefined();
    expect(genderSuggestion?.suggestedValue).toBe("Women's");
    expect(genderSuggestion?.confidence).toBeGreaterThan(0.8);
  });

  it('should suggest materials from RICS longDescription', () => {
    const product = {
      sku_core: {
        mpn: 'TEST-005',
        brand: '',
        name: 'Premium Shoe',
        styleId: 'TEST-005',
      },
      descriptive: {
        material: [],
      },
      source: {
        rics: {
          category: 'M|FTW|CASUAL|ADULT',
          longDescription: 'Premium leather upper with mesh inserts and rubber sole',
        },
      },
    };

    const result = runSmartDetect(product);

    expect(result).toBeDefined();
    
    // Should suggest materials from description
    const materialSuggestion = result.suggestions.find(s => s.fieldPath === 'descriptive.material');
    expect(materialSuggestion).toBeDefined();
    expect(Array.isArray(materialSuggestion?.suggestedValue)).toBe(true);
    
    const suggestedMaterials = materialSuggestion?.suggestedValue as string[];
    expect(suggestedMaterials).toContain('Leather');
    expect(suggestedMaterials).toContain('Mesh');
    expect(suggestedMaterials).toContain('Rubber');
  });

  it('should maintain backward compatibility with legacy flat schema', () => {
    const legacyProduct = {
      mpn: 'LEGACY-001',
      brand: '',
      name: 'Legacy Product',
      department: '',
      class: '',
      ageGroup: '',
      gender: '',
      material: [],
      rics: {
        category: 'M|FTW|BASKETBALL|YOUTH',
        longDescription: 'Legacy format product',
      },
    };

    const result = runSmartDetect(legacyProduct);

    expect(result).toBeDefined();
    expect(result.suggestions).toBeDefined();
    expect(Array.isArray(result.suggestions)).toBe(true);
    expect(result.suggestions.length).toBeGreaterThan(0);
    
    // Should still generate canonical field paths even with legacy input
    const fieldPaths = result.suggestions.map(s => s.fieldPath);
    const hasCanonicalPaths = fieldPaths.some(path => 
      path.startsWith('sku_core.') || path.startsWith('descriptive.')
    );
    expect(hasCanonicalPaths).toBe(true);
  });
});
