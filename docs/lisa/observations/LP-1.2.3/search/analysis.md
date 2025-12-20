# LP-1.2.3: Capture Search Implementation Analysis

## Current Implementation

### MPN Lookup (MobileMPNScanner.tsx)
- Uses **exact match** via `/api/products/by-mpn/:mpn`
- Query: `db.collection('products').where('mpn', '==', mpn).limit(1)`
- Issue: 401 due to missing Authorization header (separate fix)

### Products List Search (useProducts.ts → /api/products?q=)
- Uses **substring match** via client-side filtering
- Implementation (products.ts lines 273-285):
  ```ts
  if (searchQuery) {
    docs = docs.filter(doc => {
      const searchFields = [sku, mpn, name, brand, category, department, class];
      return searchFields.some(field => field.includes(searchQuery));
    });
  }
  ```
- **Partial matching supported**: `ABC-12` matches `ABC-123`, `ABC-1234`, etc.

## Partial/Prefix Search Verification

The current search implementation **already supports partial matching** because it uses `.includes()`:
- `"ABC-123".toLowerCase().includes("abc-1")` → true ✅
- `"ABC-123".toLowerCase().includes("abc")` → true ✅

## Issue: MPN Scanner Uses Exact Match Only

The `MobileMPNScanner` component only does **exact lookup** via `/by-mpn/:mpn`.
- If user types partial MPN, lookup fails with 404
- No autocomplete/suggestions are shown

## Recommendation

1. **Short-term**: The `/api/products?q=` endpoint already supports partial search. The MobileMPNScanner could be enhanced to:
   - Show autocomplete suggestions while typing
   - Call `/api/products?q=${partialMpn}` for suggestions
   - Allow selection from suggestions or exact lookup on submit

2. **Current behavior is acceptable** for barcode scanning (always has full MPN)
   - Manual entry could benefit from autocomplete (future enhancement)

## Constraints

- Firestore doesn't support native substring/LIKE queries
- Current client-side filtering works for <5k products
- For scale (>5k products): consider Algolia or Elasticsearch

## Verdict

**Partial search is implemented and working** via `/api/products?q=` endpoint.
The MPN scanner's exact-match behavior is correct for barcode scanning.
Autocomplete enhancement is a separate feature request (not required for LP-1.2.3).
