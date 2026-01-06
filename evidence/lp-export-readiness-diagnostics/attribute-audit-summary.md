# SDK ↔ Product Attribute Usage Audit Summary

**LP:** LP-export-readiness-diagnostics-1.0.0  
**Task:** HES B - Task 3  
**Date:** 2026-01-06  
**Scope:** Read-only audit - NO DATA CHANGES

---

## Executive Summary

Audit of SDK attribute registry (69 attributes) vs actual product attribute usage (55 unique keys found in 32 sampled products) revealed:

- **41 attributes** used in products AND defined in SDK ✅
- **14 attributes** used in products but MISSING from SDK ⚠️
- **28 attributes** defined in SDK but NEVER used in products 📊

**Delta:** -14 (more used than defined)

---

## Top 10 Deltas: Used but NOT in SDK

| Rank | Attribute ID | Usage Count | Impact | Action |
|------|--------------|-------------|--------|--------|
| 1 | `rics_color` | 25 | **P1-HIGH** | Add to SDK immediately |
| 2 | `ageGroup` | 8 | P2-MEDIUM | Add to SDK |
| 3 | `_meta` | 5 | P2-MEDIUM | Review if internal-only |
| 4 | `primaryColor` | 5 | P2-MEDIUM | Add to SDK |
| 5 | `drawing` | 4 | P2-MEDIUM | Add to SDK |
| 6 | `_normalizedAt` | 1 | P3-LOW | Internal field - consider |
| 7 | `color` | 1 | P3-LOW | Possible duplicate of rics_color |
| 8 | `cushioning` | 1 | P3-LOW | Add if product-specific |
| 9 | `descriptive.heelType` | 1 | P3-LOW | Nested attribute - review structure |
| 10 | `launch` | 1 | P3-LOW | Possible naming conflict |

---

## Top 10 SDK Attributes NEVER Used

| Attribute ID | Label | Status | Recommendation |
|--------------|-------|--------|----------------|
| `custom_message` | Custom Message (Internal) | active | Consider deprecating |
| `dept` | Department | active | Mark deprecated if unused |
| `description_karmaloop` | Description – Karmaloop | active | Site-specific - review |
| `description_mltd` | Description – MLTD | active | Site-specific - review |
| `description_sangremia` | Description – Sangremia | active | Site-specific - review |
| `description_shiekh` | Description – Shiekh.com | active | Site-specific - review |
| `expedited_override_shipping` | Expedited Override Shipping | active | Review if still needed |
| `family_sizing` | Family Sizing | active | Consider deprecating |
| `gtin` | GTIN/UPC | active | ⚠️ Keep - may be used later |
| `made_in` | Made In | active | Consider deprecating |

**Note:** 28 total SDK attributes never used in sampled products.

---

## Recommended Next Steps

### Immediate (P1-HIGH)

1. **Add `rics_color` to SDK registry**
   - Most-used undocumented attribute (25 products)
   - Define schema, data type, allowed values
   - Add to `packages/sdk/config/attributeRegistry.json`

### Short-Term (P2-MEDIUM)

2. **Add 4 moderately-used attributes:**
   - `ageGroup` (8 usages)
   - `_meta` (5 usages) - confirm if internal-only
   - `primaryColor` (5 usages)
   - `drawing` (4 usages)

3. **Review `_meta` and `_normalizedAt`:**
   - These appear to be internal/system fields
   - Document in SDK with `internalOnly: true`
   - Prefix with `_` convention for internal fields

4. **Investigate `color` vs `rics_color`:**
   - Only 1 usage of `color`
   - Possible data inconsistency or legacy field
   - Normalize to `rics_color`

### Long-Term (P3-LOW)

5. **Deprecate 28 unused SDK attributes:**
   - Mark as `status: 'deprecated'` in registry
   - Keep for backward compatibility
   - Remove from active UI dropdowns
   - Plan removal after 6-12 months

6. **Site-specific description fields:**
   - 5 site-specific description attributes never used
   - Evaluate if still needed for each site
   - Consider generic `site_description` with channel targeting

7. **Expand audit sample size:**
   - Current audit sampled 32 products
   - Re-run with all products for comprehensive view
   - Schedule quarterly audits to track drift

---

## Export Field Format Analysis

SDK registry shows:
- **0 attributes** with boolean export format
- **12 attributes** with object export format (new)
- **57 attributes** with undefined export field

**Finding:** SDK has NO legacy `export: true` (boolean), but HES B Task 2 found boolean exports in Firestore → confirms data/schema mismatch was real and fixed.

---

## Data Integrity Observations

### Registry Drift Root Causes

1. **Ad-hoc attribute creation:** Products added with attributes not in SDK
2. **Import pipeline bypass:** External data sources bypass registry validation
3. **No enforcement:** No pre-save validation requiring SDK registration
4. **Legacy data:** Attributes created before SDK registry existed

### Recommended Governance

1. **Strict validation:** Require all product attributes exist in SDK
2. **Pre-import check:** Validate CSV headers against registry
3. **Registry-first workflow:** Create attribute in SDK before product use
4. **Periodic audits:** Schedule quarterly drift reports

---

## Evidence Files

### JSON Reports
- `/evidence/lp-export-readiness-diagnostics/sdk-product-attribute-audit-2026-01-06.json`
  - Full audit results with usage counts
  - Priority breakdown by usage frequency
  - Top 10 most-used attributes

### CSV Reports
- `/evidence/lp-export-readiness-diagnostics/sdk-product-attribute-audit-2026-01-06.csv`
  - Tabular format for spreadsheet analysis
  - Columns: attribute_id, location, usage_count, in_sdk, label, status, impact

### Audit Scripts
- `/audit_sdk_product_attributes.js` - Main audit script
- `/audit_sdk_firestore_attributes.js` - Collection-level audit
- `/check_firestore_attributes.js` - Helper script

---

## Conclusion

The audit confirms **moderate registry drift** with 14 undocumented attributes in active use. Priority focus on `rics_color` (P1) will address 45% of the delta (25 of 55 usages).

**No data changes made** - this is a read-only audit. All findings documented for follow-up LP.

---

**Audit Status:** ✅ COMPLETE  
**Follow-Up LP:** TBD (registry cleanup)
