/**
 * Attribute Value Preview Utility
 * Provides a minimal, safe product-value preview for attributes
 * Lisa v3.3.0 - ACC Vocabulary UX & Product-value Preview
 */

import { getFirestore, collection, query, limit, getDocs } from 'firebase/firestore';

export interface ValueDistribution {
  value: string | null;
  count: number;
}

export interface AttributeValuePreview {
  canonicalPath: string;
  distribution: ValueDistribution[];
  totalSampled: number;
  previewAvailable: boolean;
  error?: string;
}

const SAMPLE_LIMIT = 500; // Cap to 500 docs for safety
const MAX_PREVIEW_VALUES = 10; // Show top 10 values

/**
 * Fetch a sample of product/catalog data and compute value distribution
 * For v3.3, this is a minimal implementation using products collection
 * 
 * TODO v3.4/3.6: Extend to support more collections and smarter sampling
 */
export async function getAttributeValuePreview(
  canonicalPath: string
): Promise<AttributeValuePreview> {
  try {
    const db = getFirestore();
    
    // Try to fetch from products collection (adjust collection name as needed)
    // TODO: Make collection configurable or detect from schema
    const productsRef = collection(db, 'products');
    const q = query(productsRef, limit(SAMPLE_LIMIT));
    
    const snapshot = await getDocs(q);
    
    if (snapshot.empty) {
      return {
        canonicalPath,
        distribution: [],
        totalSampled: 0,
        previewAvailable: false,
        error: 'No product data found'
      };
    }
    
    // Count values
    const valueCounts = new Map<string, number>();
    let totalFound = 0;
    
    for (const doc of snapshot.docs) {
      const data = doc.data();
      const value = getNestedValue(data, canonicalPath);
      
      if (value !== undefined && value !== null && value !== '') {
        totalFound++;
        const valueStr = String(value);
        valueCounts.set(valueStr, (valueCounts.get(valueStr) || 0) + 1);
      } else {
        // Track null/unknown
        valueCounts.set('(Unknown)', (valueCounts.get('(Unknown)') || 0) + 1);
      }
    }
    
    // Convert to distribution array and sort by count descending
    const distribution = Array.from(valueCounts.entries())
      .map(([value, count]) => ({ value, count }))
      .sort((a, b) => b.count - a.count);
    
    // Keep only top N values, aggregate rest as "Other"
    const topValues = distribution.slice(0, MAX_PREVIEW_VALUES);
    const remaining = distribution.slice(MAX_PREVIEW_VALUES);
    
    if (remaining.length > 0) {
      const otherCount = remaining.reduce((sum, item) => sum + item.count, 0);
      topValues.push({ value: '(Other)', count: otherCount });
    }
    
    return {
      canonicalPath,
      distribution: topValues,
      totalSampled: snapshot.size,
      previewAvailable: totalFound > 0
    };
  } catch (error) {
    console.error('[attributeValuePreview] Error fetching preview:', error);
    return {
      canonicalPath,
      distribution: [],
      totalSampled: 0,
      previewAvailable: false,
      error: error instanceof Error ? error.message : 'Failed to fetch preview'
    };
  }
}

/**
 * Get nested value from object using dot-notation path
 * e.g. "descriptive.gender" from { descriptive: { gender: "Male" } }
 */
function getNestedValue(obj: Record<string, unknown>, path: string): unknown {
  const parts = path.split('.');
  let current: unknown = obj;
  
  for (const part of parts) {
    if (current && typeof current === 'object' && part in current) {
      current = (current as Record<string, unknown>)[part];
    } else {
      return undefined;
    }
  }
  
  return current;
}

/**
 * Detect if a set of values looks like a stable vocab set
 * Heuristic: if we have 2-20 distinct values with decent coverage
 */
export function looksLikeVocabSet(preview: AttributeValuePreview): boolean {
  if (!preview.previewAvailable || preview.distribution.length === 0) {
    return false;
  }
  
  // Filter out (Unknown) and (Other)
  const realValues = preview.distribution.filter(
    d => d.value !== '(Unknown)' && d.value !== '(Other)'
  );
  
  // Check if we have a reasonable vocab set size (2-20 values)
  if (realValues.length < 2 || realValues.length > 20) {
    return false;
  }
  
  // Check if values cover at least 60% of samples
  const totalCoverage = realValues.reduce((sum, item) => sum + item.count, 0);
  const coveragePercent = (totalCoverage / preview.totalSampled) * 100;
  
  return coveragePercent >= 60;
}
