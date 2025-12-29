# LP: LP-importer-mapping-recon-1.4.6.3

## UI / DATA CONSISTENCY AUDIT (PRE-LP) — Audit Only. No Fixes.

**Date:** 2025-12-29  
**Branch:** aoss-main  
**Commit:** f970084  
**Auditor:** Homer (AI)

---

## Executive Summary

This audit investigated 5 specific UI/data consistency behaviors. Key findings:

1. **Auth state does NOT affect Firestore queries/projections** - The same document is returned regardless of auth state; the difference users may see is due to different merge logic paths or browser caching.

2. **Date console errors ARE caused by ISO timestamps** - `<input type="date">` requires `yyyy-MM-dd` format, but normalized ISO timestamps (`2026-01-09T00:00:00.000Z`) are passed, causing browser validation warnings.

3. **"Product saved to localStorage!" is a legacy alert** - Firestore writes DO happen; the alert message is misleading and comes from `ProductEditorPage.tsx:81`.

4. **Normalized dates ARE correctly stored** - The migration wrote ISO timestamps to `attributes.*` fields. However, top-level fields retain original vendor formats.

5. **Normalization did NOT break the UI** - The UI was already displaying vendor formats from top-level fields. Normalization only affected `attributes.*` which are used as fallbacks.

---

## Detailed Findings

### Q1: Does auth state affect Firestore queries/projections leading to missing attributes?

**Finding:** No, auth state does NOT affect Firestore data projections.

**Evidence:**
- [useProduct.ts#L315-L360](packages/web/src/hooks/useProduct.ts#L315-L360): The Firestore `onSnapshot` listener retrieves the full document regardless of auth state
- The code path does NOT use any role-based field projection:
  ```typescript
  // Line 324-325
  unsub = onSnapshot(ref, (snap) => {
    if (snap.exists()) {
      const docData = snap.data(); // Full document, no projection
  ```
- Firestore rules (`firestore.rules`) allow reads for authenticated users but don't filter fields
- Differences users may observe are due to:
  - Browser localStorage fallback (when not authenticated)
  - Different merge logic paths (`mergeCoreFieldsToTopLevel`, `mergeFieldsToTopLevel`)
  - Stale browser cache

**Conclusion:** Auth state affects whether Firestore or localStorage is used, but NOT field visibility within Firestore.

---

### Q2: Where do UI attribute values come from?

**Finding:** Values come from a complex merge hierarchy with multiple sources.

**Evidence from [useProduct.ts](packages/web/src/hooks/useProduct.ts):**

1. **Primary source:** Firestore document snapshot (`snap.data()`)
2. **Merge layer 1:** `mergeCoreFieldsToTopLevel()` (lines 127-181)
   - Merges `product.core.*`, `product.inventory.*`, `product.attributes.*` to top-level
   - Defined field lists: `CORE_FIELD_KEYS`, `INVENTORY_FIELD_KEYS`, `ATTRIBUTE_FIELDS_TO_TOP_LEVEL`
3. **Merge layer 2:** `mergeFieldsToTopLevel()` (lines 230-277)
   - Additional attribute fields merged with case-insensitive lookup
   - Handles both snake_case and camelCase variants
4. **Merge layer 3:** `mergeTopLevelAttributesToAttributesMap()` (lines 40-55)
   - Reverse: copies top-level registry keys INTO `product.attributes`

**Component-level value resolution (LaunchMediaTab.tsx lines 134-139):**
```typescript
const launchDateValue = product.launch_date ??       // 1st: top-level snake_case
                        product.launchDate ?? '';    // 2nd: top-level camelCase
const klPostDateValue = product.kl_post_date ?? 
                        (product.attributes?.kl_post_date as string) ?? '';  // 3rd: attributes fallback
```

**Actual data in Firestore for product 211737-90h1-8:**
```json
{
  "top_level": {
    "launchDate": "1/9/2026",           // Original vendor format
    "kl_post_date": "12/30/2025",       // Original vendor format
    "firstReceived": "12/26/2025",
    "lastReceived": "12/18/2025"
  },
  "attributes": {
    "launch_date": "2026-01-09T00:00:00.000Z",  // Normalized ISO
    "kl_post_date": "2025-12-30T00:00:00.000Z", // Normalized ISO
    "first_received": "2025-12-26T00:00:00.000Z",
    "last_received": "2025-12-18T00:00:00.000Z",
    "hide_image_date": "2026-01-15T00:00:00.000Z"
  }
}
```

**Conclusion:** UI shows top-level values first (original vendor formats), only falling back to `attributes.*` (normalized ISO) when top-level is missing. The normalization migration writes to `attributes.*` but does NOT update top-level fields.

---

### Q3: Which components emit yyyy-MM-dd console errors?

**Finding:** Date console errors originate from `<input type="date">` elements in multiple components.

**Evidence from grep search:**

| File | Line | Context |
|------|------|---------|
| [LaunchMediaTab.tsx](packages/web/src/components/product/LaunchMediaTab.tsx#L185) | 185 | `type="date"` for launch_date |
| [LaunchMediaTab.tsx](packages/web/src/components/product/LaunchMediaTab.tsx#L199) | 199 | `type="date"` for kl_post_date |
| [LaunchMediaTab.tsx](packages/web/src/components/product/LaunchMediaTab.tsx#L213) | 213 | `type="date"` for hide_image_date |
| [ProductAttributesTab.tsx](packages/web/src/components/product/ProductAttributesTab.tsx#L207) | 207 | `type="date"` for date-type attributes |
| [ProductsPage.tsx](packages/web/src/pages/ProductsPage.tsx#L588-L597) | 588-597 | Date filters |
| [ExportAuditButton.tsx](packages/web/src/components/ExportAuditButton.tsx#L163-L176) | 163-176 | Export date range |

**Root cause analysis (LaunchMediaTab.tsx lines 134-139, 185):**
```typescript
// Value resolution - prefers top-level (vendor format)
const launchDateValue = product.launch_date ?? product.launchDate ?? '';

// HTML binding
<input type="date" value={launchDateValue} ... />
```

**Problem:** HTML `<input type="date">` requires `yyyy-MM-dd` format.
- Top-level values: `"1/9/2026"` - INVALID for date input
- Normalized values: `"2026-01-09T00:00:00.000Z"` - ALSO INVALID (T00:00:00.000Z suffix)
- Required format: `"2026-01-09"` - Neither source provides this

**Conclusion:** Console errors occur because:
1. Top-level fields contain vendor formats (`M/D/YYYY`)
2. Even normalized ISO timestamps have `T00:00:00.000Z` suffix which is invalid for date inputs
3. A date formatting function is needed to extract `yyyy-MM-dd` from ISO timestamps

---

### Q4: Why is "Product saved to localStorage!" shown?

**Finding:** This is a misleading legacy alert in the save handler. Firestore writes DO occur.

**Evidence:**

**Location:** [ProductEditorPage.tsx#L79-L82](packages/web/src/pages/ProductEditorPage.tsx#L79-L82)
```typescript
const handleSave = () => {
  if (product) {
    saveProduct(product);
    alert('Product saved to localStorage!');  // <-- Misleading message
  }
};
```

**Actual saveProduct behavior ([useProduct.ts#L411-L424](packages/web/src/hooks/useProduct.ts#L411-L424)):**
```typescript
const saveProduct = async (updatedProduct: Product): Promise<boolean> => {
  try {
    if (isFirebaseAvailable() && db) {
      const ref = doc(db, 'products', updatedProduct.id);
      await setDoc(ref, updatedProduct, { merge: true });  // Firestore write!
    } else {
      localStorage.setItem(`aoss:product:${updatedProduct.id}`, JSON.stringify(updatedProduct));
    }
    setProduct(updatedProduct);
    return true;
  } catch (error) { ... }
};
```

**Conclusion:** 
- When Firebase is available and user is authenticated: **Firestore write occurs**
- The alert message is a legacy artifact from localStorage-only development
- The message should be updated to reflect actual behavior or removed

---

### Q5: Are normalized ISO dates correctly stored/read/formatted?

**Finding:** Normalized dates ARE correctly stored in `attributes.*`, but:
1. Top-level fields retain original vendor formats
2. UI reads top-level first (vendor formats)
3. ISO timestamps need formatting before binding to date inputs

**Evidence from Firestore dump (product 211737-90h1-8):**

| Field | Top-level Value | attributes.* Value |
|-------|----------------|-------------------|
| launch_date | `"1/9/2026"` (via launchDate) | `"2026-01-09T00:00:00.000Z"` ✅ |
| kl_post_date | `"12/30/2025"` | `"2025-12-30T00:00:00.000Z"` ✅ |
| first_received | `"12/26/2025"` (via firstReceived) | `"2025-12-26T00:00:00.000Z"` ✅ |
| last_received | `"12/18/2025"` (via lastReceived) | `"2025-12-18T00:00:00.000Z"` ✅ |
| hide_image_date | `null` | `"2026-01-15T00:00:00.000Z"` ✅ |

**Normalization provenance (_meta):**
```json
{
  "attributes._meta.launch_date": {
    "method": "normalizeProductDates",
    "definition_version": "1.1.4",
    "note": "LP-1.4.6.2 single-product normalization",
    "source": "migration",
    "actor": "system:migrator",
    "ts": "2025-12-29T06:26:12.657Z"
  }
}
```

**Conclusion:**
- Normalization worked correctly (ISO timestamps in `attributes.*`)
- Top-level fields were NOT updated by normalization (design decision)
- UI console errors are NOT caused by normalization - they existed before because vendor formats also don't match `yyyy-MM-dd`

---

## Summary Answers to Lisa's 6 Questions

| # | Question | Answer |
|---|----------|--------|
| 1 | Does auth state affect Firestore queries/projections? | **No.** Full document is returned; differences are from localStorage fallback or merge logic. |
| 2 | Where do UI attribute values come from? | **Hierarchy:** Top-level snake_case → Top-level camelCase → `attributes.*` |
| 3 | Which components emit yyyy-MM-dd errors? | **LaunchMediaTab.tsx** (lines 185, 199, 213), **ProductAttributesTab.tsx** (line 207), **ProductsPage.tsx** (lines 588-597) |
| 4 | Why "Product saved to localStorage!" message? | **Legacy alert.** Firestore write DOES occur when authenticated. Message is misleading. |
| 5 | Are normalized dates correctly stored? | **Yes.** ISO timestamps in `attributes.*` with `_meta` provenance. Top-level retains vendor formats. |
| 6 | Is normalization causing UI errors? | **No.** UI reads top-level first (vendor formats). Console errors existed before normalization. |

---

## Artifacts

| Artifact | Path |
|----------|------|
| Firestore full dump | `/tmp/normalize-211737-firestore-full.json` |
| Browser HAR | 🚫 Not capturable in headless environment |
| Signed-in screenshot | 🚫 Not capturable in headless environment |
| Signed-out screenshot | 🚫 Not capturable in headless environment |

---

## Recommendations for Future LP

These are observations only - no fixes were made per audit scope.

1. **Date formatting helper needed:** Create a utility function to extract `yyyy-MM-dd` from ISO timestamps for `<input type="date">` bindings

2. **Update save alert:** Change "Product saved to localStorage!" to reflect actual behavior (Firestore vs localStorage)

3. **Consider top-level normalization:** Current normalization only writes to `attributes.*`. Consider also updating top-level fields or deprecating top-level date fields in favor of `attributes.*`

4. **Document merge hierarchy:** The 3-layer merge logic in useProduct.ts is complex. Consider documenting the priority order and intended behavior.

---

**End of LP-1.4.6.3 Audit**
