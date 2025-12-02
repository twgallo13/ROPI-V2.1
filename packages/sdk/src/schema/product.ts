/**
 * Product Schema Types
 * Per AOSS Section 2.1 — Product Schema (JSON)
 * 
 * These types represent the canonical product data model for AOSS.
 * TODO (AOSS): Expand as Section 2.1 schema is finalized with all fields.
 */

/**
 * Core product identification and metadata
 */
export interface ProductCore {
  sku: string;
  title: string;
  brand: string;
  description?: string;
  status: 'draft' | 'active' | 'archived';
  createdAt: string; // ISO timestamp
  updatedAt: string; // ISO timestamp
  // TODO (AOSS): Add remaining core fields from Section 2.1 schema
}

/**
 * Product attributes - hierarchical classification and properties
 * Per AOSS Section 2.1 and Attribute Registry
 */
export interface ProductAttributes {
  department?: string;
  class?: string;
  category?: string;
  subcategory?: string;
  gender?: string;
  ageGroup?: string;
  color?: string;
  size?: string;
  material?: string;
  // TODO (AOSS): Add remaining attributes from Section 2.1 and Attribute Registry
  [key: string]: string | undefined; // Allow dynamic attributes
}

/**
 * Product pricing information
 */
export interface ProductPricing {
  msrp?: number;
  cost?: number;
  retailPrice?: number;
  currency?: string; // e.g., "USD"
  // TODO (AOSS): Add remaining pricing fields from Section 2.1 schema
}

/**
 * Product inventory and availability
 */
export interface ProductInventory {
  quantity?: number;
  warehouse?: string;
  location?: string;
  // TODO (AOSS): Add remaining inventory fields from Section 2.1 schema
}

/**
 * Product media assets
 */
export interface ProductMedia {
  images?: string[]; // URLs
  primaryImage?: string; // URL
  videos?: string[]; // URLs
  // TODO (AOSS): Add remaining media fields from Section 2.1 schema
}

/**
 * Complete Product object
 * Per AOSS Section 2.1 — Product Schema (JSON)
 */
export interface Product {
  core: ProductCore;
  attributes: ProductAttributes;
  pricing?: ProductPricing;
  inventory?: ProductInventory;
  media?: ProductMedia;
  
  // Metadata for import/normalization tracking
  _meta?: {
    source?: string; // e.g., "notion", "csv"
    importedAt?: string; // ISO timestamp
    normalizedAt?: string; // ISO timestamp
    validatedAt?: string; // ISO timestamp
  };
  
  // TODO (AOSS): Add remaining top-level fields from Section 2.1 schema
}
