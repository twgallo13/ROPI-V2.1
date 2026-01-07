# LP-export-global-impl-2a: Implement productLevelReadiness (Engine)

## Summary

This PR implements the product-level evaluation semantics for RetailOps GLOBAL mode, as designed in HES B. The engine now computes `productLevelReadiness` with aggregated completion scores across all product sites using a BEST-score-per-segment algorithm, while preserving site-specific data for backward compatibility.

**Link to HES B Design:** [evidence/lp-export-global-1.0.0/design-architecture.md](evidence/lp-export-global-1.0.0/design-architecture.md)

**Explicit Guarantee:** This PR implements evaluation semantics exactly as specified in HES B. No breaking changes to SITE_SCOPED behavior. Feature-flagged and fully rollbackable.

---

## Changes

### 1. API Extension: ProductLevelReadiness Interface

**File:** `packages/api/src/services/completionDrivenExportReadiness.ts:L30-70`

**New Types:**
```typescript
export interface SegmentScore {
  segmentId: string;
  segmentName: string;
  score: number;
  weightPct: number;
  missingAttributes: string[];
}

export interface ProductLevelReadiness {
  aggregatedCompletionPct: number;           // Weighted average across sites
  segmentScores: SegmentScore[];             // Per-segment BEST scores
  missingGlobalAttributes: string[];         // Union of missing attrs
  websiteOptional: boolean;                  // True if no sites present
  sitesEvaluated: string[];                  // All sites evaluated
  blockingSegments: string[];                // Segments < 100%
}
```

**Updated Interface:**
- `CompletionDrivenExportReadiness` now includes optional `productLevelReadiness: ProductLevelReadiness | { ready, completionPct, threshold, hasBlockingSites }` (Phase 2 extends Phase 1 shape)

---

### 2. Product-Level Aggregation Engine

**File:** `packages/api/src/services/completionDrivenExportReadiness.ts:L95-195`

**New Function: `aggregateProductLevelReadiness(product, rules, registry, timestamp)`**

Implements HES B algorithm:
1. Extract all sites associated with product
2. Evaluate completion for each site (excluding description-seo site-blocking segment)
3. Aggregate segment scores using BEST-score-per-segment strategy:
   - For each segment, keep the highest score across all sites
   - Exclude site-specific blocking attributes (description-seo)
4. Calculate weighted average: `sum(score × weight) / sum(weights)`
5. Collect union of missing attributes (de-duplicated, sorted)
6. Identify blocking segments (score < 100)

**Key Design Decisions:**
- **Website Optional:** If product has no sites, evaluates as `['__GLOBAL__']` with `websiteOptional: true`
- **Site-Blocking Exclusion:** Filters out `description-seo` segment from global aggregation (site-specific blocking doesn't apply to product-level)
- **BEST Score Strategy:** Per HES B, takes highest score per segment across sites (optimistic aggregation)
- **Deterministic:** No randomization; results are identical for identical inputs

**Performance Target:** <500ms per product (verified by test)

---

### 3. Main Evaluation Function: Mode Branching

**File:** `packages/api/src/services/completionDrivenExportReadiness.ts:L470-500`

**Modified: `calculateCompletionDrivenExportReadiness(product, forceRulesRefresh, evaluatedAt)`**

**Logic:**
```
1. Load rules and attribute registry
2. Detect export mode via detectExportModeFeatureFlag() (Phase 1 reuse)
3. If mode === 'GLOBAL':
   → Call aggregateProductLevelReadiness()
   → Return response with mode='GLOBAL', productLevelReadiness, ready based on threshold
   → No site-specific blocking (hasBlockingSites=false)
4. Else (mode === 'SITE_SCOPED'):
   → Existing per-site logic unchanged
   → Return response without mode/productLevelReadiness (or with Phase 1 fields if flag enabled)
```

**Backward Compatibility:**
- SITE_SCOPED behavior unchanged (existing code path unmodified)
- Feature flag defaults to SITE_SCOPED when absent
- Phase 1 fields (optional mode, simple productLevelReadiness) still present when Phase 1 flag enabled

---

### 4. Helper Function: Global Operator Explanation

**File:** `packages/api/src/services/completionDrivenExportReadiness.ts:L520-545`

**New Function: `generateGlobalOperatorExplanation(productReadiness, rules)`**

Generates operator-facing explanation for GLOBAL mode:
- Summary: "Export ready/blocked: product X% complete (threshold Y%)"
- Blocking issues: List of incomplete segments
- Completion breakdown: Segment scores with missing attributes
- Site status: List of evaluated sites (no blocking indicators in GLOBAL mode)
- Action required: Specific attributes to complete

---

### 5. Tests

**File:** `packages/api/src/services/__tests__/phase2_engine.test.ts` (NEW)

**Test Coverage:**

**Unit Tests:**
- ✅ Multi-site aggregation: BEST-score-per-segment correctly selects highest score from each site
- ✅ Missing attributes union: Collects all missing attributes across segments (de-duplicated)
- ✅ Blocking segments: Identifies segments with score < 100%
- ✅ Website optional: Handles product with no sites (evaluates as __GLOBAL__)
- ✅ Ready/blocked decision: Correct when aggregation ≥/< threshold
- ✅ Description-SEO exclusion: Site-blocking segment filtered from global aggregation
- ✅ SiteStatus preservation: Site list preserved in operatorExplanation

**Performance Tests:**
- ✅ 5-site product aggregation completes within 500ms

**Fallback Tests:**
- ✅ Feature flag OFF: Disables Phase 2, falls through to SITE_SCOPED behavior

**Run tests locally:**
```bash
cd packages/api
EXPORT_GLOBAL_MODE_FEATURE=true npm run test -- phase2_engine.test.ts
```

**Example Output:**
```
 ✓ src/services/__tests__/phase2_engine.test.ts > Phase 2: Product-Level Aggregation (GLOBAL Mode)
   ✓ aggregateProductLevelReadiness
     ✓ should aggregate segment scores using BEST-score-per-segment algorithm
     ✓ should collect union of missing attributes across segments
     ✓ should identify blocking segments (score < 100)
     ✓ should handle product with no sites (website optional)
     ✓ should return ready true when aggregation >= threshold
     ✓ should return ready false when aggregation < threshold
     ✓ should exclude description-seo site-blocking segment from aggregation
     ✓ should preserve siteStatus in operatorExplanation
   ✓ Performance
     ✓ should complete 5-site aggregation within 500ms (elapsed: 45ms)
   ✓ Fallback Behavior
     ✓ should disable Phase 2 when feature flag is OFF
```

---

## Staging Logs

**File:** `packages/api/src/services/completionDrivenExportReadiness.ts:L180-186`

**Temporary Logging (disabled by default):**

Enable with: `export EXPORT_GLOBAL_LOGS=true`

Log locations:
- Line 180: Aggregation result summary (segment count, sites, blocking count)

Example output:
```
[ProductLevelAgg:Phase2] Aggregation result: {
  aggregatedCompletionPct: 92,
  segmentCount: 4,
  sitesEvaluated: ['siteA', 'siteB', 'siteC'],
  blockingSegmentCount: 1
}
```

**Removal Timeline:** Logs are ephemeral and can be removed post-verification or moved to debug-level logging.

---

## HES C Verification Plan (Post-Merge, Staging Deploy)

### Prerequisites
- Phase 1 already merged and verified in staging
- Feature flag `settings/exportSettings.exportGlobalMode.enabled = true` set in Firestore
- Staging deploy completed with Phase 2A changes

### Steps

#### Step 1: Baseline Test (Feature Flag OFF)
```bash
# Disable flag in Firestore or env
unset EXPORT_GLOBAL_MODE_FEATURE

# Call readiness endpoint
curl -X GET "https://staging-api.retailops.example/api/products/18-test/completion" \
  -H "Authorization: Bearer $ADMIN_ID_TOKEN" \
  -o evidence/phase2/product-18-test-flag-off.json

# Expected:
# - mode absent (or "SITE_SCOPED")
# - productLevelReadiness absent
# - siteStatus present in operatorExplanation
```

#### Step 2: Verify GLOBAL Mode (Feature Flag ON)
```bash
# Enable flag in Firestore
curl -X POST "https://staging-api.retailops.example/api/admin/firestore/settings/exportSettings" \
  -H "Authorization: Bearer $ADMIN_ID_TOKEN" \
  -d '{"exportGlobalMode": {"enabled": true, "mode": "GLOBAL"}}' \
  -o evidence/phase2/flag-enabled.json

# Call readiness endpoint with logs enabled
export EXPORT_GLOBAL_LOGS=true
curl -X GET "https://staging-api.retailops.example/api/products/18-test/completion" \
  -H "Authorization: Bearer $ADMIN_ID_TOKEN" \
  -o evidence/phase2/product-18-test-flag-on.json

# Expected:
# - mode: "GLOBAL"
# - productLevelReadiness present with aggregatedCompletionPct, segmentScores, missingGlobalAttributes
# - aggregatedCompletionPct = weighted average (not per-site)
# - siteStatus preserved in operatorExplanation
# - Logs show [ProductLevelAgg:Phase2] entries
```

#### Step 3: Multi-Site Aggregation Verification
```bash
# Test product with multiple sites (e.g., product 211737-90h1-8)
curl -X GET "https://staging-api.retailops.example/api/products/211737-90h1-8/completion" \
  -H "Authorization: Bearer $ADMIN_ID_TOKEN" \
  -o evidence/phase2/product-211737-flag-on.json

# Verify:
# - aggregatedCompletionPct is BEST-score-per-segment aggregation
# - segmentScores contains multiple segments with correct scores
# - sitesEvaluated contains all product sites
# - No description-seo segment in productLevelReadiness.segmentScores
```

#### Step 4: Completion Threshold Verification
```bash
# Test product below threshold (e.g., 70% complete, threshold 80%)
# Verify ready=false and blockingReasons include threshold message

# Test product above threshold (e.g., 92% complete)
# Verify ready=true and blockingReasons is empty
```

#### Step 5: Toggle Back Verification
```bash
# Disable flag again
curl -X POST "https://staging-api.retailops.example/api/admin/firestore/settings/exportSettings" \
  -H "Authorization: Bearer $ADMIN_ID_TOKEN" \
  -d '{"exportGlobalMode": {"enabled": false}}' \
  -o evidence/phase2/flag-disabled.json

# Call readiness endpoint again
curl -X GET "https://staging-api.retailops.example/api/products/18-test/completion" \
  -H "Authorization: Bearer $ADMIN_ID_TOKEN" \
  -o evidence/phase2/product-18-test-toggle-back.json

# Verify response matches baseline (flag OFF)
```

#### Step 6: Performance Measurement
```bash
# Measure aggregation time for multi-site products
# Log entry [ProductLevelAgg:Phase2] includes timing (Vitest test showed <50ms for 5 sites)

# Expected: <500ms per product (target met)
```

#### Step 7: Test Suite Pass
```bash
# Run full test suite to confirm no regressions
pnpm --filter @ropi-aoss/api test 2>&1 | tee evidence/phase2/api-tests-phase2a.txt

# Expected: All tests pass (Phase 2A tests green, existing tests unaffected)
```

### Checklist
- [ ] Flag OFF: mode absent, productLevelReadiness absent
- [ ] Flag ON: mode == "GLOBAL", productLevelReadiness present with correct shape
- [ ] Aggregation: BEST-score-per-segment verified with multi-site product
- [ ] Threshold: Ready decision correct (≥threshold → true, <threshold → false)
- [ ] Exclusion: description-seo segment not in productLevelReadiness.segmentScores
- [ ] SiteStatus: Preserved in operatorExplanation even in GLOBAL mode
- [ ] Toggle: Response reverts when flag disabled
- [ ] Performance: <500ms per product
- [ ] Tests: All pass, no regressions
- [ ] Logs: [ProductLevelAgg:Phase2] entries present when enabled

---

## Files Changed

- `packages/api/src/services/completionDrivenExportReadiness.ts` (492 lines added/modified)
  - L30-70: New types (SegmentScore, ProductLevelReadiness)
  - L95-195: aggregateProductLevelReadiness() function
  - L200-210: aggregateSegmentScoresBest() helper
  - L470-500: Mode branching in calculateCompletionDrivenExportReadiness()
  - L520-545: generateGlobalOperatorExplanation() function

- `packages/api/src/services/__tests__/phase2_engine.test.ts` (NEW, 350+ lines)
  - Multi-site aggregation tests
  - Missing attributes union tests
  - Blocking segment identification tests
  - Performance tests (<500ms target)
  - Fallback behavior tests

---

## Key Design Decisions

✅ **No evaluation semantics changed for SITE_SCOPED:** Existing per-site logic unchanged; Phase 2 adds parallel GLOBAL branch.

✅ **BEST-score-per-segment algorithm:** Per HES B, optimistic aggregation maximizes product readiness while ensuring all segments are evaluated.

✅ **Website optional support:** Products with no sites evaluated as `['__GLOBAL__']` with `websiteOptional: true` flag.

✅ **Site-blocking exclusion:** Description-SEO site-blocking segment excluded from global aggregation (site-specific constraint doesn't apply at product level).

✅ **Feature-flagged:** Uses Phase 1's `detectExportModeFeatureFlag()` for instant rollback via Firestore flag.

✅ **Backward compatible:** SITE_SCOPED behavior unchanged; Phase 1 fields still present when appropriate.

---

## Merge Instructions

- **Target branch:** `aoss-main`
- **Merge method:** Squash
- **Post-merge:** 
  1. Deploy to staging
  2. Follow HES C verification plan above
  3. Collect evidence files to `evidence/phase2/`
  4. Create HES C manifest (see Step 8 below)

---

## Next Steps (Phase 2B)

After Phase 2A HES C verification passes, Phase 2B (UI) will:
- Update ExportPage.tsx to detect mode and render GLOBAL product-level card
- Update CompletionExportGatePanel.tsx to prefer productLevelReadiness when present
- Hide per-site dropdown in GLOBAL mode
- Provide "Advanced" toggle for siteStatus visibility

---

## Support & Questions

If blocked:
- Registry access for attribute evaluation → See access-blockers.txt
- Staging deploy issues → Review CI/CD logs
- Performance concerns → Contact DevOps for load testing
