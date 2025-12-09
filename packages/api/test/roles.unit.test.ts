/**
 * Canonical Roles Unit Tests
 * 
 * Tests for role validation, authorization helpers, and role constants.
 * 
 * Homer v1.0.0 - User Management - Canonical Roles
 */

import { describe, it, expect } from 'vitest';
import {
  CANONICAL_ROLES,
  ROLE_LIST,
  isValidRole,
  getRoleLabel,
  isAdminRole,
  type CanonicalRole,
} from '../src/constants/roles.js';

describe('Canonical Roles Constants', () => {
  it('should export 6 canonical roles', () => {
    expect(Object.keys(CANONICAL_ROLES)).toHaveLength(6);
    expect(CANONICAL_ROLES.PLATFORM_ADMIN).toBe('platform_admin');
    expect(CANONICAL_ROLES.DISTRICT_MANAGER).toBe('district_manager');
    expect(CANONICAL_ROLES.STORE_MANAGER).toBe('store_manager');
    expect(CANONICAL_ROLES.CATALOG_EDITOR).toBe('catalog_editor');
    expect(CANONICAL_ROLES.VIEWER).toBe('viewer');
    expect(CANONICAL_ROLES.AUTOMATION_SERVICE).toBe('automation_service');
  });

  it('should export ROLE_LIST with metadata for all roles', () => {
    expect(ROLE_LIST).toHaveLength(6);
    
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
  it('should accept all 6 canonical roles', () => {
    expect(isValidRole('platform_admin')).toBe(true);
    expect(isValidRole('district_manager')).toBe(true);
    expect(isValidRole('store_manager')).toBe(true);
    expect(isValidRole('catalog_editor')).toBe(true);
    expect(isValidRole('viewer')).toBe(true);
    expect(isValidRole('automation_service')).toBe(true);
  });

  it('should reject old hardcoded role names', () => {
    // Old roles that were hardcoded before canonical roles
    expect(isValidRole('admin')).toBe(false);
    expect(isValidRole('district')).toBe(false);
    expect(isValidRole('store')).toBe(false);
    expect(isValidRole('user')).toBe(false);
  });

  it('should reject invalid or malformed role names', () => {
    expect(isValidRole('Admin')).toBe(false); // Wrong case
    expect(isValidRole('PLATFORM_ADMIN')).toBe(false); // Wrong case
    expect(isValidRole('manager')).toBe(false); // Incomplete
    expect(isValidRole('platformadmin')).toBe(false); // No underscore
    expect(isValidRole('')).toBe(false); // Empty
    expect(isValidRole('   ')).toBe(false); // Whitespace
    expect(isValidRole('platform_manager')).toBe(false); // Non-existent role
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
  it('should return correct labels for all canonical roles', () => {
    expect(getRoleLabel('platform_admin')).toBe('Platform Admin');
    expect(getRoleLabel('district_manager')).toBe('District Manager');
    expect(getRoleLabel('store_manager')).toBe('Store Manager');
    expect(getRoleLabel('catalog_editor')).toBe('Catalog Editor');
    expect(getRoleLabel('viewer')).toBe('Viewer');
    expect(getRoleLabel('automation_service')).toBe('Automation Service');
  });

  it('should return the role value itself for unknown roles', () => {
    expect(getRoleLabel('admin')).toBe('admin');
    expect(getRoleLabel('unknown_role')).toBe('unknown_role');
    expect(getRoleLabel('')).toBe('');
  });
});

describe('isAdminRole()', () => {
  it('should return true for platform_admin', () => {
    expect(isAdminRole('platform_admin')).toBe(true);
  });

  it('should return false for non-admin roles', () => {
    expect(isAdminRole('district_manager')).toBe(false);
    expect(isAdminRole('store_manager')).toBe(false);
    expect(isAdminRole('catalog_editor')).toBe(false);
    expect(isAdminRole('viewer')).toBe(false);
    expect(isAdminRole('automation_service')).toBe(false);
  });

  it('should return false for old admin role name', () => {
    expect(isAdminRole('admin')).toBe(false);
  });

  it('should return false for undefined or null', () => {
    expect(isAdminRole(undefined)).toBe(false);
    // @ts-expect-error - Testing runtime behavior
    expect(isAdminRole(null)).toBe(false);
  });

  it('should return false for malformed admin role names', () => {
    expect(isAdminRole('Platform_Admin')).toBe(false);
    expect(isAdminRole('PLATFORM_ADMIN')).toBe(false);
    expect(isAdminRole('platformadmin')).toBe(false);
  });
});

describe('Type Safety', () => {
  it('should have proper TypeScript types', () => {
    // This test ensures compile-time type checking
    const adminRole: CanonicalRole = 'platform_admin';
    expect(isValidRole(adminRole)).toBe(true);
    
    // Verify all canonical role values match the type
    const allRoles: CanonicalRole[] = [
      'platform_admin',
      'district_manager',
      'store_manager',
      'catalog_editor',
      'viewer',
      'automation_service',
    ];
    
    allRoles.forEach(role => {
      expect(isValidRole(role)).toBe(true);
    });
  });
});
