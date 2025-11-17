/**
 * Firestore Import Canonical Mapping Tests
 * Tests that CSV importer writes canonical Product schema fields
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { importToFirestore } from '../utils/firestoreImport';
import type { ImportRow } from '../utils/firestoreImport';

// Mock Firebase
vi.mock('../firebase', () => ({
  db: {},
}));

// Mock Firestore functions
vi.mock('firebase/firestore', () => ({
  collection: vi.fn(),
  doc: vi.fn(() => ({ id: 'mock-doc' })),
  setDoc: vi.fn(() => Promise.resolve()),
  writeBatch: vi.fn(),
}));

// Import mocked functions
import { setDoc } from 'firebase/firestore';

describe('firestoreImport canonical mappings', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should write canonical fields from CSV row with RICS data', async () => {
    const rows: ImportRow[] = [
      {
        rowNumber: 1,
        data: {
          mpn: 'TEST-001',
          sku: 'TEST-001-BLK-10',
          brand: 'Test Brand',
          name: 'Test Product',
          rics_short_desc: 'RICS Short Description',
          rics_color: 'Navy Blue',
          rics_category: 'Running Shoes',
          department: 'Footwear',
          class: 'Athletic',
          category: 'Running',
          age_group: 'Adult',
          gender: "Men's",
          material: 'Leather, Mesh',
          size: '10',
          color: 'Black',
          price: 99.99,
        },
      },
    ];

    await importToFirestore(rows, []);

    expect(setDoc).toHaveBeenCalled();
    const writeCall = (setDoc as any).mock.calls[0];
    const productData = writeCall[1];

    // Verify canonical fields are written
    expect(productData.name).toBe('RICS Short Description'); // name from RICS
    expect(productData.ricsShortDesc).toBe('RICS Short Description');
    expect(productData.ricsColor).toBe('Navy Blue');
    expect(productData.primaryColor).toBe('Navy Blue'); // RICS color mapped to primaryColor
    expect(productData.ricsCategory).toBe('Running Shoes');
    expect(productData.materials).toEqual(['Leather', 'Mesh']); // Normalized array
  });

  it('should write inventory fields from CSV', async () => {
    const rows: ImportRow[] = [
      {
        rowNumber: 1,
        data: {
          mpn: 'TEST-002',
          sku: 'TEST-002-10',
          brand: 'Test Brand',
          name: 'Test Product',
          department: 'Footwear',
          class: 'Athletic',
          category: 'Running',
          age_group: 'Adult',
          gender: "Men's",
          last_received: '2025-11-15',
          first_received: '2025-11-01',
          store_inv: 10,
          store1: 5,
          store4: 3,
          warehouse_inv: 50,
          whs_inv: 25,
          total_inv: 60,
          variant_count: 8,
          size: '10',
          price: 79.99,
        },
      },
    ];

    await importToFirestore(rows, []);

    expect(setDoc).toHaveBeenCalled();
    const writeCall = (setDoc as any).mock.calls[0];
    const productData = writeCall[1];

    expect(productData.lastReceived).toBe('2025-11-15');
    expect(productData.firstReceived).toBe('2025-11-01');
    expect(productData.storeInv).toBe(10);
    expect(productData.store1).toBe(5);
    expect(productData.store4).toBe(3);
    expect(productData.warehouseInv).toBe(50);
    expect(productData.whsInv).toBe(25);
    expect(productData.totalInv).toBe(60);
    expect(productData.variantCount).toBe(8);
  });

  it('should write custom fields from CSV', async () => {
    const rows: ImportRow[] = [
      {
        rowNumber: 1,
        data: {
          mpn: 'TEST-003',
          sku: 'TEST-003-10',
          brand: 'Test Brand',
          name: 'Test Product',
          department: 'Footwear',
          class: 'Athletic',
          category: 'Running',
          age_group: 'Adult',
          gender: "Men's",
          custom2: 'Custom Field 2 Value',
          custom3: 'Custom Field 3 Value',
          size: '10',
          price: 59.99,
        },
      },
    ];

    await importToFirestore(rows, []);

    expect(setDoc).toHaveBeenCalled();
    const writeCall = (setDoc as any).mock.calls[0];
    const productData = writeCall[1];

    expect(productData.custom2).toBe('Custom Field 2 Value');
    expect(productData.custom3).toBe('Custom Field 3 Value');
  });

  it('should write collection to launch.newCollection', async () => {
    const rows: ImportRow[] = [
      {
        rowNumber: 1,
        data: {
          mpn: 'TEST-004',
          sku: 'TEST-004-10',
          brand: 'Test Brand',
          name: 'Test Product',
          department: 'Footwear',
          class: 'Athletic',
          category: 'Running',
          age_group: 'Adult',
          gender: "Men's",
          collection: 'Air Jordan',
          new_collection: 'Fall 2025',
          size: '10',
          price: 149.99,
        },
      },
    ];

    await importToFirestore(rows, []);

    expect(setDoc).toHaveBeenCalled();
    const writeCall = (setDoc as any).mock.calls[0];
    const productData = writeCall[1];

    expect(productData.launch?.newCollection).toBe('Air Jordan');
  });

  it('should normalize and dedupe materials array', async () => {
    const rows: ImportRow[] = [
      {
        rowNumber: 1,
        data: {
          mpn: 'TEST-005',
          sku: 'TEST-005-10',
          brand: 'Test Brand',
          name: 'Test Product',
          department: 'Footwear',
          class: 'Athletic',
          category: 'Running',
          age_group: 'Adult',
          gender: "Men's",
          material: 'Leather, Mesh, Synthetic, Leather',
          size: '10',
          price: 89.99,
        },
      },
    ];

    await importToFirestore(rows, []);

    expect(setDoc).toHaveBeenCalled();
    const writeCall = (setDoc as any).mock.calls[0];
    const productData = writeCall[1];

    // Should be deduped and sorted
    expect(productData.materials).toEqual(['Leather', 'Mesh', 'Synthetic']);
  });

  it('should write pricing fields to canonical structure', async () => {
    const rows: ImportRow[] = [
      {
        rowNumber: 1,
        data: {
          mpn: 'TEST-006',
          sku: 'TEST-006-10',
          brand: 'Test Brand',
          name: 'Test Product',
          department: 'Footwear',
          class: 'Athletic',
          category: 'Running',
          age_group: 'Adult',
          gender: "Men's",
          map: '120.00',
          scom_regular: '99.99',
          scom_sale: '79.99',
          promo: true,
          size: '10',
          price: 79.99,
        },
      },
    ];

    await importToFirestore(rows, []);

    expect(setDoc).toHaveBeenCalled();
    const writeCall = (setDoc as any).mock.calls[0];
    const productData = writeCall[1];

    expect(productData.price?.map).toBe(120);
    expect(productData.price?.scomRegular).toBe(99.99);
    expect(productData.price?.scomSale).toBe(79.99);
    expect(productData.map).toBe(true);
    expect(productData.promo).toBe(true);
  });

  it('should handle FD ZAHARA-S-WHT import correctly', async () => {
    const rows: ImportRow[] = [
      {
        rowNumber: 1,
        data: {
          mpn: 'FD ZAHARA-S-WHT',
          sku: 'FD-ZAHARA-S-WHT-7',
          brand: 'Fashion Designer',
          name: 'ZAHARA S WHT',
          rics_short_desc: 'Zahara Sandal White',
          rics_color: 'White',
          rics_category: 'Sandals',
          department: 'Footwear',
          class: 'Sandals',
          category: 'Women',
          age_group: 'Adult',
          gender: "Women's",
          material: 'Leather, Synthetic',
          last_received: '2025-11-15',
          store_inv: 12,
          warehouse_inv: 48,
          total_inv: 60,
          variant_count: 6,
          custom2: 'Summer Collection',
          collection: 'Zahara Line',
          scom_regular: 89.99,
          size: '7',
          price: 89.99,
        },
      },
    ];

    await importToFirestore(rows, []);

    expect(setDoc).toHaveBeenCalled();
    const writeCall = (setDoc as any).mock.calls[0];
    const productData = writeCall[1];

    // Verify canonical mappings for FD ZAHARA-S-WHT
    expect(productData.mpn).toBe('FD ZAHARA-S-WHT');
    expect(productData.name).toBe('Zahara Sandal White'); // RICS short desc
    expect(productData.ricsShortDesc).toBe('Zahara Sandal White');
    expect(productData.ricsColor).toBe('White');
    expect(productData.primaryColor).toBe('White');
    expect(productData.ricsCategory).toBe('Sandals');
    expect(productData.materials).toEqual(['Leather', 'Synthetic']);
    expect(productData.lastReceived).toBe('2025-11-15');
    expect(productData.storeInv).toBe(12);
    expect(productData.warehouseInv).toBe(48);
    expect(productData.totalInv).toBe(60);
    expect(productData.variantCount).toBe(6);
    expect(productData.custom2).toBe('Summer Collection');
    expect(productData.launch?.newCollection).toBe('Zahara Line');
    expect(productData.price?.scomRegular).toBe(89.99);
  });

  it('should handle missing optional fields gracefully', async () => {
    const rows: ImportRow[] = [
      {
        rowNumber: 1,
        data: {
          mpn: 'MINIMAL-001',
          sku: 'MINIMAL-001-10',
          brand: 'Test Brand',
          name: 'Minimal Product',
          department: 'Footwear',
          class: 'Athletic',
          category: 'Running',
          age_group: 'Adult',
          gender: "Men's",
          size: '10',
          price: 49.99,
        },
      },
    ];

    await importToFirestore(rows, []);

    expect(setDoc).toHaveBeenCalled();
    const writeCall = (setDoc as any).mock.calls[0];
    const productData = writeCall[1];

    // Verify minimal product imports without errors
    expect(productData.mpn).toBe('MINIMAL-001');
    expect(productData.name).toBe('Minimal Product');
    expect(productData.materials).toEqual([]); // Empty array, not undefined
  });
});
