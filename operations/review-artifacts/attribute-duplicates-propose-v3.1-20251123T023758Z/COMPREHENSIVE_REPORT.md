# Attribute Registry Duplicate Analysis - No Action Required

**Version:** v3.1.propose  
**Generated:** 2025-11-23T02:37:58Z  
**Analyst:** Homer  
**Status:** ✅ NO DUPLICATES FOUND

---

## Executive Summary

Analysis of `scripts/attribute-registry-normalized.json` (78 entries, dated 2025-11-22) found **ZERO duplicate canonicalPaths**. The normalization process has successfully ensured each attribute has a unique canonical path.

### Key Findings

1. **No Duplicates**: All 78 attributes have unique canonicalPaths
2. **No Blank Labels**: All attributes have proper labels defined
3. **Vocabulary Issue Identified**: allowedValuesRef is NOT set for key attributes, and ACC UI lacks vocabulary display logic

### Vocabulary Configuration Gap

The following critical attributes have no `allowedValuesRef` configured:

| Canonical Path | Current allowedValuesRef | Expected Reference |
|---|---|---|
| `sku_core.department` | null | `settings/lists/departments` |
| `sku_core.class` | null | `settings/lists/classes` |
| `descriptive.primaryColor` | null | `settings/lists/colors` |
| `source.rics` | null | N/A (not vocabulary-based) |

**Impact**: ACC UI cannot display vocabulary dropdowns because:
1. Attributes don't have allowedValuesRef configured
2. ACC code doesn't fetch/display vocabulary even if configured

---

## Analysis Results

### Source Data
- **File**: `scripts/attribute-registry-normalized.json`
- **Date**: 2025-11-22
- **Total Entries**: 78
- **Duplicate Groups**: 0
- **Blank Labels**: 0

### Duplicate Detection Method
Grouped all entries by `canonicalPath` and identified groups with count > 1.

**Result**: No groups with count > 1 found.

### Sample Canonical Paths (No Duplicates)
- `a_i_generated.descriptionBlocks`
- `a_i_generated.descriptionHtml`
- `a_i_generated.ropiScore`
- `descriptive.primaryColor`
- `sku_core.brand`
- `sku_core.category`
- `sku_core.class`
- `sku_core.department`
- `source.rics`
- (... 69 more unique paths)

---

## Original Registry Analysis

Checked `scripts/attribute-registry.json` (pre-normalization):
- Found 2 duplicate **keys** (not canonical paths):
  - `brand`: appears in `rics_source.brand` AND `sku_core.brand` (DIFFERENT canonical paths)
  - `category`: appears in `rics_source.category` AND `sku_core.category` (DIFFERENT canonical paths)

**Conclusion**: These are NOT duplicates - they're distinct attributes in different namespaces with the same key name. This is valid and expected.

---

## ACC Vocabulary Issue - Root Cause Analysis

### Problem Statement
Theo reported: "ACC is not displaying vocabulary values for attributes such as sku_core.department"

### Root Cause (Confirmed)

1. **Missing Configuration**: Attributes don't have `validation.allowedValuesRef` set
   ```json
   {
     "canonicalPath": "sku_core.department",
     "validation": {
       "allowedValuesRef": null  // ❌ Should be "settings/lists/departments"
     }
   }
   ```

2. **Missing UI Logic**: AttributeDetailDrawer.tsx shows input field for allowedValuesRef but doesn't:
   - Fetch vocabulary from Firestore
   - Display vocabulary values
   - Validate user input against allowed values

### Solution Options

**Option A: Quick Fix - Configure allowedValuesRef** (Recommended First Step)
```json
// Update in registry
{
  "canonicalPath": "sku_core.department",
  "validation": {
    "allowedValuesRef": "settings/lists/departments"
  }
}
```

**Option B: Complete Fix - Add Vocabulary Display to ACC**
- Create `VocabularyValuesList` component
- Fetch from Firestore using allowedValuesRef path
- Display vocabulary values in drawer
- See `repo-code-scan-results.txt` for implementation code

---

## Deliverables

All artifacts located in:
```
operations/review-artifacts/attribute-duplicates-propose-v3.1-20251123T023758Z/
```

### Files Generated

1. ✅ `attribute-registry-source-20251123T023758Z.json` - Source registry backup
2. ✅ `attribute-registry-original-20251123T023758Z.json` - Pre-normalization backup
3. ✅ `duplicates-by-canonical.json` - Empty (no duplicates)
4. ✅ `blank-labels.json` - Empty (no blank labels)
5. ✅ `duplicates-summary.md` - Analysis summary
6. ✅ `proposed-keepers.json` - Empty (no duplicates to merge)
7. ✅ `merge-plan.json` - Empty (no merges needed)
8. ✅ `merge-plan.md` - Human-readable merge plan
9. ✅ `registry-proposed-patch.json` - No changes proposed
10. ✅ `attribute-allowed-values-check.json` - Vocabulary configuration audit
11. ✅ `repo-code-scan-results.txt` - ACC code analysis + fix recommendations
12. ✅ `homer-summary-v3.1-propose.json` - Machine-readable summary
13. ✅ `homer-summary-v3.1-propose.txt` - This file
14. ✅ `analysis.log` - Full analysis execution log

---

## Recommended Next Steps

### For Lisa/Theo Review

Since no duplicates were found, the main action item is addressing the vocabulary gap:

1. **Verify Firestore**: Check if `settings/lists/departments` exists in staging
   ```bash
   # If you have firestore access
   gcloud firestore documents describe settings/lists/departments --project=ropi-bccee
   ```

2. **Decision Point**: Choose approach for vocabulary fix
   - **Option A**: Set allowedValuesRef in registry + verify Firestore lists exist
   - **Option B**: Add vocabulary display to ACC UI (more complete, more effort)
   - **Option C**: Both (recommended long-term)

3. **No Registry Patch Needed**: The normalized registry is clean - no duplicate merges required

### If You Want to Configure allowedValuesRef

Create a manual patch file:
```json
{
  "version": "v3.1.vocab-config",
  "operations": [
    {
      "action": "update",
      "canonicalPath": "sku_core.department",
      "updates": {
        "validation": {
          "allowedValuesRef": "settings/lists/departments"
        }
      }
    },
    {
      "action": "update",
      "canonicalPath": "sku_core.class",
      "updates": {
        "validation": {
          "allowedValuesRef": "settings/lists/classes"
        }
      }
    },
    {
      "action": "update",
      "canonicalPath": "descriptive.primaryColor",
      "updates": {
        "validation": {
          "allowedValuesRef": "settings/lists/colors"
        }
      }
    }
  ]
}
```

---

## Verification Checklist (Not Applicable)

Since no duplicates found and no patch needed:
- ❌ No merge operations to verify
- ❌ No deprecations to apply
- ❌ No duplicate keepers to validate
- ✅ Vocabulary configuration issue documented
- ✅ ACC code fix recommendations provided

---

## Rollback Instructions (Not Applicable)

No changes proposed or applied - no rollback needed.

---

## Conclusion

**Status**: ✅ **CLEAN REGISTRY - NO DUPLICATES**

The attribute registry is in good shape with no duplicate canonicalPaths. The normalization process has successfully maintained unique canonical paths across all 78 attributes.

**Main Finding**: Vocabulary display issue is due to missing configuration + missing UI logic, not duplicate attributes.

**Recommendation**: Close this duplicate-detection task as "complete - no action required" and open a separate task for vocabulary configuration if needed.

---

**Homer Log Entry**: Proposal produced; no changes applied. No duplicates found - registry is clean.
