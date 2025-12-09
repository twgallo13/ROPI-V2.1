/**
 * Ropi Canonical Role Definitions
 * 
 * These are the authoritative role identifiers used throughout ROPI.
 * All custom claims and permissions are based on these role values.
 * 
 * Role Hierarchy (from highest to lowest privilege):
 * 1. admin - Full system access
 * 2. merch - Import/export and Launch Calendar management
 * 3. photographer - Observations and media management
 * 4. viewer - Launch calendar read-only access
 */

export const ROPI_ROLES = {
  ADMIN: 'admin',
  MERCH: 'merch',
  PHOTOGRAPHER: 'photographer',
  VIEWER: 'viewer',
} as const;

export const ROLE_LIST = [
  {
    value: ROPI_ROLES.ADMIN,
    label: 'Administrator',
    description: 'Full system access and user management',
  },
  {
    value: ROPI_ROLES.MERCH,
    label: 'Merchandise Manager',
    description: 'Import/export and Launch Calendar management',
  },
  {
    value: ROPI_ROLES.PHOTOGRAPHER,
    label: 'Photographer',
    description: 'Observations and media management',
  },
  {
    value: ROPI_ROLES.VIEWER,
    label: 'Viewer',
    description: 'Launch calendar read-only access',
  },
] as const;

export type RopiRole = typeof ROPI_ROLES[keyof typeof ROPI_ROLES];

/**
 * Check if a role is valid
 */
export function isValidRole(role: string): role is RopiRole {
  return Object.values(ROPI_ROLES).includes(role as RopiRole);
}

/**
 * Get role label by value
 */
export function getRoleLabel(roleValue: string): string {
  const role = ROLE_LIST.find((r) => r.value === roleValue);
  return role?.label || roleValue;
}

/**
 * Check if user has admin privilege
 */
export function isAdminRole(role: string | undefined): boolean {
  return role === ROPI_ROLES.ADMIN;
}
