/**
 * useAttributeRegistry Hook
 * 
 * Read-only wrapper around useAttributes for product editor access.
 * Provides attribute definitions from the registry for rendering form controls.
 * 
 * Lisa v1.0.0
 * 
 * References:
 * - Attribute Registry: https://www.notion.so/2b845ee1ec5a81228b07ca97964cd033
 * - Product Completion Workflows (W2): https://www.notion.so/2ba45ee1ec5a80698690f9492961ed8b
 */

import { useMemo } from 'react';
import { useAttributes, type Attribute } from './useAttributes';

export type { Attribute };

export interface AttributeRegistryResult {
  /** All attributes from the registry */
  attributes: Attribute[];
  /** Loading state */
  loading: boolean;
  /** Error message if any */
  error: string | null;
  /** Get a single attribute definition by ID */
  getAttributeById: (id: string) => Attribute | undefined;
  /** Get attributes filtered by category */
  getAttributesByCategory: (category: string) => Attribute[];
  /** Get only active attributes (status !== 'hidden' && status !== 'deprecated') */
  activeAttributes: Attribute[];
  /** Get required attributes for product completion */
  requiredAttributes: Attribute[];
  /** Refresh the registry from the server */
  refresh: () => Promise<void>;
}

/**
 * LP-1.4.5: Helper functions for case conversion (tolerant lookup)
 */
const toSnakeCase = (s: string) => s.replace(/([A-Z])/g, (m) => `_${m.toLowerCase()}`).replace(/^_/, '');
const toCamelCase = (s: string) => s.replace(/_([a-z])/g, (_, c) => c.toUpperCase());

/**
 * Hook to access the attribute registry for the product editor.
 * Provides read-only access to attribute definitions.
 * 
 * @returns AttributeRegistryResult object with attributes and helper functions
 */
export function useAttributeRegistry(): AttributeRegistryResult {
  const { attributes, loading, error, refresh } = useAttributes();

  /**
   * LP-1.4.5: Tolerant attribute lookup that tries multiple naming conventions.
   * Tries: exact match → snake_case → camelCase → lowercase → synonyms
   * This prevents UI omissions when registry uses different naming than code.
   */
  const getAttributeById = useMemo(
    () => (id: string): Attribute | undefined => {
      if (!id) return undefined;
      
      // 1. Try exact match
      let found = attributes.find(a => a.attribute_id === id);
      if (found) return found;
      
      // 2. Try snake_case variant
      const snakeVariant = toSnakeCase(id);
      if (snakeVariant !== id) {
        found = attributes.find(a => a.attribute_id === snakeVariant);
        if (found) return found;
      }
      
      // 3. Try camelCase variant
      const camelVariant = toCamelCase(id);
      if (camelVariant !== id) {
        found = attributes.find(a => a.attribute_id === camelVariant);
        if (found) return found;
      }
      
      // 4. Try lowercase variant (case-insensitive)
      const lowerId = id.toLowerCase();
      found = attributes.find(a => a.attribute_id.toLowerCase() === lowerId);
      if (found) return found;
      
      // 5. Try synonyms lookup (if attributes have synonyms defined)
      found = attributes.find(a => {
        if (!a.synonyms) return false;
        if (Array.isArray(a.synonyms)) {
          return a.synonyms.some(s => s.toLowerCase() === lowerId);
        }
        // Record<string, string[]> format
        return Object.keys(a.synonyms).some(k => k.toLowerCase() === lowerId);
      });
      if (found) return found;
      
      return undefined;
    },
    [attributes]
  );

  const getAttributesByCategory = useMemo(
    () => (category: string) => attributes.filter(a => a.category === category),
    [attributes]
  );

  const activeAttributes = useMemo(
    () => attributes.filter(a => a.status !== 'hidden' && a.status !== 'deprecated'),
    [attributes]
  );

  const requiredAttributes = useMemo(
    () => attributes.filter(a => a.required_for_completion === true),
    [attributes]
  );

  return {
    attributes,
    loading,
    error,
    getAttributeById,
    getAttributesByCategory,
    activeAttributes,
    requiredAttributes,
    refresh,
  };
}

export default useAttributeRegistry;
