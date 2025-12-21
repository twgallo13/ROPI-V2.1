/**
 * Import Row Validator
 * Per AOSS Section 2.2 — Attribute Validation Schema
 * 
 * LP-2.1.0: MPN-first — MPN is required, SKU is optional
 * 
 * Validates normalized import rows and generates validation issues.
 */

import type {
  ImportNormalizedFields,
  ImportValidation,
  ValidationIssue,
  ValidationCode,
} from '../schema/importEngine';
import type { ColumnMapping } from '../schema/importEngine';

/**
 * Create a validation issue
 */
function createIssue(
  code: ValidationCode,
  severity: 'error' | 'warning',
  field: string,
  message: string,
  value?: string
): ValidationIssue {
  return { code, severity, field, message, value };
}

/**
 * Validate MPN (Manufacturer Part Number) - REQUIRED per LP-2.1.0
 */
function validateMPN(mpn: string | undefined): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  
  if (!mpn) {
    issues.push(
      createIssue(
        'MISSING_REQUIRED_FIELD',
        'error',
        'mpn',
        'MPN (Manufacturer Part Number) is required'
      )
    );
    return issues;
  }
  
  // Check MPN format (basic alphanumeric + hyphens/underscores)
  if (!/^[A-Z0-9\-_]+$/i.test(mpn)) {
    issues.push(
      createIssue(
        'INVALID_FORMAT',
        'error',
        'mpn',
        'MPN must contain only alphanumeric characters, hyphens, and underscores',
        mpn
      )
    );
  }
  
  // Check MPN length
  if (mpn.length < 2 || mpn.length > 50) {
    issues.push(
      createIssue(
        'INVALID_VALUE',
        'error',
        'mpn',
        'MPN must be between 2 and 50 characters',
        mpn
      )
    );
  }
  
  return issues;
}

/**
 * Validate SKU format (OPTIONAL per LP-2.1.0)
 */
function validateSKU(sku: string | undefined): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  
  // LP-2.1.0: SKU is optional, so no error if missing
  if (!sku) {
    return issues;
  }
  
  // Check SKU format (basic alphanumeric + hyphens/underscores)
  if (!/^[A-Z0-9\-_]+$/i.test(sku)) {
    issues.push(
      createIssue(
        'INVALID_FORMAT',
        'error',
        'sku',
        'SKU must contain only alphanumeric characters, hyphens, and underscores',
        sku
      )
    );
  }
  
  // Check SKU length
  if (sku.length < 3 || sku.length > 50) {
    issues.push(
      createIssue(
        'INVALID_VALUE',
        'error',
        'sku',
        'SKU must be between 3 and 50 characters',
        sku
      )
    );
  }
  
  return issues;
}

/**
 * Validate title
 */
function validateTitle(title: string | undefined): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  
  if (!title) {
    issues.push(
      createIssue(
        'MISSING_REQUIRED_FIELD',
        'error',
        'title',
        'Product title is required'
      )
    );
    return issues;
  }
  
  if (title.length < 5) {
    issues.push(
      createIssue(
        'INVALID_VALUE',
        'warning',
        'title',
        'Product title is very short (less than 5 characters)',
        title
      )
    );
  }
  
  if (title.length > 200) {
    issues.push(
      createIssue(
        'INVALID_VALUE',
        'error',
        'title',
        'Product title is too long (max 200 characters)',
        title
      )
    );
  }
  
  return issues;
}

/**
 * Validate brand
 */
function validateBrand(brand: string | undefined): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  
  if (!brand) {
    issues.push(
      createIssue(
        'MISSING_REQUIRED_FIELD',
        'error',
        'brand',
        'Brand is required'
      )
    );
  }
  
  return issues;
}

/**
 * Validate pricing fields
 */
function validatePricing(normalized: ImportNormalizedFields): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  
  // Validate MSRP
  if (normalized.msrp !== undefined) {
    if (typeof normalized.msrp !== 'number' || normalized.msrp < 0) {
      issues.push(
        createIssue(
          'INVALID_PRICE',
          'error',
          'msrp',
          'MSRP must be a positive number',
          String(normalized.msrp)
        )
      );
    }
  }
  
  // Validate cost
  if (normalized.cost !== undefined) {
    if (typeof normalized.cost !== 'number' || normalized.cost < 0) {
      issues.push(
        createIssue(
          'INVALID_PRICE',
          'error',
          'cost',
          'Cost must be a positive number',
          String(normalized.cost)
        )
      );
    }
  }
  
  // Validate retail price
  if (normalized.retailPrice !== undefined) {
    if (typeof normalized.retailPrice !== 'number' || normalized.retailPrice < 0) {
      issues.push(
        createIssue(
          'INVALID_PRICE',
          'error',
          'retailPrice',
          'Retail price must be a positive number',
          String(normalized.retailPrice)
        )
      );
    }
    
    // Warn if retail price > MSRP
    if (normalized.msrp && normalized.retailPrice > normalized.msrp) {
      issues.push(
        createIssue(
          'INVALID_VALUE',
          'warning',
          'retailPrice',
          'Retail price is higher than MSRP',
          String(normalized.retailPrice)
        )
      );
    }
    
    // Warn if retail price < cost
    if (normalized.cost && normalized.retailPrice < normalized.cost) {
      issues.push(
        createIssue(
          'INVALID_VALUE',
          'warning',
          'retailPrice',
          'Retail price is lower than cost (negative margin)',
          String(normalized.retailPrice)
        )
      );
    }
  }
  
  return issues;
}

/**
 * Validate inventory fields
 */
function validateInventory(normalized: ImportNormalizedFields): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  
  if (normalized.quantity !== undefined) {
    if (typeof normalized.quantity !== 'number' || normalized.quantity < 0 || !Number.isInteger(normalized.quantity)) {
      issues.push(
        createIssue(
          'INVALID_QUANTITY',
          'error',
          'quantity',
          'Quantity must be a non-negative integer',
          String(normalized.quantity)
        )
      );
    }
  }
  
  return issues;
}

/**
 * Validate date fields
 */
function validateDates(normalized: ImportNormalizedFields): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  
  // Validate firstReceived
  if (normalized.firstReceived !== undefined) {
    try {
      const date = new Date(normalized.firstReceived);
      if (isNaN(date.getTime())) {
        issues.push(
          createIssue(
            'INVALID_DATE',
            'error',
            'firstReceived',
            'Invalid date format',
            normalized.firstReceived
          )
        );
      } else if (date > new Date()) {
        issues.push(
          createIssue(
            'INVALID_DATE',
            'warning',
            'firstReceived',
            'First received date is in the future',
            normalized.firstReceived
          )
        );
      }
    } catch {
      issues.push(
        createIssue(
          'INVALID_DATE',
          'error',
          'firstReceived',
          'Invalid date format',
          normalized.firstReceived
        )
      );
    }
  }
  
  // Validate launchDate
  if (normalized.launchDate !== undefined) {
    try {
      const date = new Date(normalized.launchDate);
      if (isNaN(date.getTime())) {
        issues.push(
          createIssue(
            'INVALID_DATE',
            'error',
            'launchDate',
            'Invalid date format',
            normalized.launchDate
          )
        );
      }
    } catch {
      issues.push(
        createIssue(
          'INVALID_DATE',
          'error',
          'launchDate',
          'Invalid date format',
          normalized.launchDate
        )
      );
    }
  }
  
  return issues;
}

/**
 * Validate media fields
 */
function validateMedia(normalized: ImportNormalizedFields): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  
  // Validate primary image URL
  if (normalized.primaryImage !== undefined) {
    try {
      new URL(normalized.primaryImage);
    } catch {
      issues.push(
        createIssue(
          'INVALID_FORMAT',
          'error',
          'primaryImage',
          'Invalid URL format',
          normalized.primaryImage
        )
      );
    }
  }
  
  // Validate image URLs array
  if (normalized.images !== undefined && Array.isArray(normalized.images)) {
    for (let i = 0; i < normalized.images.length; i++) {
      try {
        new URL(normalized.images[i]);
      } catch {
        issues.push(
          createIssue(
            'INVALID_FORMAT',
            'error',
            `images[${i}]`,
            'Invalid URL format',
            normalized.images[i]
          )
        );
      }
    }
  }
  
  return issues;
}

/**
 * Validate a normalized import row
 * 
 * LP-2.1.0: MPN-first — MPN is required, SKU is optional
 * 
 * @param normalized - Normalized fields to validate
 * @returns Validation results with errors and warnings
 */
export function validateImportRow(
  normalized: ImportNormalizedFields
): ImportValidation {
  const errors: ValidationIssue[] = [];
  const warnings: ValidationIssue[] = [];
  
  // Validate core required fields (LP-2.1.0: MPN is now required)
  const mpnIssues = validateMPN(normalized.mpn);
  const skuIssues = validateSKU(normalized.sku); // Optional but validated if present
  const titleIssues = validateTitle(normalized.title);
  const brandIssues = validateBrand(normalized.brand);
  
  // Validate optional fields
  const pricingIssues = validatePricing(normalized);
  const inventoryIssues = validateInventory(normalized);
  const dateIssues = validateDates(normalized);
  const mediaIssues = validateMedia(normalized);
  
  // Separate errors and warnings from all issues
  const allIssues = [
    ...mpnIssues,
    ...skuIssues,
    ...titleIssues,
    ...brandIssues,
    ...pricingIssues,
    ...inventoryIssues,
    ...dateIssues,
    ...mediaIssues,
  ];
  
  for (const issue of allIssues) {
    if (issue.severity === 'error') {
      errors.push(issue);
    } else {
      warnings.push(issue);
    }
  }
  
  return {
    isValid: errors.length === 0,
    errors,
    warnings,
  };
}

/**
 * Check if validation allows row to be processed
 * (i.e., no critical errors)
 * 
 * @param validation - Validation results
 * @returns True if row can be processed despite warnings
 */
export function canProcessRow(validation: ImportValidation): boolean {
  return validation.isValid;
}
