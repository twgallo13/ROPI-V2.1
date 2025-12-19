# LP-0.1.0: MPN/MPON Canonicalization & Impact Analysis

**Audit Date:** 2025-12-19  
**Status:** ✅ COMPLETE  
**Outcome:** Case A — Everything consistent  

---

## Executive Summary

The ROPI AOSS system uses a **consistent canonical attribute ID of `mpn`** across all layers:
- Registry definition: `mpn`
- Canonical map aliases: `mpn`, `Mpn` → `mpn`
- Import normalizer: `MPN`, `mpn`, `Manufacturer Part Number` → `mpn`
- Product data storage: `attributes.mpn`

**No `mpon` variant exists anywhere in the codebase or data.** The system is fully consistent.

---

## 1. Registry Canonical ID for MPN Concept

### attributeRegistry.json
```json
{
  "attribute_id": "mpn",
  "label": "MPN",
  "external_header": "MPN",
  "category": "sku_core",
  "data_type": "text",
  "required_for_completion": true,
  "required_for_export": true,
  "import_required": false,
  "ai_usage_notes": "Manufacturer part number",
  "status": "active"
}
```

### canonicalAttributeMap.approved.json
```json
{
  "mpn": "mpn",
  "Mpn": "mpn"
}
```

**Finding:** The canonical ID is definitively `mpn`. No `mpon` alias exists.

---

## 2. Code References (Files + Lines)

| File | Line | Context |
|------|------|---------|
| `packages/sdk/config/attributeRegistry.json` | 28-30 | Registry definition |
| `packages/sdk/config/canonicalAttributeMap.approved.json` | 10-11 | Alias mappings |
| `packages/sdk/src/normalization/importNormalizer.ts` | 31-33 | Import column mappings |
| `packages/sdk/src/import/retailOps.ts` | 210 | RetailOps column mappings |
| `packages/sdk/src/import/retailOps.ts` | 270 | MPN value extraction |
| `packages/api/src/endpoints/products.ts` | 278 | Product endpoint uses `data.mpn` |
| `packages/api/src/tasks/migrateProductsToAttributes.ts` | 56 | Migration includes `mpn` |
| `packages/web/src/hooks/useProduct.ts` | 26 | Hook references `mpn` |

### Import Normalizer Mappings (importNormalizer.ts)
```typescript
{ sourceColumn: 'MPN', targetField: 'mpn', transform: 'trim' },
{ sourceColumn: 'mpn', targetField: 'mpn', transform: 'trim' },
{ sourceColumn: 'Manufacturer Part Number', targetField: 'mpn', transform: 'trim' },
```

### RetailOps Import Mappings (retailOps.ts)
```typescript
mpn: ['MPN', 'Mpn', 'mpn', 'Manufacturer Part Number'],
```

**Full code references saved to:** `code-references.txt`

---

## 3. Product Usage Counts

Based on `reports/product_attribute_usage.csv`:

| Attribute Key | Product Count | Status |
|---------------|---------------|--------|
| `attributes.mpn` | 82 | ✅ Used |
| `attributes.mpon` | 0 | ❌ Not found |
| `product.mpn` (top-level) | 0 | ❌ Not found |

**Sample products with `attributes.mpn`:**
- 14943667, 14943678, 207012-001, 209473-1001, 209516-1001
- 209516-6916, 209710-6916, 211116-001, 212350-90H, 4254T1035

---

## 4. Impact Assessment

### What Works Correctly ✅

1. **Import Pipeline**
   - CSV headers `MPN`, `mpn`, `Manufacturer Part Number` all map to canonical `mpn`
   - RetailOps imports handle variations correctly
   - No unknown header issues expected

2. **Product Data Storage**
   - All 82 products store MPN under `attributes.mpn`
   - Consistent with registry definition
   - No legacy `mpon` keys to migrate

3. **API & UI**
   - Product endpoints read `attributes.mpn`
   - Product editor hooks reference `mpn`
   - Export templates can reference `mpn`

4. **Registry Definition**
   - `mpn` is `required_for_completion: true`
   - `mpn` is `required_for_export: true`
   - Proper `ai_usage_notes` for AI context

### Potential Gaps (Minor) ⚠️

1. **Missing Alias: `MPN`** (uppercase only)
   - `canonicalAttributeMap` has `mpn` and `Mpn` but not `MPN`
   - The import normalizer handles this, but map should include it for consistency
   - **Risk:** Low - import pipeline handles it regardless

---

## 5. Conclusion: Case A — Everything Consistent

The MPN attribute is correctly canonicalized across all system layers:

| Layer | Canonical ID | Aliases Handled |
|-------|--------------|-----------------|
| Registry | `mpn` | N/A |
| Canonical Map | `mpn` | `mpn`, `Mpn` |
| Import Normalizer | `mpn` | `MPN`, `mpn`, `Manufacturer Part Number` |
| Product Storage | `attributes.mpn` | N/A |

**No remediation required.** The system is working as designed.

---

## 6. Minor Recommendation (Optional)

Add `MPN` (all caps) to `canonicalAttributeMap.approved.json` for completeness:

```json
{
  "mpn": "mpn",
  "Mpn": "mpn",
  "MPN": "mpn"  // ADD THIS
}
```

This is a documentation/completeness improvement, not a bug fix.

---

## Deliverables

- [x] `registry-mpn.json` - Registry findings
- [x] `code-references.txt` - All code references
- [x] `product-sample-500.json` - Product usage data
- [x] `REPORT.md` - This report

---

## Sign-Off

**Auditor:** Lisa (LP-0.1.0)  
**Date:** 2025-12-19  
**Result:** ✅ No action required - system is consistent
