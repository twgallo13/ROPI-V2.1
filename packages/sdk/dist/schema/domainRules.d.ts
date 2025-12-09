/**
 * Attribute Domain Rules Types
 * Per AOSS Section 2.3 — Attribute Domain Rules (JSON)
 *
 * Defines business rules and relationships between attributes.
 */
/**
 * Type of domain rule
 */
export type DomainRuleType = 'dependency' | 'exclusion' | 'implication' | 'range' | 'format' | 'custom';
/**
 * Condition for rule evaluation
 */
export interface RuleCondition {
    attribute: string;
    operator: 'equals' | 'notEquals' | 'contains' | 'greaterThan' | 'lessThan' | 'exists';
    value?: any;
}
/**
 * Action to take when rule is triggered
 */
export interface RuleAction {
    type: 'set' | 'unset' | 'validate' | 'warn' | 'error';
    attribute?: string;
    value?: any;
    message?: string;
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
    priority?: number;
    enabled?: boolean;
    scope?: 'product' | 'category' | 'brand';
}
/**
 * Domain rules registry - collection of all domain rules
 */
export interface DomainRulesRegistry {
    rules: AttributeDomainRule[];
    version?: string;
    updatedAt?: string;
}
