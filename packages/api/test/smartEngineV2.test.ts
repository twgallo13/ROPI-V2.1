/**
 * Smart Rules Engine V2 - Unit Tests
 * LP-smart-rules-engine-1.0.0
 * 
 * Comprehensive tests for:
 * - S2.2: Tokenization / RICS matching (edge cases: "women's", "men", "wmns", multi-phrase)
 * - S2.3: Engine validation (enum normalization, numeric constraints, internalOnly rejection)
 * - S2.3: Guardrails (rule attempting to overwrite existing field must not change)
 * - Determinism (run engine twice on same import row → identical output)
 * - S2.4: Provenance model
 * - S2.6: Conflict detection
 */

import { describe, it, expect, beforeEach } from 'vitest';
import SmartRulesEngineV2, {
  RICSNormalizer,
  ricsNormalizer,
  DEFAULT_RICS_DICTIONARY,
  evaluateCondition,
  validateRuleTarget,
  validateGeneratedValue,
  isAllowedTargetField,
  deepGet,
  deepSet,
  generateId,
  type SmartRule,
  type ImportRow,
  type Product,
  type Condition,
  type DictionaryEntry,
} from '../src/lib/smartEngineV2';

// ============================================================================
// S2.2: Tokenization / RICS Matching Tests
// ============================================================================

describe('S2.2: RICSNormalizer - Tokenization', () => {
  let normalizer: RICSNormalizer;
  
  beforeEach(() => {
    normalizer = new RICSNormalizer(DEFAULT_RICS_DICTIONARY);
  });
  
  describe('normalize()', () => {
    it('should lowercase text', () => {
      expect(normalizer.normalize('HELLO WORLD')).toBe('hello world');
    });
    
    it('should remove unicode accents', () => {
      expect(normalizer.normalize('café résumé')).toBe('cafe resume');
    });
    
    it('should normalize apostrophes', () => {
      expect(normalizer.normalize("men's")).toBe("men's");
      expect(normalizer.normalize("men's")).toBe("men's"); // curly apostrophe
      expect(normalizer.normalize("men`s")).toBe("men's"); // backtick
    });
    
    it('should remove punctuation except apostrophes', () => {
      expect(normalizer.normalize('hello, world!')).toBe('hello world');
      expect(normalizer.normalize('test@example#123')).toBe('test example 123');
    });
    
    it('should collapse whitespace', () => {
      expect(normalizer.normalize('hello   world')).toBe('hello world');
      expect(normalizer.normalize('  spaced  out  ')).toBe('spaced out');
    });
  });
  
  describe('tokenize()', () => {
    it('should split on spaces', () => {
      expect(normalizer.tokenize('hello world')).toEqual(['hello', 'world']);
    });
    
    it('should split on RICS pipe delimiter', () => {
      expect(normalizer.tokenize('Footwear | Men | Sneakers')).toEqual(['footwear', 'men', 'sneakers']);
    });
    
    it('should handle complex RICS categories', () => {
      expect(normalizer.tokenize("Footwear | Men's Athletic | Running"))
        .toEqual(['footwear', "men's", 'athletic', 'running']);
    });
    
    it('should return empty array for empty input', () => {
      expect(normalizer.tokenize('')).toEqual([]);
      expect(normalizer.tokenize(null as unknown as string)).toEqual([]);
    });
  });
  
  describe('generateNgrams()', () => {
    it('should generate bigrams', () => {
      const tokens = ['hello', 'world', 'test'];
      expect(normalizer.generateNgrams(tokens, 2)).toEqual(['hello world', 'world test']);
    });
    
    it('should generate trigrams', () => {
      const tokens = ['a', 'b', 'c', 'd'];
      expect(normalizer.generateNgrams(tokens, 3)).toEqual(['a b c', 'b c d']);
    });
    
    it('should return empty for insufficient tokens', () => {
      expect(normalizer.generateNgrams(['single'], 2)).toEqual([]);
    });
  });
  
  describe('matchToken() - Dictionary lookup', () => {
    it('should match exact tokens', () => {
      const entry = normalizer.matchToken('black');
      expect(entry?.canonical).toBe('Black');
    });
    
    it('should match synonyms', () => {
      expect(normalizer.matchToken('blk')?.canonical).toBe('Black');
      expect(normalizer.matchToken('wht')?.canonical).toBe('White');
      expect(normalizer.matchToken('gry')?.canonical).toBe('Gray');
    });
    
    it('should match gender variants', () => {
      expect(normalizer.matchToken('mens')?.canonical).toBe("Men's");
      expect(normalizer.matchToken('womens')?.canonical).toBe("Women's");
      expect(normalizer.matchToken('wmns')?.canonical).toBe("Women's");
    });
    
    it('should return undefined for unknown tokens', () => {
      expect(normalizer.matchToken('unknowntoken')).toBeUndefined();
    });
  });
  
  describe('disambiguateGender() - men vs women edge cases', () => {
    it('should correctly identify "women\'s"', () => {
      expect(normalizer.disambiguateGender(["women's"])).toBe("Women's");
      expect(normalizer.disambiguateGender(['womens'])).toBe("Women's");
    });
    
    it('should correctly identify "men\'s"', () => {
      expect(normalizer.disambiguateGender(["men's"])).toBe("Men's");
      expect(normalizer.disambiguateGender(['mens'])).toBe("Men's");
    });
    
    it('should prefer "women" over "men" when both could match', () => {
      // "women" contains "men" but should correctly identify women
      expect(normalizer.disambiguateGender(['women'])).toBe("Women's");
    });
    
    it('should identify "men" when not part of "women"', () => {
      expect(normalizer.disambiguateGender(['men', 'footwear'])).toBe("Men's");
    });
    
    it('should handle "wmns" abbreviation', () => {
      // wmns should map via dictionary
      const entry = normalizer.matchToken('wmns');
      expect(entry?.canonical).toBe("Women's");
    });
    
    it('should identify kids variants', () => {
      expect(normalizer.disambiguateGender(['kids'])).toBe('Kids');
      expect(normalizer.disambiguateGender(['boys'])).toBe('Boys');
      expect(normalizer.disambiguateGender(['girls'])).toBe('Girls');
    });
    
    it('should return undefined for no gender tokens', () => {
      expect(normalizer.disambiguateGender(['footwear', 'sneakers'])).toBeUndefined();
    });
  });
  
  describe('extractFromRICS() - Full RICS parsing', () => {
    it('should extract gender from RICS category', () => {
      const result = normalizer.extractFromRICS("Footwear | Men's | Sneakers");
      expect(result.matches.some(m => m.canonical === "Men's")).toBe(true);
    });
    
    it('should extract category type', () => {
      const result = normalizer.extractFromRICS("Footwear | Women's | Boots");
      expect(result.matches.some(m => m.canonical === 'Footwear')).toBe(true);
      expect(result.matches.some(m => m.canonical === 'Boots')).toBe(true);
    });
    
    it('should handle multi-phrase categories', () => {
      const result = normalizer.extractFromRICS("Apparel | Kids | Grade School | T-Shirts");
      expect(result.tokens).toContain('apparel');
      expect(result.tokens).toContain('kids');
    });
    
    it('should prioritize matches by priority', () => {
      const result = normalizer.extractFromRICS("Footwear | Men's | Sneakers");
      // Higher priority matches should come first
      const priorities = result.matches.map(m => m.priority || 0);
      for (let i = 1; i < priorities.length; i++) {
        expect(priorities[i - 1]).toBeGreaterThanOrEqual(priorities[i]);
      }
    });
  });
});

// ============================================================================
// S2.3: Engine Validation Tests
// ============================================================================

describe('S2.3: Guardrails & Validation', () => {
  describe('validateRuleTarget()', () => {
    it('should accept allowed target fields', () => {
      expect(validateRuleTarget('attributes.gender').valid).toBe(true);
      expect(validateRuleTarget('attributes.primaryColor').valid).toBe(true);
      expect(validateRuleTarget('descriptive.ageGroup').valid).toBe(true);
    });
    
    it('should reject non-whitelisted fields', () => {
      const result = validateRuleTarget('attributes.someRandomField');
      expect(result.valid).toBe(false);
      expect(result.code).toBe('TARGET_NOT_EXPORTABLE');
    });
    
    it('should reject system fields', () => {
      expect(validateRuleTarget('_appliedRules.test').valid).toBe(false);
      expect(validateRuleTarget('provenance.test').valid).toBe(false);
    });
  });
  
  describe('validateGeneratedValue()', () => {
    it('should accept valid values for unconstrained attributes', () => {
      const result = validateGeneratedValue('attributes.unknownAttr', 'anything');
      expect(result.valid).toBe(true);
    });
    
    it('should allow null/empty values', () => {
      expect(validateGeneratedValue('attributes.gender', null).valid).toBe(true);
      expect(validateGeneratedValue('attributes.gender', '').valid).toBe(true);
      expect(validateGeneratedValue('attributes.gender', undefined).valid).toBe(true);
    });
  });
  
  describe('isAllowedTargetField()', () => {
    it('should recognize exact matches', () => {
      expect(isAllowedTargetField('attributes.gender')).toBe(true);
      expect(isAllowedTargetField('descriptive.primaryColor')).toBe(true);
    });
    
    it('should recognize nested prefixes', () => {
      expect(isAllowedTargetField('attributes.gender.sub')).toBe(true);
    });
    
    it('should reject unknown fields', () => {
      expect(isAllowedTargetField('random.field')).toBe(false);
      expect(isAllowedTargetField('_internal.field')).toBe(false);
    });
  });
});

// ============================================================================
// S2.3: Set-Only-If-Empty Guardrail Tests
// ============================================================================

describe('S2.3: Set-Only-If-Empty Enforcement', () => {
  let engine: SmartRulesEngineV2;
  let rule: SmartRule;
  
  beforeEach(() => {
    rule = {
      ruleId: 'test-rule-001',
      name: 'Test Gender Rule',
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
    };
    
    engine = new SmartRulesEngineV2([rule]);
  });
  
  it('should auto-apply when field is empty', () => {
    const importRow: ImportRow = {
      productId: 'TEST-001',
      normalized: {},
      source: { rics: { category: "Footwear | Men's | Sneakers" } },
    };
    
    const result = engine.evaluateForImport(importRow);
    
    expect(result.autoApplied.length).toBe(1);
    expect(result.autoApplied[0].value).toBe("Men's");
  });
  
  it('should NOT auto-apply when field has existing value', () => {
    const importRow: ImportRow = {
      productId: 'TEST-001',
      normalized: { gender: "Women's" }, // Existing value
      source: { rics: { category: "Footwear | Men's | Sneakers" } },
    };
    
    const result = engine.evaluateForImport(importRow);
    
    // Should produce suggestion but NOT auto-apply
    expect(result.suggestions.length).toBe(1);
    expect(result.autoApplied.length).toBe(0);
    expect(result.suggestions[0].autoApply).toBe(false);
  });
  
  it('should NOT auto-apply when user edited the field', () => {
    const existingProduct: Product = {
      mpn: 'TEST-001',
      attributes: {},
      _userEditedFields: ['attributes.gender'],
    };
    
    const importRow: ImportRow = {
      productId: 'TEST-001',
      normalized: {},
      source: { rics: { category: "Footwear | Men's | Sneakers" } },
      existingProduct,
    };
    
    const result = engine.evaluateForImport(importRow);
    
    expect(result.suggestions.length).toBe(1);
    expect(result.autoApplied.length).toBe(0);
    expect(result.suggestions[0].autoApply).toBe(false);
  });
});

// ============================================================================
// Determinism Tests
// ============================================================================

describe('Determinism: Identical outputs for identical inputs', () => {
  let engine: SmartRulesEngineV2;
  let rules: SmartRule[];
  
  beforeEach(() => {
    rules = [
      {
        ruleId: 'rule-001',
        name: 'Gender Rule',
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
      },
      {
        ruleId: 'rule-002',
        name: 'Category Rule',
        enabled: true,
        priority: 90,
        condition: {
          source: 'source.rics.category',
          matchType: 'contains',
          value: 'Footwear',
        },
        action: {
          targetField: 'attributes.category',
          valueTemplate: 'Footwear',
        },
        autoApply: true,
        autoApplyConfidence: 0.8,
      },
    ];
    
    engine = new SmartRulesEngineV2(rules);
  });
  
  it('should produce identical suggestions on repeated evaluations', () => {
    const importRow: ImportRow = {
      productId: 'TEST-001',
      normalized: {},
      source: { rics: { category: "Footwear | Men's | Sneakers" } },
    };
    
    const result1 = engine.evaluateForImport(importRow);
    const result2 = engine.evaluateForImport(importRow);
    
    // Compare suggestion counts
    expect(result1.suggestions.length).toBe(result2.suggestions.length);
    expect(result1.autoApplied.length).toBe(result2.autoApplied.length);
    
    // Compare suggestion values (ignoring IDs which are generated)
    const values1 = result1.suggestions.map(s => ({ field: s.targetField, value: s.value }));
    const values2 = result2.suggestions.map(s => ({ field: s.targetField, value: s.value }));
    expect(values1).toEqual(values2);
  });
  
  it('should produce identical auto-applies on repeated evaluations', () => {
    const importRow: ImportRow = {
      productId: 'TEST-001',
      normalized: {},
      source: { rics: { category: "Footwear | Men's | Sneakers" } },
    };
    
    const result1 = engine.evaluateForImport(importRow);
    const result2 = engine.evaluateForImport(importRow);
    
    const applied1 = result1.autoApplied.map(s => s.targetField).sort();
    const applied2 = result2.autoApplied.map(s => s.targetField).sort();
    expect(applied1).toEqual(applied2);
  });
  
  it('should maintain rule priority ordering deterministically', () => {
    const importRow: ImportRow = {
      productId: 'TEST-001',
      normalized: {},
      source: { rics: { category: "Footwear | Men's | Sneakers" } },
    };
    
    // Run 10 times to ensure ordering is consistent
    const allResults = [];
    for (let i = 0; i < 10; i++) {
      const result = engine.evaluateForImport(importRow);
      allResults.push(result.suggestions.map(s => s.ruleId));
    }
    
    // All results should be identical
    const first = allResults[0];
    for (const result of allResults) {
      expect(result).toEqual(first);
    }
  });
});

// ============================================================================
// S2.4: Provenance Model Tests
// ============================================================================

describe('S2.4: Provenance Model', () => {
  let engine: SmartRulesEngineV2;
  
  beforeEach(() => {
    const rule: SmartRule = {
      ruleId: 'prov-rule-001',
      name: 'Gender Provenance Test',
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
    };
    
    engine = new SmartRulesEngineV2([rule]);
  });
  
  it('should include provenance in updates for auto-applied suggestions', () => {
    const importRow: ImportRow = {
      productId: 'TEST-001',
      normalized: {},
      source: { rics: { category: "Footwear | Men's | Sneakers" } },
    };
    
    const result = engine.evaluateForImport(importRow);
    
    // Check provenance key exists (updates uses nested structure)
    const provenance = deepGet(result.updates, 'provenance.attributes_gender') as any;
    expect(provenance).toBeDefined();
    expect(provenance.source).toBe('smartRule');
    expect(provenance.ruleId).toBe('prov-rule-001');
    expect(provenance.ruleName).toBe('Gender Provenance Test');
    expect(provenance.appliedAt).toBeDefined();
    expect(provenance.input).toBeDefined();
  });
  
  it('should include input context in provenance', () => {
    const importRow: ImportRow = {
      productId: 'TEST-001',
      normalized: {},
      source: { rics: { category: "Footwear | Men's | Sneakers" } },
    };
    
    const result = engine.evaluateForImport(importRow);
    const provenance = deepGet(result.updates, 'provenance.attributes_gender') as any;
    
    expect(provenance.input.ricsCategory).toBe("Footwear | Men's | Sneakers");
  });
  
  it('should include reason in provenance', () => {
    const importRow: ImportRow = {
      productId: 'TEST-001',
      normalized: {},
      source: { rics: { category: "Footwear | Men's | Sneakers" } },
    };
    
    const result = engine.evaluateForImport(importRow);
    const provenance = deepGet(result.updates, 'provenance.attributes_gender') as any;
    
    expect(provenance.reason).toBeDefined();
    expect(typeof provenance.reason).toBe('string');
  });
  
  it('should track applied rule in _appliedRules', () => {
    const importRow: ImportRow = {
      productId: 'TEST-001',
      normalized: {},
      source: { rics: { category: "Footwear | Men's | Sneakers" } },
    };
    
    const result = engine.evaluateForImport(importRow);
    const tracking = deepGet(result.updates, '_appliedRules.attributes_gender') as any;
    
    expect(tracking).toBeDefined();
    expect(tracking.ruleId).toBe('prov-rule-001');
    expect(tracking.confidence).toBeGreaterThan(0);
    expect(tracking.appliedAt).toBeDefined();
  });
});

// ============================================================================
// S2.6: Conflict Detection Tests
// ============================================================================

describe('S2.6: Conflict Detection', () => {
  it('should detect conflicts when two rules propose different values for same field', () => {
    const rules: SmartRule[] = [
      {
        ruleId: 'rule-men',
        name: 'Men Rule',
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
        autoApply: false, // Not auto-apply to avoid applying first
        autoApplyConfidence: 0.9,
      },
      {
        ruleId: 'rule-unisex',
        name: 'Unisex Rule',
        enabled: true,
        priority: 90,
        condition: {
          source: 'source.rics.category',
          matchType: 'contains',
          value: 'Athletic',
        },
        action: {
          targetField: 'attributes.gender',
          valueTemplate: 'Unisex',
        },
        autoApply: false,
        autoApplyConfidence: 0.9,
      },
    ];
    
    const engine = new SmartRulesEngineV2(rules);
    
    const importRow: ImportRow = {
      productId: 'TEST-001',
      normalized: {},
      source: { rics: { category: "Footwear | Men's Athletic | Running" } },
    };
    
    const result = engine.evaluateForImport(importRow);
    
    // Should have 2 suggestions for same field
    expect(result.suggestions.length).toBe(2);
    
    // Should detect conflict
    expect(result.conflicts.length).toBe(1);
    expect(result.conflicts[0].field).toBe('attributes.gender');
    expect(result.conflicts[0].candidates.length).toBe(2);
    expect(result.conflicts[0].suggestedResolution).toBe('highest_priority');
  });
  
  it('should NOT create conflict when values are identical', () => {
    const rules: SmartRule[] = [
      {
        ruleId: 'rule-1',
        name: 'Rule 1',
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
        autoApply: false,
        autoApplyConfidence: 0.9,
      },
      {
        ruleId: 'rule-2',
        name: 'Rule 2',
        enabled: true,
        priority: 90,
        condition: {
          source: 'source.rics.category',
          matchType: 'contains',
          value: 'Footwear',
        },
        action: {
          targetField: 'attributes.gender',
          valueTemplate: "Men's", // Same value
        },
        autoApply: false,
        autoApplyConfidence: 0.9,
      },
    ];
    
    const engine = new SmartRulesEngineV2(rules);
    
    const importRow: ImportRow = {
      productId: 'TEST-001',
      normalized: {},
      source: { rics: { category: "Footwear | Men's | Sneakers" } },
    };
    
    const result = engine.evaluateForImport(importRow);
    
    // Should have 2 suggestions
    expect(result.suggestions.length).toBe(2);
    
    // Should NOT detect conflict (same value)
    expect(result.conflicts.length).toBe(0);
  });
  
  it('should include priority in conflict candidates', () => {
    const rules: SmartRule[] = [
      {
        ruleId: 'high-priority',
        name: 'High Priority Rule',
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
        ruleId: 'low-priority',
        name: 'Low Priority Rule',
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
    
    const engine = new SmartRulesEngineV2(rules);
    
    const importRow: ImportRow = {
      productId: 'TEST-001',
      normalized: {},
      source: { rics: { category: 'Anything' } },
    };
    
    const result = engine.evaluateForImport(importRow);
    
    // Both rules should match and create suggestions
    expect(result.suggestions.length).toBe(2);
    
    // Different values should create conflict
    expect(result.conflicts.length).toBe(1);
    
    const conflict = result.conflicts[0];
    expect(conflict.candidates.some(c => c.priority === 200)).toBe(true);
    expect(conflict.candidates.some(c => c.priority === 50)).toBe(true);
  });
});

// ============================================================================
// Condition Evaluation Tests
// ============================================================================

describe('evaluateCondition()', () => {
  describe('equals matchType', () => {
    it('should match exact values', () => {
      const condition: Condition = {
        source: 'attributes.brand',
        matchType: 'equals',
        value: 'Nike',
      };
      
      const data: ImportRow = {
        productId: 'TEST-001',
        normalized: {},
        source: {},
      };
      (data as any).attributes = { brand: 'Nike' };
      
      const result = evaluateCondition(condition, data);
      expect(result.matches).toBe(true);
      expect(result.confidence).toBe(1.0);
    });
    
    it('should support case-insensitive matching', () => {
      const condition: Condition = {
        source: 'attributes.brand',
        matchType: 'equals',
        value: 'NIKE',
        options: { caseInsensitive: true },
      };
      
      const data: ImportRow = {
        productId: 'TEST-001',
        normalized: {},
        source: {},
      };
      (data as any).attributes = { brand: 'nike' };
      
      const result = evaluateCondition(condition, data);
      expect(result.matches).toBe(true);
    });
  });
  
  describe('contains matchType', () => {
    it('should match substring', () => {
      const condition: Condition = {
        source: 'source.rics.category',
        matchType: 'contains',
        value: 'Men',
      };
      
      const data: ImportRow = {
        productId: 'TEST-001',
        normalized: {},
        source: { rics: { category: "Footwear | Men's | Sneakers" } },
      };
      
      const result = evaluateCondition(condition, data);
      expect(result.matches).toBe(true);
      expect(result.confidence).toBe(0.9);
    });
    
    it('should check array membership', () => {
      const condition: Condition = {
        source: 'attributes.tags',
        matchType: 'contains',
        value: 'featured',
      };
      
      const data: ImportRow = {
        productId: 'TEST-001',
        normalized: {},
        source: {},
      };
      (data as any).attributes = { tags: ['new', 'featured', 'sale'] };
      
      const result = evaluateCondition(condition, data);
      expect(result.matches).toBe(true);
      expect(result.confidence).toBe(0.95);
    });
  });
  
  describe('regex matchType', () => {
    it('should match regex patterns', () => {
      const condition: Condition = {
        source: 'attributes.sku',
        matchType: 'regex',
        value: '^NK-\\d{4}$',
      };
      
      const data: ImportRow = {
        productId: 'TEST-001',
        normalized: {},
        source: {},
      };
      (data as any).attributes = { sku: 'NK-1234' };
      
      const result = evaluateCondition(condition, data);
      expect(result.matches).toBe(true);
    });
    
    it('should capture groups', () => {
      const condition: Condition = {
        source: 'attributes.sku',
        matchType: 'regex',
        value: '^(\\w+)-(\\d+)$',
      };
      
      const data: ImportRow = {
        productId: 'TEST-001',
        normalized: {},
        source: {},
      };
      (data as any).attributes = { sku: 'NK-1234' };
      
      const result = evaluateCondition(condition, data);
      expect(result.matches).toBe(true);
      expect(result.captures.matchGroups).toEqual(['NK', '1234']);
    });
  });
  
  describe('token matchType', () => {
    it('should match normalized tokens', () => {
      const condition: Condition = {
        source: 'source.rics.category',
        matchType: 'token',
        value: 'men',
      };
      
      const data: ImportRow = {
        productId: 'TEST-001',
        normalized: {},
        source: { rics: { category: "Footwear | Men's | Sneakers" } },
      };
      
      const result = evaluateCondition(condition, data);
      expect(result.matches).toBe(true);
    });
    
    it('should match via synonyms', () => {
      const condition: Condition = {
        source: 'source.rics.color',
        matchType: 'token',
        value: 'black',
      };
      
      const data: ImportRow = {
        productId: 'TEST-001',
        normalized: {},
        source: { rics: { color: 'BLK' } },
      };
      
      const result = evaluateCondition(condition, data);
      // Should match via synonym lookup
      expect(result.matches).toBe(true);
    });
  });
  
  describe('exists matchType', () => {
    it('should check field existence', () => {
      const conditionExists: Condition = {
        source: 'attributes.brand',
        matchType: 'exists',
        value: true,
      };
      
      const dataWithBrand: ImportRow = {
        productId: 'TEST-001',
        normalized: {},
        source: {},
      };
      (dataWithBrand as any).attributes = { brand: 'Nike' };
      
      expect(evaluateCondition(conditionExists, dataWithBrand).matches).toBe(true);
      
      const dataWithoutBrand: ImportRow = {
        productId: 'TEST-001',
        normalized: {},
        source: {},
      };
      (dataWithoutBrand as any).attributes = {};
      
      expect(evaluateCondition(conditionExists, dataWithoutBrand).matches).toBe(false);
    });
  });
  
  describe('logical operators', () => {
    it('should evaluate AND conditions', () => {
      const condition: Condition = {
        matchType: 'and',
        value: [
          { source: 'attributes.brand', matchType: 'equals', value: 'Nike' },
          { source: 'attributes.category', matchType: 'equals', value: 'Footwear' },
        ],
      };
      
      const data: ImportRow = {
        productId: 'TEST-001',
        normalized: {},
        source: {},
      };
      (data as any).attributes = { brand: 'Nike', category: 'Footwear' };
      
      const result = evaluateCondition(condition, data);
      expect(result.matches).toBe(true);
    });
    
    it('should evaluate OR conditions', () => {
      const condition: Condition = {
        matchType: 'or',
        value: [
          { source: 'attributes.brand', matchType: 'equals', value: 'Nike' },
          { source: 'attributes.brand', matchType: 'equals', value: 'Adidas' },
        ],
      };
      
      const data: ImportRow = {
        productId: 'TEST-001',
        normalized: {},
        source: {},
      };
      (data as any).attributes = { brand: 'Adidas' };
      
      const result = evaluateCondition(condition, data);
      expect(result.matches).toBe(true);
    });
    
    it('should evaluate NOT conditions', () => {
      const condition: Condition = {
        matchType: 'not',
        value: { source: 'attributes.brand', matchType: 'equals', value: 'Nike' },
      };
      
      const data: ImportRow = {
        productId: 'TEST-001',
        normalized: {},
        source: {},
      };
      (data as any).attributes = { brand: 'Adidas' };
      
      const result = evaluateCondition(condition, data);
      expect(result.matches).toBe(true);
    });
  });
});

// ============================================================================
// Utility Function Tests
// ============================================================================

describe('Utility Functions', () => {
  describe('deepGet()', () => {
    it('should get nested values', () => {
      const obj = { a: { b: { c: 'value' } } };
      expect(deepGet(obj, 'a.b.c')).toBe('value');
    });
    
    it('should return undefined for missing paths', () => {
      const obj = { a: { b: 1 } };
      expect(deepGet(obj, 'a.b.c')).toBeUndefined();
      expect(deepGet(obj, 'x.y.z')).toBeUndefined();
    });
  });
  
  describe('deepSet()', () => {
    it('should set nested values', () => {
      const obj: Record<string, unknown> = {};
      deepSet(obj, 'a.b.c', 'value');
      expect((obj as any).a.b.c).toBe('value');
    });
    
    it('should create intermediate objects', () => {
      const obj: Record<string, unknown> = {};
      deepSet(obj, 'x.y.z', 123);
      expect((obj as any).x.y.z).toBe(123);
    });
  });
  
  describe('generateId()', () => {
    it('should generate unique IDs', () => {
      const id1 = generateId('test');
      const id2 = generateId('test');
      expect(id1).not.toBe(id2);
    });
    
    it('should use prefix', () => {
      const id = generateId('sug');
      expect(id.startsWith('sug-')).toBe(true);
    });
  });
});

// ============================================================================
// Activity Log Tests
// ============================================================================

describe('Activity Log Generation', () => {
  it('should generate activity log entries for auto-applied suggestions', () => {
    const rule: SmartRule = {
      ruleId: 'log-test-001',
      name: 'Activity Log Test Rule',
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
    };
    
    const engine = new SmartRulesEngineV2([rule]);
    
    const importRow: ImportRow = {
      productId: 'TEST-001',
      normalized: {},
      source: { rics: { category: "Footwear | Men's | Sneakers" } },
    };
    
    const result = engine.evaluateForImport(importRow);
    
    expect(result.activityLog.length).toBe(1);
    
    const logEntry = result.activityLog[0];
    expect(logEntry.actor).toBe('system:smartRulesEngine');
    expect(logEntry.action).toBe('smartrule_auto_apply');
    expect(logEntry.details.ruleId).toBe('log-test-001');
    expect(logEntry.details.targetField).toBe('attributes.gender');
    expect(logEntry.details.value).toBe("Men's");
  });
  
  it('should NOT generate activity log for suggestions not auto-applied', () => {
    const rule: SmartRule = {
      ruleId: 'no-auto-001',
      name: 'No Auto Apply Rule',
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
      autoApply: false, // Not auto-apply
      autoApplyConfidence: 0.8,
    };
    
    const engine = new SmartRulesEngineV2([rule]);
    
    const importRow: ImportRow = {
      productId: 'TEST-001',
      normalized: {},
      source: { rics: { category: "Footwear | Men's | Sneakers" } },
    };
    
    const result = engine.evaluateForImport(importRow);
    
    expect(result.suggestions.length).toBe(1);
    expect(result.activityLog.length).toBe(0);
  });
});

// ============================================================================
// Error Handling Tests
// ============================================================================

describe('Error Handling', () => {
  it('should capture errors for rules targeting internalOnly attributes', () => {
    const rule: SmartRule = {
      ruleId: 'internal-target-001',
      name: 'Internal Target Rule',
      enabled: true,
      priority: 100,
      condition: {
        source: 'source.rics.category',
        matchType: 'exists',
        value: true,
      },
      action: {
        targetField: 'attributes.status', // Assuming status is internalOnly
        valueTemplate: 'active',
      },
      autoApply: true,
      autoApplyConfidence: 0.9,
    };
    
    const engine = new SmartRulesEngineV2([rule]);
    
    const importRow: ImportRow = {
      productId: 'TEST-001',
      normalized: {},
      source: { rics: { category: 'Footwear' } },
    };
    
    const result = engine.evaluateForImport(importRow);
    
    // Should have error, not suggestion
    expect(result.errors.length).toBeGreaterThan(0);
    expect(result.suggestions.length).toBe(0);
  });
  
  it('should capture errors for rules targeting non-whitelisted fields', () => {
    const rule: SmartRule = {
      ruleId: 'non-whitelist-001',
      name: 'Non-Whitelist Target Rule',
      enabled: true,
      priority: 100,
      condition: {
        source: 'source.rics.category',
        matchType: 'exists',
        value: true,
      },
      action: {
        targetField: 'some.random.field',
        valueTemplate: 'value',
      },
      autoApply: true,
      autoApplyConfidence: 0.9,
    };
    
    const engine = new SmartRulesEngineV2([rule]);
    
    const importRow: ImportRow = {
      productId: 'TEST-001',
      normalized: {},
      source: { rics: { category: 'Footwear' } },
    };
    
    const result = engine.evaluateForImport(importRow);
    
    expect(result.errors.length).toBe(1);
    expect(result.errors[0].code).toBe('TARGET_NOT_EXPORTABLE');
  });
});
