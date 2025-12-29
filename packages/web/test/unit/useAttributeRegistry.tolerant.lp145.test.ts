/**
 * LP-1.4.5 Unit Tests for useAttributeRegistry tolerant getAttributeById
 * Tests case-insensitive and variant-tolerant attribute lookups
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useAttributeRegistry } from '../../src/hooks/useAttributeRegistry';

// Mock the useAttributes hook
vi.mock('../../src/hooks/useAttributes', () => ({
  useAttributes: () => ({
    attributes: [
      { attribute_id: 'cut_type', label: 'Cut Type', data_type: 'enum' },
      { attribute_id: 'closure_type', label: 'Closure Type', data_type: 'enum' },
      { attribute_id: 'platform_height', label: 'Platform Height', data_type: 'string' },
      { attribute_id: 'heel_height', label: 'Heel Height', data_type: 'string' },
      { attribute_id: 'fit', label: 'Fit', data_type: 'enum' },
      { attribute_id: 'scom_regular_price', label: 'SCOM Regular Price', data_type: 'currency' },
      { attribute_id: 'standard_shipping_override', label: 'Standard Shipping Override', data_type: 'currency' },
      { 
        attribute_id: 'gender', 
        label: 'Gender', 
        data_type: 'enum',
        synonyms: ['sex', 'Gender Type']
      },
    ],
    loading: false,
    error: null,
    refresh: vi.fn(),
  }),
}));

describe('useAttributeRegistry - Tolerant getAttributeById (LP-1.4.5)', () => {
  describe('Exact Match', () => {
    it('finds attribute by exact snake_case ID', () => {
      const { result } = renderHook(() => useAttributeRegistry());
      const attr = result.current.getAttributeById('cut_type');
      expect(attr).toBeDefined();
      expect(attr?.attribute_id).toBe('cut_type');
      expect(attr?.label).toBe('Cut Type');
    });

    it('finds attribute by exact ID for fit', () => {
      const { result } = renderHook(() => useAttributeRegistry());
      const attr = result.current.getAttributeById('fit');
      expect(attr).toBeDefined();
      expect(attr?.attribute_id).toBe('fit');
    });
  });

  describe('CamelCase to snake_case Tolerance', () => {
    it('finds cut_type when given cutType (camelCase)', () => {
      const { result } = renderHook(() => useAttributeRegistry());
      const attr = result.current.getAttributeById('cutType');
      expect(attr).toBeDefined();
      expect(attr?.attribute_id).toBe('cut_type');
    });

    it('finds closure_type when given closureType (camelCase)', () => {
      const { result } = renderHook(() => useAttributeRegistry());
      const attr = result.current.getAttributeById('closureType');
      expect(attr).toBeDefined();
      expect(attr?.attribute_id).toBe('closure_type');
    });

    it('finds platform_height when given platformHeight (camelCase)', () => {
      const { result } = renderHook(() => useAttributeRegistry());
      const attr = result.current.getAttributeById('platformHeight');
      expect(attr).toBeDefined();
      expect(attr?.attribute_id).toBe('platform_height');
    });

    it('finds heel_height when given heelHeight (camelCase)', () => {
      const { result } = renderHook(() => useAttributeRegistry());
      const attr = result.current.getAttributeById('heelHeight');
      expect(attr).toBeDefined();
      expect(attr?.attribute_id).toBe('heel_height');
    });
  });

  describe('Case-Insensitive Tolerance', () => {
    it('finds fit when given Fit (capitalized)', () => {
      const { result } = renderHook(() => useAttributeRegistry());
      const attr = result.current.getAttributeById('Fit');
      expect(attr).toBeDefined();
      expect(attr?.attribute_id).toBe('fit');
    });

    it('finds fit when given FIT (uppercase)', () => {
      const { result } = renderHook(() => useAttributeRegistry());
      const attr = result.current.getAttributeById('FIT');
      expect(attr).toBeDefined();
      expect(attr?.attribute_id).toBe('fit');
    });

    it('finds cut_type when given CUT_TYPE (uppercase)', () => {
      const { result } = renderHook(() => useAttributeRegistry());
      const attr = result.current.getAttributeById('CUT_TYPE');
      expect(attr).toBeDefined();
      expect(attr?.attribute_id).toBe('cut_type');
    });
  });

  describe('Synonym Lookup', () => {
    it('finds gender when given sex (synonym)', () => {
      const { result } = renderHook(() => useAttributeRegistry());
      const attr = result.current.getAttributeById('sex');
      expect(attr).toBeDefined();
      expect(attr?.attribute_id).toBe('gender');
    });

    it('finds gender when given Gender Type (synonym)', () => {
      const { result } = renderHook(() => useAttributeRegistry());
      const attr = result.current.getAttributeById('Gender Type');
      expect(attr).toBeDefined();
      expect(attr?.attribute_id).toBe('gender');
    });
  });

  describe('Pricing and Shipping Fields', () => {
    it('finds scom_regular_price by exact ID', () => {
      const { result } = renderHook(() => useAttributeRegistry());
      const attr = result.current.getAttributeById('scom_regular_price');
      expect(attr).toBeDefined();
      expect(attr?.attribute_id).toBe('scom_regular_price');
    });

    it('finds scom_regular_price when given scomRegularPrice (camelCase)', () => {
      const { result } = renderHook(() => useAttributeRegistry());
      const attr = result.current.getAttributeById('scomRegularPrice');
      expect(attr).toBeDefined();
      expect(attr?.attribute_id).toBe('scom_regular_price');
    });

    it('finds standard_shipping_override by exact ID', () => {
      const { result } = renderHook(() => useAttributeRegistry());
      const attr = result.current.getAttributeById('standard_shipping_override');
      expect(attr).toBeDefined();
      expect(attr?.attribute_id).toBe('standard_shipping_override');
    });

    it('finds standard_shipping_override when given standardShippingOverride (camelCase)', () => {
      const { result } = renderHook(() => useAttributeRegistry());
      const attr = result.current.getAttributeById('standardShippingOverride');
      expect(attr).toBeDefined();
      expect(attr?.attribute_id).toBe('standard_shipping_override');
    });
  });

  describe('Missing Attributes', () => {
    it('returns undefined for non-existent attribute', () => {
      const { result } = renderHook(() => useAttributeRegistry());
      const attr = result.current.getAttributeById('nonexistent_attribute');
      expect(attr).toBeUndefined();
    });

    it('returns undefined for empty string', () => {
      const { result } = renderHook(() => useAttributeRegistry());
      const attr = result.current.getAttributeById('');
      expect(attr).toBeUndefined();
    });
  });
});
