import { describe, it, expect, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useProduct } from '../hooks/useProduct';
import type { NewObservation } from '../types/product';

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

  it('should load mock product data', () => {
    const { result } = renderHook(() => useProduct('123'));
    
    expect(result.current.loading).toBe(false);
    expect(result.current.product).toBeDefined();
    expect(result.current.product?.id).toBe('123');
    expect(result.current.product?.sku).toBe('NK-AIR-MAX-270-BLK-10');
  });

  it('should update a product field', () => {
    const { result } = renderHook(() => useProduct('123'));
    
    act(() => {
      result.current.updateField('name', 'Updated Product Name');
    });
    
    expect(result.current.product?.name).toBe('Updated Product Name');
  });

  it('should add an observation', () => {
    const { result } = renderHook(() => useProduct('123'));
    
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

  it('should resolve an observation', () => {
    const { result } = renderHook(() => useProduct('123'));
    
    const obsId = result.current.product?.observations[0].id;
    expect(obsId).toBeDefined();
    
    act(() => {
      result.current.resolveObservation(obsId!);
    });
    
    const resolvedObs = result.current.product?.observations.find(o => o.id === obsId);
    expect(resolvedObs?.status).toBe('resolved');
  });

  it('should apply a suggestion', () => {
    const { result } = renderHook(() => useProduct('123'));
    
    const suggestion = result.current.product?.smartSuggestions[0];
    expect(suggestion).toBeDefined();
    
    act(() => {
      result.current.applySuggestion(suggestion!.id);
    });
    
    const appliedSuggestion = result.current.product?.smartSuggestions.find(s => s.id === suggestion!.id);
    expect(appliedSuggestion?.status).toBe('applied');
  });

  it('should ignore a suggestion', () => {
    const { result } = renderHook(() => useProduct('123'));
    
    const suggestion = result.current.product?.smartSuggestions[0];
    expect(suggestion).toBeDefined();
    
    act(() => {
      result.current.ignoreSuggestion(suggestion!.id);
    });
    
    const ignoredSuggestion = result.current.product?.smartSuggestions.find(s => s.id === suggestion!.id);
    expect(ignoredSuggestion?.status).toBe('ignored');
  });

  it('should recalculate export readiness when fields are updated', () => {
    const { result } = renderHook(() => useProduct('123'));
    
    const initialScore = result.current.product?.exportReadiness.overall || 0;
    
    // Update required fields
    act(() => {
      result.current.updateField('descriptions.shiekh.com.main', 'A'.repeat(100));
    });
    
    const newScore = result.current.product?.exportReadiness.overall || 0;
    expect(newScore).toBeGreaterThanOrEqual(initialScore);
  });

  it('should persist to localStorage', () => {
    const { result } = renderHook(() => useProduct('test-id'));
    
    act(() => {
      result.current.updateField('name', 'Persisted Product');
    });
    
    const stored = localStorageMock.getItem('aoss:product:test-id');
    expect(stored).toBeDefined();
    
    const parsed = JSON.parse(stored!);
    expect(parsed.name).toBe('Persisted Product');
  });
});
