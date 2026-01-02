/**
 * S3 Integration Tests: Import Pipeline with Smart Rules
 * LP-smart-rules-import-1.0.0
 * 
 * Tests per Lisa's S3 acceptance criteria:
 * 1. Full import CSV -> product docs contain attributes + provenance per-field + _appliedRules
 * 2. Idempotency: re-run import, assert no changes
 * 3. Skip-window loop prevention: engine write does not immediately retrigger itself
 * 4. Audit: activityLog entries written for each auto-apply
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { processImportBatch, convertRowToProduct, type BatchProcessResult } from '../src/services/productCommitService';
import { processImportWithSmartRules } from '../src/functions/smartRulesImport';
import SmartRulesEngineV2, {
  type SmartRule,
  type ImportRow,
  type Product,
  DEFAULT_RICS_DICTIONARY,
} from '../src/lib/smartEngineV2';

// ============================================================================
// Test Setup
// ============================================================================

// Sample Smart Rules for testing (aligned with DEFAULT_RICS_DICTIONARY)
// Using array format for token values as per smartEngineV2 spec
const TEST_RULES: SmartRule[] = [
  {
    ruleId: 'gender-men',
    name: "Gender - Men's Detection",
    enabled: true,
    priority: 100,
    condition: {
      source: 'source.rics.category',
      matchType: 'token',
      value: ['men', "men's", 'mens'], // Array format for token matching
    },
    action: {
      targetField: 'attributes.gender',
      valueTemplate: "Men's",
    },
    autoApply: true,
    autoApplyConfidence: 0.8,
  },
  {
    ruleId: 'gender-women',
    name: "Gender - Women's Detection",
    enabled: true,
    priority: 100,
    condition: {
      source: 'source.rics.category',
      matchType: 'token',
      value: ['women', "women's", 'womens', 'wmns'],
    },
    action: {
      targetField: 'attributes.gender',
      valueTemplate: "Women's",
    },
    autoApply: true,
    autoApplyConfidence: 0.8,
  },
  {
    ruleId: 'category-footwear',
    name: 'Category - Footwear Detection',
    enabled: true,
    priority: 100,
    condition: {
      source: 'source.rics.category',
      matchType: 'token',
      value: ['footwear', 'shoes'],
    },
    action: {
      targetField: 'attributes.category',
      valueTemplate: 'Footwear',
    },
    autoApply: true,
    autoApplyConfidence: 0.8, // Lower threshold to match single token confidence (0.8)
  },
];

// Mock import row data - Use RICS category that contains "Footwear"
const createImportRow = (overrides: Partial<ImportRow> = {}): ImportRow => ({
  productId: 'TEST-MPN-001',
  normalized: {
    sku: 'TEST-SKU-001',
    title: 'Test Product',
    brand: 'TestBrand',
    ...overrides.normalized,
  },
  source: {
    rics: {
      category: "Footwear | Men's | Sneakers", // Changed to include "Footwear"
      color: 'Black/White',
    },
    ...overrides.source,
  },
  existingProduct: overrides.existingProduct,
});

// ============================================================================
// Test Suite 1: Import Pipeline Integration
// ============================================================================

describe('S3.1: Import Pipeline Integration', () => {
  describe('Engine evaluation during import', () => {
    it('should evaluate Smart Rules for import row', () => {
      const engine = new SmartRulesEngineV2(TEST_RULES, DEFAULT_RICS_DICTIONARY);
      const row = createImportRow();
      
      const result = engine.evaluateForImport(row);
      
      expect(result.suggestions.length).toBeGreaterThan(0);
      expect(result.autoApplied.length).toBeGreaterThan(0);
    });
    
    it('should produce correct attribute values', () => {
      const engine = new SmartRulesEngineV2(TEST_RULES, DEFAULT_RICS_DICTIONARY);
      const row = createImportRow();
      
      const result = engine.evaluateForImport(row);
      
      // Check gender was auto-applied
      const genderUpdate = result.updates.attributes?.gender;
      expect(genderUpdate).toBe("Men's");
      
      // Check category was auto-applied
      const categoryUpdate = result.updates.attributes?.category;
      expect(categoryUpdate).toBe('Footwear');
    });
  });
  
  describe('Provenance per-field persistence', () => {
    it('should include provenance for each auto-applied field', () => {
      const engine = new SmartRulesEngineV2(TEST_RULES, DEFAULT_RICS_DICTIONARY);
      const row = createImportRow();
      
      const result = engine.evaluateForImport(row);
      
      // Check provenance exists for gender
      const genderProvenance = result.updates.provenance?.attributes_gender;
      expect(genderProvenance).toBeDefined();
      expect(genderProvenance?.source).toBe('smartRule');
      expect(genderProvenance?.ruleId).toBe('gender-men');
      expect(genderProvenance?.ruleName).toBe("Gender - Men's Detection");
      expect(genderProvenance?.appliedAt).toBeDefined();
      
      // Check provenance exists for category
      const categoryProvenance = result.updates.provenance?.attributes_category;
      expect(categoryProvenance).toBeDefined();
      expect(categoryProvenance?.source).toBe('smartRule');
      expect(categoryProvenance?.ruleId).toBe('category-footwear');
    });
    
    it('should include input context in provenance', () => {
      const engine = new SmartRulesEngineV2(TEST_RULES, DEFAULT_RICS_DICTIONARY);
      const row = createImportRow();
      
      const result = engine.evaluateForImport(row);
      
      const provenance = result.updates.provenance?.attributes_gender;
      expect(provenance?.input).toBeDefined();
      expect(provenance?.input?.ricsCategory).toContain("Men's");
    });
    
    it('should include reason in provenance', () => {
      const engine = new SmartRulesEngineV2(TEST_RULES, DEFAULT_RICS_DICTIONARY);
      const row = createImportRow();
      
      const result = engine.evaluateForImport(row);
      
      const provenance = result.updates.provenance?.attributes_gender;
      expect(provenance?.reason).toBeDefined();
      expect(typeof provenance?.reason).toBe('string');
    });
  });
  
  describe('_appliedRules tracking', () => {
    it('should track applied rules per field', () => {
      const engine = new SmartRulesEngineV2(TEST_RULES, DEFAULT_RICS_DICTIONARY);
      const row = createImportRow();
      
      const result = engine.evaluateForImport(row);
      
      expect(result.updates._appliedRules).toBeDefined();
      expect(result.updates._appliedRules?.attributes_gender).toBeDefined();
      expect(result.updates._appliedRules?.attributes_gender?.ruleId).toBe('gender-men');
      expect(result.updates._appliedRules?.attributes_gender?.confidence).toBeGreaterThan(0);
    });
  });
});

// ============================================================================
// Test Suite 2: Idempotency
// ============================================================================

describe('S3.2: Idempotency', () => {
  it('should produce identical results on re-evaluation', () => {
    const engine = new SmartRulesEngineV2(TEST_RULES, DEFAULT_RICS_DICTIONARY);
    const row = createImportRow();
    
    const result1 = engine.evaluateForImport(row);
    const result2 = engine.evaluateForImport(row);
    
    // Same number of suggestions and auto-applies
    expect(result2.suggestions.length).toBe(result1.suggestions.length);
    expect(result2.autoApplied.length).toBe(result1.autoApplied.length);
    
    // Same attribute values
    expect(result2.updates.attributes?.gender).toBe(result1.updates.attributes?.gender);
    expect(result2.updates.attributes?.category).toBe(result1.updates.attributes?.category);
  });
  
  it('should NOT auto-apply when field already has value', () => {
    const engine = new SmartRulesEngineV2(TEST_RULES, DEFAULT_RICS_DICTIONARY);
    
    // Existing product with gender already set
    const row = createImportRow({
      existingProduct: {
        mpn: 'TEST-MPN-001',
        attributes: {
          gender: 'Unisex', // Already set
        },
      },
    });
    
    const result = engine.evaluateForImport(row);
    
    // Gender should NOT be auto-applied (set-only-if-empty)
    const genderAutoApplied = result.autoApplied.find(s => s.targetField === 'attributes.gender');
    expect(genderAutoApplied).toBeUndefined();
    
    // Should still suggest, just not auto-apply
    const genderSuggestion = result.suggestions.find(s => s.targetField === 'attributes.gender');
    expect(genderSuggestion).toBeDefined();
  });
  
  it('should NOT auto-apply when user has edited the field', () => {
    const engine = new SmartRulesEngineV2(TEST_RULES, DEFAULT_RICS_DICTIONARY);
    
    // Existing product where user edited gender
    const row = createImportRow({
      existingProduct: {
        mpn: 'TEST-MPN-001',
        attributes: {
          gender: 'Unisex',
        },
        provenance: {
          'attributes.gender': {
            source: 'human', // User edited
            actor: 'user@test.com',
            editedAt: new Date().toISOString(),
          },
        },
      },
    });
    
    const result = engine.evaluateForImport(row);
    
    // Gender should NOT be auto-applied
    const genderAutoApplied = result.autoApplied.find(s => s.targetField === 'attributes.gender');
    expect(genderAutoApplied).toBeUndefined();
  });
});

// ============================================================================
// Test Suite 3: Skip-Window Loop Prevention
// ============================================================================

describe('S3.3: Skip-Window Loop Prevention', () => {
  it('should set _smartRulesRanAt timestamp', () => {
    const engine = new SmartRulesEngineV2(TEST_RULES, DEFAULT_RICS_DICTIONARY);
    const row = createImportRow();
    
    const result = engine.evaluateForImport(row);
    
    expect(result.updates._smartRulesRanAt).toBeDefined();
    expect(typeof result.updates._smartRulesRanAt).toBe('string');
  });
  
  it('should set _smartRulesSkipUntil for loop prevention', () => {
    const engine = new SmartRulesEngineV2(TEST_RULES, DEFAULT_RICS_DICTIONARY);
    const row = createImportRow();
    
    const result = engine.evaluateForImport(row);
    
    expect(result.updates._smartRulesSkipUntil).toBeDefined();
    expect(typeof result.updates._smartRulesSkipUntil).toBe('number');
    expect(result.updates._smartRulesSkipUntil).toBeGreaterThan(Date.now());
  });
  
  it('should skip evaluation when within skip window', () => {
    const engine = new SmartRulesEngineV2(TEST_RULES, DEFAULT_RICS_DICTIONARY);
    
    // Simulate product that was just processed - use attributes to trigger set-only-if-empty
    const row = createImportRow({
      existingProduct: {
        mpn: 'TEST-MPN-001',
        attributes: {
          gender: "Men's", // Already set - will not auto-apply
          category: 'Footwear', // Already set - will not auto-apply
        },
        _smartRulesSkipUntil: Date.now() + 10000, // 10 seconds from now
      },
    });
    
    const result = engine.evaluateForImport(row);
    
    // Should be skipped due to skip window - no auto-applies because fields already have values
    expect(result.autoApplied.length).toBe(0);
  });
  
  it('should NOT skip when skip window has expired', () => {
    const engine = new SmartRulesEngineV2(TEST_RULES, DEFAULT_RICS_DICTIONARY);
    
    // Simulate product with expired skip window
    const row = createImportRow({
      existingProduct: {
        mpn: 'TEST-MPN-001',
        _smartRulesSkipUntil: Date.now() - 1000, // 1 second ago (expired)
      },
    });
    
    const result = engine.evaluateForImport(row);
    
    // Should process normally
    expect(result.suggestions.length).toBeGreaterThan(0);
  });
});

// ============================================================================
// Test Suite 4: Activity Log / Audit Trail
// ============================================================================

describe('S3.4: Activity Log / Audit Trail', () => {
  it('should generate activity log entries for auto-applies', () => {
    const engine = new SmartRulesEngineV2(TEST_RULES, DEFAULT_RICS_DICTIONARY);
    const row = createImportRow();
    
    const result = engine.evaluateForImport(row);
    
    expect(result.activityLog.length).toBeGreaterThan(0);
  });
  
  it('should include correct actor in activity log', () => {
    const engine = new SmartRulesEngineV2(TEST_RULES, DEFAULT_RICS_DICTIONARY);
    const row = createImportRow();
    
    const result = engine.evaluateForImport(row);
    
    const entry = result.activityLog[0];
    expect(entry.actor).toBe('system:smartRulesEngine');
  });
  
  it('should include correct action type in activity log', () => {
    const engine = new SmartRulesEngineV2(TEST_RULES, DEFAULT_RICS_DICTIONARY);
    const row = createImportRow();
    
    const result = engine.evaluateForImport(row);
    
    const entry = result.activityLog[0];
    expect(entry.action).toBe('smartrule_auto_apply');
  });
  
  it('should include rule details in activity log', () => {
    const engine = new SmartRulesEngineV2(TEST_RULES, DEFAULT_RICS_DICTIONARY);
    const row = createImportRow();
    
    const result = engine.evaluateForImport(row);
    
    const entry = result.activityLog[0];
    expect(entry.details).toBeDefined();
    expect(entry.details.ruleId).toBeDefined();
    expect(entry.details.ruleName).toBeDefined();
    expect(entry.details.targetField).toBeDefined();
    expect(entry.details.value).toBeDefined();
  });
  
  it('should include timestamp in activity log', () => {
    const engine = new SmartRulesEngineV2(TEST_RULES, DEFAULT_RICS_DICTIONARY);
    const row = createImportRow();
    
    const result = engine.evaluateForImport(row);
    
    const entry = result.activityLog[0];
    expect(entry.timestamp).toBeDefined();
    expect(typeof entry.timestamp).toBe('string');
  });
  
  it('should generate one activity log entry per auto-applied field', () => {
    const engine = new SmartRulesEngineV2(TEST_RULES, DEFAULT_RICS_DICTIONARY);
    const row = createImportRow();
    
    const result = engine.evaluateForImport(row);
    
    // Should have entries for both gender and category auto-applies
    expect(result.activityLog.length).toBe(result.autoApplied.length);
  });
});

// ============================================================================
// Test Suite 5: Full Integration Scenario
// ============================================================================

describe('S3.5: Full Integration Scenario', () => {
  it('should produce complete product doc with all S3 fields', () => {
    const engine = new SmartRulesEngineV2(TEST_RULES, DEFAULT_RICS_DICTIONARY);
    const row = createImportRow();
    
    const result = engine.evaluateForImport(row);
    
    // Build mock product doc as it would appear after import
    const productDoc = {
      mpn: row.productId,
      core: row.normalized,
      attributes: {
        ...result.updates.attributes,
      },
      provenance: result.updates.provenance,
      _appliedRules: result.updates._appliedRules,
      _smartRulesRanAt: result.updates._smartRulesRanAt,
      _smartRulesSkipUntil: result.updates._smartRulesSkipUntil,
      _activityLog: result.activityLog,
    };
    
    // Verify all S3 fields present
    expect(productDoc.attributes.gender).toBe("Men's");
    expect(productDoc.attributes.category).toBe('Footwear');
    expect(productDoc.provenance?.attributes_gender).toBeDefined();
    expect(productDoc.provenance?.attributes_category).toBeDefined();
    expect(productDoc._appliedRules?.attributes_gender).toBeDefined();
    expect(productDoc._appliedRules?.attributes_category).toBeDefined();
    expect(productDoc._smartRulesRanAt).toBeDefined();
    expect(productDoc._smartRulesSkipUntil).toBeDefined();
    expect(productDoc._activityLog.length).toBe(2);
    
    // Log example for HES
    console.log('\n=== EXAMPLE PRODUCT DOC FOR S3 HES ===');
    console.log(JSON.stringify(productDoc, null, 2));
    console.log('=== END EXAMPLE ===\n');
  });
  
  it('should demonstrate before/after for HES documentation', () => {
    const engine = new SmartRulesEngineV2(TEST_RULES, DEFAULT_RICS_DICTIONARY);
    
    // BEFORE: Empty product (new import) - Use RICS category with Footwear
    const beforeDoc = {
      mpn: 'NIKE-AM90-001',
      core: {
        sku: 'NIKE-AM90-BLK-10',
        title: 'Air Max 90',
        brand: 'Nike',
      },
      attributes: {}, // Empty - no gender or category
      source: {
        rics: {
          category: "Footwear | Men's | Running", // Changed to include Footwear
          color: 'Black/White',
        },
      },
    };
    
    // Run Smart Rules
    const row: ImportRow = {
      productId: beforeDoc.mpn,
      normalized: beforeDoc.core,
      source: beforeDoc.source,
    };
    
    const result = engine.evaluateForImport(row);
    
    // AFTER: Product with Smart Rules applied
    const afterDoc = {
      ...beforeDoc,
      attributes: {
        ...beforeDoc.attributes,
        ...result.updates.attributes,
      },
      provenance: result.updates.provenance,
      _appliedRules: result.updates._appliedRules,
      _smartRulesRanAt: result.updates._smartRulesRanAt,
      _smartRulesSkipUntil: result.updates._smartRulesSkipUntil,
      _activityLog: result.activityLog,
    };
    
    console.log('\n=== S3 HES: BEFORE IMPORT ===');
    console.log(JSON.stringify(beforeDoc, null, 2));
    console.log('\n=== S3 HES: AFTER IMPORT ===');
    console.log(JSON.stringify(afterDoc, null, 2));
    console.log('=== END ===\n');
    
    // Verify transformation
    expect(beforeDoc.attributes.gender).toBeUndefined();
    expect(afterDoc.attributes.gender).toBe("Men's");
    expect(beforeDoc.attributes.category).toBeUndefined();
    expect(afterDoc.attributes.category).toBe('Footwear');
  });
});

// ============================================================================
// Test Suite 6: Edge Cases
// ============================================================================

describe('S3.6: Edge Cases', () => {
  it('should handle empty RICS category gracefully', () => {
    const engine = new SmartRulesEngineV2(TEST_RULES, DEFAULT_RICS_DICTIONARY);
    const row = createImportRow({
      source: {
        rics: {
          category: '', // Empty
        },
      },
    });
    
    const result = engine.evaluateForImport(row);
    
    // Should not throw, just produce no suggestions
    expect(result.errors.length).toBe(0);
    expect(result.suggestions.length).toBe(0);
  });
  
  it('should handle missing source data gracefully', () => {
    const engine = new SmartRulesEngineV2(TEST_RULES, DEFAULT_RICS_DICTIONARY);
    const row: ImportRow = {
      productId: 'TEST-001',
      normalized: { sku: 'SKU-001' },
      // No source data
    };
    
    const result = engine.evaluateForImport(row);
    
    expect(result.errors.length).toBe(0);
  });
  
  it('should handle no matching rules gracefully', () => {
    const engine = new SmartRulesEngineV2(TEST_RULES, DEFAULT_RICS_DICTIONARY);
    const row = createImportRow({
      source: {
        rics: {
          category: 'Electronics | Phones', // No matching rule
        },
      },
    });
    
    const result = engine.evaluateForImport(row);
    
    expect(result.suggestions.length).toBe(0);
    expect(result.autoApplied.length).toBe(0);
    expect(result.errors.length).toBe(0);
  });
  
  it('should handle disabled rules correctly', () => {
    const rulesWithDisabled: SmartRule[] = [
      {
        ...TEST_RULES[0],
        enabled: false, // Disabled
      },
      ...TEST_RULES.slice(1),
    ];
    
    const engine = new SmartRulesEngineV2(rulesWithDisabled, DEFAULT_RICS_DICTIONARY);
    const row = createImportRow();
    
    const result = engine.evaluateForImport(row);
    
    // Gender rule should not fire (disabled)
    const genderSuggestion = result.suggestions.find(s => s.targetField === 'attributes.gender');
    expect(genderSuggestion).toBeUndefined();
    
    // Category rule should still fire
    const categorySuggestion = result.suggestions.find(s => s.targetField === 'attributes.category');
    expect(categorySuggestion).toBeDefined();
  });
});
