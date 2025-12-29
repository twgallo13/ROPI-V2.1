/**
 * LP-1.4.1 Unit Tests for mergeFieldsToTopLevel
 * Tests attribute and dimension mapping to top-level fields for Product Page rendering
 */
import { mergeFieldsToTopLevel } from '../../src/hooks/useProduct';

describe('mergeFieldsToTopLevel (LP-1.4.1)', () => {
  it('copies attributes and dimensions into top-level fields and normalizes websites', () => {
    const product = {
      attributes: {
        fit: 'True to Size',
        platform_height: '10mm',
        website: 'shiekh.com',
        media_status: 'media-xyz',
      },
      dimensions: { height: 5, length: 10, width: 2, weight: 100 }
    };
    const out = mergeFieldsToTopLevel(product);
    expect(out.fit).toBe('True to Size');
    expect(out.platformHeight).toBe('10mm');
    expect(out.platform_height).toBe('10mm');
    expect(out.website).toEqual(['shiekh.com']);
    expect(out.websites).toEqual(['shiekh.com']);
    expect(out.media_status).toBe('media-xyz');
    expect(out.height).toBe(5);
    expect(out.length).toBe(10);
    expect(out.width).toBe(2);
    expect(out.weight).toBe(100);
  });

  it('handles camelCase attribute keys', () => {
    const product = {
      attributes: {
        heelHeight: 'Flat',
        closureType: 'Lace-up',
        styleId: 'STYLE-123',
      },
    };
    const out = mergeFieldsToTopLevel(product);
    expect(out.heelHeight).toBe('Flat');
    expect(out.heel_height).toBe('Flat');
    expect(out.closureType).toBe('Lace-up');
    expect(out.closure_type).toBe('Lace-up');
    expect(out.styleId).toBe('STYLE-123');
    expect(out.style_id).toBe('STYLE-123');
  });

  it('handles snake_case attribute keys', () => {
    const product = {
      attributes: {
        heel_height: '2"',
        closure_type: 'Buckle',
        style_id: 'STY-456',
        cut_type: 'Low',
      },
    };
    const out = mergeFieldsToTopLevel(product);
    expect(out.heel_height).toBe('2"');
    expect(out.heelHeight).toBe('2"');
    expect(out.closure_type).toBe('Buckle');
    expect(out.closureType).toBe('Buckle');
    expect(out.cut_type).toBe('Low');
    expect(out.cutType).toBe('Low');
  });

  it('does not overwrite existing top-level values', () => {
    const product = {
      fit: 'Existing Fit',
      height: 999,
      attributes: {
        fit: 'Attribute Fit',
      },
      dimensions: { height: 5 }
    };
    const out = mergeFieldsToTopLevel(product);
    expect(out.fit).toBe('Existing Fit'); // Should not be overwritten
    expect(out.height).toBe(999); // Should not be overwritten
  });

  it('handles website as array', () => {
    const product = {
      attributes: {
        website: ['shiekh.com', 'amazon.com'],
      },
    };
    const out = mergeFieldsToTopLevel(product);
    expect(out.website).toEqual(['shiekh.com', 'amazon.com']);
    expect(out.websites).toEqual(['shiekh.com', 'amazon.com']);
  });

  it('splits comma-delimited website string', () => {
    const product = {
      attributes: {
        website: 'shiekh.com, amazon.com, ebay.com',
      },
    };
    const out = mergeFieldsToTopLevel(product);
    expect(out.website).toEqual(['shiekh.com', 'amazon.com', 'ebay.com']);
    expect(out.websites).toEqual(['shiekh.com', 'amazon.com', 'ebay.com']);
  });

  it('handles null/undefined product gracefully', () => {
    expect(mergeFieldsToTopLevel(null as any)).toBe(null);
    expect(mergeFieldsToTopLevel(undefined as any)).toBe(undefined);
  });

  it('handles empty attributes gracefully', () => {
    const product = { id: 'test-123' };
    const out = mergeFieldsToTopLevel(product);
    expect(out.id).toBe('test-123');
    expect(out.fit).toBeUndefined();
  });

  it('merges media_status from attributes', () => {
    const product = {
      attributes: {
        media_status: 'ready-for-review',
      },
    };
    const out = mergeFieldsToTopLevel(product);
    expect(out.media_status).toBe('ready-for-review');
  });

  it('merges mediaStatus (camelCase) from attributes', () => {
    const product = {
      attributes: {
        mediaStatus: 'approved',
      },
    };
    const out = mergeFieldsToTopLevel(product);
    expect(out.media_status).toBe('approved');
  });

  it('handles complete product structure from Firestore', () => {
    const product = {
      id: '451-9204-BLK18',
      core: {
        mpn: '451-9204-BLK18',
        brand: 'ICE CREAM/ROC',
      },
      attributes: {
        fit: 'True to Size',
        platform_height: '1-2"',
        heel_height: 'Flat',
        heel_type: 'Flat',
        shoe_height_map: 'high-top',
        website: 'shiekh.com',
        media_status: 'sdfsdfgdf-23rcwsdf34-sdf34r-',
        closure_type: 'Mid',
        cut_type: 'Regular',
        style_id: 'STYLE-789',
        gender: "Men's",
        age_group: 'Adult',
        department: 'Footwear',
        class: 'Casual',
        category: 'Athletic',
      },
      dimensions: { height: 5, length: 5, width: 5, weight: 5 },
    };
    const out = mergeFieldsToTopLevel(product);
    
    // Verify all expected fields are at top-level
    expect(out.fit).toBe('True to Size');
    expect(out.platform_height).toBe('1-2"');
    expect(out.platformHeight).toBe('1-2"');
    expect(out.heel_height).toBe('Flat');
    expect(out.heelHeight).toBe('Flat');
    expect(out.website).toEqual(['shiekh.com']);
    expect(out.websites).toEqual(['shiekh.com']);
    expect(out.media_status).toBe('sdfsdfgdf-23rcwsdf34-sdf34r-');
    expect(out.closure_type).toBe('Mid');
    expect(out.closureType).toBe('Mid');
    expect(out.style_id).toBe('STYLE-789');
    expect(out.styleId).toBe('STYLE-789');
    expect(out.height).toBe(5);
    expect(out.length).toBe(5);
    expect(out.width).toBe(5);
    expect(out.weight).toBe(5);
  });
});
