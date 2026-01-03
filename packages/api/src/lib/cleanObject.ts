/**
 * Clean Object Utility
 * 
 * Recursively removes `undefined` values from objects before writing to Firestore.
 * This prevents "Cannot use 'undefined' as a Firestore value" errors.
 * 
 * Usage:
 * ```ts
 * const auditDoc = { actor: uid, reason: undefined, timestamp: Date.now() };
 * const cleaned = cleanObject(auditDoc);
 * await db.collection('audit').add(cleaned);
 * ```
 * 
 * @param obj - Object, array, or primitive to clean
 * @returns Cleaned object with undefined values removed
 */
export function cleanObject<T = any>(obj: T): T {
  // Handle null explicitly (Firestore allows null)
  if (obj === null) {
    return obj;
  }

  // Handle arrays
  if (Array.isArray(obj)) {
    return obj.map(cleanObject).filter(item => item !== undefined) as any;
  }

  // Handle objects
  if (obj && typeof obj === 'object') {
    const cleaned: any = {};
    for (const [key, value] of Object.entries(obj)) {
      // Skip undefined values
      if (value === undefined) {
        continue;
      }
      
      // Recursively clean nested objects/arrays
      const cleanedValue = cleanObject(value);
      
      // Only include if cleaned value is not undefined
      if (cleanedValue !== undefined) {
        cleaned[key] = cleanedValue;
      }
    }
    return cleaned;
  }

  // Return primitives as-is (including undefined, which will be filtered by caller)
  return obj;
}
