// Based on Section 3.3 / C.1
export type Variant = {
  variantId: string;
  sku: string;
  size: string;
  color: string;
  price: number;
};

// Product Facts stored in products/{id}/facts subcollection
export type ProductFacts = {
  observations: string;
  materials: string;
  fit: string;
  useCases: string;
  care: string;
  teamLeague: string;
  keywords: string[];
  images: Array<{ url: string; storagePath: string }>; // Firebase Storage downloads with paths for deletion
  updatedBy: string;
  updatedAt: any; // Firestore Timestamp
};

// Based on Section 3.3 / C.1 and expanded
export type Product = {
  id: string; // This is the 'styleId'
  mpn: string; // The MPN
  name: string; // Product name
  brand: string;
  department: string;
  class: string;
  category: string;
  ageGroup: string;
  gender: string;
  materialFabric: string; // deprecated in favor of materials array
  materials?: string[]; // multi-select from vocab
  fit: string;
  primaryColor?: string;
  descriptiveColor?: string; // free-text (manufacturer descriptive color)
  cutType?: string;
  closureType?: string;
  heelHeight?: string;
  platformHeight?: string;
  heelType?: string; // Stiletto, Block, Wedge, etc.
  sportsTeam?: string;
  league?: string;
  websites: string[]; // Changed to array
  featured: boolean; // New
  status: 'intake' | 'in-progress' | 'validated' | 'uploaded';

  // Core product flags
  isActive: boolean; // Required - toggles product visibility
  coreProduct?: boolean; // Marks main styles that persist across seasons
  productGroup?: string; // Logical family group (e.g., 'Air Max Family')
  notes?: string; // Internal notes

  // Legacy boolean fields (deprecated - use launch/price objects)
  map: boolean;
  promo: boolean;
  hype: boolean;
  fastfashion: boolean;

  // Family sizing availability
  familySizing?: boolean;

  // Pricing structure
  price?: {
    map?: number; // Minimum Advertised Price
    promo?: string; // Promo code/tag
    scomRegular?: number; // Web override regular price
    scomSale?: number; // Web override sale price
    ricsRetail: number; // Store regular price (REQUIRED)
    ricsOffer?: number; // Store sale price
    scomOverride?: boolean; // Use SCOM prices instead of RICS
  };

  // Launch/Marketing structure
  launch?: {
    hype?: boolean; // High-priority or limited drop
    fastFashion?: boolean; // Fast-turn styles
    date?: Date | string; // Scheduled release date
    newCollection?: string; // Product collection (Air Force 1, Dunk, etc.)
    klPostDate?: Date | string; // Internal marketing date
  };

  // Shipping structure (expanded)
  shipping?: {
    height?: number;
    width?: number;
    length?: number;
    weight?: number;
    heightUnit?: 'in' | 'cm';
    lengthUnit?: 'in' | 'cm';
    widthUnit?: 'in' | 'cm';
    standard?: boolean; // Standard shipping available
    expedited?: boolean; // Expedited shipping available
    standardOverride?: boolean; // Manual override for standard
    expeditedOverride?: boolean; // Manual override for expedited
  };

  // Dimensions structure (separate from shipping)
  dimensions?: {
    height?: number;
    length?: number;
    width?: number;
    heightUnit?: 'in' | 'cm';
    lengthUnit?: 'in' | 'cm';
    widthUnit?: 'in' | 'cm';
  };

  // Style structure
  style?: {
    id?: string; // Unique internal style identifier
    shoeHeightMap?: string; // AI/context label (Low, Mid, High)
    heelHeight?: number; // Numeric heel height
    soleMaterial?: string; // Outsole material
  };

  // Tax structure
  tax?: {
    class?: string; // Tax category (Standard, Apparel, Exempt)
  };

  // Media structure
  media?: {
    hideImageDate?: Date | string; // Image embargo date
  };

  // RICS fields
  ricsCategory?: string;
  ricsLongDesc?: string;
  
  // Keywords/tags
  keywords?: string[];

  // For the "AI Context" tab
  aiContext: {
    keywords: string[];
    featureBullets: string[];
    designNotes: string;
  };
  
  // For the "AI Generation" tab
  marketing: {
    title: string;
    bullets: string[];
    seo: string;
    paragraphDraft: string;
    paragraphFinal: string;
  };

  variants: Variant[];
  lastUpdated: string;
};