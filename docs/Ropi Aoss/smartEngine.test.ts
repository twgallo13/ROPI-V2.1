/**
 * ROPI Smart Rules Engine - Tests
 * ================================
 * Unit tests for the Smart Rules engine components.
 */

import SmartRulesEngine, {
  evaluateCondition,
  renderTemplate,
  deepGet,
  deepSet,
  normalizeToken,
  tokenize,
  isUserEdited,
  isAllowedTargetField,
} from '../smartEngine';
import { CANONICAL_RULES } from '../canonicalRules';
import type { Product, SmartRule, Condition } from '../types';

// =============================================================================
// TEST UTILITIES
// =============================================================================

/**
 * Create a sample product for testing
 */
function createSampleProduct(overrides: Partial<Product> = {}): Product {
  return {
    mpn: 'TEST-001',
    skus: ['TEST-001-BLK-9', 'TEST-001-BLK-10'],
    attributes: {},
    source: {
      rics: {
        category: 'Mens|Footwear|Athletic|Basketball',
        category_tokens: ['mens', 'footwear', 'athletic', 'basketball'],
        color: 'Black/White',
        shortDescription: 'NIKE AIR JORDAN 1 RETRO HIGH OG',
      },
    },
    observations: {
      ai_insights: 'lace-up closure, leather upper, high-top silhouette',
    },
    sku_core: {
      brand: 'Jordan',
    },
    ...overrides,
  };
}

// =============================================================================
// UTILITY FUNCTION TESTS
// =============================================================================

describe('Utility Functions', () => {
  describe('deepGet', () => {
    it('should get nested values', () => {
      const obj = { a: { b: { c: 'value' } } };
      expect(deepGet(obj, 'a.b.c')).toBe('value');
    });

    it('should return undefined for missing paths', () => {
      const obj = { a: { b: 'value' } };
      expect(deepGet(obj, 'a.b.c')).toBeUndefined();
    });

    it('should handle arrays in path', () => {
      const obj = { items: [{ name: 'first' }, { name: 'second' }] };
      expect(deepGet(obj, 'items.0.name')).toBe('first');
    });
  });

  describe('deepSet', () => {
    it('should set nested values', () => {
      const obj: Record<string, unknown> = {};
      deepSet(obj, 'a.b.c', 'value');
      expect((obj as any).a.b.c).toBe('value');
    });

    it('should overwrite existing values', () => {
      const obj: Record<string, unknown> = { a: { b: { c: 'old' } } };
      deepSet(obj, 'a.b.c', 'new');
      expect((obj as any).a.b.c).toBe('new');
    });
  });

  describe('normalizeToken', () => {
    it('should lowercase and trim', () => {
      expect(normalizeToken('  HELLO  ')).toBe('hello');
    });

    it('should apply synonyms', () => {
      expect(normalizeToken('Mens')).toBe("men's");
      expect(normalizeToken('womens')).toBe("women's");
      expect(normalizeToken('blk')).toBe('black');
    });

    it('should remove punctuation', () => {
      expect(normalizeToken("men's")).toBe("men's"); // synonym applied
      expect(normalizeToken('hello!')).toBe('hello');
    });
  });

  describe('tokenize', () => {
    it('should split on pipes (RICS format)', () => {
      expect(tokenize('Mens|Footwear|Athletic')).toEqual(["men's", 'footwear', 'athletic']);
    });

    it('should split on spaces', () => {
      expect(tokenize('hello world')).toEqual(['hello', 'world']);
    });

    it('should normalize tokens', () => {
      expect(tokenize('MENS BASKETBALL')).toEqual(["men's", 'basketball']);
    });
  });

  describe('isAllowedTargetField', () => {
    it('should allow descriptive fields', () => {
      expect(isAllowedTargetField('descriptive.gender')).toBe(true);
      expect(isAllowedTargetField('descriptive.primaryColor')).toBe(true);
    });

    it('should allow sku_core fields', () => {
      expect(isAllowedTargetField('sku_core.name')).toBe(true);
      expect(isAllowedTargetField('sku_core.brand')).toBe(true);
    });

    it('should reject admin fields', () => {
      expect(isAllowedTargetField('settings.apiKey')).toBe(false);
      expect(isAllowedTargetField('users.admin')).toBe(false);
    });
  });
});

// =============================================================================
// CONDITION EVALUATOR TESTS
// =============================================================================

describe('Condition Evaluator', () => {
  const product = createSampleProduct();

  describe('equals matchType', () => {
    it('should match exact values', () => {
      const condition: Condition = {
        source: 'source.rics.color',
        matchType: 'equals',
        value: 'Black/White',
      };
      const result = evaluateCondition(condition, product);
      expect(result.matches).toBe(true);
      expect(result.confidence).toBe(1.0);
    });

    it('should not match different values', () => {
      const condition: Condition = {
        source: 'source.rics.color',
        matchType: 'equals',
        value: 'Red',
      };
      const result = evaluateCondition(condition, product);
      expect(result.matches).toBe(false);
    });

    it('should support case-insensitive matching', () => {
      const condition: Condition = {
        source: 'source.rics.color',
        matchType: 'equals',
        value: 'BLACK/WHITE',
        options: { caseInsensitive: true },
      };
      const result = evaluateCondition(condition, product);
      expect(result.matches).toBe(true);
    });
  });

  describe('contains matchType', () => {
    it('should match substrings', () => {
      const condition: Condition = {
        source: 'source.rics.shortDescription',
        matchType: 'contains',
        value: 'JORDAN',
      };
      const result = evaluateCondition(condition, product);
      expect(result.matches).toBe(true);
    });

    it('should match array elements', () => {
      const condition: Condition = {
        source: 'source.rics.category_tokens',
        matchType: 'contains',
        value: 'basketball',
      };
      const result = evaluateCondition(condition, product);
      expect(result.matches).toBe(true);
    });
  });

  describe('token matchType', () => {
    it('should match tokens with normalization', () => {
      const condition: Condition = {
        source: 'source.rics.category_tokens',
        matchType: 'token',
        value: ['mens', 'basketball'],
      };
      const result = evaluateCondition(condition, product);
      expect(result.matches).toBe(true);
      expect(result.captures.tokens).toBeDefined();
    });
  });

  describe('regex matchType', () => {
    it('should match regex patterns', () => {
      const condition: Condition = {
        source: 'source.rics.shortDescription',
        matchType: 'regex',
        value: 'JORDAN\\s+\\d+',
      };
      const result = evaluateCondition(condition, product);
      expect(result.matches).toBe(true);
    });

    it('should capture groups', () => {
      const condition: Condition = {
        source: 'observations.ai_insights',
        matchType: 'regex',
        value: '(lace-up|zip|slip-on)',
        options: { caseInsensitive: true },
      };
      const result = evaluateCondition(condition, product);
      expect(result.matches).toBe(true);
      expect(result.captures.matchGroups).toContain('lace-up');
    });
  });

  describe('exists matchType', () => {
    it('should match existing fields', () => {
      const condition: Condition = {
        source: 'source.rics.color',
        matchType: 'exists',
        value: true,
      };
      const result = evaluateCondition(condition, product);
      expect(result.matches).toBe(true);
    });

    it('should match non-existing fields', () => {
      const condition: Condition = {
        source: 'source.rics.nonexistent',
        matchType: 'exists',
        value: false,
      };
      const result = evaluateCondition(condition, product);
      expect(result.matches).toBe(true);
    });
  });

  describe('and/or/not composite conditions', () => {
    it('should evaluate AND conditions', () => {
      const condition: Condition = {
        matchType: 'and',
        value: [
          { source: 'source.rics.category_tokens', matchType: 'token', value: 'mens' },
          { source: 'source.rics.category_tokens', matchType: 'token', value: 'basketball' },
        ],
      };
      const result = evaluateCondition(condition, product);
      expect(result.matches).toBe(true);
    });

    it('should fail AND when one condition fails', () => {
      const condition: Condition = {
        matchType: 'and',
        value: [
          { source: 'source.rics.category_tokens', matchType: 'token', value: 'mens' },
          { source: 'source.rics.category_tokens', matchType: 'token', value: 'womens' },
        ],
      };
      const result = evaluateCondition(condition, product);
      expect(result.matches).toBe(false);
    });

    it('should evaluate OR conditions', () => {
      const condition: Condition = {
        matchType: 'or',
        value: [
          { source: 'source.rics.category_tokens', matchType: 'token', value: 'running' },
          { source: 'source.rics.category_tokens', matchType: 'token', value: 'basketball' },
        ],
      };
      const result = evaluateCondition(condition, product);
      expect(result.matches).toBe(true);
    });

    it('should evaluate NOT conditions', () => {
      const condition: Condition = {
        matchType: 'not',
        value: {
          source: 'source.rics.category_tokens',
          matchType: 'token',
          value: 'running',
        },
      };
      const result = evaluateCondition(condition, product);
      expect(result.matches).toBe(true);
    });
  });
});

// =============================================================================
// TEMPLATE RENDERER TESTS
// =============================================================================

describe('Template Renderer', () => {
  const product = createSampleProduct();

  it('should render simple values', () => {
    const result = renderTemplate('{{sku_core.brand}}', { product, captures: {} });
    expect(result).toBe('Jordan');
  });

  it('should render with trim helper', () => {
    const result = renderTemplate('{{trim "  hello  "}}', { product, captures: {} });
    expect(result).toBe('hello');
  });

  it('should render with capitalize helper', () => {
    const result = renderTemplate('{{capitalize "hello"}}', { product, captures: {} });
    expect(result).toBe('Hello');
  });

  it('should render with captures', () => {
    const captures = { tokens: ['basketball', 'mens'] };
    const result = renderTemplate(
      "{{#if (contains captures.tokens 'basketball')}}Basketball{{/if}}",
      { product, captures }
    );
    expect(result).toBe('Basketball');
  });

  it('should render firstMatch helper', () => {
    const captures = { tokens: ['basketball', 'running'] };
    const result = renderTemplate(
      "{{firstMatch captures.tokens (array 'running' 'basketball' 'casual')}}",
      { product, captures }
    );
    // Note: firstMatch returns first from candidates that exists in tokens
    expect(['Running', 'Basketball']).toContain(result);
  });
});

// =============================================================================
// SMART RULES ENGINE TESTS
// =============================================================================

describe('SmartRulesEngine', () => {
  let engine: SmartRulesEngine;
  let product: Product;

  beforeEach(() => {
    engine = new SmartRulesEngine(CANONICAL_RULES);
    product = createSampleProduct();
  });

  describe('evaluateRulesForProduct', () => {
    it('should produce suggestions for matching rules', async () => {
      const result = await engine.evaluateRulesForProduct(product);
      
      expect(result.suggestions.length).toBeGreaterThan(0);
      expect(result.errors.length).toBe(0);
    });

    it('should detect gender from RICS', async () => {
      const result = await engine.evaluateRulesForProduct(product);
      
      const genderSuggestion = result.suggestions.find(
        s => s.targetField === 'descriptive.gender'
      );
      
      expect(genderSuggestion).toBeDefined();
      expect(genderSuggestion?.value).toBe("Men's");
      expect(genderSuggestion?.autoApply).toBe(true);
    });

    it('should detect closure type from observations', async () => {
      const result = await engine.evaluateRulesForProduct(product);
      
      const closureSuggestion = result.suggestions.find(
        s => s.targetField === 'descriptive.closureType'
      );
      
      expect(closureSuggestion).toBeDefined();
      expect(closureSuggestion?.value).toBe('Lace-up');
    });

    it('should not auto-apply to user-edited fields', async () => {
      product._userEditedFields = ['descriptive.gender'];
      const result = await engine.evaluateRulesForProduct(product);
      
      const genderSuggestion = result.suggestions.find(
        s => s.targetField === 'descriptive.gender'
      );
      
      expect(genderSuggestion).toBeDefined();
      expect(genderSuggestion?.autoApply).toBe(false);
    });

    it('should respect priority ordering', async () => {
      const result = await engine.evaluateRulesForProduct(product);
      
      // Suggestions should be in priority order
      for (let i = 1; i < result.suggestions.length; i++) {
        const prevRule = CANONICAL_RULES.find(r => r.ruleId === result.suggestions[i - 1].ruleId);
        const currRule = CANONICAL_RULES.find(r => r.ruleId === result.suggestions[i].ruleId);
        
        if (prevRule && currRule) {
          expect(prevRule.priority).toBeGreaterThanOrEqual(currRule.priority);
        }
      }
    });
  });

  describe('testRule', () => {
    it('should test a single rule', () => {
      const rule = CANONICAL_RULES[0]; // sd_001_gender_from_rics
      const result = engine.testRule(rule, product);
      
      expect(result.matches).toBe(true);
      expect(result.renderedValue).toBe("Men's");
      expect(result.wouldAutoApply).toBe(true);
    });

    it('should report non-matching rules', () => {
      const product = createSampleProduct({
        source: { rics: { category_tokens: ['womens', 'footwear'] } },
      });
      
      // Test with a rule that won't match
      const rule: SmartRule = {
        ruleId: 'test_rule',
        name: 'Test Rule',
        enabled: true,
        priority: 100,
        condition: {
          source: 'source.rics.category_tokens',
          matchType: 'token',
          value: 'kids',
        },
        action: {
          targetField: 'descriptive.ageGroup',
          valueTemplate: 'Kids',
        },
        autoApply: true,
        autoApplyConfidence: 0.9,
      };
      
      const result = engine.testRule(rule, product);
      expect(result.matches).toBe(false);
    });
  });

  describe('applySuggestion', () => {
    it('should generate updates for valid suggestions', async () => {
      const result = await engine.evaluateRulesForProduct(product);
      const suggestion = result.suggestions[0];
      
      const applyResult = engine.applySuggestion(product, suggestion, 'test_user');
      
      expect(applyResult.success).toBe(true);
      expect(applyResult.updates).toBeDefined();
      expect(applyResult.activityLog).toBeDefined();
    });

    it('should not apply to user-edited fields', async () => {
      product._userEditedFields = ['descriptive.gender'];
      const result = await engine.evaluateRulesForProduct(product);
      
      const genderSuggestion = result.suggestions.find(
        s => s.targetField === 'descriptive.gender'
      );
      
      if (genderSuggestion) {
        const applyResult = engine.applySuggestion(product, genderSuggestion, 'test_user');
        expect(applyResult.success).toBe(false);
        expect(applyResult.reason).toBe('user_edited');
      }
    });

    it('should detect no-op when value already set', async () => {
      product.descriptive = { gender: "Men's" };
      
      const result = await engine.evaluateRulesForProduct(product);
      const genderSuggestion = result.suggestions.find(
        s => s.targetField === 'descriptive.gender' && s.value === "Men's"
      );
      
      if (genderSuggestion) {
        const applyResult = engine.applySuggestion(product, genderSuggestion, 'test_user');
        expect(applyResult.success).toBe(false);
        expect(applyResult.reason).toBe('noop');
      }
    });
  });

  describe('conflict detection', () => {
    it('should detect conflicts when multiple rules target same field with different values', async () => {
      // Create a product that could match multiple conflicting rules
      const conflictProduct = createSampleProduct({
        source: {
          rics: {
            category_tokens: ['unisex', 'mens', 'footwear'],
            color: 'Black',
          },
        },
      });
      
      const result = await engine.evaluateRulesForProduct(conflictProduct);
      
      // Check if we have multiple suggestions for gender
      const genderSuggestions = result.suggestions.filter(
        s => s.targetField === 'descriptive.gender'
      );
      
      if (genderSuggestions.length > 1) {
        // Should have detected a conflict
        const genderConflict = result.conflicts.find(c => c.field === 'descriptive.gender');
        expect(genderConflict).toBeDefined();
      }
    });
  });
});

// =============================================================================
// CANONICAL RULES TESTS
// =============================================================================

describe('Canonical Rules', () => {
  it('should have 20 rules', () => {
    expect(CANONICAL_RULES.length).toBe(20);
  });

  it('should have unique rule IDs', () => {
    const ruleIds = CANONICAL_RULES.map(r => r.ruleId);
    const uniqueIds = new Set(ruleIds);
    expect(uniqueIds.size).toBe(ruleIds.length);
  });

  it('should have all required fields', () => {
    for (const rule of CANONICAL_RULES) {
      expect(rule.ruleId).toBeDefined();
      expect(rule.name).toBeDefined();
      expect(rule.enabled).toBeDefined();
      expect(rule.priority).toBeDefined();
      expect(rule.condition).toBeDefined();
      expect(rule.action).toBeDefined();
      expect(rule.action.targetField).toBeDefined();
      expect(rule.action.valueTemplate).toBeDefined();
      expect(rule.autoApply).toBeDefined();
      expect(rule.autoApplyConfidence).toBeDefined();
    }
  });

  it('should have priorities in expected range', () => {
    for (const rule of CANONICAL_RULES) {
      expect(rule.priority).toBeGreaterThanOrEqual(800);
      expect(rule.priority).toBeLessThanOrEqual(1000);
    }
  });

  it('should only target allowed fields', () => {
    for (const rule of CANONICAL_RULES) {
      expect(isAllowedTargetField(rule.action.targetField)).toBe(true);
    }
  });
});
