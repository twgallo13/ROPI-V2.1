/**
 * ROPI AOSS Navigation Configuration
 * 
 * This file defines the canonical navigation structure for the AOSS v1.0 internal frontend.
 * Based on:
 * - Section 1 — Navigation & Page Index: https://www.notion.so/eba3cfdc44fd49ef98c38b183642cc7b
 * - Section 7 — Frontend & Launch Calendar: https://www.notion.so/2b845ee1ec5a811d8d47ef14b3d0f46c
 */

export interface NavItem {
  id: string;
  label: string;
  route: string;
  icon?: string; // Placeholder for future icon integration
  children?: NavItem[];
}

export const navigationConfig: NavItem[] = [
  {
    id: 'home',
    label: 'Home',
    route: '/home',
    icon: '🏠', // Placeholder emoji icon
  },
  {
    id: 'products',
    label: 'Products',
    route: '/products',
    icon: '📦',
  },
  {
    id: 'launch-calendar',
    label: 'Launch Calendar',
    route: '/launch-calendar',
    icon: '📅',
  },
  {
    id: 'import',
    label: 'Import',
    route: '/import',
    icon: '📥',
  },
  {
    id: 'export',
    label: 'Export',
    route: '/export',
    icon: '📤',
  },
  {
    id: 'observations',
    label: 'Observations',
    route: '/observations',
    icon: '👁️',
  },
  {
    id: 'attributes',
    label: 'Attributes',
    route: '/attributes',
    icon: '🏷️',
  },
  {
    id: 'smart-rules',
    label: 'Smart Rules',
    route: '/smart-rules',
    icon: '⚡',
  },
  {
    id: 'settings',
    label: 'Settings',
    route: '/settings',
    icon: '⚙️',
  },
];

/**
 * Settings sub-navigation
 * Based on: Admin UI Build Spec — Settings CRUD
 * https://www.notion.so/2b845ee1ec5a81e58df8f9633b2e0e2b
 */
export const settingsNavConfig: NavItem[] = [
  {
    id: 'ai-templates',
    label: 'AI Templates',
    route: '/settings/ai-templates',
    icon: '🤖',
  },
  {
    id: 'search',
    label: 'Search',
    route: '/settings/search',
    icon: '🔍',
  },
  {
    id: 'import-settings',
    label: 'Import Settings',
    route: '/settings/import-settings',
    icon: '📥',
  },
  {
    id: 'export-settings',
    label: 'Export Settings',
    route: '/settings/export-settings',
    icon: '📤',
  },
  {
    id: 'bulk-actions',
    label: 'Bulk Actions',
    route: '/settings/bulk-actions',
    icon: '📋',
  },
  {
    id: 'workflows',
    label: 'Workflows',
    route: '/settings/workflows',
    icon: '🔄',
  },
  {
    id: 'ai-performance',
    label: 'AI Performance',
    route: '/settings/ai-performance',
    icon: '📊',
  },
  {
    id: 'users',
    label: 'Users',
    route: '/settings/users',
    icon: '👥',
  },
  {
    id: 'permissions',
    label: 'Permissions',
    route: '/settings/permissions',
    icon: '🔐',
  },
];
