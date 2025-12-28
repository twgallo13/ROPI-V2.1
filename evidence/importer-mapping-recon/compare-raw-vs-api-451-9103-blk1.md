# LP-1.3.7 Investigation: Product 451-9103-blk1

**Date:** 2025-12-28
**Product ID:** 451-9103-blk1

---

## Summary

**Root Cause:** Schema mismatch between Firestore document structure and frontend expectations.

The importer writes data in a nested structure:
```
product.core.mpn = "451-9103-BLK1"
product.core.brand = "ICE CREAM/ROC"
product.core.sku = "SHK3054050"
product.inventory.quantity = 0
```

But the frontend (`ProductHeader.tsx`, `useProduct.ts`) expects flat structure:
```
product.mpn = "..."
product.brand = "..."
product.sku = "..."
product.warehouse_inv = ...
```

---

## Raw Firestore Document

**Location:** `products/451-9103-blk1`
**Captured:** 2025-12-28T21:24:46.738Z

### Data Present ✅
| Path | Value |
|------|-------|
| `core.mpn` | 451-9103-BLK1 |
| `core.sku` | SHK3054050 |
| `core.brand` | ICE CREAM/ROC |
| `core.status` | draft |
| `core.firstReceived` | 2025-12-26T00:00:00.000Z |
| `inventory.quantity` | 0 |
| `attributes.rics_color` | BLACK |
| `attributes.rics_category` | Apparel\|\|Mens\|\|Pants\|\|Casual |
| `attributes.rics_long_desc` | running sweatpants |
| `attributes.department` | Footwear |

---

## Frontend Expectations

### ProductHeader.tsx reads:
- `product.mpn` → shows "—" because it's in `core.mpn`
- `product.sku` → shows "—" because it's in `core.sku`
- `product.warehouse_inv` → shows "—" because it's in `inventory.warehouse_inv`
- `product.store_inv` → shows "—" because it's in `inventory.store_inv`

### useProduct.ts behavior (before fix):
- Only merged `attributes` to top-level
- Did NOT merge `core.*` fields to top-level
- Did NOT merge `inventory.*` fields to top-level

---

## Fix Applied

**Fix Type:** B (UI/frontend mapping)

Updated `useProduct.ts` to merge nested fields to top-level:

```typescript
// LP-1.3.7: Merge core fields to top-level for UI compatibility
const CORE_FIELD_KEYS = [
  'mpn', 'sku', 'brand', 'title', 'name', 'status', 'description',
  'styleId', 'style_id', 'firstReceived', 'first_received', 
  'lastReceived', 'last_received', 'launchDate', 'launch_date',
  'createdAt', 'updatedAt',
];

const INVENTORY_FIELD_KEYS = [
  'quantity', 'warehouse_inv', 'store_inv', 'whs_inv', 'total_inv',
  'warehouse', 'location',
];
```

The `mergeCoreFieldsToTopLevel()` function now:
1. Merges `core.*` fields to top-level if top-level is undefined
2. Merges `inventory.*` fields to top-level if top-level is undefined
3. Preserves existing top-level values (no overwrite)

---

## Unit Tests

Created `test/unit/useProduct.mergeFields.test.ts` with 5 tests:
1. ✅ should merge MPN from core to top-level
2. ✅ should not overwrite existing top-level fields
3. ✅ should merge inventory fields to top-level
4. ✅ should handle missing core and inventory gracefully
5. ✅ should merge all fields from exact Firestore structure

All tests pass.

---

## Expected Result

After deployment, the Product Page will:
- Show MPN: `451-9103-BLK1`
- Show Brand: `ICE CREAM/ROC`
- Show SKU: `SHK3054050`
- Show RICS fields in attributes tab
