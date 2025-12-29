/**
 * LP-1.4.5 Unit Tests for mergeFieldsToTopLevel - Pricing & Shipping
 * Tests pricing.shipping.* mapping to top-level fields for UI compatibility
 */
import { mergeFieldsToTopLevel } from '../../src/hooks/useProduct';

describe('mergeFieldsToTopLevel (LP-1.4.5) - Pricing & Shipping', () => {
  describe('SCOM Pricing Merging', () => {
    it('merges pricing.scom_regular_price to top-level', () => {
      const product = {
        pricing: {
          currency: 'USD',
          scom_regular_price: 149.99,
        },
      };
      const out = mergeFieldsToTopLevel(product);
      expect(out.scom_regular_price).toBe(149.99);
    });

    it('merges pricing.scom_sale_price to top-level', () => {
      const product = {
        pricing: {
          currency: 'USD',
          scom_sale_price: 119.99,
        },
      };
      const out = mergeFieldsToTopLevel(product);
      expect(out.scom_sale_price).toBe(119.99);
    });

    it('does not overwrite existing top-level SCOM prices', () => {
      const product = {
        scom_regular_price: 199.99,
        scom_sale_price: 179.99,
        pricing: {
          scom_regular_price: 149.99,
          scom_sale_price: 119.99,
        },
      };
      const out = mergeFieldsToTopLevel(product);
      expect(out.scom_regular_price).toBe(199.99);
      expect(out.scom_sale_price).toBe(179.99);
    });
  });

  describe('Shipping Override Merging from pricing.shipping.*', () => {
    it('merges pricing.shipping.standard_override to top-level standard_shipping_override', () => {
      const product = {
        pricing: {
          shipping: {
            standard_override: 5.99,
          },
        },
      };
      const out = mergeFieldsToTopLevel(product);
      expect(out.standard_shipping_override).toBe(5.99);
    });

    it('merges pricing.shipping.expedited_override to top-level expedited_override_shipping', () => {
      const product = {
        pricing: {
          shipping: {
            expedited_override: 12.99,
          },
        },
      };
      const out = mergeFieldsToTopLevel(product);
      expect(out.expedited_override_shipping).toBe(12.99);
    });

    it('merges both shipping overrides correctly', () => {
      const product = {
        pricing: {
          currency: 'USD',
          shipping: {
            standard_override: 4.99,
            expedited_override: 11.99,
          },
        },
      };
      const out = mergeFieldsToTopLevel(product);
      expect(out.standard_shipping_override).toBe(4.99);
      expect(out.expedited_override_shipping).toBe(11.99);
    });

    it('does not overwrite existing top-level shipping overrides', () => {
      const product = {
        standard_shipping_override: 7.99,
        expedited_override_shipping: 15.99,
        pricing: {
          shipping: {
            standard_override: 4.99,
            expedited_override: 11.99,
          },
        },
      };
      const out = mergeFieldsToTopLevel(product);
      expect(out.standard_shipping_override).toBe(7.99);
      expect(out.expedited_override_shipping).toBe(15.99);
    });
  });

  describe('Complete Pricing Structure', () => {
    it('merges all pricing fields from nested structure', () => {
      const product = {
        pricing: {
          currency: 'USD',
          msrp: 199.99,
          scom_regular_price: 149.99,
          scom_sale_price: 119.99,
          shipping: {
            standard_override: 5.99,
            expedited_override: 12.99,
          },
        },
      };
      const out = mergeFieldsToTopLevel(product);
      expect(out.scom_regular_price).toBe(149.99);
      expect(out.scom_sale_price).toBe(119.99);
      expect(out.standard_shipping_override).toBe(5.99);
      expect(out.expedited_override_shipping).toBe(12.99);
    });

    it('handles missing pricing object gracefully', () => {
      const product = {
        id: 'test-123',
        attributes: {
          fit: 'True to Size',
        },
      };
      const out = mergeFieldsToTopLevel(product);
      expect(out.scom_regular_price).toBeUndefined();
      expect(out.scom_sale_price).toBeUndefined();
      expect(out.standard_shipping_override).toBeUndefined();
      expect(out.expedited_override_shipping).toBeUndefined();
    });

    it('handles pricing without shipping object gracefully', () => {
      const product = {
        pricing: {
          currency: 'USD',
          scom_regular_price: 149.99,
          // no shipping object
        },
      };
      const out = mergeFieldsToTopLevel(product);
      expect(out.scom_regular_price).toBe(149.99);
      expect(out.standard_shipping_override).toBeUndefined();
      expect(out.expedited_override_shipping).toBeUndefined();
    });
  });

  describe('Zero values are preserved', () => {
    it('preserves zero for shipping overrides', () => {
      const product = {
        pricing: {
          shipping: {
            standard_override: 0,
            expedited_override: 0,
          },
        },
      };
      const out = mergeFieldsToTopLevel(product);
      expect(out.standard_shipping_override).toBe(0);
      expect(out.expedited_override_shipping).toBe(0);
    });

    it('preserves zero for SCOM prices', () => {
      const product = {
        pricing: {
          scom_regular_price: 0,
          scom_sale_price: 0,
        },
      };
      const out = mergeFieldsToTopLevel(product);
      expect(out.scom_regular_price).toBe(0);
      expect(out.scom_sale_price).toBe(0);
    });
  });
});
