/**
 * Attribute Validator Service
 * LP-2.1.8 — Server-side Import Validation
 * 
 * Validates import rows against the canonical attribute registry.
 * Enforces:
 * - MPN required
 * - data_type shape validation
 * - enum/multiSelect allowed_values (with synonyms support)
 * - import: true flag on attributes
 * - import_required enforcement
 * 
 * Produces per-row diagnostics (errors/warnings).
 */

import * as admin from 'firebase-admin';

// ============================================================================
// Types
// ============================================================================

/**
 * Registry attribute definition from settings/attributes/keys/{id}
 */
export interface AttributeDefinition {
  id: string;
  attribute_id: string;
  label: string;
  data_type: 'string' | 'number' | 'boolean' | 'enum' | 'multiSelect' | 'date' | 'currency' | 'json';
  allowed_values?: string[];
  synonyms?: Record<string, string>; // { "blk": "Black", "wht": "White" }
  import?: boolean; // if false, attribute not importable
  import_required?: boolean; // if true, attribute must be present
  import_strict?: boolean; // if true, unknown enum values are blocking errors
  canonical?: boolean;
  definition_version?: string;
}

/**
 * Validation diagnostic for a single issue
 */
export interface ValidationDiagnostic {
  code: string;
  message: string;
  attribute?: string;
  value?: unknown;
}

/**
 * Row validation result
 */
export interface RowValidationResult {
  rowNumber: number;
  mpn: string;
  status: 'valid' | 'valid_with_warnings' | 'invalid';
  errors: ValidationDiagnostic[];
  warnings: ValidationDiagnostic[];
  normalizedValues: Record<string, unknown>;
}

/**
 * Batch validation result
 */
export interface BatchValidationResult {
  timestamp: string;
  totalRows: number;
  validRows: number;
  invalidRows: number;
  warningRows: number;
  rows: RowValidationResult[];
}

// ============================================================================
// Registry Cache
// ============================================================================

/**
 * In-memory cache for registry attributes (per-batch)
 */
let registryCache: Map<string, AttributeDefinition> | null = null;

/**
 * Load registry map from Firestore
 * Fetches all attribute definitions and caches them
 */
export async function loadRegistryMap(): Promise<Map<string, AttributeDefinition>> {
  if (registryCache) {
    return registryCache;
  }

  const db = admin.firestore();
  const snap = await db.collection('settings').doc('attributes').collection('keys').get();
  
  const map = new Map<string, AttributeDefinition>();
  
  snap.forEach(doc => {
    const data = doc.data();
    const def: AttributeDefinition = {
      id: doc.id,
      attribute_id: data.attribute_id || doc.id,
      label: data.label || doc.id,
      data_type: data.data_type || 'string',
      allowed_values: data.allowed_values,
      synonyms: data.synonyms,
      import: data.import !== false, // default to true if not set
      import_required: data.import_required || false,
      import_strict: data.import_strict || false,
      canonical: data.canonical,
      definition_version: data.definition_version,
    };
    
    // Index by both id and attribute_id
    map.set(doc.id, def);
    if (data.attribute_id && data.attribute_id !== doc.id) {
      map.set(data.attribute_id, def);
    }
  });
  
  registryCache = map;
  return map;
}

/**
 * Clear registry cache (call after batch processing)
 */
export function clearRegistryCache(): void {
  registryCache = null;
}

/**
 * Get attribute definition by ID
 */
export async function getAttributeDefinition(attrId: string): Promise<AttributeDefinition | null> {
  const map = await loadRegistryMap();
  return map.get(attrId) || null;
}

// ============================================================================
// Value Parsers
// ============================================================================

/**
 * Parse and validate a string value
 */
function validateString(value: unknown): { value: string | null; error?: ValidationDiagnostic } {
  if (value === null || value === undefined || value === '') {
    return { value: null };
  }
  
  if (typeof value === 'object' && !Array.isArray(value)) {
    return {
      value: null,
      error: {
        code: 'invalid_string',
        message: `Expected string, got object`,
        value,
      },
    };
  }
  
  return { value: String(value).trim() };
}

/**
 * Parse and validate a number value
 */
function validateNumber(value: unknown): { value: number | null; error?: ValidationDiagnostic } {
  if (value === null || value === undefined || value === '') {
    return { value: null };
  }
  
  const num = Number(value);
  if (Number.isNaN(num)) {
    return {
      value: null,
      error: {
        code: 'invalid_number',
        message: `'${value}' is not a valid number`,
        value,
      },
    };
  }
  
  return { value: num };
}

/**
 * Parse and validate a boolean value
 */
function validateBoolean(value: unknown): { value: boolean | null; error?: ValidationDiagnostic } {
  if (value === null || value === undefined || value === '') {
    return { value: null };
  }
  
  const strVal = String(value).toLowerCase().trim();
  
  if (['true', '1', 'yes', 'y'].includes(strVal)) {
    return { value: true };
  }
  
  if (['false', '0', 'no', 'n'].includes(strVal)) {
    return { value: false };
  }
  
  return {
    value: null,
    error: {
      code: 'invalid_boolean',
      message: `'${value}' is not a valid boolean (expected true/false, yes/no, 1/0)`,
      value,
    },
  };
}

/**
 * Parse and validate a date value (ISO format)
 */
function validateDate(value: unknown): { value: string | null; error?: ValidationDiagnostic } {
  if (value === null || value === undefined || value === '') {
    return { value: null };
  }
  
  const strVal = String(value).trim();
  const date = new Date(strVal);
  
  if (Number.isNaN(date.getTime())) {
    return {
      value: null,
      error: {
        code: 'invalid_date',
        message: `'${value}' is not a valid date`,
        value,
      },
    };
  }
  
  // Return ISO format
  return { value: date.toISOString() };
}

/**
 * Parse and validate a currency value
 * Accept string or number, warn if malformed
 */
function validateCurrency(value: unknown): { value: string | null; warning?: ValidationDiagnostic } {
  if (value === null || value === undefined || value === '') {
    return { value: null };
  }
  
  const strVal = String(value).trim();
  
  // Check for valid numeric pattern (allow $ prefix, commas, decimals)
  const cleanVal = strVal.replace(/[$,]/g, '');
  const num = Number(cleanVal);
  
  if (Number.isNaN(num)) {
    return {
      value: strVal,
      warning: {
        code: 'currency_malformed',
        message: `'${value}' may not be a valid currency value`,
        value,
      },
    };
  }
  
  return { value: strVal };
}

/**
 * Parse and validate an enum value
 */
function validateEnum(
  value: unknown,
  attrDef: AttributeDefinition
): { value: string | null; error?: ValidationDiagnostic; warning?: ValidationDiagnostic } {
  if (value === null || value === undefined || value === '') {
    return { value: null };
  }
  
  const strVal = String(value).trim();
  const allowedValues = attrDef.allowed_values || [];
  const synonyms = attrDef.synonyms || {};
  
  // Map synonym to canonical value
  const mapped = synonyms[strVal] || synonyms[strVal.toLowerCase()] || strVal;
  
  // Check if value is allowed
  if (allowedValues.length > 0 && !allowedValues.includes(mapped)) {
    // Check case-insensitive match
    const caseInsensitiveMatch = allowedValues.find(
      v => v.toLowerCase() === mapped.toLowerCase()
    );
    
    if (caseInsensitiveMatch) {
      return { value: caseInsensitiveMatch };
    }
    
    // Unknown value - treat as warning or error based on import_strict
    if (attrDef.import_strict) {
      return {
        value: null,
        error: {
          code: 'enum_invalid',
          message: `Value '${strVal}' is not allowed for ${attrDef.attribute_id}`,
          attribute: attrDef.attribute_id,
          value: strVal,
        },
      };
    }
    
    return {
      value: strVal, // Keep raw value but mark warning
      warning: {
        code: 'enum_unknown',
        message: `Value '${strVal}' is not in allowed values for ${attrDef.attribute_id}`,
        attribute: attrDef.attribute_id,
        value: strVal,
      },
    };
  }
  
  return { value: mapped };
}

/**
 * Parse and validate a multiSelect value
 * Accept array or pipe/comma-delimited string
 */
function validateMultiSelect(
  value: unknown,
  attrDef: AttributeDefinition
): { value: string[] | null; warning?: ValidationDiagnostic } {
  if (value === null || value === undefined || value === '') {
    return { value: null };
  }
  
  // Parse into array
  let arr: string[];
  if (Array.isArray(value)) {
    arr = value.map(v => String(v).trim()).filter(Boolean);
  } else {
    // Split by | or ,
    const strVal = String(value);
    arr = strVal.split(/[|,]/).map(v => v.trim()).filter(Boolean);
  }
  
  if (arr.length === 0) {
    return { value: null };
  }
  
  const allowedValues = attrDef.allowed_values || [];
  const synonyms = attrDef.synonyms || {};
  
  // Map synonyms
  const mappedArr = arr.map(v => {
    const mapped = synonyms[v] || synonyms[v.toLowerCase()] || v;
    // Check case-insensitive match
    if (allowedValues.length > 0) {
      const match = allowedValues.find(av => av.toLowerCase() === mapped.toLowerCase());
      return match || mapped;
    }
    return mapped;
  });
  
  // Find invalid values
  if (allowedValues.length > 0) {
    const invalids = mappedArr.filter(v => !allowedValues.includes(v));
    if (invalids.length > 0) {
      return {
        value: mappedArr,
        warning: {
          code: 'multi_select_unknown',
          message: `Values '${invalids.join(', ')}' not in allowed values for ${attrDef.attribute_id}`,
          attribute: attrDef.attribute_id,
          value: invalids,
        },
      };
    }
  }
  
  return { value: mappedArr };
}

// ============================================================================
// Row Validation
// ============================================================================

/**
 * Non-attribute columns (skip validation)
 */
const SKIP_COLUMNS = new Set([
  'mpn', 'MPN', 'sku', 'SKU', 'title', 'name', 'Product Name',
  'description', 'Description', 'price', 'Price', 'MSRP', 'quantity', 'Quantity',
  'image', 'images', 'url', 'barcode', 'upc', 'UPC', 'Brand',
]);

/**
 * Map common column names to attribute IDs
 * LP-ATTR-1.3.0: Add title → name mapping for Product Name normalization
 */
const COLUMN_TO_ATTRIBUTE: Record<string, string> = {
  // LP-ATTR-1.3.0: Product Name normalization
  'Product Name': 'name',
  'title': 'name',
  'Title': 'name',
  'name': 'name',
  'Name': 'name',
  // Core attributes
  'Gender': 'gender',
  'gender': 'gender',
  'Department': 'department',
  'department': 'department',
  'Category': 'category',
  'category': 'category',
  'Class': 'class',
  'class': 'class',
  'Color': 'primary_color',
  'color': 'primary_color',
  'Primary Color': 'primary_color',
  'primaryColor': 'primary_color',
  'Age Group': 'age_group',
  'ageGroup': 'age_group',
  'age_group': 'age_group',
  'Material': 'material',
  'material': 'material',
  'Style': 'style',
  'style': 'style',
  'Fit': 'fit',
  'fit': 'fit',
};

/**
 * Validate a single import row
 */
export function validateRow(
  row: Record<string, unknown>,
  rowNumber: number,
  registryMap: Map<string, AttributeDefinition>
): RowValidationResult {
  const errors: ValidationDiagnostic[] = [];
  const warnings: ValidationDiagnostic[] = [];
  const normalizedValues: Record<string, unknown> = {};
  
  // Extract MPN
  const mpn = String(row['MPN'] || row['mpn'] || '').trim();
  
  // LP-2.1.8: MPN required
  if (!mpn) {
    errors.push({
      code: 'missing_mpn',
      message: 'MPN is required for import',
    });
    
    return {
      rowNumber,
      mpn: '',
      status: 'invalid',
      errors,
      warnings,
      normalizedValues,
    };
  }
  
  normalizedValues['mpn'] = mpn;
  
  // Track required attributes that are missing
  const requiredAttrs = new Set<string>();
  registryMap.forEach((def, _id) => {
    if (def.import_required) {
      requiredAttrs.add(def.attribute_id);
    }
  });
  
  // Validate each column
  for (const [col, rawVal] of Object.entries(row)) {
    // Skip non-attribute columns
    if (SKIP_COLUMNS.has(col)) {
      continue;
    }
    
    // Map column to attribute ID
    const attrId = COLUMN_TO_ATTRIBUTE[col] || col;
    
    // Get attribute definition
    const attrDef = registryMap.get(attrId);
    
    if (!attrDef) {
      // Unknown attribute - warn but don't block
      if (rawVal !== null && rawVal !== undefined && rawVal !== '') {
        warnings.push({
          code: 'unknown_attribute',
          message: `Attribute '${attrId}' not found in registry`,
          attribute: attrId,
        });
      }
      continue;
    }
    
    // Check if attribute is importable
    if (attrDef.import === false) {
      errors.push({
        code: 'attribute_not_importable',
        message: `Attribute '${attrId}' is not importable (import: false)`,
        attribute: attrId,
      });
      continue;
    }
    
    // Mark required attribute as seen
    requiredAttrs.delete(attrDef.attribute_id);
    
    // Skip empty values
    if (rawVal === null || rawVal === undefined || rawVal === '') {
      continue;
    }
    
    // Validate by data_type
    switch (attrDef.data_type) {
      case 'string': {
        const result = validateString(rawVal);
        if (result.error) {
          errors.push({ ...result.error, attribute: attrId });
        } else if (result.value !== null) {
          normalizedValues[attrId] = result.value;
        }
        break;
      }
      
      case 'number': {
        const result = validateNumber(rawVal);
        if (result.error) {
          errors.push({ ...result.error, attribute: attrId });
        } else if (result.value !== null) {
          normalizedValues[attrId] = result.value;
        }
        break;
      }
      
      case 'boolean': {
        const result = validateBoolean(rawVal);
        if (result.error) {
          errors.push({ ...result.error, attribute: attrId });
        } else if (result.value !== null) {
          normalizedValues[attrId] = result.value;
        }
        break;
      }
      
      case 'date': {
        const result = validateDate(rawVal);
        if (result.error) {
          errors.push({ ...result.error, attribute: attrId });
        } else if (result.value !== null) {
          normalizedValues[attrId] = result.value;
        }
        break;
      }
      
      case 'currency': {
        const result = validateCurrency(rawVal);
        if (result.warning) {
          warnings.push({ ...result.warning, attribute: attrId });
        }
        if (result.value !== null) {
          normalizedValues[attrId] = result.value;
        }
        break;
      }
      
      case 'enum': {
        const result = validateEnum(rawVal, attrDef);
        if (result.error) {
          errors.push(result.error);
        }
        if (result.warning) {
          warnings.push(result.warning);
        }
        if (result.value !== null) {
          normalizedValues[attrId] = result.value;
        }
        break;
      }
      
      case 'multiSelect': {
        const result = validateMultiSelect(rawVal, attrDef);
        if (result.warning) {
          warnings.push(result.warning);
        }
        if (result.value !== null) {
          normalizedValues[attrId] = result.value;
        }
        break;
      }
      
      case 'json':
      default: {
        // Pass through as-is
        normalizedValues[attrId] = rawVal;
        break;
      }
    }
  }
  
  // Check for missing required attributes
  for (const missingAttr of requiredAttrs) {
    errors.push({
      code: 'missing_required',
      message: `Required attribute '${missingAttr}' is missing`,
      attribute: missingAttr,
    });
  }
  
  // Determine status
  let status: 'valid' | 'valid_with_warnings' | 'invalid';
  if (errors.length > 0) {
    status = 'invalid';
  } else if (warnings.length > 0) {
    status = 'valid_with_warnings';
  } else {
    status = 'valid';
  }
  
  return {
    rowNumber,
    mpn,
    status,
    errors,
    warnings,
    normalizedValues,
  };
}

/**
 * Validate a batch of import rows
 */
export async function validateBatch(
  rows: Record<string, unknown>[]
): Promise<BatchValidationResult> {
  // Load registry (cached for batch)
  const registryMap = await loadRegistryMap();
  
  const results: RowValidationResult[] = [];
  let validRows = 0;
  let invalidRows = 0;
  let warningRows = 0;
  
  for (let i = 0; i < rows.length; i++) {
    const result = validateRow(rows[i], i + 1, registryMap);
    results.push(result);
    
    if (result.status === 'invalid') {
      invalidRows++;
    } else if (result.status === 'valid_with_warnings') {
      warningRows++;
      validRows++;
    } else {
      validRows++;
    }
  }
  
  // Clear cache after batch
  clearRegistryCache();
  
  return {
    timestamp: new Date().toISOString(),
    totalRows: rows.length,
    validRows,
    invalidRows,
    warningRows,
    rows: results,
  };
}
