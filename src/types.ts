// Based on Section 3.3 / C.1
export type Variant = {
  variantId: string;
  sku: string;
  size: string;
  color: string;
  price: number;
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
  materialFabric: string;
  fit: string;
  sportsTeam?: string;
  league?: string;
  websites: string[]; // Changed to array
  featured: boolean; // New
  status: 'intake' | 'in-progress' | 'validated' | 'uploaded';

  // New boolean fields
  map: boolean;
  promo: boolean;
  hype: boolean;
  fastfashion: boolean;

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