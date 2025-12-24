/**
 * LP-ATTR-1.3.1: Validator fix tests
 * Verify that name and brand are optional (not required)
 */

import { describe, it, expect } from 'vitest';
import { validateImportRow } from '../src/validators/importValidator';
import type { ImportNormalizedFields } from '../src/schema/importEngine';

describe('LP-ATTR-1.3.1: Import Validator - name and brand optional', () => {
  it('should allow MPN-only rows (no name, no brand)', () => {
    const normalized: ImportNormalizedFields = {
      mpn: 'TEST-MPN-123',
    };

    const result = validateImportRow(normalized);

    // No errors - MPN-only is valid
    expect(result.errors).toEqual([]);
    expect(result.warnings).toEqual([]);
  });

  it('should allow rows with MPN and name (no brand)', () => {
    const normalized: ImportNormalizedFields = {
      mpn: 'TEST-MPN-123',
      name: 'Test Product Name',
    };

    const result = validateImportRow(normalized);

    expect(result.errors).toEqual([]);
    expect(result.warnings).toEqual([]);
  });

  it('should allow rows with MPN and brand (no name)', () => {
    const normalized: ImportNormalizedFields = {
      mpn: 'TEST-MPN-123',
      brand: 'Test Brand',
    };

    const result = validateImportRow(normalized);

    expect(result.errors).toEqual([]);
    expect(result.warnings).toEqual([]);
  });

  it('should validate name length if present', () => {
    const normalized: ImportNormalizedFields = {
      mpn: 'TEST-MPN-123',
      name: 'ABC', // Too short (< 5 chars)
    };

    const result = validateImportRow(normalized);

    expect(result.errors).toEqual([]);
    expect(result.warnings).toHaveLength(1);
    expect(result.warnings[0].field).toBe('name');
    expect(result.warnings[0].message).toContain('very short');
  });

  it('should validate brand length if present', () => {
    const normalized: ImportNormalizedFields = {
      mpn: 'TEST-MPN-123',
      brand: 'A'.repeat(101), // Too long (> 100 chars)
    };

    const result = validateImportRow(normalized);

    expect(result.errors).toHaveLength(1);
    expect(result.errors[0].field).toBe('brand');
    expect(result.errors[0].message).toContain('too long');
  });

  it('should check title (legacy) if name is not present', () => {
    const normalized: ImportNormalizedFields = {
      mpn: 'TEST-MPN-123',
      title: 'Legacy Product Title', // Using title instead of name
    };

    const result = validateImportRow(normalized);

    // Should work with legacy title field
    expect(result.errors).toEqual([]);
    expect(result.warnings).toEqual([]);
  });

  it('should prefer name over title when both present', () => {
    const normalized: ImportNormalizedFields = {
      mpn: 'TEST-MPN-123',
      name: 'ABC', // Short name (triggers warning)
      title: 'Long Enough Legacy Title',
    };

    const result = validateImportRow(normalized);

    // Should validate 'name' and report warning on 'name' field (not 'title')
    expect(result.warnings).toHaveLength(1);
    expect(result.warnings[0].field).toBe('name');
  });

  it('should validate name max length if too long', () => {
    const normalized: ImportNormalizedFields = {
      mpn: 'TEST-MPN-123',
      name: 'A'.repeat(201), // Too long (> 200 chars)
    };

    const result = validateImportRow(normalized);

    expect(result.errors).toHaveLength(1);
    expect(result.errors[0].field).toBe('name');
    expect(result.errors[0].code).toBe('INVALID_VALUE');
    expect(result.errors[0].message).toContain('too long');
  });

  it('should NOT have MISSING_REQUIRED_FIELD errors for name or brand', () => {
    const normalized: ImportNormalizedFields = {
      mpn: 'TEST-MPN-123',
      // No name, no brand, no title
    };

    const result = validateImportRow(normalized);

    // No errors for missing name/brand - they are optional
    const missingFieldErrors = result.errors.filter(
      (e) => e.code === 'MISSING_REQUIRED_FIELD'
    );
    expect(missingFieldErrors).toEqual([]);
  });

  it('should still require MPN (MPN is the only required field)', () => {
    const normalized: ImportNormalizedFields = {
      name: 'Product Name',
      brand: 'Brand Name',
      // No MPN
    };

    const result = validateImportRow(normalized);

    expect(result.errors).toHaveLength(1);
    expect(result.errors[0].code).toBe('MISSING_REQUIRED_FIELD');
    expect(result.errors[0].field).toBe('mpn');
  });
});
