"use strict";
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
Object.defineProperty(exports, "__esModule", { value: true });
exports.RETAILOPS_COLUMN_NAMES = exports.getRetailOpsHeaderRow = exports.retailOpsExportMapping = exports.buildRetailOpsCsv = exports.buildRetailOpsRow = exports.ImportRowRawSchema = exports.ImportRowSchema = exports.validateImportRowSchemaOrThrow = exports.validateImportRowSchema = exports.importRowJsonSchema = exports.ProductMetaSchema = exports.ProductFlagsSchema = exports.ProductImageSchema = exports.CoreProductSchema = exports.validateCoreProductOrThrow = exports.validateCoreProduct = exports.productJsonSchema = exports.buildImportRows = exports.buildImportRow = exports.REGISTRY_TO_LEGACY = exports.LEGACY_TO_REGISTRY = exports.sourceColumnMatchesHeader = exports.normalizeTargetFieldToRegistry = exports.DEFAULT_COLUMN_MAPPINGS = exports.validateRequiredFields = exports.isEmptyRow = exports.deriveProductId = exports.normalizeImportRow = exports.canProcessRow = exports.validateImportRow = exports.AttributeConstraintSchema = exports.AttributeDataTypeSchema = exports.AttributeRegistrySchema = exports.AttributeValueSchema = exports.AttributeDefinitionSchema = exports.safeValidateAttributeDefinition = exports.validateAttributes = exports.validateAttributeRegistry = exports.validateAttributeValue = exports.validateAttributeDefinition = exports.ProductMediaSchema = exports.ProductInventorySchema = exports.ProductPricingSchema = exports.ProductAttributesSchema = exports.ProductCoreSchema = exports.ProductSchema = exports.validateAttributesOnly = exports.validateProductWithDomains = exports.safeValidateProduct = exports.validateProduct = void 0;
exports.SDK_VERSION = exports.getRegistryVersion = exports.validateAttributeDomains = exports.validateAttributeDomain = exports.allowsCustomValues = exports.getAllowedValues = exports.getAttributeById = exports.getAttributes = exports.getAttributeRegistry = exports.detectCollisions = exports.wouldCollide = exports.normalizeDataType = exports.toSnakeCase = exports.AITemplateSchema = exports.SmartRuleAction = exports.SmartRuleCondition = exports.SmartRuleSchema = exports.AttributeSchema = exports.importRowsToCoreProducts = exports.parsedRowsToImportRows = exports.retailOpsCsvToCoreProductsWithDetails = exports.retailOpsCsvToCoreProducts = exports.importRowToCoreProduct = exports.retailOpsRowToImportRow = exports.parseRetailOpsCsv = exports.RETAILOPS_HEADER_ROW = void 0;
// Export validators
var productValidator_1 = require("./validators/productValidator");
Object.defineProperty(exports, "validateProduct", { enumerable: true, get: function () { return productValidator_1.validateProduct; } });
Object.defineProperty(exports, "safeValidateProduct", { enumerable: true, get: function () { return productValidator_1.safeValidateProduct; } });
Object.defineProperty(exports, "validateProductWithDomains", { enumerable: true, get: function () { return productValidator_1.validateProductWithDomains; } });
Object.defineProperty(exports, "validateAttributesOnly", { enumerable: true, get: function () { return productValidator_1.validateAttributesOnly; } });
Object.defineProperty(exports, "ProductSchema", { enumerable: true, get: function () { return productValidator_1.ProductSchema; } });
Object.defineProperty(exports, "ProductCoreSchema", { enumerable: true, get: function () { return productValidator_1.ProductCoreSchema; } });
Object.defineProperty(exports, "ProductAttributesSchema", { enumerable: true, get: function () { return productValidator_1.ProductAttributesSchema; } });
Object.defineProperty(exports, "ProductPricingSchema", { enumerable: true, get: function () { return productValidator_1.ProductPricingSchema; } });
Object.defineProperty(exports, "ProductInventorySchema", { enumerable: true, get: function () { return productValidator_1.ProductInventorySchema; } });
Object.defineProperty(exports, "ProductMediaSchema", { enumerable: true, get: function () { return productValidator_1.ProductMediaSchema; } });
var attributeValidator_1 = require("./validators/attributeValidator");
Object.defineProperty(exports, "validateAttributeDefinition", { enumerable: true, get: function () { return attributeValidator_1.validateAttributeDefinition; } });
Object.defineProperty(exports, "validateAttributeValue", { enumerable: true, get: function () { return attributeValidator_1.validateAttributeValue; } });
Object.defineProperty(exports, "validateAttributeRegistry", { enumerable: true, get: function () { return attributeValidator_1.validateAttributeRegistry; } });
Object.defineProperty(exports, "validateAttributes", { enumerable: true, get: function () { return attributeValidator_1.validateAttributes; } });
Object.defineProperty(exports, "safeValidateAttributeDefinition", { enumerable: true, get: function () { return attributeValidator_1.safeValidateAttributeDefinition; } });
Object.defineProperty(exports, "AttributeDefinitionSchema", { enumerable: true, get: function () { return attributeValidator_1.AttributeDefinitionSchema; } });
Object.defineProperty(exports, "AttributeValueSchema", { enumerable: true, get: function () { return attributeValidator_1.AttributeValueSchema; } });
Object.defineProperty(exports, "AttributeRegistrySchema", { enumerable: true, get: function () { return attributeValidator_1.AttributeRegistrySchema; } });
Object.defineProperty(exports, "AttributeDataTypeSchema", { enumerable: true, get: function () { return attributeValidator_1.AttributeDataTypeSchema; } });
Object.defineProperty(exports, "AttributeConstraintSchema", { enumerable: true, get: function () { return attributeValidator_1.AttributeConstraintSchema; } });
var importValidator_1 = require("./validators/importValidator");
Object.defineProperty(exports, "validateImportRow", { enumerable: true, get: function () { return importValidator_1.validateImportRow; } });
Object.defineProperty(exports, "canProcessRow", { enumerable: true, get: function () { return importValidator_1.canProcessRow; } });
// Export normalization utilities
var importNormalizer_1 = require("./normalization/importNormalizer");
Object.defineProperty(exports, "normalizeImportRow", { enumerable: true, get: function () { return importNormalizer_1.normalizeImportRow; } });
Object.defineProperty(exports, "deriveProductId", { enumerable: true, get: function () { return importNormalizer_1.deriveProductId; } });
Object.defineProperty(exports, "isEmptyRow", { enumerable: true, get: function () { return importNormalizer_1.isEmptyRow; } });
Object.defineProperty(exports, "validateRequiredFields", { enumerable: true, get: function () { return importNormalizer_1.validateRequiredFields; } });
Object.defineProperty(exports, "DEFAULT_COLUMN_MAPPINGS", { enumerable: true, get: function () { return importNormalizer_1.DEFAULT_COLUMN_MAPPINGS; } });
// LP-importer-mapping-recon-1.1.0: Canonical registry ID helpers
Object.defineProperty(exports, "normalizeTargetFieldToRegistry", { enumerable: true, get: function () { return importNormalizer_1.normalizeTargetFieldToRegistry; } });
Object.defineProperty(exports, "sourceColumnMatchesHeader", { enumerable: true, get: function () { return importNormalizer_1.sourceColumnMatchesHeader; } });
// LP-importer-mapping-recon-1.1.0: Export legacy-to-registry translation map
var legacyToRegistryMap_1 = require("./normalization/legacyToRegistryMap");
Object.defineProperty(exports, "LEGACY_TO_REGISTRY", { enumerable: true, get: function () { return legacyToRegistryMap_1.LEGACY_TO_REGISTRY; } });
Object.defineProperty(exports, "REGISTRY_TO_LEGACY", { enumerable: true, get: function () { return legacyToRegistryMap_1.REGISTRY_TO_LEGACY; } });
// Export import row builder
var importRowBuilder_1 = require("./builders/importRowBuilder");
Object.defineProperty(exports, "buildImportRow", { enumerable: true, get: function () { return importRowBuilder_1.buildImportRow; } });
Object.defineProperty(exports, "buildImportRows", { enumerable: true, get: function () { return importRowBuilder_1.buildImportRows; } });
// ============================================================================
// Core Schemas (aoss.v0.4.0)
// JSON Schema-aligned types for canonical Product and Import Row
// ============================================================================
// Core Product Schema (per /schemas/product.schema.json)
var coreProduct_1 = require("./schemas/coreProduct");
Object.defineProperty(exports, "productJsonSchema", { enumerable: true, get: function () { return coreProduct_1.productJsonSchema; } });
Object.defineProperty(exports, "validateCoreProduct", { enumerable: true, get: function () { return coreProduct_1.validateCoreProduct; } });
Object.defineProperty(exports, "validateCoreProductOrThrow", { enumerable: true, get: function () { return coreProduct_1.validateCoreProductOrThrow; } });
Object.defineProperty(exports, "CoreProductSchema", { enumerable: true, get: function () { return coreProduct_1.CoreProductSchema; } });
Object.defineProperty(exports, "ProductImageSchema", { enumerable: true, get: function () { return coreProduct_1.ProductImageSchema; } });
Object.defineProperty(exports, "ProductFlagsSchema", { enumerable: true, get: function () { return coreProduct_1.ProductFlagsSchema; } });
Object.defineProperty(exports, "ProductMetaSchema", { enumerable: true, get: function () { return coreProduct_1.ProductMetaSchema; } });
// Import Row Schema (per /schemas/import-row.schema.json)
var importRow_1 = require("./schemas/importRow");
Object.defineProperty(exports, "importRowJsonSchema", { enumerable: true, get: function () { return importRow_1.importRowJsonSchema; } });
Object.defineProperty(exports, "validateImportRowSchema", { enumerable: true, get: function () { return importRow_1.validateImportRowSchema; } });
Object.defineProperty(exports, "validateImportRowSchemaOrThrow", { enumerable: true, get: function () { return importRow_1.validateImportRowSchemaOrThrow; } });
Object.defineProperty(exports, "ImportRowSchema", { enumerable: true, get: function () { return importRow_1.ImportRowSchema; } });
Object.defineProperty(exports, "ImportRowRawSchema", { enumerable: true, get: function () { return importRow_1.ImportRowRawSchema; } });
// ============================================================================
// RetailOps Export (aoss.v0.5.0)
// Transform CoreProduct to RetailOps CSV format
// ============================================================================
var retailOps_1 = require("./export/retailOps");
Object.defineProperty(exports, "buildRetailOpsRow", { enumerable: true, get: function () { return retailOps_1.buildRetailOpsRow; } });
Object.defineProperty(exports, "buildRetailOpsCsv", { enumerable: true, get: function () { return retailOps_1.buildRetailOpsCsv; } });
Object.defineProperty(exports, "retailOpsExportMapping", { enumerable: true, get: function () { return retailOps_1.retailOpsExportMapping; } });
Object.defineProperty(exports, "getRetailOpsHeaderRow", { enumerable: true, get: function () { return retailOps_1.getRetailOpsHeaderRow; } });
Object.defineProperty(exports, "RETAILOPS_COLUMN_NAMES", { enumerable: true, get: function () { return retailOps_1.RETAILOPS_COLUMN_NAMES; } });
Object.defineProperty(exports, "RETAILOPS_HEADER_ROW", { enumerable: true, get: function () { return retailOps_1.RETAILOPS_HEADER_ROW; } });
// ============================================================================
// RetailOps Import (aoss.v0.6.0)
// Parse RetailOps CSV and transform to CoreProduct
// ============================================================================
var retailOps_2 = require("./import/retailOps");
Object.defineProperty(exports, "parseRetailOpsCsv", { enumerable: true, get: function () { return retailOps_2.parseRetailOpsCsv; } });
Object.defineProperty(exports, "retailOpsRowToImportRow", { enumerable: true, get: function () { return retailOps_2.retailOpsRowToImportRow; } });
Object.defineProperty(exports, "importRowToCoreProduct", { enumerable: true, get: function () { return retailOps_2.importRowToCoreProduct; } });
Object.defineProperty(exports, "retailOpsCsvToCoreProducts", { enumerable: true, get: function () { return retailOps_2.retailOpsCsvToCoreProducts; } });
Object.defineProperty(exports, "retailOpsCsvToCoreProductsWithDetails", { enumerable: true, get: function () { return retailOps_2.retailOpsCsvToCoreProductsWithDetails; } });
Object.defineProperty(exports, "parsedRowsToImportRows", { enumerable: true, get: function () { return retailOps_2.parsedRowsToImportRows; } });
Object.defineProperty(exports, "importRowsToCoreProducts", { enumerable: true, get: function () { return retailOps_2.importRowsToCoreProducts; } });
// ============================================================================
// Settings Schema Validators (Lisa v0.2.0-rc)
// Zod schemas for Attributes, SmartRules, and AITemplate
// ============================================================================
var attribute_1 = require("./schema/attribute");
Object.defineProperty(exports, "AttributeSchema", { enumerable: true, get: function () { return attribute_1.AttributeSchema; } });
var smartRule_1 = require("./schema/smartRule");
Object.defineProperty(exports, "SmartRuleSchema", { enumerable: true, get: function () { return smartRule_1.SmartRuleSchema; } });
Object.defineProperty(exports, "SmartRuleCondition", { enumerable: true, get: function () { return smartRule_1.SmartRuleCondition; } });
Object.defineProperty(exports, "SmartRuleAction", { enumerable: true, get: function () { return smartRule_1.SmartRuleAction; } });
var aiTemplate_1 = require("./schema/aiTemplate");
Object.defineProperty(exports, "AITemplateSchema", { enumerable: true, get: function () { return aiTemplate_1.AITemplateSchema; } });
// ============================================================================
// String Utilities (LP-2.1.6)
// Canonical attribute ID normalization
// ============================================================================
var stringUtils_1 = require("./lib/stringUtils");
Object.defineProperty(exports, "toSnakeCase", { enumerable: true, get: function () { return stringUtils_1.toSnakeCase; } });
Object.defineProperty(exports, "normalizeDataType", { enumerable: true, get: function () { return stringUtils_1.normalizeDataType; } });
Object.defineProperty(exports, "wouldCollide", { enumerable: true, get: function () { return stringUtils_1.wouldCollide; } });
Object.defineProperty(exports, "detectCollisions", { enumerable: true, get: function () { return stringUtils_1.detectCollisions; } });
// ============================================================================
// Attribute Registry (LP-attr-enforce-2.1.0)
// Runtime access to attributeRegistry.json for domain validation
// ============================================================================
var registry_1 = require("./registry");
Object.defineProperty(exports, "getAttributeRegistry", { enumerable: true, get: function () { return registry_1.getAttributeRegistry; } });
Object.defineProperty(exports, "getAttributes", { enumerable: true, get: function () { return registry_1.getAttributes; } });
Object.defineProperty(exports, "getAttributeById", { enumerable: true, get: function () { return registry_1.getAttributeById; } });
Object.defineProperty(exports, "getAllowedValues", { enumerable: true, get: function () { return registry_1.getAllowedValues; } });
Object.defineProperty(exports, "allowsCustomValues", { enumerable: true, get: function () { return registry_1.allowsCustomValues; } });
Object.defineProperty(exports, "validateAttributeDomain", { enumerable: true, get: function () { return registry_1.validateAttributeDomain; } });
Object.defineProperty(exports, "validateAttributeDomains", { enumerable: true, get: function () { return registry_1.validateAttributeDomains; } });
Object.defineProperty(exports, "getRegistryVersion", { enumerable: true, get: function () { return registry_1.getRegistryVersion; } });
// Version info
exports.SDK_VERSION = '0.6.0';
//# sourceMappingURL=index.js.map