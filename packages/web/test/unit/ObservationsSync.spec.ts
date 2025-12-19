/**
 * ObservationsSync Service Tests
 * 
 * LP-1.1.1: Unit tests for offline sync service.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

// Mock the idb module before any imports
vi.mock('idb', () => ({
  openDB: vi.fn(),
  deleteDB: vi.fn(),
}));

describe('ObservationsSync', () => {
  // Mock IndexedDB store
  let mockStore: Map<string, any>;
  let mockDb: any;

  beforeEach(async () => {
    // Reset modules to get fresh imports
    vi.resetModules();
    
    mockStore = new Map();
    
    mockDb = {
      put: vi.fn((storeName: string, value: any) => {
        mockStore.set(value.id, value);
        return Promise.resolve();
      }),
      get: vi.fn((storeName: string, key: string) => {
        return Promise.resolve(mockStore.get(key));
      }),
      getAll: vi.fn(() => {
        return Promise.resolve(Array.from(mockStore.values()));
      }),
      getAllFromIndex: vi.fn((storeName: string, index: string, value: string) => {
        return Promise.resolve(
          Array.from(mockStore.values()).filter(obs => obs.status === value)
        );
      }),
      delete: vi.fn((storeName: string, key: string) => {
        mockStore.delete(key);
        return Promise.resolve();
      }),
    };

    // Re-mock with the new mockDb
    const { openDB } = await import('idb');
    (openDB as any).mockResolvedValue(mockDb);
  });

  afterEach(() => {
    vi.clearAllMocks();
    mockStore.clear();
  });

  describe('addToQueue', () => {
    it('should add observation with pending status', async () => {
      const { addToQueue } = await import('../../src/services/ObservationsSync');
      
      const observation = {
        product_mpn: 'TEST-123',
        text: 'Test observation',
        description: 'Test description',
        severity: 'medium' as const,
        images: ['https://example.com/image.jpg'],
        source: 'mobile_capture' as const,
      };

      const result = await addToQueue(observation);

      expect(result.id).toBeDefined();
      expect(result.product_mpn).toBe('TEST-123');
      expect(result.text).toBe('Test observation');
      expect(result.status).toBe('pending');
      expect(result.retryCount).toBe(0);
      expect(result.createdAt).toBeDefined();
      expect(mockDb.put).toHaveBeenCalledWith('pendingObservations', expect.any(Object));
    });
  });

  describe('getPendingCount', () => {
    it('should return count of pending, syncing, and error observations', async () => {
      const { getPendingCount } = await import('../../src/services/ObservationsSync');
      
      // Setup mock data
      mockStore.set('obs1', { id: 'obs1', status: 'pending' });
      mockStore.set('obs2', { id: 'obs2', status: 'syncing' });
      mockStore.set('obs3', { id: 'obs3', status: 'error' });
      mockStore.set('obs4', { id: 'obs4', status: 'synced' }); // Should not be counted

      const count = await getPendingCount();

      expect(count).toBe(3);
    });
  });

  describe('getAllPending', () => {
    it('should return all non-synced observations sorted by createdAt', async () => {
      const { getAllPending } = await import('../../src/services/ObservationsSync');
      
      mockStore.set('obs1', { id: 'obs1', status: 'pending', createdAt: 200 });
      mockStore.set('obs2', { id: 'obs2', status: 'pending', createdAt: 100 });
      mockStore.set('obs3', { id: 'obs3', status: 'synced', createdAt: 150 }); // Should be excluded

      const pending = await getAllPending();

      expect(pending).toHaveLength(2);
      expect(pending[0].createdAt).toBe(100); // Older first
      expect(pending[1].createdAt).toBe(200);
    });
  });

  describe('updateStatus', () => {
    it('should update observation status', async () => {
      const { updateStatus } = await import('../../src/services/ObservationsSync');
      
      mockStore.set('obs1', { 
        id: 'obs1', 
        status: 'pending',
        retryCount: 0,
        updatedAt: 0,
      });

      await updateStatus('obs1', 'syncing');

      const updated = mockStore.get('obs1');
      expect(updated.status).toBe('syncing');
    });

    it('should increment retryCount on error', async () => {
      const { updateStatus } = await import('../../src/services/ObservationsSync');
      
      mockStore.set('obs1', { 
        id: 'obs1', 
        status: 'syncing',
        retryCount: 1,
        updatedAt: 0,
      });

      await updateStatus('obs1', 'error', 'Network error');

      const updated = mockStore.get('obs1');
      expect(updated.status).toBe('error');
      expect(updated.error).toBe('Network error');
      expect(updated.retryCount).toBe(2);
    });
  });

  describe('removeFromQueue', () => {
    it('should delete observation from store', async () => {
      const { removeFromQueue } = await import('../../src/services/ObservationsSync');
      
      mockStore.set('obs1', { id: 'obs1', status: 'synced' });
      expect(mockStore.has('obs1')).toBe(true);

      await removeFromQueue('obs1');

      expect(mockDb.delete).toHaveBeenCalled();
    });
  });

  describe('flushQueue', () => {
    it('should skip observations with too many retries', async () => {
      const { flushQueue } = await import('../../src/services/ObservationsSync');
      
      mockStore.set('obs1', { 
        id: 'obs1', 
        status: 'error',
        retryCount: 3, // Max retries exceeded
        createdAt: 100,
      });

      const result = await flushQueue('/api');

      expect(result.failed).toBe(1);
      expect(result.synced).toBe(0);
    });
  });

  describe('registerAutoSync', () => {
    it('should register online event listener and return cleanup function', async () => {
      const { registerAutoSync } = await import('../../src/services/ObservationsSync');
      
      const addEventListenerSpy = vi.spyOn(window, 'addEventListener');
      const removeEventListenerSpy = vi.spyOn(window, 'removeEventListener');

      const cleanup = registerAutoSync('/api');

      expect(addEventListenerSpy).toHaveBeenCalledWith('online', expect.any(Function));

      cleanup();

      expect(removeEventListenerSpy).toHaveBeenCalledWith('online', expect.any(Function));
    });
  });
});
