/**
 * RetailOps Import Module
 * Per AOSS Section 3.3 — RetailOps Import Path
 * Version: aoss.v0.6.0
 *
 * This module parses RetailOps CSV exports and transforms them into ImportRow and CoreProduct objects.
 * It handles the actual RetailOps export format with flexible column mapping.
 *
 * Data flow:
 *   RetailOps CSV → ParsedRetailOpsRow[] → ImportRow[] → CoreProduct[]
 */

import type { ImportRow } from '../schemas/importRow';
import type { CoreProduct, ProductImage } from '../schemas/coreProduct';

// ============================================================================
// Types
// ============================================================================

/**
 * Options for parsing RetailOps CSV
 */
export interface RetailOpsCsvParseOptions {
  /** Field delimiter (default: ",") */
  delimiter?: string;
  /** Whether the first row is a header row (default: true) */
  hasHeaderRow?: boolean;
  /** Whether to trim whitespace from field values (default: true) */
  trimFields?: boolean;
  /** Whether to skip empty rows (default: true) */
  skipEmptyRows?: boolean;
}

/**
 * A parsed row from a RetailOps CSV file
 * Contains the raw column values indexed by header name
 */
export interface ParsedRetailOpsRow {
  /** Raw column values keyed by header name */
  raw: Record<string, string>;
  /** 1-based row number in the original CSV (excluding header) */
  rowNumber: number;
}

/**
 * Result of importing a CSV with potential errors
 */
export interface RetailOpsImportResult {
  /** Successfully parsed products */
  products: CoreProduct[];
  /** Rows that were skipped with reasons */
  skipped: Array<{
    rowNumber: number;
    reason: string;
    raw: Record<string, string>;
  }>;
  /** Total rows processed */
  totalRows: number;
}

// ============================================================================
// CSV Parsing
// ============================================================================

/**
 * Parse a CSV line handling quoted fields, commas in quotes, and escaped quotes
 */
function parseCSVLine(line: string, delimiter: string = ','): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;
  let i = 0;

  while (i < line.length) {
    const char = line[i];

    if (inQuotes) {
      if (char === '"') {
        // Check for escaped quote ""
        if (i + 1 < line.length && line[i + 1] === '"') {
          current += '"';
          i += 2;
          continue;
        }
        // End of quoted field
        inQuotes = false;
        i++;
        continue;
      }
      current += char;
      i++;
    } else {
      if (char === '"') {
        // Start of quoted field
        inQuotes = true;
        i++;
        continue;
      }
      if (char === delimiter) {
        result.push(current);
        current = '';
        i++;
        continue;
      }
      current += char;
      i++;
    }
  }

  // Push the last field
  result.push(current);

  return result;
}

/**
 * Parse a RetailOps CSV string into an array of ParsedRetailOpsRow objects
 *
 * @param csv - The raw CSV string
 * @param options - Parsing options
 * @returns Array of parsed rows with raw column values
 *
 * @example
 * ```typescript
 * const csv = `SKU,Brand,Color\nNK-001,Nike,Black\nNK-002,Nike,White`;
 * const rows = parseRetailOpsCsv(csv);
 * // rows[0].raw = { SKU: 'NK-001', Brand: 'Nike', Color: 'Black' }
 * ```
 */
export function parseRetailOpsCsv(
  csv: string,
  options?: RetailOpsCsvParseOptions
): ParsedRetailOpsRow[] {
  const {
    delimiter = ',',
    hasHeaderRow = true,
    trimFields = true,
    skipEmptyRows = true,
  } = options || {};

  // Split into lines, handling different line endings
  const lines = csv.split(/\r?\n/);

  if (lines.length === 0) {
    return [];
  }

  const result: ParsedRetailOpsRow[] = [];
  let headers: string[] = [];
  let dataStartIndex = 0;

  // Parse header row if present
  if (hasHeaderRow && lines.length > 0) {
    headers = parseCSVLine(lines[0], delimiter);
    if (trimFields) {
      headers = headers.map((h) => h.trim());
    }
    dataStartIndex = 1;
  }

  // Parse data rows
  for (let i = dataStartIndex; i < lines.length; i++) {
    const line = lines[i];

    // Skip empty lines
    if (skipEmptyRows && (!line || line.trim() === '')) {
      continue;
    }

    const values = parseCSVLine(line, delimiter);

    // Build the raw object
    const raw: Record<string, string> = {};
    for (let j = 0; j < headers.length; j++) {
      let value = values[j] || '';
      if (trimFields) {
        value = value.trim();
      }
      raw[headers[j]] = value;
    }

    // Add any extra columns beyond headers (shouldn't happen normally)
    for (let j = headers.length; j < values.length; j++) {
      let value = values[j] || '';
      if (trimFields) {
        value = value.trim();
      }
      raw[`_col${j}`] = value;
    }

    result.push({
      raw,
      rowNumber: i - dataStartIndex + 1, // 1-based, relative to data rows
    });
  }

  return result;
}

// ============================================================================
// Column Name Normalization
// ============================================================================

/**
 * Known column name mappings from RetailOps to normalized keys
 * Handles variations in column naming across different RetailOps exports
 */
const COLUMN_MAPPINGS: Record<string, string[]> = {
  sku: ['SKU', 'Sku', 'sku', 'Item SKU', 'Product SKU'],
  mpn: ['MPN', 'Mpn', 'mpn', 'Manufacturer Part Number'],
  brand: ['Brand', 'BRAND', 'brand', 'Vendor', 'Manufacturer'],
  name: ['Name', 'NAME', 'name', 'Product Name', 'ProductName', 'Title'],
  description: ['Description', 'DESCRIPTION', 'description', 'RICS Short Description', 'RICS Long Desc'],
  department: ['Department', 'DEPARTMENT', 'department', 'Dept'],
  category: ['Category', 'CATEGORY', 'category', 'RICS Category'],
  class: ['Class', 'CLASS', 'class', 'Product Class'],
  gender: ['Gender', 'GENDER', 'gender'],
  ageGroup: ['Age Group', 'AgeGroup', 'age_group'],
  color: ['Color', 'COLOR', 'color', 'Primary Color', 'Descriptive Color', 'RICS Color'],
  size: ['Size', 'SIZE', 'size'],
  msrp: ['MSRP', 'msrp', 'MAP', 'SCOM Regular Price', 'Regular Price'],
  retailPrice: ['Retail Price', 'RetailPrice', 'retail_price', 'SCOM Sale Price', 'Sale Price', 'Price'],
  cost: ['Cost', 'COST', 'cost'],
  currency: ['Currency', 'CURRENCY', 'currency'],
  quantity: ['Quantity', 'QTY', 'qty', 'Total Inv', 'Warehouse Inv'],
  warehouse: ['Warehouse', 'WAREHOUSE', 'warehouse', 'Location'],
  launchDate: ['Launch Date', 'LaunchDate', 'launch_date', 'Release Date'],
  images: ['Images', 'IMAGES', 'images', 'Media', 'Image URLs'],
  primaryImage: ['Primary Image', 'PrimaryImage', 'primary_image', 'Main Image'],
  // NOTE: 'Product Is Active' is intentionally **not** included as a synonym for status.
  // Product Is Active is a separate operational command/flag and must be treated as pass-through.
  status: ['Status', 'STATUS', 'status'],
  styleId: ['Style ID', 'StyleID', 'style_id', 'Style'],
};

/**
 * Find a value from raw data using known column name variations
 */
function findColumnValue(raw: Record<string, string>, key: string): string {
  const variations = COLUMN_MAPPINGS[key] || [key];
  for (const variation of variations) {
    if (raw[variation] !== undefined && raw[variation] !== '') {
      return raw[variation];
    }
  }
  return '';
}

// ============================================================================
// ParsedRetailOpsRow → ImportRow
// ============================================================================

/**
 * Convert a ParsedRetailOpsRow into an ImportRow
 *
 * @param parsed - The parsed CSV row
 * @returns An ImportRow suitable for further processing
 *
 * @example
 * ```typescript
 * const parsed = { raw: { SKU: 'NK-001', Brand: 'Nike' }, rowNumber: 1 };
 * const importRow = retailOpsRowToImportRow(parsed);
 * // importRow.source = 'RETAILOPS_EXPORT'
 * // importRow.styleCode = 'NK-001'
 * ```
 */
export function retailOpsRowToImportRow(parsed: ParsedRetailOpsRow): ImportRow {
  const { raw, rowNumber } = parsed;

  // Extract values using column mappings
  const sku = findColumnValue(raw, 'sku');
  const mpn = findColumnValue(raw, 'mpn');
  const brand = findColumnValue(raw, 'brand');
  const color = findColumnValue(raw, 'color');
  const size = findColumnValue(raw, 'size');
  const gender = findColumnValue(raw, 'gender');
  const department = findColumnValue(raw, 'department');
  const category = findColumnValue(raw, 'category');

  // Derive styleCode from SKU or MPN
  // TODO: A more robust styleCode extractor may be added later to handle
  // Nike-style patterns like "DZ5485-410" vs generic SKUs
  const styleCode = mpn || sku || `ROW-${rowNumber}`;

  // Generate rowId from SKU or fallback to row number
  const rowId = sku || `retailops:${rowNumber}`;

  // TODO: No explicit UPC column in RetailOps export - using SKU as placeholder
  const upc = sku;

  // Normalize gender from various sources
  let normalizedGender: string | undefined;
  const genderSource = gender || department || '';
  if (/\b(men|mens|men's|male)\b/i.test(genderSource)) {
    normalizedGender = 'MEN';
  } else if (/\b(women|womens|women's|female)\b/i.test(genderSource)) {
    normalizedGender = 'WOMEN';
  } else if (/\b(kids|child|children|toddler|infant|youth|boys?|girls?)\b/i.test(genderSource)) {
    normalizedGender = 'KIDS';
  } else if (/\b(unisex)\b/i.test(genderSource)) {
    normalizedGender = 'UNISEX';
  }

  // Normalize category - check both department and category for footwear keywords
  let normalizedCategory: string | undefined;
  const categorySource = `${department} ${category}`.trim();
  if (/\b(footwear|shoe|sneaker|boot|sandal|clog|slipper)\b/i.test(categorySource)) {
    normalizedCategory = 'FOOTWEAR';
  } else if (/\b(apparel|clothing|shirt|pants|jacket|top)\b/i.test(categorySource)) {
    normalizedCategory = 'APPAREL';
  } else if (category) {
    normalizedCategory = category.toUpperCase();
  } else if (department) {
    normalizedCategory = department.toUpperCase();
  }

  // For MVP (Nike men's footwear), default size scale
  const normalizedSizeScale = normalizedGender === 'MEN' ? 'MENS_US' : undefined;

  // === Pass-through protection ===
  // Keep Status and Product Is Active as pass-through metadata only.
  // We place them into raw._passThrough to make accidental promotion to canonical fields unlikely.
  const statusRaw = raw['Status'] || raw['STATUS'] || raw['status'] || '';
  const productIsActiveRaw = raw['Product Is Active'] || raw['product_is_active'] || raw['PRODUCT_IS_ACTIVE'] || '';

  // Ensure _passThrough exists on the raw snapshot for clarity.
  if (!raw['_passThrough']) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (raw as any)['_passThrough'] = {};
  }
  // Store original pass-through values (do not use these for canonical mapping).
  (raw as any)['_passThrough'].status = statusRaw;
  (raw as any)['_passThrough'].product_is_active = productIsActiveRaw;

  // Remove from raw to prevent accidental use
  delete raw['Status'];
  delete raw['status'];
  delete raw['STATUS'];
  delete raw['Product Is Active'];
  delete raw['product_is_active'];
  delete raw['PRODUCT_IS_ACTIVE'];

  return {
    source: 'RETAILOPS_EXPORT',
    rowId,
    originalRowNumber: rowNumber,
    styleCode,
    brand: brand.trim(),
    color: color.trim(),
    size: size.trim(),
    upc,
    raw: raw as Record<string, unknown>,
    normalizedGender,
    normalizedCategory,
    normalizedSizeScale,
  };
}

// ============================================================================
// ImportRow → CoreProduct
// ============================================================================

/**
 * Parse a numeric value from a string, handling currency symbols and commas
 */
function parseNumeric(value: string): number {
  if (!value || value.trim() === '') {
    return 0;
  }
  // Remove currency symbols, commas, spaces
  const cleaned = value.replace(/[$€£,\s]/g, '');
  const num = parseFloat(cleaned);
  return isNaN(num) ? 0 : num;
}

/**
 * Parse a date string into ISO 8601 format
 */
function parseDate(value: string): string {
  if (!value || value.trim() === '') {
    // Default to current date for MVP
    return new Date().toISOString();
  }

  // Try parsing as-is first (handles ISO format)
  let date = new Date(value);
  if (!isNaN(date.getTime())) {
    return date.toISOString();
  }

  // Try common formats: MM/DD/YYYY, DD/MM/YYYY
  const parts = value.split(/[\/\-]/);
  if (parts.length === 3) {
    // Assume MM/DD/YYYY for US format
    const [p1, p2, p3] = parts.map((p) => parseInt(p, 10));
    if (p3 > 100) {
      // YYYY is third
      date = new Date(p3, p1 - 1, p2);
    } else if (p1 > 100) {
      // YYYY is first (ISO-like)
      date = new Date(p1, p2 - 1, p3);
    }
    if (!isNaN(date.getTime())) {
      return date.toISOString();
    }
  }

  // Fallback to current date
  return new Date().toISOString();
}

/**
 * Normalize brand string to CoreProduct brand enum
 * @returns 'NIKE' | 'JORDAN' or null if not a supported brand
 */
function normalizeBrand(brand: string): 'NIKE' | 'JORDAN' | null {
  const upper = brand.toUpperCase().trim();
  if (upper === 'NIKE' || upper.includes('NIKE')) {
    return 'NIKE';
  }
  if (upper === 'JORDAN' || upper.includes('JORDAN')) {
    return 'JORDAN';
  }
  return null;
}

/**
 * Derive product class from category/department
 */
function deriveClass(raw: Record<string, unknown>): string {
  const category = String(raw['Category'] || raw['RICS Category'] || '');
  const classVal = String(raw['Class'] || '');
  const combined = `${category} ${classVal}`.toLowerCase();

  if (/basketball/i.test(combined)) {
    return 'BASKETBALL';
  }
  if (/running|run/i.test(combined)) {
    return 'RUNNING';
  }
  if (/training|gym|fitness/i.test(combined)) {
    return 'TRAINING';
  }
  if (/soccer|football/i.test(combined)) {
    return 'SOCCER';
  }
  if (/tennis/i.test(combined)) {
    return 'TENNIS';
  }
  if (/golf/i.test(combined)) {
    return 'GOLF';
  }
  if (/skateboard|skate/i.test(combined)) {
    return 'SKATEBOARDING';
  }

  // TODO: More robust class derivation may be needed
  // Fallback to LIFESTYLE for unclassified products
  return 'LIFESTYLE';
}

/**
 * Parse images from CSV columns into ProductImage array
 */
function parseImages(raw: Record<string, unknown>): ProductImage[] {
  const images: ProductImage[] = [];

  // Find images column (pipe-separated or comma-separated URLs)
  const imagesStr = String(findColumnValue(raw as Record<string, string>, 'images') || '');
  const primaryImageStr = String(findColumnValue(raw as Record<string, string>, 'primaryImage') || '');

  // Handle the Media column format: "hash,type,name;hash,type,name;..."
  // This is the format in the actual RetailOps export
  if (imagesStr.includes(';') || imagesStr.includes(',')) {
    // Split by semicolon for multiple images
    const imageParts = imagesStr.split(';').filter(Boolean);
    for (const part of imageParts) {
      // Each part might be "hash,type,name" or just a URL
      const subParts = part.split(',');
      if (subParts.length >= 1) {
        // For now, we can't construct URLs from hashes without more context
        // TODO: Handle RetailOps media hash format properly
        // For MVP, skip non-URL formats
        if (subParts[0].startsWith('http')) {
          images.push({ url: subParts[0].trim() });
        }
      }
    }
  } else if (imagesStr.includes('|')) {
    // Pipe-separated URLs (our export format)
    const urls = imagesStr.split('|').filter(Boolean);
    for (const url of urls) {
      if (url.trim().startsWith('http')) {
        images.push({ url: url.trim() });
      }
    }
  } else if (imagesStr.startsWith('http')) {
    // Single URL
    images.push({ url: imagesStr.trim() });
  }

  // Mark primary image
  if (primaryImageStr && primaryImageStr.startsWith('http')) {
    const primaryUrl = primaryImageStr.trim();
    const existingPrimary = images.find((img) => img.url === primaryUrl);
    if (existingPrimary) {
      existingPrimary.isPrimary = true;
    } else {
      images.unshift({ url: primaryUrl, isPrimary: true });
    }
  } else if (images.length > 0) {
    // Mark first image as primary if no explicit primary
    images[0].isPrimary = true;
  }

  return images;
}

/**
 * Convert an ImportRow into a CoreProduct (Nike men's footwear MVP)
 *
 * @param row - The ImportRow to convert
 * @returns A CoreProduct object
 * @throws Error if the brand is not NIKE or JORDAN (MVP constraint)
 *
 * @example
 * ```typescript
 * const importRow: ImportRow = { ... };
 * const product = importRowToCoreProduct(importRow);
 * // product.brand = 'NIKE'
 * // product.gender = 'MEN'
 * ```
 */
export function importRowToCoreProduct(row: ImportRow): CoreProduct {
  const raw = row.raw as Record<string, string>;

  // Normalize brand - MVP only supports NIKE and JORDAN
  const brand = normalizeBrand(row.brand);
  if (!brand) {
    throw new Error(
      `Unsupported brand "${row.brand}" for MVP. Only NIKE and JORDAN are supported.`
    );
  }

  // Extract pricing
  const msrpStr = findColumnValue(raw, 'msrp');
  const priceStr = findColumnValue(raw, 'retailPrice');
  const msrp = parseNumeric(msrpStr);
  const price = parseNumeric(priceStr) || msrp; // Fallback to MSRP if no sale price

  // Extract launch date
  const launchDateStr = findColumnValue(raw, 'launchDate');
  const launchDate = parseDate(launchDateStr);

  // Parse images
  const images = parseImages(raw);

  // Derive product class
  const productClass = deriveClass(raw);

  // Build the CoreProduct
  const coreProduct: CoreProduct = {
    id: row.rowId,
    sku: row.rowId,
    styleCode: row.styleCode,
    brand,
    gender: 'MEN', // MVP: Nike men's footwear only
    category: 'FOOTWEAR', // MVP: Footwear only
    class: productClass,
    colorPrimary: row.color || 'Unknown',
    sizeScale: 'MENS_US', // MVP: Men's US sizes only
    msrp: msrp || 0,
    price: price || 0,
    launchDate,
    status: 'READY_FOR_EXPORT',
    images,
    meta: {
      retailOpsRowId: row.rowId,
      originalBrand: row.brand,
      importSource: 'RETAILOPS_EXPORT',
    },
  };

  // Add colorSecondary if available
  const descriptiveColor = raw['Descriptive Color'] || '';
  if (descriptiveColor && descriptiveColor !== row.color) {
    coreProduct.colorSecondary = descriptiveColor;
  }

  // Add season if derivable
  const seasonMatch = launchDate.match(/^(\d{4})/);
  if (seasonMatch) {
    const year = seasonMatch[1].slice(2);
    const month = new Date(launchDate).getMonth();
    const season = month < 6 ? 'SP' : 'FA';
    coreProduct.season = `${season}${year}`;
  }

  return coreProduct;
}

// ============================================================================
// High-Level Convenience Functions
// ============================================================================

/**
 * Parse a RetailOps CSV and convert all rows to CoreProduct objects
 *
 * This is the main entry point for importing RetailOps data.
 * It handles parsing, mapping, and filtering in one call.
 *
 * @param csv - The raw CSV string
 * @param options - Parsing options
 * @returns Array of CoreProduct objects (only NIKE/JORDAN products for MVP)
 *
 * @example
 * ```typescript
 * const csv = fs.readFileSync('retailops-export.csv', 'utf-8');
 * const products = retailOpsCsvToCoreProducts(csv);
 * console.log(`Imported ${products.length} Nike/Jordan products`);
 * ```
 */
export function retailOpsCsvToCoreProducts(
  csv: string,
  options?: RetailOpsCsvParseOptions
): CoreProduct[] {
  const parsed = parseRetailOpsCsv(csv, options);
  const products: CoreProduct[] = [];

  for (const row of parsed) {
    try {
      const importRow = retailOpsRowToImportRow(row);
      const product = importRowToCoreProduct(importRow);
      products.push(product);
    } catch {
      // Skip rows that fail validation (e.g., non-Nike/Jordan brands)
      // In production, you might want to log these
      continue;
    }
  }

  return products;
}

/**
 * Parse a RetailOps CSV and return detailed results including skipped rows
 *
 * @param csv - The raw CSV string
 * @param options - Parsing options
 * @returns Import result with products, skipped rows, and statistics
 */
export function retailOpsCsvToCoreProductsWithDetails(
  csv: string,
  options?: RetailOpsCsvParseOptions
): RetailOpsImportResult {
  const parsed = parseRetailOpsCsv(csv, options);
  const products: CoreProduct[] = [];
  const skipped: RetailOpsImportResult['skipped'] = [];

  for (const row of parsed) {
    try {
      const importRow = retailOpsRowToImportRow(row);
      const product = importRowToCoreProduct(importRow);
      products.push(product);
    } catch (error) {
      skipped.push({
        rowNumber: row.rowNumber,
        reason: error instanceof Error ? error.message : 'Unknown error',
        raw: row.raw,
      });
    }
  }

  return {
    products,
    skipped,
    totalRows: parsed.length,
  };
}

/**
 * Convert an array of ParsedRetailOpsRow to ImportRow array
 * Useful for intermediate processing or debugging
 */
export function parsedRowsToImportRows(parsed: ParsedRetailOpsRow[]): ImportRow[] {
  return parsed.map(retailOpsRowToImportRow);
}

/**
 * Convert an array of ImportRow to CoreProduct array
 * Filters out rows that fail validation (non-Nike/Jordan brands)
 */
export function importRowsToCoreProducts(rows: ImportRow[]): CoreProduct[] {
  const products: CoreProduct[] = [];
  for (const row of rows) {
    try {
      products.push(importRowToCoreProduct(row));
    } catch {
      continue;
    }
  }
  return products;
}
