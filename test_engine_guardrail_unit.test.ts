/**
 * Smart Rules Engine V2 - Guardrail Unit Test
 * Step 2.3: Engine honor guardrail during apply
 * 
 * Tests that the engine honors the onlyIfEmpty flag and skips applying
 * rules when target field already has a value.
 */

import { SmartRulesEngineV2, type SmartRule, type ImportRow } from '../src/lib/smartEngineV2';

describe('Smart Rules Engine V2 - Guardrail Logic', () => {
  let engine: SmartRulesEngineV2;
  
  beforeEach(() => {
    engine = new SmartRulesEngineV2();
  });

  const baseRule: SmartRule = {
    ruleId: 'test_guardrail_rule',
    name: 'Test Guardrail Rule',
    enabled: true,
    priority: 100,
    condition: { matchType: 'always', value: true },
    action: {
      targetField: 'attributes.gender',
      valueTemplate: 'Men\'s Clothing',
      onlyIfEmpty: true
    },
    autoApply: true,
    autoApplyConfidence: 0.8
  };

  const baseImportRow: ImportRow = {
    productId: 'test_product_123',
    normalized: {
      title: 'Test Product',
      description: 'A test product for guardrail testing'
    },
    source: {
      raw: { title: 'Test Product' },
      format: 'csv'
    },
    existingProduct: null
  };

  describe('onlyIfEmpty = true (guardrail active)', () => {
    beforeEach(() => {
      engine.setRules([{ ...baseRule, action: { ...baseRule.action, onlyIfEmpty: true } }]);
    });

    it('should apply rule when target field is undefined', () => {
      // Arrange: No existing value
      const importRow = { ...baseImportRow };
      
      // Act
      const result = engine.evaluateForImport(importRow);
      
      // Assert: Rule should be applied
      expect(result.suggestions).toHaveLength(1);
      expect(result.autoApplied).toHaveLength(1);
      expect(result.autoApplied[0]).toMatchObject({
        ruleId: 'test_guardrail_rule',
        targetField: 'attributes.gender',
        value: 'Men\'s Clothing',
        applied: true
      });
      expect(result.updates).toHaveProperty('attributes.gender', 'Men\'s Clothing');
      
      // Should log successful application
      expect(result.activityLog.find(log => log.action === 'smartrule_auto_apply')).toBeTruthy();
      expect(result.activityLog.find(log => log.action === 'smartrule_guardrail_blocked')).toBeFalsy();
    });

    it('should apply rule when target field is null', () => {
      // Arrange: Existing product with null value
      const importRow = {
        ...baseImportRow,
        existingProduct: {
          productId: 'test_product_123',
          attributes: { gender: null }
        }
      };
      
      // Act
      const result = engine.evaluateForImport(importRow);
      
      // Assert: Rule should be applied
      expect(result.autoApplied).toHaveLength(1);
      expect(result.updates).toHaveProperty('attributes.gender', 'Men\'s Clothing');
      expect(result.activityLog.find(log => log.action === 'smartrule_guardrail_blocked')).toBeFalsy();
    });

    it('should apply rule when target field is empty string', () => {
      // Arrange: Existing product with empty string
      const importRow = {
        ...baseImportRow,
        existingProduct: {
          productId: 'test_product_123',
          attributes: { gender: '' }
        }
      };
      
      // Act
      const result = engine.evaluateForImport(importRow);
      
      // Assert: Rule should be applied
      expect(result.autoApplied).toHaveLength(1);
      expect(result.updates).toHaveProperty('attributes.gender', 'Men\'s Clothing');
      expect(result.activityLog.find(log => log.action === 'smartrule_guardrail_blocked')).toBeFalsy();
    });

    it('should NOT apply rule when target field has existing value (guardrail blocks)', () => {
      // Arrange: Existing product with non-empty value
      const importRow = {
        ...baseImportRow,
        existingProduct: {
          productId: 'test_product_123',
          attributes: { gender: 'Women\'s Clothing' }
        }
      };
      
      // Act
      const result = engine.evaluateForImport(importRow);
      
      // Assert: Rule should NOT be applied due to guardrail
      expect(result.suggestions).toHaveLength(1);
      expect(result.autoApplied).toHaveLength(0);
      expect(result.suggestions[0]).toMatchObject({
        ruleId: 'test_guardrail_rule',
        targetField: 'attributes.gender',
        value: 'Men\'s Clothing',
        applied: false,
        autoApply: false
      });
      
      // Should not update the field
      expect(result.updates).not.toHaveProperty('attributes.gender');
      
      // Should log guardrail block
      const guardLog = result.activityLog.find(log => log.action === 'smartrule_guardrail_blocked');
      expect(guardLog).toBeTruthy();
      expect(guardLog.details).toMatchObject({
        ruleId: 'test_guardrail_rule',
        targetField: 'attributes.gender',
        suggestedValue: 'Men\'s Clothing',
        existingValue: 'Women\'s Clothing',
        reason: 'GUARDRAIL_ONLY_IF_EMPTY'
      });
    });
  });

  describe('onlyIfEmpty = false (guardrail inactive)', () => {
    beforeEach(() => {
      engine.setRules([{ ...baseRule, action: { ...baseRule.action, onlyIfEmpty: false } }]);
    });

    it('should apply rule even when target field has existing value', () => {
      // Arrange: Existing product with non-empty value
      const importRow = {
        ...baseImportRow,
        existingProduct: {
          productId: 'test_product_123',
          attributes: { gender: 'Women\'s Clothing' }
        }
      };
      
      // Act
      const result = engine.evaluateForImport(importRow);
      
      // Assert: Rule should be applied despite existing value
      expect(result.suggestions).toHaveLength(1);
      expect(result.autoApplied).toHaveLength(1);
      expect(result.autoApplied[0]).toMatchObject({
        ruleId: 'test_guardrail_rule',
        targetField: 'attributes.gender',
        value: 'Men\'s Clothing',
        applied: true
      });
      expect(result.updates).toHaveProperty('attributes.gender', 'Men\'s Clothing');
      
      // Should log successful application, NOT guardrail block
      expect(result.activityLog.find(log => log.action === 'smartrule_auto_apply')).toBeTruthy();
      expect(result.activityLog.find(log => log.action === 'smartrule_guardrail_blocked')).toBeFalsy();
    });
  });

  describe('onlyIfEmpty = undefined (default behavior)', () => {
    beforeEach(() => {
      const ruleWithoutFlag = { ...baseRule };
      delete ruleWithoutFlag.action.onlyIfEmpty; // Remove the flag entirely
      engine.setRules([ruleWithoutFlag]);
    });

    it('should apply rule when onlyIfEmpty is undefined (treats as false)', () => {
      // Arrange: Existing product with non-empty value
      const importRow = {
        ...baseImportRow,
        existingProduct: {
          productId: 'test_product_123',
          attributes: { gender: 'Women\'s Clothing' }
        }
      };
      
      // Act
      const result = engine.evaluateForImport(importRow);
      
      // Assert: Rule should be applied (default behavior = no guardrail)
      expect(result.autoApplied).toHaveLength(1);
      expect(result.updates).toHaveProperty('attributes.gender', 'Men\'s Clothing');
      expect(result.activityLog.find(log => log.action === 'smartrule_guardrail_blocked')).toBeFalsy();
    });
  });

  describe('Complex scenarios', () => {
    it('should handle user-edited fields (skip regardless of guardrail)', () => {
      // This tests that user-edited fields are still respected
      const importRow = {
        ...baseImportRow,
        existingProduct: {
          productId: 'test_product_123',
          attributes: { gender: 'Women\'s Clothing' },
          // Simulate user edit tracking
          _editHistory: {
            'attributes.gender': { editedBy: 'user123', editedAt: '2024-01-01T00:00:00Z' }
          }
        }
      };
      
      // Mock the isUserEdited function to return true
      const originalIsUserEdited = require('../src/lib/smartEngineV2').isUserEdited;
      require('../src/lib/smartEngineV2').isUserEdited = jest.fn(() => true);
      
      engine.setRules([{ ...baseRule, action: { ...baseRule.action, onlyIfEmpty: true } }]);
      const result = engine.evaluateForImport(importRow);
      
      // Should not apply due to user edit (not guardrail)
      expect(result.autoApplied).toHaveLength(0);
      expect(result.activityLog.find(log => log.action === 'smartrule_guardrail_blocked')).toBeFalsy();
      
      // Restore
      require('../src/lib/smartEngineV2').isUserEdited = originalIsUserEdited;
    });

    it('should handle nested attribute paths correctly', () => {
      const nestedRule = {
        ...baseRule,
        action: {
          targetField: 'attributes.nested.category',
          valueTemplate: 'Test Category',
          onlyIfEmpty: true
        }
      };
      
      const importRow = {
        ...baseImportRow,
        existingProduct: {
          productId: 'test_product_123',
          attributes: { 
            nested: { 
              category: 'Existing Category' 
            } 
          }
        }
      };
      
      engine.setRules([nestedRule]);
      const result = engine.evaluateForImport(importRow);
      
      // Should be blocked by guardrail
      expect(result.autoApplied).toHaveLength(0);
      const guardLog = result.activityLog.find(log => log.action === 'smartrule_guardrail_blocked');
      expect(guardLog).toBeTruthy();
      expect(guardLog.details.targetField).toBe('attributes.nested.category');
    });
  });
});

// Export the test for Step 2.3 artifact generation
export const guardrailTestSummary = {
  step: '2.3',
  description: 'Engine honor guardrail during apply',
  testCases: [
    'onlyIfEmpty=true + empty field → APPLY (no guardrail block)',
    'onlyIfEmpty=true + existing value → BLOCK with GUARDRAIL_ONLY_IF_EMPTY log',
    'onlyIfEmpty=false + existing value → APPLY (guardrail inactive)',
    'onlyIfEmpty=undefined + existing value → APPLY (default behavior)',
    'User-edited field → SKIP (existing user-edit logic preserved)',
    'Nested attribute paths → Guardrail works correctly'
  ],
  implementation: {
    interface: 'Added onlyIfEmpty?: boolean to Action interface',
    logic: 'Modified canAutoApply check to honor action.onlyIfEmpty flag',
    logging: 'Added smartrule_guardrail_blocked activity log entry',
    fallback: 'onlyIfEmpty=undefined treats as false (no guardrail)'
  }
};