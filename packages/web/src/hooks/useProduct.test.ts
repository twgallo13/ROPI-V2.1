import { describe, it, expect, beforeEach, vi } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { useProduct } from '../hooks/useProduct';
import type { NewObservation } from '../types/product';

// Mock firebaseConfig to return offline mode
vi.mock('../firebaseConfig', () => ({
  isFirebaseAvailable: () => false,
  db: null,
  auth: null, // LP-smart-rules-ui-provenance-1.0.0: Add auth mock
}));

// Mock firebase/firestore to prevent import errors
vi.mock('firebase/firestore', () => ({
  doc: vi.fn(),
  updateDoc: vi.fn(),
  setDoc: vi.fn(),
  onSnapshot: vi.fn(),
  arrayUnion: vi.fn((val) => val), // LP-smart-rules-ui-provenance-1.0.0: Add arrayUnion mock
}));

// Mock productService (LP-smart-rules-ui-provenance-1.0.0)
vi.mock('../services/productService', () => ({
  getProvenanceKey: (path: string) => path.replace(/\./g, '_'),
  createHumanProvenance: (actor: string) => ({
    source: 'human',
    appliedAt: new Date().toISOString(),
    actor,
  }),
  createReplacementActivityLog: (actor: string, fieldPath: string, prev: unknown, value: unknown) => ({
    actor,
    action: 'user_replaced_smartrule',
    timestamp: new Date().toISOString(),
    details: { fieldPath, previousProvenance: prev, newValue: value },
  }),
}));

// Mock localStorage
const localStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: (key: string) => store[key] || null,
    setItem: (key: string, value: string) => { store[key] = value; },
    clear: () => { store = {}; },
  };
})();

Object.defineProperty(window, 'localStorage', {
  value: localStorageMock,
});

describe('useProduct hook', () => {
  beforeEach(() => {
    localStorageMock.clear();
  });

  it('should load mock product data', async () => {
    const { result } = renderHook(() => useProduct('123'));
    
    // Wait for async loading to complete
    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });
    
    expect(result.current.product).toBeDefined();
    expect(result.current.product?.id).toBe('123');
    expect(result.current.product?.sku).toBe('NK-AIR-MAX-270-BLK-10');
  });

  it('should update a product field', async () => {
    const { result } = renderHook(() => useProduct('123'));
    
    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });
    
    act(() => {
      result.current.updateField('name', 'Updated Product Name');
    });
    
    expect(result.current.product?.name).toBe('Updated Product Name');
  });

  it('should add an observation', async () => {
    const { result } = renderHook(() => useProduct('123'));
    
    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });
    
    const initialCount = result.current.product?.observations.length || 0;
    
    const newObs: NewObservation = {
      title: 'Test Observation',
      description: 'Test description',
      severity: 'high',
    };
    
    act(() => {
      result.current.addObservation(newObs);
    });
    
    expect(result.current.product?.observations.length).toBe(initialCount + 1);
    expect(result.current.product?.observations[initialCount].title).toBe('Test Observation');
  });

  it('should resolve an observation', async () => {
    const { result } = renderHook(() => useProduct('123'));
    
    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });
    
    const obsId = result.current.product?.observations[0].id;
    expect(obsId).toBeDefined();
    
    act(() => {
      result.current.resolveObservation(obsId!);
    });
    
    const resolvedObs = result.current.product?.observations.find(o => o.id === obsId);
    expect(resolvedObs?.status).toBe('resolved');
  });

  it('should apply a suggestion', async () => {
    const { result } = renderHook(() => useProduct('123'));
    
    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });
    
    const suggestion = result.current.product?.smartSuggestions[0];
    expect(suggestion).toBeDefined();
    
    await act(async () => {
      await result.current.applySuggestion(suggestion!.id);
    });
    
    // Wait for state to update
    await waitFor(() => {
      const appliedSuggestion = result.current.product?.smartSuggestions.find(s => s.id === suggestion!.id);
      expect(appliedSuggestion?.status).toBe('applied');
    });
  });

  it('should ignore a suggestion', async () => {
    const { result } = renderHook(() => useProduct('123'));
    
    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });
    
    const suggestion = result.current.product?.smartSuggestions[0];
    expect(suggestion).toBeDefined();
    
    await act(async () => {
      await result.current.ignoreSuggestion(suggestion!.id);
    });
    
    // Wait for state to update
    await waitFor(() => {
      const ignoredSuggestion = result.current.product?.smartSuggestions.find(s => s.id === suggestion!.id);
      expect(ignoredSuggestion?.status).toBe('ignored');
    });
  });

  it('should recalculate export readiness when fields are updated', async () => {
    const { result } = renderHook(() => useProduct('123'));
    
    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });
    
    const initialScore = result.current.product?.exportReadiness.overall || 0;
    
    // Update required fields
    await act(async () => {
      await result.current.updateField('descriptions.shiekh.com.main', 'A'.repeat(100));
    });
    
    const newScore = result.current.product?.exportReadiness.overall || 0;
    expect(newScore).toBeGreaterThanOrEqual(initialScore);
  });

  it('should persist to localStorage', async () => {
    const { result } = renderHook(() => useProduct('123'));
    
    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });
    
    await act(async () => {
      await result.current.updateField('name', 'Persisted Product');
    });
    
    const stored = localStorageMock.getItem('aoss:product:123');
    expect(stored).toBeDefined();
    
    const parsed = JSON.parse(stored!);
    expect(parsed.name).toBe('Persisted Product');
  });
});
