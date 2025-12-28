/**
 * Smart Rules Engine - Domain Validation Tests
 * LP-smart-rules-3.1.0
 * 
 * Tests that the Smart Rules Engine validates generated values
 * against the attribute registry domain constraints.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import SmartRulesEngine, {
  validateGeneratedValue,
  type SmartRule,
  type Product,
} from '../src/lib/smartEngine';
import type { AttributeDefinition } from '../src/services/attributeValidator';

// ============================================================================
// Mock Registry Setup
// ============================================================================

function createMockRegistry(): Map<string, AttributeDefinition> {
  const registry = new Map<string, AttributeDefinition>();
  
  // Gender attribute with enum constraint
  registry.set('gender', {
    id: 'gender',
    attribute_id: 'gender',
    label: 'Gender',
    data_type: 'enum',
    allowed_values: ["Men's", "Women's", "Unisex", "Kids"],
    synonyms: {
      "mens": "Men's",
      "womens": "Women's",
    },
    import: true,
  });
  
  // Primary Color attribute with enum constraint
  registry.set('primaryColor', {
    id: 'primaryColor',
    attribute_id: 'primaryColor',
    label: 'Primary Color',
    data_type: 'enum',
    allowed_values: ['Black', 'White', 'Blue', 'Red', 'Green'],
    import: true,
  });
  
  // Category attribute without enum constraint (any value allowed)
  registry.set('category', {
    id: 'category',
    attribute_id: 'category',
    label: 'Category',
    data_type: 'string', // Not enum, so no validation
    import: true,
  });
  
  return registry;
}

// ============================================================================
// Helper Functions
// ============================================================================

function createTestProduct(mpn: string = 'TEST-MPN-001'): Product {
  return {
    mpn,
    attributes: {},
    source: {
      rics: {
        category: 'Footwear | Men | Sneakers',
        color: 'BLK',
      },
    },
  };
}

function createTestRule(overrides: Partial<SmartRule> = {}): SmartRule {
  return {
    ruleId: 'test-rule-001',
    name: 'Test Rule',
    enabled: true,
    priority: 100,
    condition: {
      source: 'source.rics.category',
      matchType: 'contains',
      value: 'Men',
    },
    action: {
      targetField: 'attributes.gender',
      valueTemplate: "Men's",
    },
    autoApply: true,
    autoApplyConfidence: 0.8,
    ...overrides,
  };
}

// ============================================================================
// validateGeneratedValue Unit Tests
// ============================================================================

describe('validateGeneratedValue', () => {
  let registry: Map<string, AttributeDefinition>;
  
  beforeEach(() => {
    registry = createMockRegistry();
  });
  
  it('should accept valid enum value', () => {
    const result = validateGeneratedValue('attributes.gender', "Men's", registry);
    expect(result.valid).toBe(true);
    expect(result.normalizedValue).toBe("Men's");
  });
  
  it('should accept valid enum value with case normalization', () => {
    const result = validateGeneratedValue('attributes.gender', "mens", registry);
    expect(result.valid).toBe(true);
    expect(result.normalizedValue).toBe("Men's"); // Normalized via synonym
  });
  
  it('should reject invalid enum value', () => {
    const result = validateGeneratedValue('attributes.gender', 'Martian', registry);
    expect(result.valid).toBe(false);
    expect(result.normalizedValue).toBeNull();
    expect(result.reason).toContain('Martian');
    expect(result.reason).toContain('not in allowed values');
  });
  
  it('should allow any value for non-enum attributes', () => {
    const result = validateGeneratedValue('attributes.category', 'Anything Goes', registry);
    expect(result.valid).toBe(true);
    expect(result.normalizedValue).toBe('Anything Goes');
  });
  
  it('should allow any value for unknown attributes', () => {
    const result = validateGeneratedValue('attributes.unknownField', 'Any Value', registry);
    expect(result.valid).toBe(true);
  });
  
  it('should allow empty values', () => {
    const result = validateGeneratedValue('attributes.gender', '', registry);
    expect(result.valid).toBe(true);
  });
  
  it('should allow null values', () => {
    const result = validateGeneratedValue('attributes.gender', null, registry);
    expect(result.valid).toBe(true);
  });
  
  it('should handle nested field paths', () => {
    const result = validateGeneratedValue('descriptive.primaryColor', 'Black', registry);
    expect(result.valid).toBe(true);
    expect(result.normalizedValue).toBe('Black');
  });
  
  it('should reject invalid color', () => {
    const result = validateGeneratedValue('descriptive.primaryColor', 'Chartreuse', registry);
    expect(result.valid).toBe(false);
    expect(result.reason).toContain('Chartreuse');
  });
});

// ============================================================================
// SmartRulesEngine Domain Validation Integration Tests
// ============================================================================

describe('SmartRulesEngine Domain Validation', () => {
  let engine: SmartRulesEngine;
  let registry: Map<string, AttributeDefinition>;
  let product: Product;
  
  beforeEach(() => {
    registry = createMockRegistry();
    product = createTestProduct();
  });
  
  it('should return suggestion for valid enum value', async () => {
    const rule = createTestRule({
      ruleId: 'valid-gender-rule',
      action: {
        targetField: 'attributes.gender',
        valueTemplate: "Men's", // Valid value
      },
    });
    
    engine = new SmartRulesEngine([rule], registry);
    const result = await engine.evaluateRulesForProduct(product);
    
    expect(result.suggestions).toHaveLength(1);
    expect(result.suggestions[0].value).toBe("Men's");
    expect(result.errors).toHaveLength(0);
  });
  
  it('should NOT return suggestion for invalid enum value', async () => {
    const rule = createTestRule({
      ruleId: 'invalid-gender-rule',
      action: {
        targetField: 'attributes.gender',
        valueTemplate: 'Martian', // Invalid value
      },
    });
    
    engine = new SmartRulesEngine([rule], registry);
    const result = await engine.evaluateRulesForProduct(product);
    
    // Suggestion should be discarded
    expect(result.suggestions).toHaveLength(0);
    
    // Error should be logged
    expect(result.errors).toHaveLength(1);
    expect(result.errors[0].ruleId).toBe('invalid-gender-rule');
    expect(result.errors[0].error).toContain('Domain validation failed');
  });
  
  it('should normalize valid enum values to canonical casing', async () => {
    const rule = createTestRule({
      ruleId: 'lowercase-gender-rule',
      action: {
        targetField: 'attributes.gender',
        valueTemplate: 'mens', // Lowercase (synonym)
      },
    });
    
    engine = new SmartRulesEngine([rule], registry);
    const result = await engine.evaluateRulesForProduct(product);
    
    expect(result.suggestions).toHaveLength(1);
    expect(result.suggestions[0].value).toBe("Men's"); // Normalized to canonical
  });
  
  it('should allow any value when registry is not set', async () => {
    const rule = createTestRule({
      ruleId: 'no-registry-rule',
      action: {
        targetField: 'attributes.gender',
        valueTemplate: 'AnythingGoes', // Would be invalid with registry
      },
    });
    
    // Engine without registry
    engine = new SmartRulesEngine([rule]);
    const result = await engine.evaluateRulesForProduct(product);
    
    // Should pass through without validation
    expect(result.suggestions).toHaveLength(1);
    expect(result.suggestions[0].value).toBe('AnythingGoes');
  });
  
  it('should allow non-enum attributes any value', async () => {
    const rule = createTestRule({
      ruleId: 'category-rule',
      condition: {
        source: 'source.rics.category',
        matchType: 'exists',
        value: true,
      },
      action: {
        targetField: 'sku_core.category', // Use allowed target field
        valueTemplate: 'Custom Category Value', // Any value for string type
      },
    });
    
    engine = new SmartRulesEngine([rule], registry);
    const result = await engine.evaluateRulesForProduct(product);
    
    expect(result.suggestions).toHaveLength(1);
    expect(result.suggestions[0].value).toBe('Custom Category Value');
  });
  
  it('should handle multiple rules with mixed valid/invalid values', async () => {
    const validRule = createTestRule({
      ruleId: 'valid-rule',
      priority: 100,
      action: {
        targetField: 'attributes.gender',
        valueTemplate: "Women's",
      },
    });
    
    const invalidRule = createTestRule({
      ruleId: 'invalid-rule',
      priority: 90,
      action: {
        targetField: 'attributes.primaryColor',
        valueTemplate: 'Chartreuse', // Invalid
      },
    });
    
    engine = new SmartRulesEngine([validRule, invalidRule], registry);
    const result = await engine.evaluateRulesForProduct(product);
    
    // Only valid rule should produce suggestion
    expect(result.suggestions).toHaveLength(1);
    expect(result.suggestions[0].ruleId).toBe('valid-rule');
    
    // Invalid rule should produce error
    expect(result.errors).toHaveLength(1);
    expect(result.errors[0].ruleId).toBe('invalid-rule');
  });
  
  it('should set registry via setRegistry method', async () => {
    const rule = createTestRule({
      action: {
        targetField: 'attributes.gender',
        valueTemplate: 'Invalid', // Invalid value
      },
    });
    
    // Start without registry
    engine = new SmartRulesEngine([rule]);
    
    // Set registry
    engine.setRegistry(registry);
    
    const result = await engine.evaluateRulesForProduct(product);
    
    // Should now validate and reject
    expect(result.suggestions).toHaveLength(0);
    expect(result.errors).toHaveLength(1);
  });
});
