/**
 * Product Editor Types
 * 
 * Type definitions for Product Editor data structures.
 * 
 * References:
 * - Product Completion Workflows (W2): https://www.notion.so/2ba45ee1ec5a80698690f9492961ed8b
 * - Workflow W1 — Observations: https://www.notion.so/2b845ee1ec5a81b5a4a6d3ea439ec277
 * - Observations Overview: https://www.notion.so/2b845ee1ec5a81e1aeeae43318b38039
 */

export type ProductStatus = 'draft' | 'in-progress' | 'export-ready';

export type ObservationSeverity = 'low' | 'medium' | 'high';

export type ObservationStatus = 'open' | 'resolved';

export type SuggestionStatus = 'pending' | 'applied' | 'ignored';

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
}

export interface NewObservation {
  title: string;
  description: string;
  severity: ObservationSeverity;
  imageUrl?: string;
  linkedField?: string;
}
