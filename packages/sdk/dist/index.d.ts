// Minimal type declarations for @ropi-aoss/sdk
// Provides basic TypeScript support for CI builds

export const DEFAULT_COLUMN_MAPPINGS: any;
export const SDK_VERSION: string;

// Schema types
export type ImportBatch = any;
export type ImportEngineRow = any;
export type ImportNormalizedFields = any;
export type ImportSourceColumns = any;
export type ValidationIssue = any;
export type ColumnMapping = any;
export type BuildRowOptions = any;
export type Product = any;
export type ProductCore = any;
export type ProductAttributes = any;
export type ProductPricing = any;
export type ProductInventory = any;
export type ProductMedia = any;
export type ProductStatusFlags = any;
export type ProductSchema = any;
export type ProductCoreSchema = any;
export type ProductAttributesSchema = any;
export type ProductPricingSchema = any;
export type ProductInventorySchema = any;
export type ProductMediaSchema = any;
export type AttributeDefinition = any;
export type AttributeDataTypeSchema = any;
export type AttributeValueSchema = any;
export type AttributeConstraintSchema = any;
export type AttributeDefinitionSchema = any;
export type AttributeRegistrySchema = any;

// Validation functions
export function normalizeImportRow(sourceColumns: any, mappings?: any): any;
export function validateImportRow(normalized: any): any;
export function deriveProductId(sku: any): string;
export function isEmptyRow(sourceColumns: any): boolean;
export function validateRequiredFields(normalized: any, mappings?: any): string[];
export function canProcessRow(row: any): boolean;

// Builder functions
export function buildImportRow(sourceColumns: any, options: any): any;
export function buildImportRows(csvData: any, batchId: string, userId: string, mappings?: any): any[];

// Product validation
export function validateProduct(product: any): any;
export function safeValidateProduct(product: any): any;
export function validateAttributes(attributes: any): any;

// Attribute validation
export function validateAttributeDefinition(input: any): any;
export function validateAttributeRegistry(input: any): any;
export function validateAttributeValue(value: any, definition: any): any;
export function safeValidateAttributeDefinition(input: any): any;
