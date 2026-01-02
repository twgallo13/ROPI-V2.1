/**
 * Unit Tests for ObservationsSync Service - SRoT Flows
 * 
 * LP-observations-srot-1.0.0: Tests for SRoT migration
 * 
 * These tests verify the correct API calls are made for the SRoT flows.
 * We mock at the authFetch level to test the sync logic.
 * 
 * Test coverage:
 * 1. syncObservation with productId present → SRoT PATCH called
 * 2. syncObservation with productId absent, valid MPN → by-mpn lookup + SRoT PATCH
 * 3. syncObservation with productId absent, unknown MPN → error: PRODUCT_NOT_FOUND
 * 4. syncObservation with no productId and no MPN → error: MISSING_PRODUCT_ID_AND_MPN
 */

import { describe, it, expect, vi, beforeEach, afterEach, Mock } from 'vitest';
import * as authFetchModule from './authFetch';

// Store for mock observations
let mockObservationsStore: Map<string, { status: string; retryCount: number; [key: string]: unknown }>;

// Mock authFetch before imports
vi.mock('./authFetch', () => ({
  authFetch: vi.fn(),
  setTelemetryEmitter: vi.fn(),
}));

// Mock idb with a working in-memory store
vi.mock('idb', () => {
  return {
    openDB: vi.fn(() => {
      return Promise.resolve({
        put: vi.fn((_storeName: string, value: { id: string }) => {
          mockObservationsStore.set(value.id, value as { id: string; status: string; retryCount: number });
          return Promise.resolve(value.id);
        }),
        get: vi.fn((_storeName: string, key: string) => {
          return Promise.resolve(mockObservationsStore.get(key));
        }),
        getAll: vi.fn(() => {
          return Promise.resolve(Array.from(mockObservationsStore.values()));
        }),
        getAllFromIndex: vi.fn((_storeName: string, _index: string, status: string) => {
          return Promise.resolve(
            Array.from(mockObservationsStore.values()).filter((obs) => obs.status === status)
          );
        }),
        delete: vi.fn((_storeName: string, key: string) => {
          mockObservationsStore.delete(key);
          return Promise.resolve();
        }),
      });
    }),
  };
});

// Import after mocks
import {
  addToQueue,
  getAllPending,
  setSyncTelemetryCallback,
  flushQueue,
} from './ObservationsSync';

describe('ObservationsSync Service - SRoT Flows', () => {
  const mockApiBaseUrl = '/api';
  let telemetryEvents: Array<{ name: string; data?: Record<string, unknown> }> = [];

  beforeEach(() => {
    vi.clearAllMocks();
    mockObservationsStore = new Map();
    telemetryEvents = [];
    setSyncTelemetryCallback((event) => {
      telemetryEvents.push(event);
    });
  });

  afterEach(() => {
    setSyncTelemetryCallback(null);
  });

  describe('addToQueue', () => {
    it('should add observation to queue with pending status', async () => {
      const observation = await addToQueue({
        product_mpn: 'TEST-MPN-123',
        productId: 'prod-123',
        tags: ['tag1', 'tag2'],
        images: [],
        source: 'mobile_capture',
      });

      expect(observation.id).toMatch(/^obs_/);
      expect(observation.status).toBe('pending');
      expect(observation.retryCount).toBe(0);
      expect(observation.product_mpn).toBe('TEST-MPN-123');
      expect(observation.productId).toBe('prod-123');
      expect(observation.tags).toEqual(['tag1', 'tag2']);
    });
  });

  describe('flushQueue - SRoT flows', () => {
    it('Case A: productId present + tags → SRoT PATCH called', async () => {
      // Add observation with productId
      await addToQueue({
        product_mpn: 'TEST-MPN-123',
        productId: 'prod-123',
        tags: ['tag1', 'tag2'],
        images: ['img1.jpg'],
        source: 'mobile_capture',
      });

      // Mock successful SRoT PATCH response
      (authFetchModule.authFetch as Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true }),
      });

      // Flush queue
      const result = await flushQueue(mockApiBaseUrl);

      // Verify SRoT PATCH was called with correct URL
      expect(authFetchModule.authFetch).toHaveBeenCalledWith(
        `${mockApiBaseUrl}/products/prod-123/observation`,
        expect.objectContaining({
          method: 'PATCH',
        })
      );

      // Verify request body structure
      const callArgs = (authFetchModule.authFetch as Mock).mock.calls[0];
      const body = JSON.parse(callArgs[1].body);
      expect(body.tags).toEqual(['tag1', 'tag2']);
      expect(body.images).toEqual(['img1.jpg']);
      expect(body.source).toBe('mobile');
      expect(body.action).toBe('add');

      // Verify result
      expect(result.synced).toBe(1);
      expect(result.failed).toBe(0);

      // Verify telemetry
      const successEvent = telemetryEvents.find(e => e.name === 'obs.sync.success');
      expect(successEvent).toBeDefined();
      expect(successEvent?.data?.productId).toBe('prod-123');
    });

    it('Case B: productId absent + valid MPN → by-mpn lookup + SRoT PATCH', async () => {
      // Add observation without productId
      await addToQueue({
        product_mpn: 'VALID-MPN-456',
        tags: ['tag1'],
        images: [],
        source: 'product_editor',
      });

      // Mock by-mpn lookup response, then SRoT PATCH response
      (authFetchModule.authFetch as Mock)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ id: 'resolved-prod-456', mpn: 'VALID-MPN-456' }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ success: true }),
        });

      // Flush queue
      const result = await flushQueue(mockApiBaseUrl);

      // Verify by-mpn lookup was called
      expect(authFetchModule.authFetch).toHaveBeenCalledWith(
        `${mockApiBaseUrl}/products/by-mpn/VALID-MPN-456`,
        expect.objectContaining({ method: 'GET' })
      );

      // Verify SRoT PATCH was called with resolved productId
      expect(authFetchModule.authFetch).toHaveBeenCalledWith(
        `${mockApiBaseUrl}/products/resolved-prod-456/observation`,
        expect.objectContaining({ method: 'PATCH' })
      );

      // Verify result
      expect(result.synced).toBe(1);
      expect(result.failed).toBe(0);

      // Verify telemetry includes resolved productId
      const successEvent = telemetryEvents.find(e => e.name === 'obs.sync.success');
      expect(successEvent?.data?.productId).toBe('resolved-prod-456');
      expect(successEvent?.data?.productMpn).toBe('VALID-MPN-456');
    });

    it('Case C: productId absent + unknown MPN → error: PRODUCT_NOT_FOUND', async () => {
      // Add observation without productId but with unknown MPN
      await addToQueue({
        product_mpn: 'UNKNOWN-MPN-789',
        tags: ['tag1'],
        images: [],
        source: 'mobile_capture',
      });

      // Mock by-mpn lookup returns 404
      (authFetchModule.authFetch as Mock).mockResolvedValueOnce({
        ok: false,
        status: 404,
        json: async () => ({ error: 'Product not found' }),
      });

      // Flush queue
      const result = await flushQueue(mockApiBaseUrl);

      // Verify by-mpn lookup was called
      expect(authFetchModule.authFetch).toHaveBeenCalledWith(
        `${mockApiBaseUrl}/products/by-mpn/UNKNOWN-MPN-789`,
        expect.objectContaining({ method: 'GET' })
      );

      // SRoT PATCH should NOT be called (only 1 call total)
      expect(authFetchModule.authFetch).toHaveBeenCalledTimes(1);

      // Verify result - should fail
      expect(result.synced).toBe(0);
      expect(result.failed).toBe(1);

      // Verify telemetry has failure event
      const failEvent = telemetryEvents.find(e => e.name === 'obs.sync.fail');
      expect(failEvent).toBeDefined();
      expect(failEvent?.data?.productMpn).toBe('UNKNOWN-MPN-789');
    });

    it('Case D: no productId and no MPN → error: MISSING_PRODUCT_ID_AND_MPN', async () => {
      // Add observation without productId AND without MPN
      await addToQueue({
        product_mpn: '', // Empty MPN
        tags: ['tag1'],
        images: [],
        source: 'mobile_capture',
      });

      // Flush queue
      const result = await flushQueue(mockApiBaseUrl);

      // No API calls should be made (early fail)
      expect(authFetchModule.authFetch).not.toHaveBeenCalled();

      // Verify result
      expect(result.synced).toBe(0);
      expect(result.failed).toBe(1);

      // Verify telemetry
      const failEvent = telemetryEvents.find(e => e.name === 'obs.sync.fail');
      expect(failEvent).toBeDefined();
      expect(failEvent?.data?.reason).toBe('MISSING_PRODUCT_ID_AND_MPN');
      expect(failEvent?.data?.errorKind).toBe('client');
    });

    it('should handle SRoT PATCH failure after successful lookup', async () => {
      // Add observation without productId
      await addToQueue({
        product_mpn: 'TEST-MPN-PATCH-FAIL',
        tags: ['tag1'],
        images: [],
        source: 'mobile_capture',
      });

      // Mock successful by-mpn lookup, then SRoT PATCH failure
      (authFetchModule.authFetch as Mock)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ id: 'resolved-prod-xyz' }),
        })
        .mockResolvedValueOnce({
          ok: false,
          status: 500,
          json: async () => ({ error: 'Internal Server Error' }),
        });

      // Flush queue
      const result = await flushQueue(mockApiBaseUrl);

      // Verify both calls were made
      expect(authFetchModule.authFetch).toHaveBeenCalledTimes(2);

      // Verify result - should fail
      expect(result.synced).toBe(0);
      expect(result.failed).toBe(1);

      // Verify telemetry includes resolved productId in failure
      const failEvent = telemetryEvents.find(e => e.name === 'obs.sync.fail');
      expect(failEvent?.data?.productId).toBe('resolved-prod-xyz');
      expect(failEvent?.data?.productMpn).toBe('TEST-MPN-PATCH-FAIL');
    });

    it('should handle malformed product lookup response (no id field)', async () => {
      // Add observation without productId
      await addToQueue({
        product_mpn: 'TEST-MPN-MALFORMED',
        tags: ['tag1'],
        images: [],
        source: 'mobile_capture',
      });

      // Mock by-mpn lookup with malformed response (no id field)
      (authFetchModule.authFetch as Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ mpn: 'TEST-MPN-MALFORMED' }), // Missing id/productId
      });

      // Flush queue
      const result = await flushQueue(mockApiBaseUrl);

      // Verify result
      expect(result.synced).toBe(0);
      expect(result.failed).toBe(1);

      // Verify telemetry
      const failEvent = telemetryEvents.find(e => e.name === 'obs.sync.fail');
      expect(failEvent?.data?.errorKind).toBe('product_response_malformed');
    });

    it('should URL-encode MPN with special characters', async () => {
      // Add observation with MPN that needs encoding
      await addToQueue({
        product_mpn: 'MPN/WITH SPECIAL+CHARS',
        tags: ['tag1'],
        images: [],
        source: 'mobile_capture',
      });

      // Mock successful lookup and PATCH
      (authFetchModule.authFetch as Mock)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ id: 'prod-special' }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ success: true }),
        });

      await flushQueue(mockApiBaseUrl);

      // Verify URL encoding in the by-mpn call
      expect(authFetchModule.authFetch).toHaveBeenCalledWith(
        `${mockApiBaseUrl}/products/by-mpn/MPN%2FWITH%20SPECIAL%2BCHARS`,
        expect.any(Object)
      );
    });

    it('should skip observations exceeding max retry count', async () => {
      // Add observation and manually set high retryCount via mock store
      const obs = await addToQueue({
        product_mpn: 'TEST-RETRY-EXCEED',
        productId: 'prod-retry',
        tags: ['tag1'],
        images: [],
        source: 'mobile_capture',
      });

      // Simulate 3 previous failures
      const storedObs = mockObservationsStore.get(obs.id);
      if (storedObs) {
        storedObs.retryCount = 3;
        storedObs.status = 'error';
        mockObservationsStore.set(obs.id, storedObs);
      }

      // Flush queue
      const result = await flushQueue(mockApiBaseUrl);

      // No API calls should be made (skipped due to max retries)
      expect(authFetchModule.authFetch).not.toHaveBeenCalled();

      // Result shows failed (skipped)
      expect(result.failed).toBe(1);
      expect(result.synced).toBe(0);

      // Verify telemetry for max retries
      const maxRetriesEvent = telemetryEvents.find(e => e.name === 'obs.sync.max_retries_exceeded');
      expect(maxRetriesEvent).toBeDefined();
    });
  });

  describe('getAllPending', () => {
    it('should return non-synced observations sorted by creation time', async () => {
      await addToQueue({
        product_mpn: 'MPN-1',
        tags: ['tag1'],
        images: [],
        source: 'mobile_capture',
      });

      await addToQueue({
        product_mpn: 'MPN-2',
        tags: ['tag2'],
        images: [],
        source: 'mobile_capture',
      });

      const pending = await getAllPending();
      expect(pending.length).toBeGreaterThanOrEqual(2);
      expect(pending.every(o => o.status !== 'synced')).toBe(true);
    });
  });
});
