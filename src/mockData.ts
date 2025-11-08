import { Product } from './types';

// Based on Section 3.10
export type Feature = {
  id: string;
  name: string;
  heroImageUrl: string;
  launchAt: string;
};

export const mockVocabulary = {
  departments: ['Footwear', 'Apparel', 'Accessories'],
  classes: ['Running', 'Basketball', 'Lifestyle', 'Tops', 'Hoodies', 'Hats'],
  categories: ['Shoes', 'Tops', 'Hoodies', 'Hats', 'Pants', 'Shorts', 'Jerseys', 'Bottoms', 'Bags'],
  ageGroups: ['Adult', 'Youth', 'Toddler'],
  genders: ['Mens', 'Womens', 'Unisex'],
  statuses: ['intake', 'in-progress', 'validated', 'uploaded'] as const,
  websites: ['Shiekh.com', 'Karmaloop.com'],
  sportsTeams: ['Lakers', 'Dodgers', 'Raiders', '49ers'],
  leagues: ['NBA', 'MLB', 'NFL'],
  materials: ['Cotton', 'Polyester', 'Nylon', 'Leather', 'Suede', 'Mesh', 'Canvas', 'Wool', 'Spandex', 'Synthetic'],
  fits: ['Regular', 'Slim', 'Relaxed', 'Athletic', 'Oversized', 'Tailored', 'Loose']
};


export const useMockLaunchProducts = (): Feature[] => {
  const oneDay = 86400000; // milliseconds in a day
  return [
    {
      id: 'feat-001',
      name: 'Project "Aurora" - Fall Collection',
      heroImageUrl: 'https://placehold.co/600x600/7B341D/FFFFFF?text=Aurora',
      launchAt: new Date(Date.now() + oneDay * 60).toISOString(), // ~60 days in the future
    },
    {
      id: 'feat-002',
      name: 'Winter Activewear "Summit" Line',
      heroImageUrl: 'https://placehold.co/600x600/1D4ED8/FFFFFF?text=Summit',
      launchAt: new Date(Date.now() + oneDay * 90).toISOString(), // ~90 days in the future
    },
    {
      id: 'feat-003',
      name: '"Oasis" Summer Swimwear',
      heroImageUrl: 'https://placehold.co/600x600/F59E0B/FFFFFF?text=Oasis',
      launchAt: new Date(Date.now() - oneDay * 180).toISOString(), // ~180 days in the past
    },
     {
      id: 'feat-004',
      name: 'Special Edition "Cosmos" Footwear',
      heroImageUrl: 'https://placehold.co/600x600/1F2937/FFFFFF?text=Cosmos',
      launchAt: new Date(Date.now() - oneDay * 120).toISOString(), // ~120 days in the past
    },
  ];
};

// Mock product data based on the full Product type
export const useMockProductData = (): Product[] => {
  return [
    {
      id: 'style-001',
      mpn: 'ABC-1000',
      name: "Men's Classic Crewneck Tee",
      brand: 'Modern Threads',
      department: 'Apparel',
      class: 'Tops',
      category: 'Tops',
      ageGroup: 'Adult',
      gender: 'Mens',
      materialFabric: '100% Cotton',
      fit: 'Regular Fit',
      websites: ['Shiekh.com'],
      featured: false,
      map: false,
      promo: false,
      hype: false,
      fastfashion: true,
      status: 'intake',
      lastUpdated: '2024-07-28T10:00:00Z',
      aiContext: {
        keywords: ['classic', 'everyday wear', 'soft cotton', 'basic tee'],
        featureBullets: ['Ultra-soft premium cotton', 'Tagless design for comfort', 'Pre-shrunk for a consistent fit'],
        designNotes: 'A timeless crewneck design suitable for layering or standalone wear. Focus on the high-quality fabric.',
      },
      marketing: { title: '', bullets: [], seo: '', paragraphDraft: '', paragraphFinal: '' },
      variants: [
        { variantId: 'v001a', sku: 'ABC-1000-S-BLK', size: 'S', color: 'Black', price: 24.99 },
        { variantId: 'v001b', sku: 'ABC-1000-M-BLK', size: 'M', color: 'Black', price: 24.99 },
        { variantId: 'v001c', sku: 'ABC-1000-L-WHT', size: 'L', color: 'White', price: 24.99 },
      ],
    },
    {
      id: 'style-002',
      mpn: 'XYZ-2024',
      name: 'Women\'s High-Waist Skinny Jeans',
      brand: 'Denim Deluxe',
      department: 'Apparel',
      class: 'Lifestyle',
      category: 'Bottoms',
      ageGroup: 'Adult',
      gender: 'Womens',
      materialFabric: '98% Cotton, 2% Spandex',
      fit: 'Skinny Fit',
      websites: ['Karmaloop.com'],
      featured: false,
      map: false,
      promo: true,
      hype: false,
      fastfashion: true,
      status: 'in-progress',
      lastUpdated: '2024-07-28T11:30:00Z',
      aiContext: {
        keywords: ['skinny jeans', 'high-waisted', 'stretch denim', 'flattering fit'],
        featureBullets: ['Power-stretch denim for all-day comfort', 'Classic 5-pocket styling', 'High-rise waist for a modern silhouette'],
        designNotes: 'Emphasize the combination of style and comfort. The stretch fabric is a key selling point.',
      },
      marketing: { title: '', bullets: [], seo: '', paragraphDraft: '', paragraphFinal: '' },
      variants: [
        { variantId: 'v002a', sku: 'XYZ-2024-28-BLU', size: '28', color: 'Vintage Blue', price: 89.99 },
        { variantId: 'v002b', sku: 'XYZ-2024-30-BLU', size: '30', color: 'Vintage Blue', price: 89.99 },
        { variantId: 'v002c', sku: 'XYZ-2024-32-BLK', size: '32', color: 'Jet Black', price: 92.50 },
      ],
    },
    {
      id: 'style-003',
      mpn: 'RUN-500',
      name: 'Unisex Performance Running Sneaker',
      brand: 'AeroStride',
      department: 'Footwear',
      class: 'Running',
      category: 'Shoes',
      ageGroup: 'Adult',
      gender: 'Unisex',
      materialFabric: 'Mesh upper, Rubber sole',
      fit: 'True to Size',
      sportsTeam: undefined,
      league: undefined,
      websites: ['Shiekh.com', 'Karmaloop.com'],
      featured: true,
      map: true,
      promo: false,
      hype: true,
      fastfashion: false,
      status: 'validated',
      lastUpdated: '2024-07-27T15:00:00Z',
      aiContext: {
        keywords: ['running shoes', 'lightweight', 'breathable mesh', 'cushioned sole'],
        featureBullets: ['Engineered mesh upper for breathability', 'Responsive foam midsole for high-energy return', 'Durable rubber outsole for superior traction'],
        designNotes: 'Targeted at serious runners. Highlight performance features like weight, cushioning, and grip.',
      },
      marketing: { title: 'AeroStride Runner 500', bullets: ['Lightweight and breathable', 'High-energy return foam'], seo: 'Best running shoes for performance', paragraphDraft: 'The AeroStride Runner 500 is your perfect partner for hitting the pavement...', paragraphFinal: '' },
      variants: [
        { variantId: 'v003a', sku: 'RUN-500-9-GRY', size: '9', color: 'Graphite Grey', price: 120.00 },
        { variantId: 'v003b', sku: 'RUN-500-10-GRY', size: '10', color: 'Graphite Grey', price: 120.00 },
        { variantId: 'v003c', sku: 'RUN-500-10-RED', size: '10', color: 'Solar Red', price: 125.00 },
        { variantId: 'v003d', sku: 'RUN-500-11-BLU', size: '11', color: 'Ocean Blue', price: 125.00 },
      ],
    },
    {
      id: 'style-004',
      mpn: 'Luxe-300',
      name: 'Leather Crossbody Bag',
      brand: 'Artisan Co.',
      department: 'Accessories',
      class: 'Lifestyle',
      category: 'Bags',
      ageGroup: 'Adult',
      gender: 'Womens',
      materialFabric: '100% Genuine Leather',
      fit: 'N/A',
      websites: ['Karmaloop.com'],
      featured: false,
      map: true,
      promo: false,
      hype: false,
      fastfashion: false,
      status: 'intake',
      lastUpdated: '2024-07-28T09:00:00Z',
      aiContext: {
        keywords: ['leather bag', 'crossbody', 'designer handbag', 'luxury accessory'],
        featureBullets: ['Crafted from full-grain Italian leather', 'Adjustable crossbody strap', 'Multiple interior pockets for organization'],
        designNotes: 'Premium, luxury item. Focus on craftsmanship, quality of materials, and timeless style.',
      },
      marketing: { title: '', bullets: [], seo: '', paragraphDraft: '', paragraphFinal: '' },
      variants: [
        { variantId: 'v004a', sku: 'Luxe-300-BRN', size: 'One Size', color: 'Cognac Brown', price: 199.99 },
        { variantId: 'v004b', sku: 'Luxe-300-BLK', size: 'One Size', color: 'Classic Black', price: 199.99 },
      ],
    },
    {
      id: 'style-005',
      mpn: 'LAL-24-H',
      name: 'Lakers Authentic Jersey',
      brand: 'Nike',
      department: 'Apparel',
      class: 'Tops',
      category: 'Jerseys',
      ageGroup: 'Adult',
      gender: 'Mens',
      materialFabric: 'Dri-Fit Polyester',
      fit: 'Athletic Cut',
      sportsTeam: 'Lakers',
      league: 'NBA',
      websites: ['Shiekh.com'],
      featured: true,
      map: true,
      promo: true,
      hype: true,
      fastfashion: false,
      status: 'intake',
      lastUpdated: '2024-07-26T18:45:00Z',
      aiContext: {
        keywords: ['lakers jersey', 'nba authentic', 'LeBron James', 'basketball apparel'],
        featureBullets: ['Official on-court NBA jersey design', 'Nike Dri-FIT technology wicks away sweat', 'Heat-applied team and player graphics'],
        designNotes: 'Authentic Lakers jersey. Highlight the official licensing and performance fabric.',
      },
      marketing: { title: '', bullets: [], seo: '', paragraphDraft: '', paragraphFinal: '' },
      variants: [
        { variantId: 'v005a', sku: 'LAL-24-H-M', size: 'M', color: 'Purple/Gold', price: 249.00 },
        { variantId: 'v005b', sku: 'LAL-24-H-L', size: 'L', color: 'Purple/Gold', price: 249.00 },
        { variantId: 'v005c', sku: 'LAL-24-H-XL', size: 'XL', color: 'Purple/Gold', price: 249.00 },
      ],
    },
  ];
};