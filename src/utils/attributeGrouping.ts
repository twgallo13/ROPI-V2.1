/**
 * Attribute Grouping Utilities
 * Groups attributes by canonical path to reduce perceived duplicates
 * Lisa v3.3.0 - ACC Vocabulary UX & Product-value Preview
 */

export type SourceKind = 'core' | 'vendor' | 'legacy' | 'ai' | 'other';

export interface AttributeData {
  canonicalPath: string;
  label: string;
  category: string;
  dataType: string;
  key?: string;
  importerColumns?: string[];
  importRequired?: boolean;
  requiredForExport?: boolean;
  export?: boolean;
  bulkEditable?: boolean;
  foundation?: boolean;
  description?: string;
  systemFlag?: boolean;
  legacyPaths?: string[];
  deprecated?: boolean;
  ai?: {
    use?: string[];
    can_write?: boolean;
    confidenceThreshold?: number;
    trusted_sources?: string[];
    notes?: string;
  };
  validation?: {
    required?: boolean;
    pattern?: string | null;
    allowedValuesRef?: string | null;
    allowedValues?: string[];
  };
  ui?: {
    hint?: string;
  };
  audit?: {
    createdBy?: string;
    createdAt?: string;
    updatedBy?: string;
    updatedAt?: string;
    version?: string;
  };
}

export interface AttributeVariant {
  id: string;
  label: string;
  sourceKind: SourceKind;
  canonicalPath: string;
  key: string;
  category: string;
  dataType: string;
  importerColumns?: string[];
  // Keep full attribute data for detail view
  fullData: AttributeData;
}

export interface GroupedAttribute {
  canonicalPath: string;
  displayName: string;
  core?: AttributeVariant;
  variants: AttributeVariant[];
  isCore: boolean;
  isDeprecated: boolean;
  tags: string[];
  // Preserve one full attribute for accessing common metadata
  primaryAttribute: AttributeData;
}

/**
 * Determine the source kind of an attribute based on its metadata
 */
function determineSourceKind(attr: AttributeData): SourceKind {
  // Check if AI-generated field
  if (attr.canonicalPath?.startsWith('a_i_generated.') || 
      attr.canonicalPath?.startsWith('ai.') ||
      attr.ai?.can_write === true) {
    return 'ai';
  }
  
  // Check if core/foundation
  if (attr.foundation === true || attr.systemFlag === true) {
    return 'core';
  }
  
  // Check if vendor (has RICS or vendor-specific columns)
  const columns = attr.importerColumns || [];
  if (columns.some((col: string) => {
    const colLower = String(col || '').toLowerCase();
    return colLower.includes('rics') || colLower.includes('vendor');
  })) {
    return 'vendor';
  }
  
  // Check if legacy (has legacy paths or old naming)
  if (attr.legacyPaths && attr.legacyPaths.length > 0) {
    return 'legacy';
  }
  
  return 'other';
}

/**
 * Group attributes by canonical path
 * Multiple labels/aliases for the same attribute are grouped together
 */
export function groupAttributesByPath(attributes: AttributeData[]): GroupedAttribute[] {
  const groupMap = new Map<string, GroupedAttribute>();
  
  for (const attr of attributes) {
    const canonicalPath = attr.canonicalPath || attr.key || '';
    
    if (!canonicalPath) {
      console.warn('[grouping] Attribute missing canonical path:', attr);
      continue;
    }
    
    const sourceKind = determineSourceKind(attr);
    const variant: AttributeVariant = {
      id: attr.canonicalPath || attr.key,
      label: attr.label,
      sourceKind,
      canonicalPath: attr.canonicalPath,
      key: attr.key || attr.canonicalPath,
      category: attr.category,
      dataType: attr.dataType,
      importerColumns: attr.importerColumns || [],
      fullData: attr
    };
    
    if (!groupMap.has(canonicalPath)) {
      // Create new group
      const isCore = sourceKind === 'core' || attr.foundation === true;
      const isDeprecated = attr.deprecated === true;
      
      const group: GroupedAttribute = {
        canonicalPath,
        displayName: attr.label,
        variants: [variant],
        isCore,
        isDeprecated,
        tags: [],
        primaryAttribute: attr
      };
      
      if (isCore) group.core = variant;
      
      groupMap.set(canonicalPath, group);
    } else {
      // Add variant to existing group
      const group = groupMap.get(canonicalPath)!;
      group.variants.push(variant);
      
      // Update core variant if this one is core
      if (sourceKind === 'core' && !group.core) {
        group.core = variant;
        group.isCore = true;
      }
      
      // Update deprecated flag
      if (attr.deprecated === true) {
        group.isDeprecated = true;
      }
    }
  }
  
  // Build tags for each group
  for (const group of groupMap.values()) {
    const tagSet = new Set<string>();
    
    if (group.isCore) tagSet.add('Core');
    if (group.isDeprecated) tagSet.add('Deprecated');
    
    // Check for vendor/legacy/ai variants
    const hasVendor = group.variants.some(v => v.sourceKind === 'vendor');
    const hasLegacy = group.variants.some(v => v.sourceKind === 'legacy');
    const hasAi = group.variants.some(v => v.sourceKind === 'ai');
    
    if (hasVendor) tagSet.add('Vendor');
    if (hasLegacy) tagSet.add('Legacy');
    if (hasAi) tagSet.add('AI');
    
    group.tags = Array.from(tagSet);
  }
  
  return Array.from(groupMap.values()).sort((a, b) => {
    // Sort by category then display name
    // Lisa v3.3.0: Guard against undefined category/displayName to prevent TypeError
    const aCat = String(a.primaryAttribute.category || '');
    const bCat = String(b.primaryAttribute.category || '');
    if (aCat !== bCat) {
      return aCat.localeCompare(bCat);
    }
    const aName = String(a.displayName || '');
    const bName = String(b.displayName || '');
    return aName.localeCompare(bName);
  });
}

/**
 * Filter grouped attributes by search term
 * Searches across canonical path, display name, and variant labels
 */
export function filterGroupedAttributes(
  groups: GroupedAttribute[],
  searchTerm: string
): GroupedAttribute[] {
  if (!searchTerm.trim()) {
    return groups;
  }
  
  const term = String(searchTerm || '').toLowerCase().trim();
  
  return groups.filter(group => {
    // Search in canonical path
    const pathLower = String(group.canonicalPath || '').toLowerCase();
    if (pathLower.includes(term)) {
      return true;
    }
    
    // Search in display name
    const nameLower = String(group.displayName || '').toLowerCase();
    if (nameLower.includes(term)) {
      return true;
    }
    
    // Search in any variant label
    if (group.variants.some(v => {
      const labelLower = String(v.label || '').toLowerCase();
      return labelLower.includes(term);
    })) {
      return true;
    }
    
    // Search in description
    const descLower = String(group.primaryAttribute.description || '').toLowerCase();
    if (descLower.includes(term)) {
      return true;
    }
    
    return false;
  });
}
