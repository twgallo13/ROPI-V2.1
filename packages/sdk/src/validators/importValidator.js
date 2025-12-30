"use strict";
/**
 * Import Row Validator
 * Per AOSS Section 2.2 — Attribute Validation Schema
 *
 * LP-2.1.0: MPN-first — MPN is required, SKU is optional
 *
 * Validates normalized import rows and generates validation issues.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.validateImportRow = validateImportRow;
exports.canProcessRow = canProcessRow;
/**
 * Create a validation issue
 */
function createIssue(code, severity, field, message, value) {
    return { code, severity, field, message, value };
}
/**
 * Validate MPN (Manufacturer Part Number) - REQUIRED per LP-2.1.0
 */
function validateMPN(mpn) {
    const issues = [];
    if (!mpn) {
        issues.push(createIssue('MISSING_REQUIRED_FIELD', 'error', 'mpn', 'MPN (Manufacturer Part Number) is required'));
        return issues;
    }
    // Check MPN format (basic alphanumeric + hyphens/underscores)
    if (!/^[A-Z0-9\-_]+$/i.test(mpn)) {
        issues.push(createIssue('INVALID_FORMAT', 'error', 'mpn', 'MPN must contain only alphanumeric characters, hyphens, and underscores', mpn));
    }
    // Check MPN length
    if (mpn.length < 2 || mpn.length > 50) {
        issues.push(createIssue('INVALID_VALUE', 'error', 'mpn', 'MPN must be between 2 and 50 characters', mpn));
    }
    return issues;
}
/**
 * Validate SKU format (OPTIONAL per LP-2.1.0)
 */
function validateSKU(sku) {
    const issues = [];
    // LP-2.1.0: SKU is optional, so no error if missing
    if (!sku) {
        return issues;
    }
    // Check SKU format (basic alphanumeric + hyphens/underscores)
    if (!/^[A-Z0-9\-_]+$/i.test(sku)) {
        issues.push(createIssue('INVALID_FORMAT', 'error', 'sku', 'SKU must contain only alphanumeric characters, hyphens, and underscores', sku));
    }
    // Check SKU length
    if (sku.length < 3 || sku.length > 50) {
        issues.push(createIssue('INVALID_VALUE', 'error', 'sku', 'SKU must be between 3 and 50 characters', sku));
    }
    return issues;
}
/**
 * Validate name (Product Name)
 * LP-ATTR-1.3.1: name is optional per registry (import_required: false)
 * Check both 'name' (canonical) and 'title' (legacy) for backward compatibility
 */
function validateName(name, title) {
    const issues = [];
    // LP-ATTR-1.3.1: Product Name (name) is optional - no error if missing
    const productName = name || title;
    if (!productName) {
        return issues; // Optional field
    }
    // Validate format if present
    if (productName.length < 5) {
        issues.push(createIssue('INVALID_VALUE', 'warning', name ? 'name' : 'title', 'Product name is very short (less than 5 characters)', productName));
    }
    if (productName.length > 200) {
        issues.push(createIssue('INVALID_VALUE', 'error', name ? 'name' : 'title', 'Product name is too long (max 200 characters)', productName));
    }
    return issues;
}
/**
 * Validate brand
 * LP-ATTR-1.3.1: brand is optional per registry (import_required: false)
 */
function validateBrand(brand) {
    const issues = [];
    // LP-ATTR-1.3.1: Brand is optional - no error if missing
    // Registry import_required: false is authoritative
    if (!brand) {
        return issues; // Optional field
    }
    // Validate format if present
    if (brand.length > 100) {
        issues.push(createIssue('INVALID_VALUE', 'error', 'brand', 'Brand is too long (max 100 characters)', brand));
    }
    return issues;
}
/**
 * Validate pricing fields
 */
function validatePricing(normalized) {
    const issues = [];
    // Validate MSRP
    if (normalized.msrp !== undefined) {
        if (typeof normalized.msrp !== 'number' || normalized.msrp < 0) {
            issues.push(createIssue('INVALID_PRICE', 'error', 'msrp', 'MSRP must be a positive number', String(normalized.msrp)));
        }
    }
    // Validate cost
    if (normalized.cost !== undefined) {
        if (typeof normalized.cost !== 'number' || normalized.cost < 0) {
            issues.push(createIssue('INVALID_PRICE', 'error', 'cost', 'Cost must be a positive number', String(normalized.cost)));
        }
    }
    // Validate retail price
    if (normalized.retailPrice !== undefined) {
        if (typeof normalized.retailPrice !== 'number' || normalized.retailPrice < 0) {
            issues.push(createIssue('INVALID_PRICE', 'error', 'retailPrice', 'Retail price must be a positive number', String(normalized.retailPrice)));
        }
        // Warn if retail price > MSRP
        if (normalized.msrp && normalized.retailPrice > normalized.msrp) {
            issues.push(createIssue('INVALID_VALUE', 'warning', 'retailPrice', 'Retail price is higher than MSRP', String(normalized.retailPrice)));
        }
        // Warn if retail price < cost
        if (normalized.cost && normalized.retailPrice < normalized.cost) {
            issues.push(createIssue('INVALID_VALUE', 'warning', 'retailPrice', 'Retail price is lower than cost (negative margin)', String(normalized.retailPrice)));
        }
    }
    return issues;
}
/**
 * Validate inventory fields
 */
function validateInventory(normalized) {
    const issues = [];
    if (normalized.quantity !== undefined) {
        if (typeof normalized.quantity !== 'number' || normalized.quantity < 0 || !Number.isInteger(normalized.quantity)) {
            issues.push(createIssue('INVALID_QUANTITY', 'error', 'quantity', 'Quantity must be a non-negative integer', String(normalized.quantity)));
        }
    }
    return issues;
}
/**
 * Validate date fields
 */
function validateDates(normalized) {
    const issues = [];
    // Validate firstReceived
    if (normalized.firstReceived !== undefined) {
        try {
            const date = new Date(normalized.firstReceived);
            if (isNaN(date.getTime())) {
                issues.push(createIssue('INVALID_DATE', 'error', 'firstReceived', 'Invalid date format', normalized.firstReceived));
            }
            else if (date > new Date()) {
                issues.push(createIssue('INVALID_DATE', 'warning', 'firstReceived', 'First received date is in the future', normalized.firstReceived));
            }
        }
        catch {
            issues.push(createIssue('INVALID_DATE', 'error', 'firstReceived', 'Invalid date format', normalized.firstReceived));
        }
    }
    // Validate launchDate
    if (normalized.launchDate !== undefined) {
        try {
            const date = new Date(normalized.launchDate);
            if (isNaN(date.getTime())) {
                issues.push(createIssue('INVALID_DATE', 'error', 'launchDate', 'Invalid date format', normalized.launchDate));
            }
        }
        catch {
            issues.push(createIssue('INVALID_DATE', 'error', 'launchDate', 'Invalid date format', normalized.launchDate));
        }
    }
    return issues;
}
/**
 * Validate media fields
 */
function validateMedia(normalized) {
    const issues = [];
    // Validate primary image URL
    if (normalized.primaryImage !== undefined) {
        try {
            new URL(normalized.primaryImage);
        }
        catch {
            issues.push(createIssue('INVALID_FORMAT', 'error', 'primaryImage', 'Invalid URL format', normalized.primaryImage));
        }
    }
    // Validate image URLs array
    if (normalized.images !== undefined && Array.isArray(normalized.images)) {
        for (let i = 0; i < normalized.images.length; i++) {
            try {
                new URL(normalized.images[i]);
            }
            catch {
                issues.push(createIssue('INVALID_FORMAT', 'error', `images[${i}]`, 'Invalid URL format', normalized.images[i]));
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
function validateImportRow(normalized) {
    const errors = [];
    const warnings = [];
    // Validate core required fields (LP-2.1.0: MPN is now required)
    const mpnIssues = validateMPN(normalized.mpn);
    const skuIssues = validateSKU(normalized.sku); // Optional but validated if present
    // LP-ATTR-1.3.1: Check both 'name' (canonical) and 'title' (legacy)
    const nameIssues = validateName(normalized.name, normalized.title);
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
        ...nameIssues,
        ...brandIssues,
        ...pricingIssues,
        ...inventoryIssues,
        ...dateIssues,
        ...mediaIssues,
    ];
    for (const issue of allIssues) {
        if (issue.severity === 'error') {
            errors.push(issue);
        }
        else {
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
function canProcessRow(validation) {
    return validation.isValid;
}
//# sourceMappingURL=importValidator.js.map