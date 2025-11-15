/**
 * ROPI Product Schema v2.0
 * Structured schema matching approved master document
 * Created: 2025-11-15
 */

/**
 * SKU Core - Essential product identification
 */
export interface SkuCore {
  mpn: string;                    // Manufacturer Part Number (Product ID)
  sku: string;                    // SKU (Variant ID)
  brand: string;                  // Brand name
  name: string;                   // Product name
  department: string;             // Department (e.g., "Footwear", "Apparel")
  class: string;                  // Class (e.g., "Athletic", "Casual")
  category: string;               // Category (e.g., "Running Shoes", "T-Shirts")
  styleId: string;                // Style ID (links colorways)
  coreProduct?: boolean;          // Marks main styles that persist across seasons
  productIsActive: boolean;       // Toggles product visibility
}

/**
 * Descriptive - Product characteristics and attributes
 */
export interface Descriptive {
  ageGroup: string;               // Age Group (Adult, Grade School, Toddler, Infant)
  gender: string;                 // Gender (Men's, Women's, Unisex)
  sportsTeam?: string;            // Sports Team name
  league?: string;                // League (NFL, NBA, etc.)
  fit: string;                    // Fit description
  material?: string[];            // Materials (multi-select array)
  cutType?: string;               // Cut Type (Low, Mid, High)
  closureType?: string;           // Closure Type (Lace-up, Slip-on, Velcro)
  platformHeight?: string;        // Platform Height
  heelType?: string;              // Heel Type (Stiletto, Block, Wedge)
  shoeHeightMap?: string;         // Shoe Height Map (Low, Mid, High)
  heelHeight?: number;            // Heel Height (numeric)
  outsoleMaterial?: string;       // Outsole Material
  primaryColor?: string;          // Primary Color
  descriptiveColor?: string;      // Descriptive Color (free-text manufacturer color)
  keywords?: string[];            // Keywords/tags
  description?: string;           // Long description (ROPI HTML output)
  familySizing?: boolean;         // Family sizing available
  madeIn?: string[];              // Countries of origin
  metaName: string;               // SEO meta name (≤60 chars)
  metaDescription: string;        // SEO meta description (≤155 chars)
  slug?: string;                  // URL slug
}

/**
 * Pricing - Price and promotional data
 */
export interface Pricing {
  map?: number;                   // Minimum Advertised Price
  promo?: boolean;                // Promotional flag
  scomRegularPrice?: number;      // SCOM regular price
  scomSalePrice?: number;         // SCOM sale price
}

/**
 * Technical - Shipping, inventory, media, and system data
 */
export interface Technical {
  website?: string[];             // Website availability
  height?: number;                // Shipping height
  length?: number;                // Shipping length
  width?: number;                 // Shipping width
  weight?: number;                // Shipping weight
  standardShippingOverride?: boolean;   // Standard shipping override
  expeditedOverrideShipping?: boolean;  // Expedited shipping override
  hideImageDate?: string;         // Image embargo date (ISO string)
  mediaStatus?: string;           // Media status ("Images Ready", "Pending", etc.)
  taxClass?: string;              // Tax class
  status?: string;                // Import status
  lastReceived?: string;          // Last received date (ISO string)
  firstReceived?: string;         // First received date (ISO string)
  store1?: number;                // Store 1 inventory
  storeInv?: number;              // Store inventory total
  warehouseInv?: number;          // Warehouse inventory
  whsInv?: number;                // WHS inventory
  store4?: number;                // Store 4 inventory
  totalInv?: number;              // Total inventory
}

/**
 * Launch - Launch and marketing data
 */
export interface Launch {
  hype?: boolean;                 // High-priority or limited drop
  fastFashion?: boolean;          // Fast fashion flag
  newCollection?: boolean;        // New collection flag
  klPostDate?: string;            // KL post date (ISO string)
  launchDate?: string;            // Launch date (ISO string)
}

/**
 * RICS Source Data - Read-only data from RICS
 */
export interface RicsSource {
  shortDescription?: string;      // RICS short description
  longDescription?: string;       // RICS long description
  brand?: string;                 // RICS brand
  category?: string;              // RICS category
  color?: string;                 // RICS color
}

/**
 * Source - External system data
 */
export interface Source {
  rics?: RicsSource;              // RICS system data
}

/**
 * AI Generated Data - System-generated content and metadata
 */
export interface AIGenerated {
  descriptionHtml?: string;       // AI-generated HTML description
  descriptionBlocks?: any;        // HTML blocks per section
  seoName?: string;               // AI-generated SEO name
  ropiScore?: number;             // ROPI validation score (0-10)
  validationFlags?: any[];        // Validation warnings/errors
  templateKey?: string;           // Template used for generation
  templateOverrideKey?: string;   // Manual template override
  smartDetectSummary?: any;       // Smart Detect autofill summary
}

/**
 * Main Product Interface - Structured schema
 */
export interface Product {
  sku_core: SkuCore;
  descriptive: Descriptive;
  pricing: Pricing;
  technical: Technical;
  launch: Launch;
  source?: Source;
  ai?: AIGenerated;
}

/**
 * Variant - Size/color variant of a product
 */
export interface Variant {
  variantId: string;              // Variant ID
  sku: string;                    // SKU
  size: string;                   // Size
  color: string;                  // Color
  price: number;                  // Variant price
}

/**
 * Product Facts - User-contributed product observations
 * Stored in products/{id}/facts subcollection
 */
export interface ProductFacts {
  observations: string;           // Product observations
  materials: string;              // Material observations
  fit: string;                    // Fit observations
  useCases: string;               // Use cases
  care: string;                   // Care instructions
  teamLeague: string;             // Team/league info
  keywords: string[];             // Keywords
  images: Array<{                 // Product fact images
    url: string;
    storagePath: string;
  }>;
  updatedBy: string;              // Last updater
  updatedAt: any;                 // Firestore Timestamp
}

/**
 * Legacy Product Type - For backward compatibility
 * @deprecated Use Product interface instead
 */
export interface LegacyProduct {
  id: string;
  mpn: string;
  name: string;
  brand: string;
  department: string;
  class: string;
  category: string;
  ageGroup: string;
  gender: string;
  materialFabric: string;
  materials?: string[];
  fit: string;
  primaryColor?: string;
  descriptiveColor?: string;
  cutType?: string;
  closureType?: string;
  heelHeight?: string;
  platformHeight?: string;
  heelType?: string;
  sportsTeam?: string;
  league?: string;
  websites: string[];
  featured: boolean;
  status: 'intake' | 'in-progress' | 'validated' | 'uploaded';
  isActive: boolean;
  coreProduct?: boolean;
  productGroup?: string;
  notes?: string;
  map: boolean;
  promo: boolean;
  hype: boolean;
  fastfashion: boolean;
  familySizing?: boolean;
  price?: {
    map?: number;
    promo?: string;
    scomRegular?: number;
    scomSale?: number;
    ricsRetail: number;
    ricsOffer?: number;
    scomOverride?: boolean;
  };
  launch?: {
    hype?: boolean;
    fastFashion?: boolean;
    date?: Date | string;
    newCollection?: boolean;
    klPostDate?: Date | string;
  };
  shipping?: {
    height?: number;
    width?: number;
    length?: number;
    weight?: number;
    heightUnit?: 'in' | 'cm';
    lengthUnit?: 'in' | 'cm';
    widthUnit?: 'in' | 'cm';
    standard?: boolean;
    expedited?: boolean;
    standardOverride?: boolean;
    expeditedOverride?: boolean;
  };
  dimensions?: {
    height?: number;
    length?: number;
    width?: number;
    heightUnit?: 'in' | 'cm';
    lengthUnit?: 'in' | 'cm';
    widthUnit?: 'in' | 'cm';
  };
  style?: {
    id?: string;
    shoeHeightMap?: string;
    heelHeight?: number;
    soleMaterial?: string;
  };
  tax?: {
    class?: string;
  };
  media?: {
    hideImageDate?: Date | string;
  };
  ricsCategory?: string;
  ricsLongDesc?: string;
  keywords?: string[];
  aiContext: {
    keywords: string[];
    featureBullets: string[];
    designNotes: string;
  };
  marketing: {
    title: string;
    bullets: string[];
    seo: string;
    paragraphDraft: string;
    paragraphFinal: string;
  };
  variants: Variant[];
  lastUpdated: string;
}
