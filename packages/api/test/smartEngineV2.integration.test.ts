/**
 * Smart Rules Engine V2 - Integration Tests
 * LP-smart-rules-engine-1.0.0
 * 
 * Integration tests for:
 * - Import pipeline end-to-end
 * - Idempotency verification (re-import same data → no changes)
 * - Conflict scenarios with _smartConflicts persistence
 * - Provenance persistence
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import SmartRulesEngineV2, {
  type SmartRule,
  type ImportRow,
  type Product,
  type EngineResult,
  type Conflict,
  deepGet,
} from '../src/lib/smartEngineV2';
import {
  processSmartRulesForRow,
  processSmartRulesForBatch,
  type SmartRulesImportResult,
} from '../src/functions/smartRulesImport';

// ============================================================================
// Mock Data Setup
// ============================================================================

function createTestRules(): SmartRule[] {
  return [
    {
      ruleId: 'gender-men',
      name: 'Gender - Men Detection',
      enabled: true,
      priority: 100,
      condition: {
        source: 'source.rics.category',
        matchType: 'token',
        value: ['men', "men's", 'mens'],
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
      name: 'Gender - Women Detection',
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
      priority: 90,
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
      autoApplyConfidence: 0.8,
    },
    {
      ruleId: 'subcategory-sneakers',
      name: 'Subcategory - Sneakers Detection',
      enabled: true,
      priority: 80,
      condition: {
        source: 'source.rics.category',
        matchType: 'token',
        value: ['sneakers', 'sneaker'],
      },
      action: {
        targetField: 'attributes.subcategory',
        valueTemplate: 'Sneakers',
      },
      autoApply: true,
      autoApplyConfidence: 0.8,
    },
  ];
}

function createTestImportRow(overrides: Partial<ImportRow> = {}): ImportRow {
  return {
    productId: 'TEST-MPN-001',
    normalized: {},
    source: {
      rics: {
        category: "Footwear | Men's | Sneakers",
        color: 'Black/White',
        shortDescription: 'Nike Air Max 90',
      },
    },
    ...overrides,
  };
}

// ============================================================================
// Integration Test: Import Pipeline End-to-End
// ============================================================================

describe('Integration: Import Pipeline End-to-End', () => {
  let rules: SmartRule[];
  let engine: SmartRulesEngineV2;
  
  beforeEach(() => {
    rules = createTestRules();
    engine = new SmartRulesEngineV2(rules);
  });
  
  it('should process import row and produce suggestions + auto-applies', () => {
    const importRow = createTestImportRow();
    
    const result = engine.evaluateForImport(importRow);
    
    // Should have suggestions
    expect(result.suggestions.length).toBeGreaterThan(0);
    
    // Should have auto-applied (since all rules have autoApply: true)
    expect(result.autoApplied.length).toBeGreaterThan(0);
    
    // Should have updates to apply
    expect(Object.keys(result.updates).length).toBeGreaterThan(0);
    
    // Should include the gender field (using deepGet for nested structure)
    expect(deepGet(result.updates, 'attributes.gender')).toBe("Men's");
    
    // Should include provenance
    expect(deepGet(result.updates, 'provenance.attributes_gender')).toBeDefined();
  });
  
  it('should update product doc with provenance and attribute values', () => {
    const importRow = createTestImportRow();
    
    const result = engine.evaluateForImport(importRow);
    
    // Simulate applying updates to product
    const productDoc: Record<string, unknown> = {
      mpn: 'TEST-MPN-001',
      attributes: {},
    };
    
    // Apply updates
    for (const [key, value] of Object.entries(result.updates)) {
      if (key.includes('.')) {
        const parts = key.split('.');
        let current: any = productDoc;
        for (let i = 0; i < parts.length - 1; i++) {
          if (!(parts[i] in current)) {
            current[parts[i]] = {};
          }
          current = current[parts[i]];
        }
        current[parts[parts.length - 1]] = value;
      } else {
        productDoc[key] = value;
      }
    }
    
    // Verify attribute was set
    expect((productDoc as any).attributes.gender).toBe("Men's");
    
    // Verify provenance was set
    expect((productDoc as any).provenance.attributes_gender).toBeDefined();
    expect((productDoc as any).provenance.attributes_gender.source).toBe('smartRule');
    expect((productDoc as any).provenance.attributes_gender.ruleId).toBe('gender-men');
    
    // Verify _appliedRules tracking
    expect((productDoc as any)._appliedRules.attributes_gender).toBeDefined();
    expect((productDoc as any)._appliedRules.attributes_gender.ruleId).toBe('gender-men');
  });
  
  it('should handle multiple rules triggering for same import row', () => {
    const importRow = createTestImportRow();
    
    const result = engine.evaluateForImport(importRow);
    
    // Should have suggestions from multiple rules
    const ruleIds = new Set(result.suggestions.map(s => s.ruleId));
    expect(ruleIds.size).toBeGreaterThan(1);
    
    // Should have gender, category, and subcategory
    const targetFields = new Set(result.suggestions.map(s => s.targetField));
    expect(targetFields.has('attributes.gender')).toBe(true);
    expect(targetFields.has('attributes.category')).toBe(true);
    expect(targetFields.has('attributes.subcategory')).toBe(true);
  });
});

// ============================================================================
// Integration Test: Idempotency (Re-import produces same result)
// ============================================================================

describe('Integration: Idempotency', () => {
  let rules: SmartRule[];
  let engine: SmartRulesEngineV2;
  
  beforeEach(() => {
    rules = createTestRules();
    engine = new SmartRulesEngineV2(rules);
  });
  
  it('should produce identical results on re-evaluation', () => {
    const importRow = createTestImportRow();
    
    const result1 = engine.evaluateForImport(importRow);
    const result2 = engine.evaluateForImport(importRow);
    
    // Same number of suggestions
    expect(result1.suggestions.length).toBe(result2.suggestions.length);
    
    // Same target fields
    const fields1 = result1.suggestions.map(s => s.targetField).sort();
    const fields2 = result2.suggestions.map(s => s.targetField).sort();
    expect(fields1).toEqual(fields2);
    
    // Same values
    const values1 = result1.suggestions.map(s => ({ field: s.targetField, value: s.value }));
    const values2 = result2.suggestions.map(s => ({ field: s.targetField, value: s.value }));
    expect(values1).toEqual(values2);
  });
  
  it('should NOT auto-apply on re-import when field already has value', () => {
    const importRow = createTestImportRow();
    
    // First import - should auto-apply
    const result1 = engine.evaluateForImport(importRow);
    expect(result1.autoApplied.length).toBeGreaterThan(0);
    
    // Simulate product now has values
    const existingProduct: Product = {
      mpn: 'TEST-MPN-001',
      attributes: {
        gender: "Men's",
        category: 'Footwear',
        subcategory: 'Sneakers',
      },
      _appliedRules: {
        attributes_gender: {
          ruleId: 'gender-men',
          confidence: 0.9,
          appliedAt: new Date().toISOString(),
        },
      },
    };
    
    const importRowWithExisting: ImportRow = {
      ...importRow,
      existingProduct,
    };
    
    // Re-import - should NOT auto-apply (fields already have values)
    const result2 = engine.evaluateForImport(importRowWithExisting);
    
    // Should still produce suggestions
    expect(result2.suggestions.length).toBeGreaterThan(0);
    
    // But should NOT auto-apply (set only if empty)
    expect(result2.autoApplied.length).toBe(0);
    
    // Suggestions should indicate they won't auto-apply
    for (const suggestion of result2.suggestions) {
      expect(suggestion.autoApply).toBe(false);
    }
  });
  
  it('should skip evaluation when within skip window', () => {
    const existingProduct: Product = {
      mpn: 'TEST-MPN-001',
      attributes: {},
      _smartRulesSkipUntil: Date.now() + 60000, // 1 minute in the future
    };
    
    const importRow: ImportRow = {
      ...createTestImportRow(),
      existingProduct,
    };
    
    const result = processSmartRulesForRow(importRow, rules, []);
    
    expect(result.skipped).toBe(true);
    expect(result.skipReason).toContain('skip window');
    expect(result.suggestionsCount).toBe(0);
  });
});

// ============================================================================
// Integration Test: Conflict Scenarios
// ============================================================================

describe('Integration: Conflict Scenarios', () => {
  it('should detect and store conflicts when rules propose different values', () => {
    // Create conflicting rules
    const conflictingRules: SmartRule[] = [
      {
        ruleId: 'rule-men',
        name: 'Gender - Men',
        enabled: true,
        priority: 100,
        condition: {
          source: 'source.rics.category',
          matchType: 'contains',
          value: 'Athletic',
        },
        action: {
          targetField: 'attributes.gender',
          valueTemplate: "Men's",
        },
        autoApply: false, // Don't auto-apply to allow conflict detection
        autoApplyConfidence: 0.9,
      },
      {
        ruleId: 'rule-unisex',
        name: 'Gender - Unisex for Athletic',
        enabled: true,
        priority: 90,
        condition: {
          source: 'source.rics.category',
          matchType: 'contains',
          value: 'Running',
        },
        action: {
          targetField: 'attributes.gender',
          valueTemplate: 'Unisex',
        },
        autoApply: false,
        autoApplyConfidence: 0.9,
      },
    ];
    
    const engine = new SmartRulesEngineV2(conflictingRules);
    
    const importRow: ImportRow = {
      productId: 'TEST-CONFLICT-001',
      normalized: {},
      source: {
        rics: {
          category: 'Footwear | Athletic | Running',
        },
      },
    };
    
    const result = engine.evaluateForImport(importRow);
    
    // Should have 2 suggestions for same field
    expect(result.suggestions.length).toBe(2);
    expect(result.suggestions.every(s => s.targetField === 'attributes.gender')).toBe(true);
    
    // Should have 1 conflict
    expect(result.conflicts.length).toBe(1);
    
    const conflict = result.conflicts[0];
    expect(conflict.field).toBe('attributes.gender');
    expect(conflict.candidates.length).toBe(2);
    expect(conflict.resolved).toBe(false);
    expect(conflict.suggestedResolution).toBe('highest_priority');
    
    // Should store conflict in updates
    expect(result.updates._smartConflicts).toBeDefined();
    expect((result.updates._smartConflicts as Conflict[]).length).toBe(1);
  });
  
  it('should include conflict candidate priorities', () => {
    const conflictingRules: SmartRule[] = [
      {
        ruleId: 'high-pri',
        name: 'High Priority',
        enabled: true,
        priority: 200,
        condition: {
          source: 'source.rics.category',
          matchType: 'exists',
          value: true,
        },
        action: {
          targetField: 'attributes.category',
          valueTemplate: 'Footwear', // Use valid enum value
        },
        autoApply: false,
        autoApplyConfidence: 0.9,
      },
      {
        ruleId: 'low-pri',
        name: 'Low Priority',
        enabled: true,
        priority: 50,
        condition: {
          source: 'source.rics.category',
          matchType: 'exists',
          value: true,
        },
        action: {
          targetField: 'attributes.category',
          valueTemplate: 'Apparel', // Use different valid enum value
        },
        autoApply: false,
        autoApplyConfidence: 0.9,
      },
    ];
    
    const engine = new SmartRulesEngineV2(conflictingRules);
    
    const importRow: ImportRow = {
      productId: 'TEST-PRIORITY-001',
      normalized: {},
      source: { rics: { category: 'Anything' } },
    };
    
    const result = engine.evaluateForImport(importRow);
    
    expect(result.conflicts.length).toBe(1);
    
    const conflict = result.conflicts[0];
    const highPriCandidate = conflict.candidates.find(c => c.ruleId === 'high-pri');
    const lowPriCandidate = conflict.candidates.find(c => c.ruleId === 'low-pri');
    
    expect(highPriCandidate?.priority).toBe(200);
    expect(lowPriCandidate?.priority).toBe(50);
  });
});

// ============================================================================
// Integration Test: Provenance Persistence
// ============================================================================

describe('Integration: Provenance Persistence', () => {
  let rules: SmartRule[];
  let engine: SmartRulesEngineV2;
  
  beforeEach(() => {
    rules = createTestRules();
    engine = new SmartRulesEngineV2(rules);
  });
  
  it('should generate provenance structure per Lisa\'s S2.4 spec', () => {
    const importRow = createTestImportRow();
    
    const result = engine.evaluateForImport(importRow);
    
    // Find gender provenance (using deepGet for nested structure)
    const provenance = deepGet(result.updates, 'provenance.attributes_gender') as any;
    
    expect(provenance).toBeDefined();
    
    // Verify structure matches S2.4 spec
    expect(provenance.source).toBe('smartRule');
    expect(provenance.ruleId).toBe('gender-men');
    expect(provenance.ruleName).toBe('Gender - Men Detection');
    expect(provenance.appliedAt).toBeDefined();
    expect(typeof provenance.appliedAt).toBe('string');
    
    // Input context
    expect(provenance.input).toBeDefined();
    expect(provenance.input.ricsCategory).toBe("Footwear | Men's | Sneakers");
    
    // Reason
    expect(provenance.reason).toBeDefined();
    expect(typeof provenance.reason).toBe('string');
  });
  
  it('should generate provenance for all auto-applied fields', () => {
    const importRow = createTestImportRow();
    
    const result = engine.evaluateForImport(importRow);
    
    // Should have provenance for each auto-applied suggestion
    for (const suggestion of result.autoApplied) {
      const provenanceKey = `provenance.${suggestion.targetField.replace(/\./g, '_')}`;
      expect(deepGet(result.updates, provenanceKey)).toBeDefined();
    }
  });
});

// ============================================================================
// Integration Test: Activity Audit Trail
// ============================================================================

describe('Integration: Activity Audit Trail', () => {
  let rules: SmartRule[];
  let engine: SmartRulesEngineV2;
  
  beforeEach(() => {
    rules = createTestRules();
    engine = new SmartRulesEngineV2(rules);
  });
  
  it('should generate activity log entries for each auto-apply', () => {
    const importRow = createTestImportRow();
    
    const result = engine.evaluateForImport(importRow);
    
    // Should have activity log entries
    expect(result.activityLog.length).toBe(result.autoApplied.length);
    
    for (const entry of result.activityLog) {
      expect(entry.actor).toBe('system:smartRulesEngine');
      expect(entry.action).toBe('smartrule_auto_apply');
      expect(entry.timestamp).toBeDefined();
      expect(entry.details.ruleId).toBeDefined();
      expect(entry.details.targetField).toBeDefined();
      expect(entry.details.value).toBeDefined();
    }
  });
  
  it('should include rule details in activity log', () => {
    const importRow = createTestImportRow();
    
    const result = engine.evaluateForImport(importRow);
    
    // Find gender activity entry
    const genderEntry = result.activityLog.find(
      e => e.details.targetField === 'attributes.gender'
    );
    
    expect(genderEntry).toBeDefined();
    expect(genderEntry!.details.ruleId).toBe('gender-men');
    expect(genderEntry!.details.ruleName).toBe('Gender - Men Detection');
    expect(genderEntry!.details.value).toBe("Men's");
    expect(genderEntry!.details.confidence).toBeGreaterThan(0);
  });
});

// ============================================================================
// Integration Test: Batch Processing
// ============================================================================

describe('Integration: Batch Processing', () => {
  it('should process multiple import rows efficiently', () => {
    const rules = createTestRules();
    
    // Create 10 import rows
    const importRows: ImportRow[] = [];
    for (let i = 0; i < 10; i++) {
      importRows.push({
        productId: `TEST-MPN-${String(i).padStart(3, '0')}`,
        normalized: {},
        source: {
          rics: {
            category: i % 2 === 0 
              ? "Footwear | Men's | Sneakers" 
              : "Apparel | Women's | T-Shirts",
          },
        },
      });
    }
    
    // Process all rows
    const results: SmartRulesImportResult[] = [];
    for (const row of importRows) {
      const result = processSmartRulesForRow(row, rules, []);
      results.push(result);
    }
    
    // All should be processed (not skipped)
    expect(results.every(r => !r.skipped)).toBe(true);
    
    // Each should have suggestions
    expect(results.every(r => r.suggestionsCount > 0)).toBe(true);
    
    // Even rows should have Men's gender
    const evenResults = results.filter((_, i) => i % 2 === 0);
    // Odd rows should have Women's gender (if we had women detection - for now they won't match)
    const oddResults = results.filter((_, i) => i % 2 !== 0);
    
    // Even rows should match Men's
    expect(evenResults.every(r => r.autoAppliedCount > 0)).toBe(true);
  });
});

// ============================================================================
// Example Product Doc JSON (for HES)
// ============================================================================

describe('HES Example: Product Doc with Provenance', () => {
  it('should produce example product doc for HES documentation', () => {
    const rules = createTestRules();
    const engine = new SmartRulesEngineV2(rules);
    
    const importRow: ImportRow = {
      productId: 'NIKE-AM90-001',
      normalized: {
        brand: 'Nike',
        name: 'Air Max 90',
        sku: 'NIKE-AM90-BLK-10',
      },
      source: {
        rics: {
          category: "Footwear | Men's | Athletic | Running",
          color: 'Black/White',
          shortDescription: 'Nike Air Max 90 Black/White',
        },
      },
    };
    
    const result = engine.evaluateForImport(importRow);
    
    // Build example product doc using deepGet for nested updates
    const productDoc = {
      mpn: 'NIKE-AM90-001',
      core: {
        sku: 'NIKE-AM90-BLK-10',
        title: 'Air Max 90',
        brand: 'Nike',
      },
      attributes: {
        gender: deepGet(result.updates, 'attributes.gender'),
        category: deepGet(result.updates, 'attributes.category'),
        subcategory: deepGet(result.updates, 'attributes.subcategory'),
      },
      source: importRow.source,
      provenance: {
        'attributes.gender': deepGet(result.updates, 'provenance.attributes_gender'),
        'attributes.category': deepGet(result.updates, 'provenance.attributes_category'),
        'attributes.subcategory': deepGet(result.updates, 'provenance.attributes_subcategory'),
      },
      _appliedRules: {
        attributes_gender: deepGet(result.updates, '_appliedRules.attributes_gender'),
        attributes_category: deepGet(result.updates, '_appliedRules.attributes_category'),
        attributes_subcategory: deepGet(result.updates, '_appliedRules.attributes_subcategory'),
      },
      _smartRulesRanAt: result.updates._smartRulesRanAt,
      _activityLog: result.activityLog,
    };
    
    // Log for HES documentation
    console.log('\n=== EXAMPLE PRODUCT DOC FOR HES ===');
    console.log(JSON.stringify(productDoc, null, 2));
    console.log('=== END EXAMPLE ===\n');
    
    // Verify structure
    expect(productDoc.provenance['attributes.gender']).toBeDefined();
    expect((productDoc.provenance['attributes.gender'] as any).source).toBe('smartRule');
    expect(productDoc._activityLog.length).toBeGreaterThan(0);
  });
});
