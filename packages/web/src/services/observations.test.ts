/**
 * Tests for Observations Service
 * 
 * Tests the observations service with mocked Firestore and Storage.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  listObservations,
  addObservation,
  resolveObservation,
  uploadImage,
} from '../services/observations';
import type { CreateObservationInput } from '../types/observation';

// Mock Firebase modules
vi.mock('../firebaseConfig', () => ({
  db: null, // Start with null to test localStorage fallback
  storage: null,
  isFirebaseAvailable: () => false,
  isStorageAvailable: () => false,
}));

vi.mock('firebase/firestore', () => ({
  collection: vi.fn(),
  addDoc: vi.fn(),
  updateDoc: vi.fn(),
  doc: vi.fn(),
  query: vi.fn(),
  where: vi.fn(),
  onSnapshot: vi.fn(),
  Timestamp: {
    fromDate: (date: Date) => ({ toDate: () => date }),
  },
  getDocs: vi.fn(() => Promise.resolve({ forEach: vi.fn() })),
}));

vi.mock('firebase/storage', () => ({
  ref: vi.fn(),
  uploadBytes: vi.fn(),
  getDownloadURL: vi.fn(),
}));

describe('Observations Service - localStorage fallback', () => {
  const mockProductId = 'test-product-123';
  const mockUser = { uid: 'user-123', name: 'Test User' };

  beforeEach(() => {
    // Clear localStorage before each test
    localStorage.clear();
  });

  afterEach(() => {
    localStorage.clear();
  });

  it('should return empty array when no observations exist', async () => {
    const observations = await listObservations(mockProductId);
    expect(observations).toEqual([]);
  });

  it('should add observation to localStorage', async () => {
    const input: CreateObservationInput = {
      productId: mockProductId,
      title: 'Test Observation',
      body: 'This is a test observation',
      severity: 'medium',
      createdBy: mockUser,
    };

    const observation = await addObservation(input);

    expect(observation.id).toMatch(/^local_/);
    expect(observation.title).toBe(input.title);
    expect(observation.body).toBe(input.body);
    expect(observation.severity).toBe(input.severity);
    expect(observation.status).toBe('open');
    expect(observation.createdBy).toEqual(mockUser);
    expect(observation.createdAt).toBeInstanceOf(Date);
  });

  it('should list observations from localStorage', async () => {
    const input1: CreateObservationInput = {
      productId: mockProductId,
      title: 'First Observation',
      body: 'First test',
      severity: 'low',
      createdBy: mockUser,
    };

    const input2: CreateObservationInput = {
      productId: mockProductId,
      title: 'Second Observation',
      body: 'Second test',
      severity: 'high',
      createdBy: mockUser,
    };

    await addObservation(input1);
    
    // Wait to ensure different timestamp
    await new Promise((resolve) => setTimeout(resolve, 50));
    
    await addObservation(input2);

    const observations = await listObservations(mockProductId);

    expect(observations).toHaveLength(2);
    expect(observations[0].title).toBe('Second Observation'); // Newest first
    expect(observations[1].title).toBe('First Observation');
    expect(observations[0].createdAt.getTime()).toBeGreaterThan(observations[1].createdAt.getTime());
  });

  it('should resolve observation in localStorage', async () => {
    const input: CreateObservationInput = {
      productId: mockProductId,
      title: 'To Resolve',
      body: 'Will be resolved',
      severity: 'medium',
      createdBy: mockUser,
    };

    const observation = await addObservation(input);
    expect(observation.status).toBe('open');

    const resolver = { uid: 'resolver-456', name: 'Resolver User' };
    await resolveObservation(observation.id, mockProductId, resolver);

    const observations = await listObservations(mockProductId);
    const resolved = observations.find((o) => o.id === observation.id);

    expect(resolved).toBeDefined();
    expect(resolved!.status).toBe('resolved');
    expect(resolved!.resolvedBy).toEqual(resolver);
    expect(resolved!.resolvedAt).toBeInstanceOf(Date);
  });

  it('should handle linked field in observation', async () => {
    const input: CreateObservationInput = {
      productId: mockProductId,
      title: 'Field Observation',
      body: 'Issue with specific field',
      severity: 'high',
      linkedField: 'product.title',
      createdBy: mockUser,
    };

    const observation = await addObservation(input);

    expect(observation.linkedField).toBe('product.title');
  });

  it('should handle observations with images (data URLs)', async () => {
    const input: CreateObservationInput = {
      productId: mockProductId,
      title: 'With Images',
      body: 'Has image attachments',
      severity: 'medium',
      images: ['data:image/png;base64,fakedata1', 'data:image/png;base64,fakedata2'],
      createdBy: mockUser,
    };

    const observation = await addObservation(input);

    expect(observation.images).toHaveLength(2);
    expect(observation.images![0]).toBe('data:image/png;base64,fakedata1');
  });

  it('should sort observations by creation date (newest first)', async () => {
    // Add observations with slight delays to ensure different timestamps
    const input1: CreateObservationInput = {
      productId: mockProductId,
      title: 'First',
      body: 'Created first',
      severity: 'low',
      createdBy: mockUser,
    };

    await addObservation(input1);

    // Wait a bit to ensure different timestamp
    await new Promise((resolve) => setTimeout(resolve, 10));

    const input2: CreateObservationInput = {
      productId: mockProductId,
      title: 'Second',
      body: 'Created second',
      severity: 'medium',
      createdBy: mockUser,
    };

    await addObservation(input2);

    const observations = await listObservations(mockProductId);

    expect(observations[0].title).toBe('Second');
    expect(observations[1].title).toBe('First');
    expect(observations[0].createdAt.getTime()).toBeGreaterThan(
      observations[1].createdAt.getTime()
    );
  });

  it('should isolate observations by productId', async () => {
    const product1 = 'product-1';
    const product2 = 'product-2';

    const input1: CreateObservationInput = {
      productId: product1,
      title: 'Product 1 Observation',
      body: 'For product 1',
      severity: 'low',
      createdBy: mockUser,
    };

    const input2: CreateObservationInput = {
      productId: product2,
      title: 'Product 2 Observation',
      body: 'For product 2',
      severity: 'high',
      createdBy: mockUser,
    };

    await addObservation(input1);
    await addObservation(input2);

    const obs1 = await listObservations(product1);
    const obs2 = await listObservations(product2);

    expect(obs1).toHaveLength(1);
    expect(obs2).toHaveLength(1);
    expect(obs1[0].productId).toBe(product1);
    expect(obs2[0].productId).toBe(product2);
  });

  it('should handle uploadImage with data URL fallback', async () => {
    const mockFile = new File(['fake image content'], 'test.png', { type: 'image/png' });

    const imageUrl = await uploadImage(mockProductId, mockFile);

    // When Storage is not available, should return data URL
    expect(imageUrl).toMatch(/^data:image\/png;base64,/);
  });

  it('should handle errors gracefully when localStorage is full', async () => {
    // Mock localStorage.setItem to throw an error
    const originalSetItem = Storage.prototype.setItem;
    Storage.prototype.setItem = vi.fn(() => {
      throw new Error('QuotaExceededError');
    });

    const input: CreateObservationInput = {
      productId: mockProductId,
      title: 'Will Fail',
      body: 'Storage full',
      severity: 'low',
      createdBy: mockUser,
    };

    // Should not throw, but log error
    const observation = await addObservation(input);

    // Should still return observation object
    expect(observation.title).toBe('Will Fail');

    // Restore original
    Storage.prototype.setItem = originalSetItem;
  });
});

describe('Observations Service - Edge Cases', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  afterEach(() => {
    localStorage.clear();
  });

  it('should handle corrupted localStorage data', async () => {
    const productId = 'test-product';
    const key = 'aoss:observations:test-product';

    // Set corrupted data
    localStorage.setItem(key, 'invalid json {{{');

    const observations = await listObservations(productId);

    // Should return empty array instead of throwing
    expect(observations).toEqual([]);
  });

  it('should handle missing optional fields', async () => {
    const input: CreateObservationInput = {
      productId: 'test-product',
      title: 'Minimal',
      body: 'Minimal observation',
      severity: 'low',
      createdBy: { uid: 'user-1', name: 'User' },
      // No linkedField or images
    };

    const observation = await addObservation(input);

    expect(observation.linkedField).toBeUndefined();
    expect(observation.images).toEqual([]);
  });
});
