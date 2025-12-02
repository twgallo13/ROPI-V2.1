/**
 * Smoke Test for Observations Feature
 * 
 * Verifies that the observations service and types are properly exported.
 * Component rendering tests would require @testing-library/react setup.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { listObservations, addObservation, resolveObservation } from '../src/services/observations';
import type { CreateObservationInput } from '../src/types/observation';

// Mock Firebase modules
vi.mock('../src/firebaseConfig', () => ({
  db: null,
  storage: null,
  auth: null,
  isFirebaseAvailable: () => false,
  isStorageAvailable: () => false,
  isAuthAvailable: () => false,
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

describe('Observations Service - Smoke Test', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('should export observations service functions', () => {
    expect(listObservations).toBeDefined();
    expect(addObservation).toBeDefined();
    expect(resolveObservation).toBeDefined();
  });

  it('should create and retrieve an observation', async () => {
    const productId = 'smoke-test-product';
    const input: CreateObservationInput = {
      productId,
      title: 'Smoke Test Observation',
      body: 'Testing basic functionality',
      severity: 'medium',
      createdBy: { uid: 'test-user', name: 'Test User' },
    };

    // Add observation
    const created = await addObservation(input);
    expect(created.id).toBeDefined();
    expect(created.title).toBe(input.title);

    // Retrieve observations
    const observations = await listObservations(productId);
    expect(observations).toHaveLength(1);
    expect(observations[0].title).toBe(input.title);
  });

  it('should handle observation resolution', async () => {
    const productId = 'smoke-test-product-2';
    const input: CreateObservationInput = {
      productId,
      title: 'To Resolve',
      body: 'Test resolution',
      severity: 'low',
      createdBy: { uid: 'creator', name: 'Creator' },
    };

    const observation = await addObservation(input);
    expect(observation.status).toBe('open');

    await resolveObservation(observation.id, productId, {
      uid: 'resolver',
      name: 'Resolver',
    });

    const observations = await listObservations(productId);
    expect(observations[0].status).toBe('resolved');
  });

  it('should handle multiple products independently', async () => {
    const product1 = 'product-a';
    const product2 = 'product-b';

    await addObservation({
      productId: product1,
      title: 'Product A Obs',
      body: 'Test',
      severity: 'low',
      createdBy: { uid: 'user', name: 'User' },
    });

    await addObservation({
      productId: product2,
      title: 'Product B Obs',
      body: 'Test',
      severity: 'high',
      createdBy: { uid: 'user', name: 'User' },
    });

    const obs1 = await listObservations(product1);
    const obs2 = await listObservations(product2);

    expect(obs1).toHaveLength(1);
    expect(obs2).toHaveLength(1);
    expect(obs1[0].productId).toBe(product1);
    expect(obs2[0].productId).toBe(product2);
  });
});
