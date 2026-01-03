/**
 * registry.bridge.test.ts
 * Tests for registryBridge.ts snapshot loader and cache behavior
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import * as admin from 'firebase-admin';
import {
  loadRegistrySnapshot,
  clearRegistrySnapshotCache,
  getRegistrySyncStatus,
  type RegistrySnapshot,
} from '../src/services/registryBridge';

// Mock Firebase Admin
vi.mock('firebase-admin', () => ({
  firestore: vi.fn(() => ({
    collection: vi.fn().mockReturnValue({
      doc: vi.fn().mockReturnValue({
        collection: vi.fn().mockReturnValue({
          get: vi.fn(),
        }),
        get: vi.fn(),
      }),
    }),
  })),
  initializeApp: vi.fn(),
}));

describe('registryBridge', () => {
  beforeEach(() => {
    clearRegistrySnapshotCache();
    vi.clearAllMocks();
  });

  afterEach(() => {
    clearRegistrySnapshotCache();
  });

  describe('loadRegistrySnapshot', () => {
    it('should load attributes from Firestore', async () => {
      const mockDb = admin.firestore() as any;
      const mockGet = vi.fn().mockResolvedValue({
        forEach: (cb: any) => {
          cb({
            id: 'brand',
            data: () => ({
              attribute_id: 'brand',
              label: 'Brand',
              data_type: 'string',
              exportable: true,
              import: true,
            }),
          });
        },
      });

      mockDb.collection().doc().collection().get = mockGet;

      const snapshot = await loadRegistrySnapshot();

      expect(snapshot).toBeDefined();
      expect(snapshot.source).toBe('firestore');
      expect(snapshot.loadedAt).toBeInstanceOf(Date);
      expect(snapshot.attributes.has('brand')).toBe(true);
    });

    it('should return cached snapshot on subsequent calls', async () => {
      const mockDb = admin.firestore() as any;
      const mockGet = vi.fn().mockResolvedValue({
        forEach: (cb: any) => {
          cb({
            id: 'color',
            data: () => ({
              attribute_id: 'color',
              label: 'Color',
              data_type: 'string',
            }),
          });
        },
      });

      mockDb.collection().doc().collection().get = mockGet;

      const snapshot1 = await loadRegistrySnapshot();
      const snapshot2 = await loadRegistrySnapshot();

      expect(snapshot1).toBe(snapshot2); // Same object reference (cached)
      expect(mockGet).toHaveBeenCalledOnce(); // Firestore called only once
    });

    it('should force refresh when requested', async () => {
      const mockDb = admin.firestore() as any;
      let callCount = 0;
      const mockGet = vi.fn().mockImplementation(() => {
        callCount++;
        return Promise.resolve({
          forEach: (cb: any) => {
            cb({
              id: `attr-${callCount}`,
              data: () => ({
                attribute_id: `attr-${callCount}`,
                label: `Attribute ${callCount}`,
              }),
            });
          },
        });
      });

      mockDb.collection().doc().collection().get = mockGet;

      const snapshot1 = await loadRegistrySnapshot();
      const snapshot2 = await loadRegistrySnapshot(true); // Force refresh

      expect(snapshot1).not.toBe(snapshot2); // Different objects
      expect(mockGet).toHaveBeenCalledTimes(2); // Firestore called twice
    });
  });

  describe('clearRegistrySnapshotCache', () => {
    it('should clear the cached snapshot', async () => {
      const mockDb = admin.firestore() as any;
      const mockGet = vi.fn().mockResolvedValue({
        forEach: (cb: any) => {
          cb({
            id: 'size',
            data: () => ({ attribute_id: 'size', label: 'Size' }),
          });
        },
      });

      mockDb.collection().doc().collection().get = mockGet;

      const snapshot1 = await loadRegistrySnapshot();
      clearRegistrySnapshotCache();
      const snapshot2 = await loadRegistrySnapshot();

      expect(snapshot1).not.toBe(snapshot2);
      expect(mockGet).toHaveBeenCalledTimes(2);
    });
  });

  describe('getRegistrySyncStatus', () => {
    it('should return sync status with version info', async () => {
      const mockDb = admin.firestore() as any;
      
      // Mock attributesMeta document
      mockDb.collection().doc = vi.fn().mockReturnValue({
        get: vi.fn().mockResolvedValue({
          exists: true,
          data: () => ({
            registry_version: 'abc123def456',
            updatedAt: new Date(),
          }),
        }),
        collection: vi.fn().mockReturnValue({
          get: vi.fn().mockResolvedValue({
            forEach: () => {},
          }),
        }),
      });

      const status = await getRegistrySyncStatus();

      expect(status).toBeDefined();
      expect(status.registry_version).toBe('abc123def456');
    });
  });

  describe('attribute lookup', () => {
    it('should resolve attribute by ID with fallback to SDK', async () => {
      const mockDb = admin.firestore() as any;
      mockDb.collection().doc().collection().get = vi.fn().mockResolvedValue({
        forEach: (cb: any) => {
          cb({
            id: 'gender',
            data: () => ({
              attribute_id: 'gender',
              label: 'Gender',
              allowed_values: ['Male', 'Female', 'Unisex'],
            }),
          });
        },
      });

      const snapshot = await loadRegistrySnapshot();
      const attr = snapshot.attributes.get('gender');

      expect(attr).toBeDefined();
      expect(attr?.label).toBe('Gender');
      expect(attr?.allowed_values).toContain('Male');
    });
  });
});
