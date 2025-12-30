"use strict";
/**
 * RetailOps Export Module
 * Per AOSS Section 4.1 — RetailOps Export Mapping
 * Version: aoss.v0.5.0
 *
 * This module transforms CoreProduct objects into RetailOps-compatible CSV format.
 * Column names and order are sourced from the RetailOps CSV Field Mapping Notion spec.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.RETAILOPS_HEADER_ROW = exports.RETAILOPS_COLUMN_NAMES = exports.retailOpsExportMapping = void 0;
exports.getRetailOpsHeaderRow = getRetailOpsHeaderRow;
exports.buildRetailOpsRow = buildRetailOpsRow;
exports.buildRetailOpsCsv = buildRetailOpsCsv;
// ============================================================================
// Export Mapping Definition
// ============================================================================
/**
 * RetailOps Export Mapping
 *
 * Column names and order exactly match the RetailOps CSV Field Mapping Notion spec.
 * DO NOT rename, abbreviate, or reorder columns.
 *
 * For any column that doesn't map cleanly to a CoreProduct field:
 * - source is set to ""
 * - default value is provided if appropriate
 * - TODO comment references what's missing
 */
exports.retailOpsExportMapping = {
    columns: [
        {
            name: 'SKU',
            source: 'sku',
            required: true,
            description: 'Internal SKU identifier',
        },
        {
            name: 'Product Name',
            source: '',
            required: true,
            default: '',
            transform: 'buildProductName',
            // TODO: CoreProduct doesn't have a title field. Build from brand + class + colorPrimary.
            description: 'Product display name built from brand, class, and color',
        },
        {
            name: 'Brand',
            source: 'brand',
            required: true,
            description: 'Product brand (NIKE or JORDAN)',
        },
        {
            name: 'Description',
            source: '',
            required: false,
            default: '',
            // TODO: CoreProduct doesn't have a description field. Could use meta.description if available.
            description: 'Product description (not available in CoreProduct)',
        },
        {
            name: 'Department',
            source: 'gender',
            required: false,
            transform: 'mapGenderToDepartment',
            description: 'Maps gender to department (MEN -> Mens)',
        },
        {
            name: 'Category',
            source: 'category',
            required: false,
            description: 'Product category (FOOTWEAR)',
        },
        {
            name: 'Color',
            source: 'colorPrimary',
            required: false,
            description: 'Primary color name',
        },
        {
            name: 'Size',
            source: '',
            required: false,
            default: '',
            // TODO: CoreProduct represents a style, not a size-specific SKU. Size not available at product level.
            description: 'Size value (not available at product level)',
        },
        {
            name: 'MSRP',
            source: 'msrp',
            required: true,
            transform: 'formatCurrency',
            description: 'Manufacturers suggested retail price',
        },
        {
            name: 'Cost',
            source: '',
            required: false,
            default: '',
            // TODO: CoreProduct doesn't have a cost field. Requires inventory/procurement data.
            description: 'Product cost (not available in CoreProduct)',
        },
        {
            name: 'Retail Price',
            source: 'price',
            required: true,
            transform: 'formatCurrency',
            description: 'Selling price',
        },
        {
            name: 'Currency',
            source: '',
            required: false,
            default: 'USD',
            description: 'Currency code. Defaults to USD for MVP.',
        },
        {
            name: 'Quantity',
            source: '',
            required: false,
            default: '',
            // TODO: CoreProduct doesn't have inventory quantity. Requires inventory data.
            description: 'Inventory quantity (not available in CoreProduct)',
        },
        {
            name: 'Warehouse',
            source: '',
            required: false,
            default: '',
            // TODO: CoreProduct doesn't have warehouse info. Requires inventory data.
            description: 'Warehouse location (not available in CoreProduct)',
        },
        {
            name: 'First Received',
            source: '',
            required: false,
            default: '',
            // TODO: CoreProduct doesn't have first received date. Requires inventory data.
            description: 'First received date (not available in CoreProduct)',
        },
        {
            name: 'Launch Date',
            source: 'launchDate',
            required: false,
            transform: 'formatDate',
            description: 'Product launch date',
        },
        {
            name: 'Images',
            source: 'images',
            required: false,
            transform: 'joinImages',
            description: 'Pipe-separated list of image URLs',
        },
        {
            name: 'Primary Image',
            source: 'images',
            required: false,
            transform: 'getPrimaryImage',
            description: 'Primary/hero image URL',
        },
    ],
};
/**
 * Get the ordered list of column names for the CSV header
 */
function getRetailOpsHeaderRow() {
    return exports.retailOpsExportMapping.columns.map((col) => col.name);
}
// ============================================================================
// Transform Functions
// ============================================================================
/**
 * Build a product name from CoreProduct fields
 * Format: "{Brand} {Class} - {ColorPrimary}"
 */
function buildProductName(product) {
    const parts = [product.brand, product.class, '-', product.colorPrimary].filter(Boolean);
    return parts.join(' ').trim();
}
/**
 * Map gender enum to department string
 */
function mapGenderToDepartment(gender) {
    const mapping = {
        MEN: 'Mens',
        WOMEN: 'Womens',
        UNISEX: 'Unisex',
        KIDS: 'Kids',
    };
    return mapping[gender] || gender;
}
/**
 * Format a number as currency (2 decimal places)
 */
function formatCurrency(value) {
    if (typeof value !== 'number' || isNaN(value)) {
        return '';
    }
    return value.toFixed(2);
}
/**
 * Format an ISO date string to YYYY-MM-DD
 */
function formatDate(isoDate) {
    if (!isoDate) {
        return '';
    }
    try {
        const date = new Date(isoDate);
        if (isNaN(date.getTime())) {
            return '';
        }
        return date.toISOString().split('T')[0];
    }
    catch {
        return '';
    }
}
/**
 * Join image URLs with pipe separator
 */
function joinImages(images) {
    if (!Array.isArray(images) || images.length === 0) {
        return '';
    }
    return images.map((img) => img.url).join('|');
}
/**
 * Get the primary image URL
 * Returns the first image with isPrimary=true, or the first image if none is marked primary
 */
function getPrimaryImage(images) {
    if (!Array.isArray(images) || images.length === 0) {
        return '';
    }
    const primary = images.find((img) => img.isPrimary);
    return primary ? primary.url : images[0]?.url || '';
}
// ============================================================================
// Value Resolution
// ============================================================================
/**
 * Resolve a dot-path value from an object
 * e.g., "images.0.url" resolves to obj.images[0].url
 */
function resolvePath(obj, path) {
    if (!path) {
        return undefined;
    }
    const parts = path.split('.');
    let current = obj;
    for (const part of parts) {
        if (current === null || current === undefined) {
            return undefined;
        }
        if (typeof current === 'object') {
            current = current[part];
        }
        else {
            return undefined;
        }
    }
    return current;
}
/**
 * Apply a named transform to a value
 */
function applyTransform(transformName, value, product) {
    switch (transformName) {
        case 'buildProductName':
            return buildProductName(product);
        case 'mapGenderToDepartment':
            return mapGenderToDepartment(String(value || ''));
        case 'formatCurrency':
            return formatCurrency(value);
        case 'formatDate':
            return formatDate(String(value || ''));
        case 'joinImages':
            return joinImages(value);
        case 'getPrimaryImage':
            return getPrimaryImage(value);
        default:
            // Unknown transform, return value as-is
            return value;
    }
}
// ============================================================================
// CSV Escaping
// ============================================================================
/**
 * Escape a value for CSV output
 * - Quote values containing commas, quotes, or newlines
 * - Escape inner quotes as ""
 */
function escapeCSV(value) {
    if (value === null || value === undefined) {
        return '';
    }
    const strValue = String(value);
    // Check if quoting is needed
    const needsQuoting = strValue.includes(',') || strValue.includes('"') || strValue.includes('\n') || strValue.includes('\r');
    if (needsQuoting) {
        // Escape inner quotes by doubling them
        const escaped = strValue.replace(/"/g, '""');
        return `"${escaped}"`;
    }
    return strValue;
}
// ============================================================================
// Main Export Functions
// ============================================================================
/**
 * Build a RetailOps row from a CoreProduct
 *
 * Uses the mapping from retailOpsExportMapping to:
 * - Walk through columns in order
 * - Resolve source values from the product
 * - Apply transforms if specified
 * - Use defaults for missing values
 *
 * @param product - A valid CoreProduct object
 * @returns RetailOpsRow with keys = exact column names
 *
 * @example
 * ```typescript
 * const product: CoreProduct = { sku: 'NK-001', ... };
 * const row = buildRetailOpsRow(product);
 * console.log(row['SKU']); // 'NK-001'
 * ```
 */
function buildRetailOpsRow(product) {
    const row = {};
    for (const column of exports.retailOpsExportMapping.columns) {
        let value;
        // Resolve source value if source path is provided
        if (column.source) {
            value = resolvePath(product, column.source);
        }
        // Apply transform if specified
        if (column.transform) {
            value = applyTransform(column.transform, value, product);
        }
        // Use default if value is missing/empty
        if (value === undefined || value === null || value === '') {
            value = column.default !== undefined ? column.default : '';
        }
        // Convert to string/number/boolean/null
        if (typeof value === 'object') {
            value = String(value);
        }
        row[column.name] = value;
    }
    return row;
}
/**
 * Build a complete RetailOps CSV from an array of CoreProduct objects
 *
 * @param products - Array of valid CoreProduct objects
 * @returns CSV string with header row and one data row per product
 *
 * @example
 * ```typescript
 * const products: CoreProduct[] = [{ sku: 'NK-001', ... }, { sku: 'NK-002', ... }];
 * const csv = buildRetailOpsCsv(products);
 * // Returns:
 * // "SKU,Product Name,Brand,...\n"
 * // "NK-001,Nike Basketball - Black,NIKE,...\n"
 * // "NK-002,Nike Running - White,NIKE,...\n"
 * ```
 */
function buildRetailOpsCsv(products) {
    const headers = getRetailOpsHeaderRow();
    // Build header row
    const headerLine = headers.map(escapeCSV).join(',');
    // Build data rows
    const dataLines = products.map((product) => {
        const row = buildRetailOpsRow(product);
        return headers.map((header) => escapeCSV(row[header])).join(',');
    });
    // Combine header and data rows
    return [headerLine, ...dataLines].join('\n');
}
/**
 * Get column names only (convenience export)
 */
exports.RETAILOPS_COLUMN_NAMES = getRetailOpsHeaderRow();
/**
 * Expected header row as a string (for testing)
 */
exports.RETAILOPS_HEADER_ROW = getRetailOpsHeaderRow().join(',');
//# sourceMappingURL=retailOps.js.map