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
    createdAt: string;
    updatedAt: string;
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
    [key: string]: string | undefined;
}
/**
 * Product pricing information
 */
export interface ProductPricing {
    msrp?: number;
    cost?: number;
    retailPrice?: number;
    currency?: string;
}
/**
 * Product inventory and availability
 */
export interface ProductInventory {
    quantity?: number;
    warehouse?: string;
    location?: string;
}
/**
 * Product media assets
 */
export interface ProductMedia {
    images?: string[];
    primaryImage?: string;
    videos?: string[];
}
/**
 * Product status flags for export and W2 tracking
 * Per AOSS Section 9 — Firebase Implementation & Security
 */
export interface ProductStatusFlags {
    ready_for_export: boolean;
    validation_status: 'valid' | 'has_warnings' | 'has_errors';
    uploaded_to_ro: boolean;
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
    statusFlags?: ProductStatusFlags;
    roUploadBatchId?: string | null;
    roUploadDate?: string | null;
    _meta?: {
        source?: string;
        importedAt?: string;
        normalizedAt?: string;
        validatedAt?: string;
    };
}
//# sourceMappingURL=product.d.ts.map