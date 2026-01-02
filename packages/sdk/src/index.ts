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
  validateProductWithDomains,
  validateAttributesOnly,
  ProductSchema,
  ProductCoreSchema,
  ProductAttributesSchema,
  ProductPricingSchema,
  ProductInventorySchema,
  ProductMediaSchema,
} from './validators/productValidator';
export type { ProductValidationResult } from './validators/productValidator';

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

// LP-smart-rules-registry-1.0.0: Canonical registry validation
export {
  validateRegistryAttribute,
  safeValidateRegistryAttribute,
  validateCanonicalRegistry,
  safeValidateCanonicalRegistry,
  validateExportControlConsistency,
  validateRegistryExportConsistency,
  RegistryAttributeSchema,
  RegistryExportMetaSchema,
  CanonicalRegistrySchema,
  ExportTargetSchema,
} from './validators/registryValidator';

export type {
  RegistryAttributeDef,
  RegistryExportMeta,
  CanonicalRegistry,
} from './validators/registryValidator';

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
  // LP-importer-mapping-recon-1.1.0: Canonical registry ID helpers
  normalizeTargetFieldToRegistry,
  sourceColumnMatchesHeader,
} from './normalization/importNormalizer';

// LP-importer-mapping-recon-1.1.0: Export legacy-to-registry translation map
export {
  LEGACY_TO_REGISTRY,
  REGISTRY_TO_LEGACY,
} from './normalization/legacyToRegistryMap';

// Export import row builder
export {
  buildImportRow,
  buildImportRows,
} from './builders/importRowBuilder';
export type { BuildRowOptions } from './builders/importRowBuilder';

// ============================================================================
// Core Schemas (aoss.v0.4.0)
// JSON Schema-aligned types for canonical Product and Import Row
// ============================================================================

// Core Product Schema (per /schemas/product.schema.json)
export {
  productJsonSchema,
  validateCoreProduct,
  validateCoreProductOrThrow,
  CoreProductSchema,
  ProductImageSchema,
  ProductFlagsSchema,
  ProductMetaSchema,
} from './schemas/coreProduct';

export type {
  CoreProduct,
  ProductImage,
  ProductFlags,
  ProductMeta,
  ProductBrand,
  ProductGender,
  ProductCategory,
  ProductSizeScale,
  ProductStatus,
} from './schemas/coreProduct';

// Import Row Schema (per /schemas/import-row.schema.json)
export {
  importRowJsonSchema,
  validateImportRowSchema,
  validateImportRowSchemaOrThrow,
  ImportRowSchema,
  ImportRowRawSchema,
} from './schemas/importRow';

export type {
  ImportRow,
  ImportRowRaw,
  ImportSource,
} from './schemas/importRow';

// ============================================================================
// RetailOps Export (aoss.v0.5.0)
// Transform CoreProduct to RetailOps CSV format
// ============================================================================

export {
  buildRetailOpsRow,
  buildRetailOpsCsv,
  retailOpsExportMapping,
  getRetailOpsHeaderRow,
  RETAILOPS_COLUMN_NAMES,
  RETAILOPS_HEADER_ROW,
} from './export/retailOps';

export type {
  RetailOpsRow,
  RetailOpsColumnMapping,
  RetailOpsExportMappingConfig,
} from './export/retailOps';

// ============================================================================
// RetailOps Import (aoss.v0.6.0)
// Parse RetailOps CSV and transform to CoreProduct
// ============================================================================

export {
  parseRetailOpsCsv,
  retailOpsRowToImportRow,
  importRowToCoreProduct,
  retailOpsCsvToCoreProducts,
  retailOpsCsvToCoreProductsWithDetails,
  parsedRowsToImportRows,
  importRowsToCoreProducts,
} from './import/retailOps';

export type {
  RetailOpsCsvParseOptions,
  ParsedRetailOpsRow,
  RetailOpsImportResult,
} from './import/retailOps';

// ============================================================================
// Settings Schema Validators (Lisa v0.2.0-rc)
// Zod schemas for Attributes, SmartRules, and AITemplate
// ============================================================================

export { AttributeSchema, type AttributeType } from './schema/attribute';
export { 
  // Canonical schemas (Lisa v1.1.0)
  RuleSchema,
  ActionSchema,
  ConditionSchema,
  // Aliases for backward compatibility
  SmartRuleSchema, 
  SmartRuleCondition, 
  SmartRuleAction, 
  // Form schemas
  SmartRuleFormSchema,
  RuleConditionFormSchema,
  RuleActionFormSchema,
  MatchTypeEnum,
  // Validators
  validateSmartRule,
  safeValidateSmartRule,
  validateSmartRuleForm,
  // Utilities
  deepCleanUndefined,
  deepClean,
  normalizeFormToDocument,
  preSubmitValidation,
  // Types
  type SmartRuleType,
  type SmartRule,
  type SmartRuleForm,
  type RuleCondition,
  type RuleAction,
  type RuleConditionForm,
  type RuleActionForm,
  type MatchType,
  type ValidationResult,
} from './schema/smartRule';
export { AITemplateSchema, type AITemplateType } from './schema/aiTemplate';

// ============================================================================
// String Utilities (LP-2.1.6)
// Canonical attribute ID normalization
// ============================================================================

export {
  toSnakeCase,
  normalizeDataType,
  wouldCollide,
  detectCollisions
} from './lib/stringUtils';

// ============================================================================
// Attribute Registry (LP-attr-enforce-2.1.0)
// Runtime access to attributeRegistry.json for domain validation
// LP-smart-rules-registry-1.0.0: Export control helpers
// ============================================================================

export {
  getAttributeRegistry,
  getAttributes,
  getAttributeById,
  getAllowedValues,
  allowsCustomValues,
  validateAttributeDomain,
  validateAttributeDomains,
  getRegistryVersion,
  // LP-smart-rules-registry-1.0.0: Export control functions
  isExportable,
  isRequiredForExport,
  isInternalOnly,
  getExportMeta,
  getExportableAttributes,
  getRequiredForExportAttributes,
  getInternalOnlyAttributes,
  getAttributesForTarget,
} from './registry';

export type {
  RegistryAttribute,
  AttributeRegistryData,
  DomainValidationResult,
  // LP-smart-rules-registry-1.0.0: Export types
  ExportTarget,
  ExportMeta,
} from './registry';

// LP-smart-rules-registry-1.0.0: Re-export schema types
export type { ExportMetadata } from './schema/attribute';
export { ExportMetadataSchema } from './schema/attribute';

// Version info
export const SDK_VERSION = '0.6.0';

