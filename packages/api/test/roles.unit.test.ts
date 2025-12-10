/**
 * Ropi Roles Unit Tests
 * 
 * Tests for role validation, authorization helpers, and role constants.
 * 
 * Homer v2.0.0 - User Management - Ropi Canonical Roles
 */

import { describe, it, expect } from 'vitest';
import {
  ROPI_ROLES,
  ROLE_LIST,
  isValidRole,
  getRoleLabel,
  isAdminRole,
  normalizeRole,
  type RopiRole,
} from '../src/constants/roles.js';

describe('Ropi Roles Constants', () => {
  it('should export 4 Ropi roles', () => {
    expect(Object.keys(ROPI_ROLES)).toHaveLength(4);
    expect(ROPI_ROLES.ADMIN).toBe('admin');
    expect(ROPI_ROLES.MERCH).toBe('merch');
    expect(ROPI_ROLES.PHOTOGRAPHER).toBe('photographer');
    expect(ROPI_ROLES.VIEWER).toBe('viewer');
  });

  it('should export ROLE_LIST with metadata for all roles', () => {
    expect(ROLE_LIST).toHaveLength(4);
    
    ROLE_LIST.forEach(role => {
      expect(role).toHaveProperty('value');
      expect(role).toHaveProperty('label');
      expect(role).toHaveProperty('description');
      expect(typeof role.value).toBe('string');
      expect(typeof role.label).toBe('string');
      expect(typeof role.description).toBe('string');
    });
  });
});

describe('isValidRole()', () => {
  it('should accept all 4 Ropi roles', () => {
    expect(isValidRole('admin')).toBe(true);
    expect(isValidRole('merch')).toBe(true);
    expect(isValidRole('photographer')).toBe(true);
    expect(isValidRole('viewer')).toBe(true);
  });

  it('should reject legacy role names', () => {
    expect(isValidRole('platform_admin')).toBe(false);
    expect(isValidRole('district_manager')).toBe(false);
    expect(isValidRole('store_manager')).toBe(false);
    expect(isValidRole('catalog_editor')).toBe(false);
    expect(isValidRole('automation_service')).toBe(false);
  });

  it('should reject invalid or malformed role names', () => {
    expect(isValidRole('Admin')).toBe(false); // Wrong case
    expect(isValidRole('ADMIN')).toBe(false); // Wrong case
    expect(isValidRole('manager')).toBe(false); // Non-existent
    expect(isValidRole('user')).toBe(false); // Non-existent
    expect(isValidRole('')).toBe(false); // Empty
    expect(isValidRole('   ')).toBe(false); // Whitespace
    expect(isValidRole('merchant')).toBe(false); // Typo
  });

  it('should handle edge cases gracefully', () => {
    // @ts-expect-error - Testing runtime behavior
    expect(isValidRole(null)).toBe(false);
    // @ts-expect-error - Testing runtime behavior
    expect(isValidRole(undefined)).toBe(false);
    // @ts-expect-error - Testing runtime behavior
    expect(isValidRole(123)).toBe(false);
    // @ts-expect-error - Testing runtime behavior
    expect(isValidRole({})).toBe(false);
  });
});

describe('getRoleLabel()', () => {
  it('should return correct labels for all Ropi roles', () => {
    expect(getRoleLabel('admin')).toBe('Administrator');
    expect(getRoleLabel('merch')).toBe('Merchandise Manager');
    expect(getRoleLabel('photographer')).toBe('Photographer');
    expect(getRoleLabel('viewer')).toBe('Viewer');
  });

  it('should return the role value itself for unknown roles', () => {
    expect(getRoleLabel('platform_admin')).toBe('platform_admin');
    expect(getRoleLabel('unknown_role')).toBe('unknown_role');
    expect(getRoleLabel('')).toBe('');
  });
});

describe('isAdminRole()', () => {
  it('should return true for admin', () => {
    expect(isAdminRole('admin')).toBe(true);
  });

  it('should return false for non-admin roles', () => {
    expect(isAdminRole('merch')).toBe(false);
    expect(isAdminRole('photographer')).toBe(false);
    expect(isAdminRole('viewer')).toBe(false);
  });

  it('should return false for legacy admin role names', () => {
    expect(isAdminRole('platform_admin')).toBe(false);
    expect(isAdminRole('district_manager')).toBe(false);
    expect(isAdminRole('automation_service')).toBe(false);
  });

  it('should return false for undefined or null', () => {
    expect(isAdminRole(undefined)).toBe(false);
    // @ts-expect-error - Testing runtime behavior
    expect(isAdminRole(null)).toBe(false);
  });

  it('should return false for malformed admin role names', () => {
    expect(isAdminRole('Admin')).toBe(false);
    expect(isAdminRole('ADMIN')).toBe(false);
    expect(isAdminRole('administrator')).toBe(false);
  });
});

describe('normalizeRole()', () => {
  it('should accept canonical role keys', () => {
    expect(normalizeRole('admin')).toBe('admin');
    expect(normalizeRole('merch')).toBe('merch');
    expect(normalizeRole('photographer')).toBe('photographer');
    expect(normalizeRole('viewer')).toBe('viewer');
  });

  it('should accept human-readable labels (case-insensitive)', () => {
    expect(normalizeRole('Administrator')).toBe('admin');
    expect(normalizeRole('administrator')).toBe('admin');
    expect(normalizeRole('ADMINISTRATOR')).toBe('admin');
    
    expect(normalizeRole('Merchandise Manager')).toBe('merch');
    expect(normalizeRole('merchandise manager')).toBe('merch');
    expect(normalizeRole('MERCHANDISE MANAGER')).toBe('merch');
    
    expect(normalizeRole('Photographer')).toBe('photographer');
    expect(normalizeRole('photographer')).toBe('photographer');
    expect(normalizeRole('PHOTOGRAPHER')).toBe('photographer');
    
    expect(normalizeRole('Viewer')).toBe('viewer');
    expect(normalizeRole('viewer')).toBe('viewer');
    expect(normalizeRole('VIEWER')).toBe('viewer');
  });

  it('should trim whitespace', () => {
    expect(normalizeRole('  admin  ')).toBe('admin');
    expect(normalizeRole(' Administrator ')).toBe('admin');
    expect(normalizeRole('  Merchandise Manager  ')).toBe('merch');
  });

  it('should return undefined for invalid roles', () => {
    expect(normalizeRole('invalid')).toBeUndefined();
    expect(normalizeRole('user')).toBeUndefined();
    expect(normalizeRole('platform_admin')).toBeUndefined();
    expect(normalizeRole('')).toBeUndefined();
    expect(normalizeRole('district_manager')).toBeUndefined();
  });

  it('should handle undefined input', () => {
    expect(normalizeRole(undefined)).toBeUndefined();
  });

  it('should handle edge cases', () => {
    expect(normalizeRole('   ')).toBeUndefined();
    // Partial matches don't work - must be exact label or canonical key
    expect(normalizeRole('Admin')).toBeUndefined();
  });
});

describe('Type Safety', () => {
  it('should have proper TypeScript types', () => {
    // This test ensures compile-time type checking
    const adminRole: RopiRole = 'admin';
    expect(isValidRole(adminRole)).toBe(true);
    
    // Verify all Ropi role values match the type
    const allRoles: RopiRole[] = [
      'admin',
      'merch',
      'photographer',
      'viewer',
    ];
    
    allRoles.forEach(role => {
      expect(isValidRole(role)).toBe(true);
    });
  });
});
