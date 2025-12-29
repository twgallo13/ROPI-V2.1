/**
 * LP-1.4.5 Legacy to Registry Map Tests
 * Tests for shipping override and SCOM pricing aliases
 */

import { describe, it, expect } from 'vitest';
import { LEGACY_TO_REGISTRY } from '../src/normalization/legacyToRegistryMap';

describe('LP-1.4.5 Legacy to Registry Map - Shipping & Pricing Aliases', () => {
  describe('Shipping Override Aliases', () => {
    it('should map standardShippingOverride to standard_shipping_override', () => {
      expect(LEGACY_TO_REGISTRY['standardShippingOverride']).toBe('standard_shipping_override');
    });

    it('should map standard_shipping_override to itself', () => {
      expect(LEGACY_TO_REGISTRY['standard_shipping_override']).toBe('standard_shipping_override');
    });

    it('should map expeditedShippingOverride to expedited_override_shipping', () => {
      expect(LEGACY_TO_REGISTRY['expeditedShippingOverride']).toBe('expedited_override_shipping');
    });

    it('should map expedited_override_shipping to itself', () => {
      expect(LEGACY_TO_REGISTRY['expedited_override_shipping']).toBe('expedited_override_shipping');
    });

    it('should map expedited_shipping_override to expedited_override_shipping', () => {
      expect(LEGACY_TO_REGISTRY['expedited_shipping_override']).toBe('expedited_override_shipping');
    });
  });

  describe('SCOM Pricing Aliases', () => {
    it('should map scomRegularPrice to scom_regular_price', () => {
      expect(LEGACY_TO_REGISTRY['scomRegularPrice']).toBe('scom_regular_price');
    });

    it('should map scom_regular_price to itself', () => {
      expect(LEGACY_TO_REGISTRY['scom_regular_price']).toBe('scom_regular_price');
    });

    it('should map scomSalePrice to scom_sale_price', () => {
      expect(LEGACY_TO_REGISTRY['scomSalePrice']).toBe('scom_sale_price');
    });

    it('should map scom_sale_price to itself', () => {
      expect(LEGACY_TO_REGISTRY['scom_sale_price']).toBe('scom_sale_price');
    });
  });

  describe('KL Post Date Aliases', () => {
    it('should map klPostDate to kl_post_date', () => {
      expect(LEGACY_TO_REGISTRY['klPostDate']).toBe('kl_post_date');
    });

    it('should map kl_post_date to itself', () => {
      expect(LEGACY_TO_REGISTRY['kl_post_date']).toBe('kl_post_date');
    });
  });
});
