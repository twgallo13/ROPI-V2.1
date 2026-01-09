/**
 * Unit tests for Attribute Registry Service
 * 
 * LP-phase2b-003: Live registry integration
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import * as admin from 'firebase-admin';

// Mock firebase-admin before importing the service
vi.mock('firebase-admin', () => ({
  firestore: vi.fn(() => ({
    collection: vi.fn()
  }))
}));

// Mock fs module
const mockExistsSync = vi.fn();
const mockReadFileSync = vi.fn();
vi.mock('fs', () => ({
  existsSync: mockExistsSync,
  readFileSync: mockReadFileSync
}));

// Now import the service after mocks are set up
import {
  getAttributeRegistry,
  refreshRegistry,
  getRegistryMetadata,
  clearCache,
  isCacheValid
} from '../attributeRegistryService';

describe('AttributeRegistryService', () => {
  beforeEach(() => {
    // Clear cache before each test
    clearCache();
    vi.clearAllMocks();
  });

  afterEach(() => {
    clearCache();
  });

  describe('Firestore loading', () => {
    it('should load registry from Firestore when available', async () => {
      // Mock Firestore response
      const mockSnapshot = {
        empty: false,
        docs: [
          {
            id: 'sku',
            data: () => ({
              label: 'SKU',
              category: 'sku_core',
              dataType: 'text',
              required: true,
              export: true
            })
          },
          {
            id: 'name',
            data: () => ({
              label: 'Product Name',
              category: 'core',
              dataType: 'text',
              required_for_completion: true
            })
          }
        ]
      };

      const mockGet = vi.fn().mockResolvedValue(mockSnapshot);
      const mockCollection = vi.fn().mockReturnValue({ get: mockGet });
      
      vi.mocked(admin.firestore).mockReturnValue({
        collection: mockCollection
      } as any);

      const registry = await getAttributeRegistry();

      expect(mockCollection).toHaveBeenCalledWith('settings/attributes/keys');
      expect(registry).toHaveProperty('sku');
      expect(registry).toHaveProperty('name');
      expect(registry.sku.required_for_completion).toBe(true);
      expect(registry.name.required_for_completion).toBe(true);

      const metadata = getRegistryMetadata();
      expect(metadata.source).toBe('firestore');
      expect(metadata.attributeCount).toBe(2);
      expect(metadata.error).toBeNull();
    });

    it('should fall back to bundled JSON when Firestore fails', async () => {
      // Mock Firestore failure
      const mockGet = vi.fn().mockRejectedValue(new Error('Firestore unavailable'));
      const mockCollection = vi.fn().mockReturnValue({ get: mockGet });
      
      vi.mocked(admin.firestore).mockReturnValue({
        collection: mockCollection
      } as any);

      // Mock bundled JSON
      const mockRegistryData = {
        version: '1.0.0',
        attributes: [
          {
            attribute_id: 'sku',
            label: 'SKU',
            category: 'sku_core',
            data_type: 'text',
            required_for_completion: true,
            exportable: true
          }
        ]
      };

      mockExistsSync.mockReturnValue(true);
      mockReadFileSync.mockReturnValue(JSON.stringify(mockRegistryData));

      const registry = await getAttributeRegistry();

      expect(registry).toHaveProperty('sku');
      expect(registry.sku.required_for_completion).toBe(true);

      const metadata = getRegistryMetadata();
      expect(metadata.source).toBe('bundled');
      expect(metadata.attributeCount).toBe(1);
      expect(metadata.error).toContain('Firestore unavailable');
    });

    it('should throw error when both Firestore and bundled JSON fail', async () => {
      // Mock Firestore failure
      const mockGet = vi.fn().mockRejectedValue(new Error('Firestore error'));
      const mockCollection = vi.fn().mockReturnValue({ get: mockGet });
      
      vi.mocked(admin.firestore).mockReturnValue({
        collection: mockCollection
      } as any);

      // Mock bundled JSON failure
      mockExistsSync.mockReturnValue(false);

      await expect(getAttributeRegistry()).rejects.toThrow('Failed to load attribute registry from any source');
    });
  });

  describe('Caching', () => {
    beforeEach(() => {
      // Mock successful Firestore load
      const mockSnapshot = {
        empty: false,
        docs: [
          {
            id: 'test_attr',
            data: () => ({
              label: 'Test Attribute',
              category: 'test',
              dataType: 'text'
            })
          }
        ]
      };

      const mockGet = vi.fn().mockResolvedValue(mockSnapshot);
      const mockCollection = vi.fn().mockReturnValue({ get: mockGet });
      
      vi.mocked(admin.firestore).mockReturnValue({
        collection: mockCollection
      } as any);
    });

    it('should use cache on subsequent calls within TTL', async () => {
      const registry1 = await getAttributeRegistry();
      const metadata1 = getRegistryMetadata();
      
      // Wait a bit but stay within TTL
      await new Promise(resolve => setTimeout(resolve, 100));
      
      const registry2 = await getAttributeRegistry();
      const metadata2 = getRegistryMetadata();
      
      expect(registry1).toEqual(registry2);
      expect(metadata1.lastRefresh).toEqual(metadata2.lastRefresh);
      expect(isCacheValid()).toBe(true);
    });

    it('should force refresh when requested', async () => {
      const registry1 = await getAttributeRegistry();
      const metadata1 = getRegistryMetadata();
      
      await new Promise(resolve => setTimeout(resolve, 50));
      
      const metadata2 = await refreshRegistry();
      
      expect(metadata2.lastRefresh?.getTime()).toBeGreaterThan(metadata1.lastRefresh!.getTime());
    });

    it('should report cache validity correctly', async () => {
      expect(isCacheValid()).toBe(false);
      
      await getAttributeRegistry();
      
      expect(isCacheValid()).toBe(true);
      
      clearCache();
      
      expect(isCacheValid()).toBe(false);
    });
  });

  describe('Data transformation', () => {
    it('should correctly transform Firestore document to AttributeType', async () => {
      const mockSnapshot = {
        empty: false,
        docs: [
          {
            id: 'test_attribute',
            data: () => ({
              label: 'Test Label',
              category: 'test_category',
              dataType: 'string',
              required: true,
              export: true,
              internalOnly: false
            })
          }
        ]
      };

      const mockGet = vi.fn().mockResolvedValue(mockSnapshot);
      const mockCollection = vi.fn().mockReturnValue({ get: mockGet });
      
      vi.mocked(admin.firestore).mockReturnValue({
        collection: mockCollection
      } as any);

      const registry = await getAttributeRegistry();
      const attr = registry.test_attribute;

      expect(attr.attribute_id).toBe('test_attribute');
      expect(attr.label).toBe('Test Label');
      expect(attr.category).toBe('test_category');
      expect(attr.data_type).toBe('string');
      expect(attr.required_for_completion).toBe(true);
      expect(attr.exportable).toBe(true);
      expect(attr.internalOnly).toBe(false);
    });

    it('should handle legacy field names', async () => {
      const mockSnapshot = {
        empty: false,
        docs: [
          {
            id: 'legacy_attr',
            data: () => ({
              label: 'Legacy',
              data_type: 'text', // legacy field name
              requiredForExport: true, // legacy field name
              systemFlag: true // legacy field name
            })
          }
        ]
      };

      const mockGet = vi.fn().mockResolvedValue(mockSnapshot);
      const mockCollection = vi.fn().mockReturnValue({ get: mockGet });
      
      vi.mocked(admin.firestore).mockReturnValue({
        collection: mockCollection
      } as any);

      const registry = await getAttributeRegistry();
      const attr = registry.legacy_attr;

      expect(attr.data_type).toBe('text');
      expect(attr.required_for_export).toBe(true);
      expect(attr.internalOnly).toBe(true);
    });
  });

  describe('Metadata tracking', () => {
    it('should track load duration', async () => {
      const mockSnapshot = {
        empty: false,
        docs: [
          {
            id: 'attr1',
            data: () => ({ label: 'Attr 1' })
          }
        ]
      };

      const mockGet = vi.fn().mockResolvedValue(mockSnapshot);
      const mockCollection = vi.fn().mockReturnValue({ get: mockGet });
      
      vi.mocked(admin.firestore).mockReturnValue({
        collection: mockCollection
      } as any);

      await getAttributeRegistry();
      
      const metadata = getRegistryMetadata();
      expect(metadata.loadDurationMs).toBeGreaterThan(0);
    });

    it('should track attribute count', async () => {
      const mockSnapshot = {
        empty: false,
        docs: [
          { id: 'attr1', data: () => ({ label: 'Attr 1' }) },
          { id: 'attr2', data: () => ({ label: 'Attr 2' }) },
          { id: 'attr3', data: () => ({ label: 'Attr 3' }) }
        ]
      };

      const mockGet = vi.fn().mockResolvedValue(mockSnapshot);
      const mockCollection = vi.fn().mockReturnValue({ get: mockGet });
      
      vi.mocked(admin.firestore).mockReturnValue({
        collection: mockCollection
      } as any);

      await getAttributeRegistry();
      
      const metadata = getRegistryMetadata();
      expect(metadata.attributeCount).toBe(3);
    });
  });
});
