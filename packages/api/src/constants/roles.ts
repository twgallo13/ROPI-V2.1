/**
 * Canonical Role Definitions
 * 
 * These are the authoritative role identifiers used throughout AOSS.
 * All custom claims and permissions are based on these role values.
 * 
 * Role Hierarchy (from highest to lowest privilege):
 * 1. platform_admin - Full system access
 * 2. district_manager - District-level access and management
 * 3. store_manager - Store-level access and operations
 * 4. catalog_editor - Product catalog editing rights
 * 5. viewer - Read-only access
 * 6. automation_service - Service account for integrations
 */

export const CANONICAL_ROLES = {
  PLATFORM_ADMIN: 'platform_admin',
  DISTRICT_MANAGER: 'district_manager',
  STORE_MANAGER: 'store_manager',
  CATALOG_EDITOR: 'catalog_editor',
  VIEWER: 'viewer',
  AUTOMATION_SERVICE: 'automation_service',
} as const;

export const ROLE_LIST = [
  {
    value: CANONICAL_ROLES.PLATFORM_ADMIN,
    label: 'Platform Admin',
    description: 'Full system access and user management',
  },
  {
    value: CANONICAL_ROLES.DISTRICT_MANAGER,
    label: 'District Manager',
    description: 'Manage district operations and stores',
  },
  {
    value: CANONICAL_ROLES.STORE_MANAGER,
    label: 'Store Manager',
    description: 'Manage store operations and inventory',
  },
  {
    value: CANONICAL_ROLES.CATALOG_EDITOR,
    label: 'Catalog Editor',
    description: 'Edit product catalog and attributes',
  },
  {
    value: CANONICAL_ROLES.VIEWER,
    label: 'Viewer',
    description: 'Read-only access to catalog',
  },
  {
    value: CANONICAL_ROLES.AUTOMATION_SERVICE,
    label: 'Automation Service',
    description: 'Service account for integrations',
  },
] as const;

export type CanonicalRole = typeof CANONICAL_ROLES[keyof typeof CANONICAL_ROLES];

/**
 * Check if a role is valid
 */
export function isValidRole(role: string): role is CanonicalRole {
  return Object.values(CANONICAL_ROLES).includes(role as CanonicalRole);
}

/**
 * Get role label by value
 */
export function getRoleLabel(roleValue: string): string {
  const role = ROLE_LIST.find((r) => r.value === roleValue);
  return role?.label || roleValue;
}

/**
 * Check if user has admin privilege (platform_admin or equivalent)
 */
export function isAdminRole(role: string | undefined): boolean {
  return role === CANONICAL_ROLES.PLATFORM_ADMIN;
}
