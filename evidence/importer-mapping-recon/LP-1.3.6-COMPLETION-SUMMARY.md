# LP-1.3.6 Completion Summary
## Product Persistence Fix

**Date:** 2025-12-28
**Commit:** b7f149c
**Deployment:** Deploy AOSS Staging workflow #20559441076 ✅ SUCCESS

---

## Problem Statement

Import engine was writing normalized data with all fields (MPN, RICS, SCOM prices, inventory, etc.) but Product Page UI was showing blanks for these fields.

## Root Cause Analysis

**Root cause: Schema mismatch in `convertRowToProduct()` function**

The `productCommitService.ts:convertRowToProduct()` function was only mapping a hardcoded subset of fields:
- Only mapped: sku, title, brand, description, department, class, category, subcategory, gender, color, size, material
- **Discarded**: mpn, style_id, rics_*, scom_*, warehouse_inv, store_inv, whs_inv, dimensions, dates, and all other normalized fields

This meant that even though the import engine correctly normalized all fields, they were silently lost during the product commit phase.

## Fix Applied

Updated `convertRowToProduct()` to preserve ALL normalized fields:

### 1. Core Fields (now includes)
- `mpn` - Primary identifier per LP-2.1.0
- `style_id` 
- `firstReceived`, `lastReceived`, `launchDate`

### 2. Attributes (now includes)
- All RICS fields: `rics_color`, `rics_category`, `rics_short_description`, `rics_long_desc`
- **Dynamic fallback**: ALL remaining normalized fields are captured as attributes

### 3. Pricing (now includes)
- SCOM fields: `scom_regular_price`, `scom_sale_price`, `map`

### 4. Inventory (now includes)
- `warehouse_inv`, `store_inv`, `whs_inv`

### 5. Dimensions (new section)
- `height`, `width`, `length`, `weight`

## Unit Tests Added

Created `/packages/api/test/convertRowToProduct.unit.test.ts` with 10 comprehensive tests:

1. ✅ should map MPN to core when present
2. ✅ should set status to draft for new imports
3. ✅ should map RICS fields to attributes
4. ✅ should map warehouse and store inventory
5. ✅ should map SCOM pricing fields
6. ✅ should map dimensions when present
7. ✅ should capture dynamic/unknown fields as attributes
8. ✅ should not include empty or undefined fields
9. ✅ should set validation_status based on validation errors
10. ✅ should preserve all fields from exact import row

All tests passing: `10 tests | 1 file | 1 worker`

## Verification Status

### Completed
- [x] Root cause identified: Case C (Schema mismatch)
- [x] Fix implemented in productCommitService.ts
- [x] Unit tests written and passing
- [x] Code committed: b7f149c
- [x] Pushed to aoss-main
- [x] Deployed to staging via GitHub Actions

### Pending (Next Import)
- [ ] Re-run import for test product
- [ ] Verify product doc contains all fields
- [ ] Verify Product Page UI shows values

## Deployment Evidence

```
gh run list --limit 2 output:
[
  {
    "conclusion": "success",
    "createdAt": "2025-12-28T20:56:45Z",
    "databaseId": 20559441076,
    "displayTitle": "fix(api): LP-1.3.6 preserve all normalized fields in product commit",
    "headBranch": "aoss-main",
    "name": "Deploy AOSS Staging",
    "status": "completed"
  }
]
```

## Files Changed

1. `packages/api/src/services/productCommitService.ts` - Fixed convertRowToProduct()
2. `packages/api/test/convertRowToProduct.unit.test.ts` - New test file
3. `evidence/importer-mapping-recon/compare-raw-vs-api.md` - Investigation findings
4. `evidence/importer-mapping-recon/product-451-9201-blk1-raw.json` - Raw product evidence

---

**Next Steps:** Run a new import to verify the fix in production. The next CSV import will now preserve all normalized fields through to the product document.
