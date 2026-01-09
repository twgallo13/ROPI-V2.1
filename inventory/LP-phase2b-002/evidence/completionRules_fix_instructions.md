# Binary Segment Enforcement - SEO Requirement Flag Fix

**Status:** FIX PREPARED (READY FOR DEPLOYMENT)  
**Date:** 2026-01-09  
**Issue:** SEO segment requirementFlag is `required_for_export` instead of `required_for_completion`  
**Impact:** SEO attributes not counted toward completion percentage

## Problem Analysis

### Current Rules (BROKEN)
```json
{
  "rulesVersion": 3,
  "segments": [
    {
      "id": "core-attributes",
      "requirementFlag": "required_for_completion",
      "weightPct": 80
    },
    {
      "id": "seo-attributes",
      "requirementFlag": "required_for_export",  // ❌ WRONG - should be required_for_completion
      "weightPct": 20
    },
    {
      "id": "media-attributes",
      "requirementFlag": "",
      "weightPct": 0,
      "enabled": false
    }
  ]
}
```

**Result:** 
- Only core-attributes (80%) is counted toward completion
- SEO attributes (20%) are ignored in completion calculation
- Products show 100% if core is complete, even if SEO is missing

### Fixed Rules (CORRECT)
```json
{
  "rulesVersion": 4,
  "segments": [
    {
      "id": "core-attributes",
      "requirementFlag": "required_for_completion",
      "weightPct": 80
    },
    {
      "id": "seo-attributes",
      "requirementFlag": "required_for_completion",  // ✅ FIXED
      "weightPct": 20
    },
    {
      "id": "media-attributes",
      "requirementFlag": "",
      "weightPct": 0,
      "enabled": false
    }
  ]
}
```

**Result:**
- Both core (80%) and SEO (20%) are counted toward completion
- Products with only core attributes = 80% complete
- Products with core + SEO attributes = 100% complete
- Binary segment status enforced: "complete" only when all required attributes present

---

## Implementation Steps

### Step 1: Update Firestore Document

Update document at path: `settings/exportSettings`

Replace `completionRules` field with the fixed JSON from:
[completionRules_admin_update_required.json](completionRules_admin_update_required.json)

Key changes:
- `rulesVersion`: 3 → 4
- `segments[1].attributeSelector.requirementFlag`: "required_for_export" → "required_for_completion"

### Step 2: Update Evaluator Cache (if applicable)

If evaluator caches rules:
1. Restart evaluator service to reload from Firestore
2. Or call evaluator reload endpoint (if exposed)

### Step 3: Verify API Response

After update, product API should return:

```json
{
  "productIdentifiers": { "mpn": "19-test" },
  "deterministic_factors": { "rulesVersion": 4 },
  "completion_result": {
    "completionPct": 80,
    "segments": [
      {
        "name": "Core Product Attributes",
        "status": "complete",
        "requiredAttributesCount": 3,
        "completedAttributesCount": 3
      },
      {
        "name": "SEO & Marketing",
        "status": "blocked",
        "requiredAttributesCount": 1,
        "completedAttributesCount": 0
      },
      {
        "name": "Media & Images",
        "status": "skipped",
        "requiredAttributesCount": 0,
        "completedAttributesCount": 0
      }
    ]
  }
}
```

**Key Validations:**
- ✅ rulesVersion == 4
- ✅ segments array present with 3 entries
- ✅ Each segment has binary status: "complete", "blocked", or "skipped"
- ✅ completionPct = sum of (requiredCount > 0 && completedCount == requiredCount) * segment.weightPct

### Step 4: Verify Binary Semantics

For each segment:
- Status "complete": completedAttributesCount == requiredAttributesCount (AND requiredAttributesCount > 0)
- Status "blocked": completedAttributesCount < requiredAttributesCount (AND requiredAttributesCount > 0)
- Status "skipped": requiredAttributesCount == 0 (segment not applicable)

### Step 5: UI Rendering

UI should display:
1. Each segment as a card with status icon:
   - ✅ for "complete"
   - ⛔ for "blocked"
   - ⊘ for "skipped"
2. Overall completion % calculated from weights of "complete" segments
3. Example: Core (80%, complete) + SEO (20%, blocked) = 80% overall

---

## Evidence Files

All files in: `inventory/LP-phase2b-002/evidence/`

```
completionRules_admin_update_required.json  - Fixed rules (rulesVersion=4, seo required_for_completion)
completionRules_fix_instructions.md         - This document
api_product_19-test.completion.json         - Expected API response after fix
api_product_16-test.completion.json         - Expected API response after fix
api_product_15-test.completion.json         - Expected API response after fix
ui_binary_segment_checks.log                - UI rendering verification (Playwright)
evaluator_reload.json                       - Evaluator reload confirmation (if API exists)
```

---

## Deployment Checklist

- [ ] Update Firestore `settings/exportSettings` with fixed rules
- [ ] Increment rulesVersion from 3 → 4
- [ ] Change SEO requirementFlag to `required_for_completion`
- [ ] Restart evaluator service or call reload endpoint
- [ ] Verify API returns rulesVersion=4
- [ ] Verify API segments include seo-attributes with status
- [ ] Verify UI displays binary segment statuses
- [ ] Verify completion % is sum of weighted complete segments
- [ ] Commit updated rules to code repo
- [ ] Merge to staging, then production

---

## Verification Commands (After Deployment)

### Check API
```bash
curl "https://ropi-aoss-staging.web.app/api/products/19-test/completion" \
  -H "Accept: application/json" | jq '{rulesVersion:.deterministic_factors.rulesVersion, segments:.completion_result.segments[] | {name, status, required:.requiredAttributesCount}}'
```

Expected output:
```json
{
  "rulesVersion": 4,
  "segments": [
    { "name": "Core Product Attributes", "status": "complete", "required": 3 },
    { "name": "SEO & Marketing", "status": "blocked", "required": 1 },
    { "name": "Media & Images", "status": "skipped", "required": 0 }
  ]
}
```

---

## Impact Assessment

### What Changes
- ✅ SEO attributes now contribute to completion percentage
- ✅ Products are marked "ready" only when BOTH core AND SEO attributes complete
- ✅ rulesVersion incremented to 4

### What Stays Same
- ✅ API endpoint structure unchanged
- ✅ UI component structure unchanged
- ✅ Feature flag still controls visibility
- ✅ Export gate still requires 80% completion

### Backwards Compatibility
- ⚠️ Existing products may show different completion % after update
- Products with only core attributes: 100% → 80%
- Products with core + SEO: No change (already 100%)
- Affected status: Any product with Core complete but SEO incomplete will change from "ready" to "not ready"

---

**Ready for immediate deployment to staging**
