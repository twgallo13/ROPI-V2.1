/**
 * ROPI Smart Rules Engine
 * ========================
 * Main entry point for the Smart Rules system.
 * 
 * Based on: ROPI AOSS v1.0 — Section 4
 */

// Export the main engine class
export { default as SmartRulesEngine } from './smartEngine';
export { SmartRulesEngine as default } from './smartEngine';

// Export engine utilities
export {
  deepGet,
  deepSet,
  normalizeToken,
  tokenize,
  generateId,
  isUserEdited,
  isAllowedTargetField,
  evaluateCondition,
  renderTemplate,
} from './smartEngine';

// Export canonical rules
export { 
  CANONICAL_RULES,
  getRulesAsJSON,
  getRulesByTag,
  getRuleById,
} from './canonicalRules';

// Export all types
export * from './types';
