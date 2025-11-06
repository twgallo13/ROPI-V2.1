// Based on Section 3.10
export type Feature = {
  id: string;
  name: string;
  heroImageUrl: string;
  launchAt: string;
};

import { Product } from '../types';

export const useMockLaunchProducts = (): Feature[] => {
  return [
    {
      id: 'feat-001',
      name: 'Project "Aurora" - Fall Collection',
      heroImageUrl: 'https://placehold.co/600x600/7B341D/FFFFFF?text=Aurora',
      launchAt: '2024-10-15',
    },
    {
      id: 'feat-002',
      name: 'Winter Activewear "Summit" Line',
      heroImageUrl: 'https://placehold.co/600x600/1D4ED8/FFFFFF?text=Summit',
      launchAt: '2024-11-01',
    },
    {
      id: 'feat-003',
      name: '"Oasis" Summer Swimwear',
      heroImageUrl: 'https://placehold.co/600x600/F59E0B/FFFFFF?text=Oasis',
      launchAt: '2025-01-20',
    },
     {
      id: 'feat-004',
      name: 'Special Edition "Cosmos" Footwear',
      heroImageUrl: 'https://placehold.co/600x600/1F2937/FFFFFF?text=Cosmos',
      launchAt: '2025-03-01',
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
      department: 'Menswear',
      class: 'Apparel',
      category: 'Tops',
      ageGroup: 'Adult',
      gender: 'Male',
      materialFabric: '100% Cotton',
      // FIX: Changed `website` to `websites` and added `featured` to satisfy the Product type.
      fit: 'Regular Fit',
      websites: ['Shiekh.com'],
      featured: false,
      // FIX: Added missing boolean properties 'map', 'promo', 'hype', and 'fastfashion' to satisfy the Product type.
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
      department: 'Womenswear',
      class: 'Apparel',
      category: 'Bottoms',
      ageGroup: 'Adult',
      gender: 'Female',
      materialFabric: '98% Cotton, 2% Spandex',
      // FIX: Changed `website` to `websites` and added `featured` to satisfy the Product type.
      fit: 'Skinny Fit',
      websites: ['Karmaloop.com'],
      featured: false,
      // FIX: Added missing boolean properties 'map', 'promo', 'hype', and 'fastfashion' to satisfy the Product type.
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
      class: 'Shoes',
      category: 'Athletic',
      ageGroup: 'Adult',
      gender: 'Unisex',
      materialFabric: 'Mesh upper, Rubber sole',
      sportsTeam: 'N/A',
      // FIX: Changed `website` to `websites` and added `featured` to satisfy the Product type.
      fit: 'True to Size',
      websites: ['Shiekh.com'],
      featured: true,
      // FIX: Added missing boolean properties 'map', 'promo', 'hype', and 'fastfashion' to satisfy the Product type.
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
      marketing: { title: '', bullets: [], seo: '', paragraphDraft: '', paragraphFinal: '' },
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
      class: 'Bags & Wallets',
      category: 'Bags',
      ageGroup: 'Adult',
      gender: 'Female',
      materialFabric: '100% Genuine Leather',
      // FIX: Changed `website` to `websites` and added `featured` to satisfy the Product type.
      fit: 'N/A',
      websites: ['Karmaloop.com'],
      featured: false,
      // FIX: Added missing boolean properties 'map', 'promo', 'hype', and 'fastfashion' to satisfy the Product type.
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
      mpn: 'OUT-950',
      name: 'All-Weather Tech Jacket',
      brand: 'Summit Gear',
      department: 'Outerwear',
      class: 'Apparel',
      category: 'Jackets',
      ageGroup: 'Adult',
      gender: 'Unisex',
      materialFabric: 'Gore-Tex Shell',
      // FIX: Changed `website` to `websites` and added `featured` to satisfy the Product type.
      fit: 'Regular Fit',
      websites: ['Shiekh.com'],
      featured: true,
      // FIX: Added missing boolean properties 'map', 'promo', 'hype', and 'fastfashion' to satisfy the Product type.
      map: true,
      promo: true,
      hype: true,
      fastfashion: false,
      status: 'intake',
      lastUpdated: '2024-07-26T18:45:00Z',
      aiContext: {
        keywords: ['waterproof jacket', 'windproof', 'Gore-Tex', 'outdoor gear', 'hiking'],
        featureBullets: ['Fully waterproof and breathable Gore-Tex fabric', 'Sealed seams to lock out moisture', 'Adjustable hood and cuffs for a custom fit'],
        designNotes: 'High-performance outdoor jacket. Technical specifications are key. Mention its suitability for harsh weather.',
      },
      marketing: { title: '', bullets: [], seo: '', paragraphDraft: '', paragraphFinal: '' },
      variants: [
        { variantId: 'v005a', sku: 'OUT-950-M-NVY', size: 'M', color: 'Midnight Navy', price: 249.00 },
        { variantId: 'v005b', sku: 'OUT-950-L-NVY', size: 'L', color: 'Midnight Navy', price: 249.00 },
        { variantId: 'v005c', sku: 'OUT-950-L-GRN', size: 'L', color: 'Forest Green', price: 249.00 },
      ],
    },
  ];
};