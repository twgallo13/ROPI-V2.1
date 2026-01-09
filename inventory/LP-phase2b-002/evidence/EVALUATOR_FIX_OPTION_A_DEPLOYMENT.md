# Option A - Binary Segment Evaluator Fix Deployment
## Verification Plan & Evidence Collection

**Date:** 2026-01-09  
**Commit:** 7d77355 (fix: Correct attribute lookup in binary segment evaluator)  
**Parent:** 3300ec8 (feat: Update evaluator to binary segment semantics + editable segment names)  
**Status:** DEPLOYED TO STAGING

---

## Summary of Changes

### 1. Evaluator Logic Rewrite (Option A)
**File:** `packages/engine/bin/evaluate.js`

**From (Formula-based):**
```
completion = 20 + (attributeCount × 10) + (contentItems × 5)
```

**To (Binary Segment Semantics):**
```
For each segment:
  - All required attributes present → score = 100 (complete)
  - Missing any required attribute → score = 0 (blocked)

Final completion = Σ(segment_score × segment_weight) / Σ(weights)
```

**Key Improvements:**
- ✅ Enforces requirement flags from registry (required_for_completion=true)
- ✅ Detects missing attributes correctly
- ✅ Blocks segment when requirements not met
- ✅ Weighted aggregation for total completion percentage
- ✅ Detailed segment status in API response
- ✅ Missing attributes explicitly listed
- ✅ Backwards compatible (fallback to legacy if no rules)

### 2. Segment Name Editability (New Feature)
**File:** `packages/api/src/handlers/segmentSettingsHandler.ts`

**New Endpoints:**
- `GET /admin/settings/segments` - Retrieve all segment settings
- `PUT /admin/settings/segments/:segmentId` - Update single segment name/metadata
- `PUT /admin/settings/segments` - Bulk update all segments
- `DELETE /admin/settings/segments/:segmentId` - Revert to defaults

**Settings Support:**
- Segment name (editable display name)
- Description
- Display order
- Icon (CSS class)
- Color (hex or named)

**Storage:** Firestore at `settings/segmentSettings`

**Audit Trail:** updatedAt, updatedBy, version

---

## Verification Checklist

### ✅ Unit Test Results (Pre-Deployment)
```
Test Suite: Evaluator Binary Segment Semantics
Result: 4/4 PASSED (100% success rate)

Test Cases:
1. ✅ Complete Core Attributes (All 6 required)
   - Core Status: complete
   - Core Score: 100
   - Completion: 100%

2. ✅ Missing website (1 of 6 core required)
   - Core Status: blocked
   - Core Score: 0
   - Completion: 20%

3. ✅ Missing product_is_active (1 of 6 core required)
   - Core Status: blocked
   - Core Score: 0
   - Completion: 20%

4. ✅ Missing multiple core attributes (4 missing)
   - Core Status: blocked
   - Core Score: 0
   - Completion: 20%
```

### Staging Verification Tasks

#### Task 1: Verify Evaluator Behavior
**Command:**
```bash
curl -X POST https://ropi-aoss-staging.web.app/api/products/19-test/completion \
  -H "Content-Type: application/json" \
  -d '{"rulesVersion": 4}'
```

**Expected Results:**
- [ ] API response includes `segments[]` array
- [ ] Each segment has `status` (complete/blocked)
- [ ] Each segment has `score` (100 or 0 for binary evaluation)
- [ ] Product with missing required attributes shows segment status="blocked"
- [ ] completionPct reflects weighted average of segments
- [ ] `missingAttributes` array populated with names of missing required attrs

#### Task 2: Verify Segment Names Are Editable
**Command:**
```bash
curl -X PUT https://ropi-aoss-staging.web.app/admin/settings/segments/core-attributes \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <admin-token>" \
  -d '{
    "name": "Core Product Info (Custom)",
    "description": "Updated description",
    "icon": "star",
    "color": "#ff0000"
  }'
```

**Expected Results:**
- [ ] Endpoint returns 200 OK
- [ ] Response includes updated segment with new name
- [ ] Settings persist in Firestore
- [ ] GET /admin/settings/segments returns updated name

#### Task 3: Verify UI Reflects Changes
**Steps:**
1. [ ] Load staging app and navigate to completion check page
2. [ ] Verify segment names are displayed correctly (from settings if custom, or defaults)
3. [ ] Edit segment name via admin API
4. [ ] Refresh page and verify new name appears
5. [ ] Check that icon/color are applied correctly

#### Task 4: API Response Validation
**Test with Product 19-test (known to have missing attributes):**

Expected response structure:
```json
{
  "completionPct": 20,
  "status": "blocked",
  "segments": [
    {
      "id": "core-attributes",
      "name": "Core Product Attributes",
      "status": "blocked",
      "score": 0,
      "weightPct": 80,
      "requiredAttributes": ["sku", "mpn", "name", "brand", "website", "product_is_active"],
      "missingAttributes": ["website", "product_is_active"]
    },
    {
      "id": "seo-attributes",
      "name": "SEO & Marketing",
      "status": "blocked",
      "score": 0,
      "weightPct": 20,
      "missingAttributes": [...]
    }
  ]
}
```

**Verification Points:**
- [ ] Core segment shows status="blocked" (missing website, product_is_active)
- [ ] Core score=0 (binary semantics)
- [ ] missingAttributes contains actual missing attr IDs
- [ ] completionPct = 20% (only SEO segment fallback, core blocked)
- [ ] Overall status="blocked" (due to core blocking)

---

## Rollback Plan

If issues are discovered during staging verification:

1. **Revert evaluator to formula-based:** 
   ```bash
   git revert 7d77355 3300ec8
   ```

2. **Redeploy to staging:**
   ```bash
   git push origin aoss-main
   ```

3. **Document issue** in issue #472

---

## Next Steps After Verification

### If All Tests Pass:
1. Create comprehensive evidence document
2. Post verification results to issue #472
3. Request Lisa approval for production deployment
4. Deploy to production (once approved)
5. Run full production verification
6. Close issue #472

### If Issues Found:
1. Document the issue clearly
2. Either:
   - Fix the issue and re-test, OR
   - Revert to Option B (update registry flags) if evaluator fix is too complex
3. Post findings to issue #472

---

## Evidence Files to Collect

During staging verification, collect:

1. `staging_evaluator_complete_product.json` - API response for product with all attrs
2. `staging_evaluator_missing_attrs.json` - API response for product 19-test
3. `staging_segment_settings_updated.json` - Response after updating segment name
4. `staging_segment_settings_fetched.json` - Fetched settings showing custom name
5. `staging_ui_screenshot_before_update.png` - UI showing original segment names
6. `staging_ui_screenshot_after_update.png` - UI showing custom segment names

---

## Related Issues

- Issue #472: Binary-segment enforcement implementation
- Issue #469: LP-phase2b-001 remediation (merged and verified)

---

**Document Version:** 1.0  
**Created:** 2026-01-09  
**Author:** Homer (Evaluator Fix - Option A)  
**Status:** DEPLOYMENT IN PROGRESS
