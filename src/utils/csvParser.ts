/**
 * CSV Import Utilities
 * Handles parsing, auto-mapping, fuzzy matching, and data coercion
 */

export type MappingConfidence = 'exact' | 'synonym' | 'suggested-low' | 'unmapped';

export type ColumnMapping = {
  csvHeader: string;
  targetField: string | null;
  confidence: MappingConfidence;
  alternatives?: string[];
};

export type ParsedRow = {
  rowNumber: number;
  data: Record<string, any>;
  errors: string[];
};

export type ParseResult = {
  headers: string[];
  mappings: ColumnMapping[];
  rows: ParsedRow[];
  rawData: string[][];
  delimiter: string;
};

// Synonym mappings for auto-detection
const HEADER_SYNONYMS: Record<string, string[]> = {
  mpn: ['mpn', 'model', 'mpn_code', 'manufacturer_part_number', 'product_id', 'style', 'style_id', 'styleid', 'parent_sku', 'style_code', 'product.id', 'product_code'],
  sku: ['sku', 'variant_id', 'child_sku', 'upc', 'variant_sku'],
  name: ['name', 'title', 'product_name', 'product_title', 'description'],
  brand: ['brand', 'manufacturer', 'vendor'],
  price: ['price', 'msrp', 'retail', 'sale_price', 'retail_price'],
  stock: ['stock', 'qty', 'quantity', 'inventory', 'available'],
  images: ['images', 'image_urls', 'image_url', 'photos', 'picture'],
  size: ['size', 'variant_size', 'product_size'],
  color: ['color', 'colour', 'variant_color', 'product_color'],
  department: ['department', 'dept', 'category_main'],
  class: ['class', 'product_class', 'subcategory'],
  category: ['category', 'product_category', 'cat'],
  age_group: ['age_group', 'agegroup', 'age', 'age_category'],
  gender: ['gender', 'sex', 'for'],
  material: ['material', 'fabric', 'material_fabric', 'composition'],
  fit: ['fit', 'fitting', 'product_fit', 'size_fit'],
  featured: ['featured', 'is_featured', 'highlight'],
  map: ['map', 'minimum_advertised_price', 'map_pricing', 'min_price'],
  promo: ['promo', 'promotion', 'is_promo', 'promotional'],
  hype: ['hype', 'trending', 'hot', 'is_hype', 'popular'],
  fastfashion: ['fastfashion', 'fast_fashion', 'quick_fashion'],
  family_sizing: ['family_sizing', 'familySizing', 'family sizing', 'family'],
  height: ['height', 'h', 'ship_height', 'shipping_height'],
  width: ['width', 'w', 'ship_width', 'shipping_width'],
  length: ['length', 'l', 'ship_length', 'shipping_length'],
  weight: ['weight', 'wght', 'wt', 'ship_weight', 'shipping_weight'],
  rics_category: ['rics_category'],
  rics_long_desc: ['rics_long_desc', 'rics_long_description'],
  sports_team: ['sports_team', 'team'],
  league: ['league', 'sports_league'],
  keywords: ['keywords', 'tags', 'search_terms'],
  website: ['website', 'site', 'store'],
  taxclass: ['taxclass', 'tax_class', 'tax_code', 'tax', 'tax_category'],
};

// Headers that should be ignored by default
const DEFAULT_IGNORE = [
  'status',
  'last_received',
  'store 1',
  'store inv',
  'warehouse inv',
  'store 4',
  'total inv',
  'whs inv',
  'kl post date',
];

/**
 * Detect the most likely delimiter in a CSV line
 */
function detectDelimiter(headerLine: string): string {
  const delimiters = [',', '\t', ';', '|'];
  const counts: Record<string, number> = {};
  
  let inQuotes = false;
  
  for (const char of headerLine) {
    if (char === '"') {
      inQuotes = !inQuotes;
    } else if (!inQuotes && delimiters.includes(char)) {
      counts[char] = (counts[char] || 0) + 1;
    }
  }
  
  // Find delimiter with highest count
  let maxCount = 0;
  let bestDelimiter = ','; // default to comma
  
  for (const delimiter of delimiters) {
    if ((counts[delimiter] || 0) > maxCount) {
      maxCount = counts[delimiter];
      bestDelimiter = delimiter;
    }
  }
  
  return bestDelimiter;
}

/**
 * Get friendly name for delimiter
 */
export function getDelimiterName(delimiter: string): string {
  switch (delimiter) {
    case ',': return 'comma';
    case '\t': return 'tab';
    case ';': return 'semicolon';
    case '|': return 'pipe';
    default: return 'comma';
  }
}

/**
 * Calculate Levenshtein distance between two strings
 */
function levenshteinDistance(str1: string, str2: string): number {
  const s1 = str1.toLowerCase();
  const s2 = str2.toLowerCase();
  
  const matrix: number[][] = [];
  
  for (let i = 0; i <= s2.length; i++) {
    matrix[i] = [i];
  }
  
  for (let j = 0; j <= s1.length; j++) {
    matrix[0][j] = j;
  }
  
  for (let i = 1; i <= s2.length; i++) {
    for (let j = 1; j <= s1.length; j++) {
      if (s2.charAt(i - 1) === s1.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1, // substitution
          matrix[i][j - 1] + 1,     // insertion
          matrix[i - 1][j] + 1      // deletion
        );
      }
    }
  }
  
  return matrix[s2.length][s1.length];
}

/**
 * Auto-map a CSV header to a target field
 */
function autoMapHeader(csvHeader: string, allHeaders: string[], headerIndex: number): ColumnMapping {
  const normalized = csvHeader.toLowerCase().replace(/[^a-z0-9]/g, '_');
  
  // Check if this is a duplicate header (appears earlier in the list)
  const isDuplicate = allHeaders.slice(0, headerIndex).some(
    h => h.toLowerCase().replace(/[^a-z0-9]/g, '_') === normalized
  );
  
  if (isDuplicate) {
    return {
      csvHeader,
      targetField: null,
      confidence: 'unmapped',
    };
  }
  
  // Check if header should be ignored by default
  if (DEFAULT_IGNORE.includes(normalized) || DEFAULT_IGNORE.includes(csvHeader.toLowerCase())) {
    return {
      csvHeader,
      targetField: null,
      confidence: 'unmapped',
    };
  }
  
  // Priority 1: Exact equality check against synonyms
  for (const [targetField, synonyms] of Object.entries(HEADER_SYNONYMS)) {
    for (const synonym of synonyms) {
      const synonymNormalized = synonym.toLowerCase().replace(/[^a-z0-9]/g, '_');
      if (normalized === synonymNormalized) {
        return {
          csvHeader,
          targetField,
          confidence: 'exact',
        };
      }
    }
  }
  
  // Priority 2: Word-boundary regex match
  for (const [targetField, synonyms] of Object.entries(HEADER_SYNONYMS)) {
    for (const synonym of synonyms) {
      // Create word-boundary regex pattern
      const pattern = new RegExp('\\b' + synonym.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '\\b', 'i');
      if (pattern.test(csvHeader)) {
        return {
          csvHeader,
          targetField,
          confidence: 'synonym',
        };
      }
    }
  }
  
  // Priority 3: Levenshtein distance fuzzy matching (distance <= 2)
  const fuzzyMatches: Array<{ field: string; distance: number }> = [];
  
  for (const [targetField, synonyms] of Object.entries(HEADER_SYNONYMS)) {
    for (const synonym of synonyms) {
      const distance = levenshteinDistance(normalized, synonym);
      if (distance <= 2) {
        fuzzyMatches.push({ field: targetField, distance });
      }
    }
  }
  
  // Sort by distance and take the best match
  fuzzyMatches.sort((a, b) => a.distance - b.distance);
  
  if (fuzzyMatches.length > 0) {
    const alternatives = fuzzyMatches.slice(1, 4).map(m => m.field);
    return {
      csvHeader,
      targetField: fuzzyMatches[0].field,
      confidence: 'suggested-low',
      alternatives: alternatives.length > 0 ? alternatives : undefined,
    };
  }
  
  // No match found
  return {
    csvHeader,
    targetField: null,
    confidence: 'unmapped',
  };
}

/**
 * Coerce a value based on the target field type
 */
function coerceValue(value: string, targetField: string): any {
  if (!value || value.trim() === '') {
    return null;
  }
  
  const trimmed = value.trim();
  
  // Boolean fields
  if (['featured', 'map', 'promo', 'hype', 'fastfashion', 'family_sizing'].includes(targetField)) {
    const upper = trimmed.toUpperCase();
    if (upper === 'TRUE' || upper === 'YES' || upper === '1' || upper === 'Y') return true;
    if (upper === 'FALSE' || upper === 'NO' || upper === '0' || upper === 'N') return false;
    return false;
  }
  
  // Price and numeric fields (including shipping dimensions)
  if (['price', 'stock', 'height', 'width', 'length', 'weight'].includes(targetField)) {
    // Remove currency symbols and commas
    const cleaned = trimmed.replace(/[$,]/g, '');
    const parsed = parseFloat(cleaned);
    return isNaN(parsed) ? null : parsed;
  }
  
  // Images - split by comma or pipe
  if (targetField === 'images') {
    return trimmed.split(/[,|]/).map(url => url.trim()).filter(url => url.length > 0);
  }
  
  // Default: return as string
  return trimmed;
}

/**
 * Parse CSV file content
 */
export function parseCSV(csvContent: string): ParseResult {
  const lines = csvContent.split(/\r?\n/).filter(line => line.trim());
  
  if (lines.length === 0) {
    throw new Error('CSV file is empty');
  }
  
  // Detect delimiter from header line
  const delimiter = detectDelimiter(lines[0]);
  
  // Parse headers
  const headers = parseCSVLine(lines[0], delimiter);
  
  // Auto-map headers
  const mappings = headers.map((header, index) => autoMapHeader(header, headers, index));
  
  // Parse data rows
  const rawData: string[][] = [];
  const rows: ParsedRow[] = [];
  
  for (let i = 1; i < lines.length; i++) {
    const values = parseCSVLine(lines[i], delimiter);
    rawData.push(values);
    
    const rowData: Record<string, any> = {};
    const errors: string[] = [];
    
    for (let j = 0; j < headers.length; j++) {
      const mapping = mappings[j];
      const value = values[j] || '';
      
      if (mapping.targetField) {
        try {
          rowData[mapping.targetField] = coerceValue(value, mapping.targetField);
        } catch (error) {
          errors.push(`Column "${mapping.csvHeader}": ${error}`);
        }
      }
    }
    
    rows.push({
      rowNumber: i,
      data: rowData,
      errors,
    });
  }
  
  // Check if parsing might have failed (all rows have exactly 1 field)
  const allSingleField = headers.length === 1 && rows.length > 0;
  if (allSingleField && lines.length > 1) {
    console.warn(`Delimiter detection: detected '${delimiter}' (${getDelimiterName(delimiter)}), but all rows parsed as single field. File might use a different delimiter.`);
  }
  
  return {
    headers,
    mappings,
    rows,
    rawData,
    delimiter,
  };
}

/**
 * Parse a single CSV line handling quoted values
 */
function parseCSVLine(line: string, delimiter: string = ','): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;
  
  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    
    if (char === '"') {
      if (inQuotes && line[i + 1] === '"') {
        // Escaped quote
        current += '"';
        i++;
      } else {
        // Toggle quote state
        inQuotes = !inQuotes;
      }
    } else if (char === delimiter && !inQuotes) {
      // Field separator
      result.push(current);
      current = '';
    } else {
      current += char;
    }
  }
  
  result.push(current);
  
  return result;
}

/**
 * Generate error CSV content
 */
export function generateErrorCSV(
  headers: string[],
  errorRows: Array<{ rowNumber: number; reason: string; raw: string[] }>
): string {
  const csvLines: string[] = [];
  
  // Add header with error column
  csvLines.push([...headers, 'Import Error'].map(escapeCSVValue).join(','));
  
  // Add error rows
  for (const row of errorRows) {
    const rowData = [...row.raw, row.reason];
    csvLines.push(rowData.map(escapeCSVValue).join(','));
  }
  
  return csvLines.join('\n');
}

/**
 * Escape CSV value (wrap in quotes if needed)
 */
function escapeCSVValue(value: string): string {
  if (value.includes(',') || value.includes('"') || value.includes('\n')) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

/**
 * Download a string as a file
 */
export function downloadFile(content: string, filename: string, mimeType: string = 'text/csv') {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
