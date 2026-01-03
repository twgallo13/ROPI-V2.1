/**
 * Product Editor Types
 * 
 * Type definitions for Product Editor data structures.
 * 
 * References:
 * - Product Completion Workflows (W2): https://www.notion.so/2ba45ee1ec5a80698690f9492961ed8b
 * - Workflow W1 — Observations: https://www.notion.so/2b845ee1ec5a81b5a4a6d3ea439ec277
 * - Observations Overview: https://www.notion.so/2b845ee1ec5a81e1aeeae43318b38039
 * 
 * S5: Added FieldProvenance and provenance types for Smart Rules provenance tracking
 */

export type ProductStatus = 'draft' | 'in-progress' | 'export-ready';

/** LP-0.1.1: Debug/audit field for tracking product data source */
export type ProductSource = 'localStorage' | 'firestore' | 'mock';

export type ObservationSeverity = 'low' | 'medium' | 'high';

export type ObservationStatus = 'open' | 'resolved';

export type SuggestionStatus = 'pending' | 'applied' | 'ignored';

/**
 * S5: Per-field provenance structure for tracking value origins
 * Matches the API's FieldProvenance type from smartEngineV2
 */
export interface FieldProvenance {
  /** Source of the value */
  source: 'smartRule' | 'human' | 'import' | 'api';
  /** Rule ID if source is smartRule */
  ruleId?: string;
  /** Rule name if source is smartRule */
  ruleName?: string;
  /** When the value was applied */
  appliedAt: string;
  /** Input data used to generate the value */
  input?: Record<string, unknown>;
  /** Human-readable reason for the value */
  reason?: string;
  /** Actor info if source is human - can be string (email/uid) or object */
  actor?: string | { uid: string; name: string; };
}

/**
 * S5: Activity log entry for tracking provenance changes
 */
export interface ActivityLogEntry {
  /** Actor - can be string (email/uid) or object */
  actor: string | { uid: string; name: string; };
  action: 'user_replaced_smartrule' | 'smartrule_auto_apply' | 'user_edit' | 'conflict_resolved';
  timestamp: string;
  details: {
    fieldPath?: string;
    previousProvenance?: FieldProvenance;
    previousSource?: string;
    previousRuleId?: string;
    newValue?: unknown;
    [key: string]: unknown;
  };
}

export interface ProductAttributes {
  [key: string]: string | string[];
}

export interface WebsiteDescription {
  main: string;
  seoTitle: string;
  metaDescription: string;
}

export interface WebsiteDescriptions {
  [website: string]: WebsiteDescription;
}

export interface ProductMedia {
  heroImage: string;
  gallery: string[];
}

export interface WebsiteChecklist {
  coreInfo: boolean;
  attributes: boolean;
  descriptions: boolean;
  media: boolean;
  pricing: boolean;
}

export interface WebsiteReadiness {
  score: number;
  checklist: WebsiteChecklist;
  missingAttributes?: Array<{ id: string; label: string }>;
}

export interface ExportReadiness {
  overall: number;
  byWebsite: {
    [website: string]: WebsiteReadiness;
  };
}

export interface Observation {
  id: string;
  title: string;
  description: string;
  severity: ObservationSeverity;
  status: ObservationStatus;
  timestamp: string;
  imageUrl?: string;
  linkedField?: string;
}

export interface SmartSuggestion {
  id: string;
  targetField: string;
  currentValue: string | null;
  proposedValue: string;
  confidence: number;
  reason: string;
  status: SuggestionStatus;
}

export interface AIHistoryEntry {
  id: string;
  action: string;
  timestamp: string;
  result: string;
  confidence: number;
}

export interface Product {
  id: string;
  sku: string;
  styleId: string;
  name: string;
  status: ProductStatus;
  websites: string[];
  brand: string;
  category: string;
  department: string;
  subcategory: string;
  firstReceived: string;
  launchDate: string;
  launchStatus: string;
  attributes: ProductAttributes;
  descriptions: WebsiteDescriptions;
  media: ProductMedia;
  exportReadiness: ExportReadiness;
  observations: Observation[];
  smartSuggestions: SmartSuggestion[];
  aiHistory: AIHistoryEntry[];
  
  /** S5: Per-field provenance map (e.g., 'attributes.gender' -> FieldProvenance) */
  provenance?: Record<string, FieldProvenance>;
  
  /** S5: Activity log for audit trail */
  activityLog?: ActivityLogEntry[];
  
  // LP-0.4.0: Tab 0 (Product Header) fields - Read-only metadata
  /** MPN - Manufacturer Part Number (required for export) */
  mpn?: string;
  /** Product Is Active - Toggle state from ROPI */
  product_is_active?: boolean;
  /** Last Received - Latest warehouse scan date */
  last_received?: string;
  /** Total Inventory - Sum of warehouse + store inventory */
  total_inv?: number;
  /** Warehouse Inventory */
  warehouse_inv?: number;
  /** Store Inventory */
  store_inv?: number;
  /** Media Status - Derived from image count (e.g., 'complete', 'partial', 'missing') */
  media_status?: 'complete' | 'partial' | 'missing';
  
  // LP-0.4.1: Tab 1 (Core Information) - Class field
  /** Product Class (e.g., Lifestyle, Performance) */
  class?: string;
  
  // LP-0.4.1: Tab 3 (Launch & Media) fields
  /** HYPE product flag - high-demand/limited release */
  hype?: boolean;
  /** Family Sizing - Boolean for family sizes availability */
  family_sizing?: boolean;
  /** KL Post Date */
  kl_post_date?: string;
  /** Launch Date (alternate snake_case accessor) */
  launch_date?: string;
  
  // LP-0.4.4: Tab 3 (Launch & Media) - Additional pricing/launch fields
  /** Hide Image Date */
  hide_image_date?: string;
  /** Drawing type (FCFS, Store-only, Web-only, Store & Web, Token set) */
  drawing?: string;
  /** MAP - Minimum Advertised Price toggle (boolean) */
  map?: boolean;
  /** Promo allowed (true=allowed, false=disallowed) */
  promo?: boolean;
  /** SCOM Regular Price */
  scom_regular_price?: string;
  /** SCOM Sale Price */
  scom_sale_price?: string;
  /** Standard Shipping Override */
  standard_shipping_override?: string;
  /** Expedited Shipping Override */
  expedited_override_shipping?: string;
  /** Custom Message (Internal) */
  custom_message?: string;
  
  // LP-0.4.2: Tab 4 (Technical) fields
  /** GTIN/UPC - Global Trade Item Number */
  gtin?: string;
  /** Tax Class - for export classification */
  tax_class?: string;
  /** Package height (inches) */
  height?: string;
  /** Package length (inches) */
  length?: string;
  /** Package width (inches) */
  width?: string;
  /** Package weight (oz) */
  weight?: string;
  /** First received date (snake_case alternate) */
  first_received?: string;
  
  // LP-0.4.2: Tab 6 (Descriptions & SEO) fields
  /** Site-specific description - Shiekh */
  description_shiekh?: string;
  /** Site-specific description - Karmaloop */
  description_karmaloop?: string;
  /** Site-specific description - MLTD */
  description_mltd?: string;
  /** Site-specific description - Sangremia */
  description_sangremia?: string;
  /** SEO Meta Title */
  meta_name?: string;
  /** SEO Meta Description */
  meta_description?: string;
  /** SEO Keywords (comma-separated) */
  keywords?: string;
  
  /** LP-0.1.1: Debug/audit field — tracks where product data was loaded from */
  __source?: ProductSource;
}

export interface NewObservation {
  title: string;
  description: string;
  severity: ObservationSeverity;
  imageUrl?: string;
  linkedField?: string;
}
