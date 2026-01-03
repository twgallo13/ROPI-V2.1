/**
 * Attribute Domain Rules Types
 * Per AOSS Section 2.3 — Attribute Domain Rules (JSON)
 * 
 * Defines business rules and relationships between attributes.
 */

/**
 * Type of domain rule
 */
export type DomainRuleType =
  | 'dependency' // One attribute depends on another
  | 'exclusion' // Two attributes cannot coexist
  | 'implication' // If A then B must be set
  | 'range' // Value must be within range
  | 'format' // Value must match format
  | 'custom'; // Custom rule logic
  // TODO (AOSS): Add remaining rule types from Section 2.3

/**
 * Condition for rule evaluation
 */
export interface RuleCondition {
  attribute: string;
  operator: 'equals' | 'notEquals' | 'contains' | 'greaterThan' | 'lessThan' | 'exists';
  value?: any;
  // TODO (AOSS): Add remaining operators from Section 2.3
}

/**
 * Action to take when rule is triggered
 */
export interface RuleAction {
  type: 'set' | 'unset' | 'validate' | 'warn' | 'error';
  attribute?: string;
  value?: any;
  message?: string;
  // TODO (AOSS): Add remaining action types from Section 2.3
}

/**
 * Attribute domain rule definition
 * Per AOSS Section 2.3 — Attribute Domain Rules
 */
export interface AttributeDomainRule {
  id: string;
  name: string;
  description?: string;
  ruleType: DomainRuleType;
  conditions: RuleCondition[];
  actions: RuleAction[];
  priority?: number; // For rule ordering
  enabled?: boolean;
  scope?: 'product' | 'category' | 'brand'; // Where rule applies
  
  // TODO (AOSS): Add remaining fields from Section 2.3 schema
}

/**
 * Domain rules registry - collection of all domain rules
 */
export interface DomainRulesRegistry {
  rules: AttributeDomainRule[];
  version?: string;
  updatedAt?: string;
  // TODO (AOSS): Add remaining registry metadata from Section 2.3
}
