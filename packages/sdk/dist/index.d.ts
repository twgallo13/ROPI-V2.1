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
export type { Product, ProductCore, ProductAttributes, ProductPricing, ProductInventory, ProductMedia, ProductStatusFlags, } from './schema/product';
export type { AttributeDefinition, AttributeValue, AttributeRegistry, AttributeDataType, AttributeConstraint, } from './schema/attribute';
export type { AttributeDomainRule, DomainRulesRegistry, DomainRuleType, RuleCondition, RuleAction, } from './schema/domainRules';
export type { ImportEngineRow, ImportBatch, ImportSourceColumns, ImportNormalizedFields, ImportValidation, ImportRowMeta, ValidationIssue, ValidationCode, ColumnMapping, ImportConfig, } from './schema/importEngine';
export { validateProduct, safeValidateProduct, ProductSchema, ProductCoreSchema, ProductAttributesSchema, ProductPricingSchema, ProductInventorySchema, ProductMediaSchema, } from './validators/productValidator';
export { validateAttributeDefinition, validateAttributeValue, validateAttributeRegistry, validateAttributes, safeValidateAttributeDefinition, AttributeDefinitionSchema, AttributeValueSchema, AttributeRegistrySchema, AttributeDataTypeSchema, AttributeConstraintSchema, } from './validators/attributeValidator';
export { validateImportRow, canProcessRow, } from './validators/importValidator';
export { normalizeImportRow, deriveProductId, isEmptyRow, validateRequiredFields, DEFAULT_COLUMN_MAPPINGS, } from './normalization/importNormalizer';
export { buildImportRow, buildImportRows, } from './builders/importRowBuilder';
export type { BuildRowOptions } from './builders/importRowBuilder';
export { productJsonSchema, validateCoreProduct, validateCoreProductOrThrow, CoreProductSchema, ProductImageSchema, ProductFlagsSchema, ProductMetaSchema, } from './schemas/coreProduct';
export type { CoreProduct, ProductImage, ProductFlags, ProductMeta, ProductBrand, ProductGender, ProductCategory, ProductSizeScale, ProductStatus, } from './schemas/coreProduct';
export { importRowJsonSchema, validateImportRowSchema, validateImportRowSchemaOrThrow, ImportRowSchema, ImportRowRawSchema, } from './schemas/importRow';
export type { ImportRow, ImportRowRaw, ImportSource, } from './schemas/importRow';
export { buildRetailOpsRow, buildRetailOpsCsv, retailOpsExportMapping, getRetailOpsHeaderRow, RETAILOPS_COLUMN_NAMES, RETAILOPS_HEADER_ROW, } from './export/retailOps';
export type { RetailOpsRow, RetailOpsColumnMapping, RetailOpsExportMappingConfig, } from './export/retailOps';
export { parseRetailOpsCsv, retailOpsRowToImportRow, importRowToCoreProduct, retailOpsCsvToCoreProducts, retailOpsCsvToCoreProductsWithDetails, parsedRowsToImportRows, importRowsToCoreProducts, } from './import/retailOps';
export type { RetailOpsCsvParseOptions, ParsedRetailOpsRow, RetailOpsImportResult, } from './import/retailOps';
export { AttributeSchema, type AttributeType } from './schema/attribute';
export { SmartRuleSchema, SmartRuleCondition, SmartRuleAction, type SmartRuleType } from './schema/smartRule';
export { AITemplateSchema, type AITemplateType } from './schema/aiTemplate';
export declare const SDK_VERSION = "0.6.0";
