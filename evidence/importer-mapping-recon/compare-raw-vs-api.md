# Compare Raw DB vs Import Row — LP-1.3.6 Investigation

**Date:** 2025-12-28  
**Product ID:** 451-9201-blk1  
**Batch ID:** 9fd957aa-7075-42c9-91c8-f3bff65179e1  

---

## Finding: Schema Mismatch in productCommitService.ts

### Root Cause

The `convertRowToProduct()` function in `packages/api/src/services/productCommitService.ts` only maps a **hardcoded subset** of normalized fields to the product document. Many fields from the import are silently discarded.

### Import Row Normalized Fields (Actual Data)

```json
{
  "mpn": "451-9201-BLK1",
  "sku": "SHK3054058",
  "brand": "ICE CREAM/ROC",
  "name": "1df585bf-d341-4c0b-887d-b3bc0165f3c2",
  "status": "Incomplete",
  "rics_color": "BLACK",
  "rics_category": "Apparel||Mens||Tops||T-short sleeve",
  "rics_short_description": "oprea ss tee",
  "rics_long_desc": "oprea ss tee",
  "warehouse_inv": "14",
  "store_inv": "0",
  "first_received": "12/26/2025",
  "last_received": "12/24/2025",
  "scom_regular_price": "0",
  "scom_sale_price": "0",
  "height": "0",
  "width": "0",
  "length": "0",
  "weight": "0"
}
```

### Product Document Written to Firestore (After convertRowToProduct)

```json
{
  "core": {
    "sku": "SHK3054058",
    "title": "",
    "brand": "ICE CREAM/ROC",
    "status": "draft",
    "createdAt": "2025-12-28T20:33:28.932Z",
    "updatedAt": "2025-12-28T20:33:28.932Z"
  },
  "attributes": {
    "fast_fashion": true
  },
  "statusFlags": {
    "validation_status": "valid",
    "ready_for_export": false,
    "uploaded_to_ro": false
  },
  "roUploadBatchId": null,
  "roUploadDate": null,
  "_meta": {
    "source": "csv",
    "importedAt": "2025-12-28T20:33:26.506Z",
    "normalizedAt": "2025-12-28T20:33:28.932Z",
    "validatedAt": "2025-12-28T20:33:28.932Z"
  }
}
```

### Missing Fields Comparison

| Normalized Field | Expected In | Present in DB |
|------------------|-------------|---------------|
| `mpn` | `core.mpn` | ❌ MISSING |
| `rics_color` | `attributes.rics_color` | ❌ MISSING |
| `rics_category` | `attributes.rics_category` | ❌ MISSING |
| `rics_short_description` | `attributes.rics_short_description` | ❌ MISSING |
| `rics_long_desc` | `attributes.rics_long_desc` | ❌ MISSING |
| `warehouse_inv` | `inventory.warehouse_inv` | ❌ MISSING |
| `store_inv` | `inventory.store_inv` | ❌ MISSING |
| `first_received` | `core.firstReceived` | ❌ MISSING |
| `last_received` | `core.lastReceived` | ❌ MISSING |
| `scom_regular_price` | `pricing.scom_regular_price` | ❌ MISSING |
| `scom_sale_price` | `pricing.scom_sale_price` | ❌ MISSING |

### Problem Location

**File:** `packages/api/src/services/productCommitService.ts`  
**Function:** `convertRowToProduct()` (lines 48-135)

The function explicitly maps only these fields:
- Core: `sku`, `title`, `brand`, `description`
- Attributes: `department`, `class`, `category`, `subcategory`, `gender`, `ageGroup`, `color`, `size`, `material`
- Pricing: `msrp`, `cost`, `retailPrice`
- Inventory: `quantity`, `warehouse`, `location`
- Media: `primaryImage`, `images`

All other normalized fields (like `mpn`, `rics_*`, `scom_*`, `*_inv`) are **silently discarded**.

---

## Diagnosis: Case C — Schema Mismatch

**This is Case C from the LP:** The importer writes correct normalized data, but `convertRowToProduct()` throws away fields that don't match its hardcoded mapping.

### Fix Required

Update `convertRowToProduct()` to:
1. **Always include `mpn`** in `core` (it's the primary identifier per LP-2.1.0)
2. **Preserve all normalized fields** as dynamic attributes instead of discarding them
3. **Map known fields** to their canonical locations (rics_* → attributes, *_inv → inventory)

---

## API Inspection Not Needed

The issue is **upstream** of the API — the product document itself lacks the data. The API returns what's in the document, which is already incomplete.
