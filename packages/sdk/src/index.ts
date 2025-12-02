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
 */

// Export schema types
export type {
  Product,
  ProductCore,
  ProductAttributes,
  ProductPricing,
  ProductInventory,
  ProductMedia,
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

// Version info
export const SDK_VERSION = '0.3.0';
