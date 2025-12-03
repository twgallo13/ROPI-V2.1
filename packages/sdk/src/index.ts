/**
 * @ropi-aoss/sdk
 * 
 * TypeScript SDK for Ropi AOSS
 * Provides types and validators for product data and attributes.
 * 
 * Per AOSS Sections:
 * - 2.1: Product Schema (JSON)
 * - 2.2: Attribute Validation Schema (JSON)
 * - 2.3: Attribute Domain Rules (JSON)
 * - 3.1: Import Engine Row Schema
 * - 3.2: Import Normalization Rules
 */

// Export schema types
export type {
  Product,
  ProductCore,
  ProductAttributes,
  ProductPricing,
  ProductInventory,
  ProductMedia,
  ProductStatusFlags,
} from './schema/product';

export type {
  AttributeDefinition,
  AttributeValue,
  AttributeRegistry,
  AttributeDataType,
  AttributeConstraint,
} from './schema/attribute';

export type {
  AttributeDomainRule,
  DomainRulesRegistry,
  DomainRuleType,
  RuleCondition,
  RuleAction,
} from './schema/domainRules';

export type {
  ImportEngineRow,
  ImportBatch,
  ImportSourceColumns,
  ImportNormalizedFields,
  ImportValidation,
  ImportRowMeta,
  ValidationIssue,
  ValidationCode,
  ColumnMapping,
  ImportConfig,
} from './schema/importEngine';

// Export validators
export {
  validateProduct,
  safeValidateProduct,
  ProductSchema,
  ProductCoreSchema,
  ProductAttributesSchema,
  ProductPricingSchema,
  ProductInventorySchema,
  ProductMediaSchema,
} from './validators/productValidator';

export {
  validateAttributeDefinition,
  validateAttributeValue,
  validateAttributeRegistry,
  validateAttributes,
  safeValidateAttributeDefinition,
  AttributeDefinitionSchema,
  AttributeValueSchema,
  AttributeRegistrySchema,
  AttributeDataTypeSchema,
  AttributeConstraintSchema,
} from './validators/attributeValidator';

export {
  validateImportRow,
  canProcessRow,
} from './validators/importValidator';

// Export normalization utilities
export {
  normalizeImportRow,
  deriveProductId,
  isEmptyRow,
  validateRequiredFields,
  DEFAULT_COLUMN_MAPPINGS,
} from './normalization/importNormalizer';

// Export import row builder
export {
  buildImportRow,
  buildImportRows,
} from './builders/importRowBuilder';
export type { BuildRowOptions } from './builders/importRowBuilder';

// Version info
export const SDK_VERSION = '0.3.0';
