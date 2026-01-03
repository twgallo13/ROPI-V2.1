/**
 * Completion Evaluation Engine - Entry Point
 * 
 * This file serves as the main entry point for the Completion Evaluation Engine.
 * It exports the core evaluation function and supporting types for external use.
 * 
 * GOVERNANCE EXCLUSIONS:
 * - No UI components
 * - No export gating logic 
 * - No Smart Rules integration
 * - No media/pricing evaluation
 * - No defaults or hard-coded attribute IDs
 * 
 * CORE FUNCTIONALITY:
 * - Pure evaluation module (no side effects)
 * - Deterministic weighted completion scoring
 * - Segment-based configuration 
 * - Site-aware attribute evaluation
 * - Registry-driven attribute resolution
 * - Settings-driven configuration
 */

export {
  evaluateCompletion,
  type ProductSnapshot,
  type AttributeRegistry,
  type AttributeRegistryEntry,
  type SegmentEvaluationResult,
  type SiteBlockingReason,
  type CompletionEvaluationResult
} from './completionEvaluationEngine';

export {
  type CompletionRulesConfig,
  type SegmentConfig,
  type AttributeSelectorConfig
} from './completionRulesService';

// Version and metadata
export const ENGINE_VERSION = '1.0.0';
export const ENGINE_DESCRIPTION = 'Pure math-only completion evaluation engine';
export const GOVERNANCE_COMPLIANCE = {
  excludesMedia: true,
  excludesPricing: true,
  excludesUI: true,
  excludesExportGating: true,
  excludesSmartRules: true,
  noDefaults: true,
  noHardcodedAttributes: true,
  pureFunctionality: true,
  deterministic: true
};