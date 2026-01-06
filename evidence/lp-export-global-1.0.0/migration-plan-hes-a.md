# Migration Plan — RetailOps Global Export Mode

**LP:** LP-export-global-1.0.0 HES A  
**Version:** 1.0.0  
**Date:** 2026-01-06

---

## Overview

This migration plan outlines the **phased approach** to implement RetailOps global export mode while preserving existing tenant behavior and enabling instant rollback at every phase.

---

## Migration Phases

### Phase 1: Extend API Response (Non-Breaking)

**Goal:** Add new fields to API response without changing behavior.

**Changes:**
1. Backend adds `mode` field to response (default: `"SITE_SCOPED"`)
2. Backend adds `productLevelReadiness` object (computed but not used by UI yet)
3. Backend adds `productCompletionBreakdown` array (same as `completionBreakdown` initially)

**No UI Changes in Phase 1**

**Deployment:**
- Deploy backend changes to staging
- Run smoke tests: verify existing UI still works (ignores new fields)
- Monitor logs for errors

**Rollback:**
- If errors: Revert backend PR
- No UI changes needed (backward compatible)

**Success Criteria:**
- Existing UI renders normally
- API responses include new fields
- No errors in staging logs

---

### Phase 2: Add GLOBAL Mode Logic (Backend Only)

**Goal:** Implement backend logic for GLOBAL mode evaluation without exposing it to users.

**Changes:**

**A. Tenant Configuration**
- Add `exportMode` field to tenant config (Firestore `settings/tenantConfig` or similar)
- Set `exportMode: "SITE_SCOPED"` for all existing tenants (default)
- Set `exportMode: "GLOBAL"` for RetailOps tenant (manual config update)

**B. Backend Evaluation Logic**
- Modify `evaluateProductCompletion()` to check tenant `exportMode`
- If `mode === "GLOBAL"`:
  - Set `response.mode = "GLOBAL"`
  - Compute `productLevelReadiness` from product-level segments only (no site-specific)
  - Set `operatorExplanation.siteStatus = []`
  - Populate `productCompletionBreakdown` with product-level segments
- If `mode === "SITE_SCOPED"`:
  - Keep existing behavior (per-site evaluation)

**C. Site-Agnostic Evaluation**
- In GLOBAL mode, modify `extractSelectedSites()` to return synthetic site `["global"]` if product has no `website` field
- Skip segments with `siteAware: true` in GLOBAL mode

**No UI Changes in Phase 2** (UI still renders per-site for all tenants)

**Deployment:**
- Deploy backend changes to staging
- Test with RetailOps tenant config manually set to `"GLOBAL"`
- Verify API response has `mode: "GLOBAL"` and `productLevelReadiness` populated
- Test with non-RetailOps tenant → verify `mode: "SITE_SCOPED"` (no change)

**Rollback:**
- If errors: Set RetailOps tenant `exportMode: "SITE_SCOPED"`
- Backend continues to work (no code revert needed)

**Success Criteria:**
- RetailOps tenant API returns `mode: "GLOBAL"`
- Other tenants API returns `mode: "SITE_SCOPED"`
- UI still renders per-site for all tenants (not consuming new fields yet)

---

### Phase 3: UI Conditional Rendering

**Goal:** Update UI to render product-level readiness for GLOBAL mode tenants.

**Changes:**

**A. ExportPage.tsx**
```typescript
// Add mode detection
const mode = completion?.mode || "SITE_SCOPED";

// Conditional rendering
{mode === "GLOBAL" ? (
  <GlobalExportReadyCard 
    ready={completion.productLevelReadiness.ready}
    completionPct={completion.productLevelReadiness.completionPct}
    threshold={completion.productLevelReadiness.threshold}
  />
) : (
  <PerSiteExportUI siteStatus={completion.operatorExplanation.siteStatus} />
)}
```

**B. CompletionExportGatePanel.tsx**
```typescript
const mode = completion?.mode || "SITE_SCOPED";

{mode === "GLOBAL" ? (
  <ProductLevelCompletionPanel 
    productLevelReadiness={completion.productLevelReadiness}
    breakdown={completion.operatorExplanation.productCompletionBreakdown}
  />
) : (
  <PerSiteCompletionPanel siteStatus={completion.operatorExplanation.siteStatus} />
)}
```

**Deployment:**
- Deploy UI changes to staging
- Test with RetailOps tenant: verify product-level UI renders
- Test with non-RetailOps tenant: verify per-site UI renders (unchanged)

**Rollback:**
- If UI errors: Revert UI PR
- Backend continues to work (still sends both modes)

**Success Criteria:**
- RetailOps tenant sees product-level export UI (no per-site dropdown)
- Other tenants see per-site UI (unchanged)
- No errors in browser console

---

### Phase 4: Segment Configuration Update (Data Migration)

**Goal:** Enable classification attributes and adjust segment configuration for GLOBAL mode.

**Changes:**

**A. Update Completion Rules**

Edit `settings/exportSettings/completionRules` in Firestore:

**1. Add/Enable "Product Classification" Segment**
```json
{
  "id": "product-classification",
  "name": "Product Classification",
  "enabled": true,
  "weightPct": 20,
  "ruleType": "ALL_REQUIRED",
  "appliesTo": {
    "mode": "ALL_PRODUCTS",
    "sites": []
  },
  "attributeSelector": {
    "source": "REGISTRY",
    "categories": ["classification"],
    "requirementFlag": "required_for_completion",
    "siteAware": false,
    "includeInternalOnly": false,
    "excludeAttributeIds": []
  }
}
```

**2. Adjust Description/SEO Segment**
```json
{
  "id": "description-seo",
  "name": "Description & SEO",
  "enabled": true,
  "weightPct": 30,
  "ruleType": "ALL_REQUIRED",
  "appliesTo": {
    "mode": "CONDITIONAL",
    "sites": ["ropi-web", "shiekh", "karmaloop", "mltd"]
  },
  "attributeSelector": {
    "source": "REGISTRY",
    "categories": ["description", "seo"],
    "requirementFlag": "required_for_completion",
    "siteAware": true,
    "includeInternalOnly": false,
    "excludeAttributeIds": []
  }
}
```

**3. Adjust Other Segments**
- Ensure Core Information, Identity/Demographic, Color, Materials segments have `siteAware: false`
- Adjust weights to sum to 100% for enabled segments

**B. Backend Logic Update**
- Modify `doesSegmentApply()` to check mode:
  - In GLOBAL mode: Skip segments with `appliesTo.mode === "CONDITIONAL"` or `siteAware: true`
  - In SITE_SCOPED mode: Keep existing logic

**Deployment:**
- Update Firestore config (manual operation or admin UI)
- Test with `mpn 18-test` and `211737-90h1-8`:
  - Verify classification attributes are enforced
  - Products without `category`, `class`, `department` should be blocked
- Deploy backend logic update if needed

**Rollback:**
- If classification enforcement blocks too many products:
  - Set "Product Classification" segment `enabled: false`
  - Products become export-ready again (instant rollback)
- If segment logic errors:
  - Revert backend PR
  - Config changes remain but are not used

**Success Criteria:**
- Products with missing classification attributes are blocked in GLOBAL mode
- Products with all classification attributes are export-ready
- Non-RetailOps tenants see per-site evaluation (unchanged)

---

### Phase 5: Export API Update (Global Export Execution)

**Goal:** Allow export execution without `site` parameter in GLOBAL mode.

**Changes:**

**A. Export API Endpoint**
- Modify `/api/admin/exports/dry-run` to accept optional `site` parameter
- If `site` omitted and tenant is GLOBAL mode → export all products (no site filter)
- If `site` provided → filter by site (existing behavior)

**B. UI Export Button**
```typescript
if (mode === "GLOBAL") {
  // Omit site parameter
  await fetch('/api/admin/exports/dry-run', {
    body: JSON.stringify({
      format: selectedFormat,
      limit: 100,
      includeMeta: true
      // No 'site' field
    })
  });
} else {
  // Include site parameter (existing behavior)
  await fetch('/api/admin/exports/dry-run', {
    body: JSON.stringify({
      site: selectedSite,
      format: selectedFormat,
      limit: 100,
      includeMeta: true
    })
  });
}
```

**Deployment:**
- Deploy backend export API changes
- Deploy UI export button changes
- Test global export: click "Start Export" in RetailOps tenant → verify export executes without site parameter

**Rollback:**
- If export errors:
  - Revert backend PR
  - UI falls back to sending `site: "global"` (synthetic site)

**Success Criteria:**
- RetailOps tenant can execute global export (no site selection)
- Export CSV contains all export-ready products (not filtered by site)
- Other tenants can execute per-site export (unchanged)

---

## Compatibility Matrix

| Phase | RetailOps UI | Other Tenants UI | Backend Behavior |
|-------|--------------|------------------|------------------|
| 1     | Per-site (unchanged) | Per-site (unchanged) | Adds new fields (ignored by UI) |
| 2     | Per-site (unchanged) | Per-site (unchanged) | Computes GLOBAL mode (UI ignores) |
| 3     | Product-level (NEW) | Per-site (unchanged) | GLOBAL/SITE_SCOPED computed |
| 4     | Product-level + classification | Per-site + classification | Classification enforced |
| 5     | Product-level + global export | Per-site + site export | Global export API live |

---

## Data Migration

### Tenant Configuration

**Before:**
```json
{
  "tenantId": "retailops",
  "name": "RetailOps"
}
```

**After:**
```json
{
  "tenantId": "retailops",
  "name": "RetailOps",
  "exportMode": "GLOBAL"
}
```

**Migration Script:**
```javascript
// Run once to add exportMode to existing tenants
const admin = require('firebase-admin');
const db = admin.firestore();

// Set SITE_SCOPED for all existing tenants
const tenants = await db.collection('tenants').get();
for (const doc of tenants.docs) {
  await doc.ref.update({ exportMode: 'SITE_SCOPED' });
}

// Set GLOBAL for RetailOps
await db.doc('tenants/retailops').update({ exportMode: 'GLOBAL' });
```

### Completion Rules

**Before:**
- No "Product Classification" segment (or disabled)
- Description/SEO applies to all products

**After:**
- "Product Classification" segment enabled (20% weight)
- Description/SEO applies only to sites with per-site attributes

**Migration:**
- Manual update via admin UI or Firestore console
- Validate with `validateCompletionRulesConfig()`

---

## Testing Plan

### Unit Tests

- [ ] Backend: `mode` determination logic
- [ ] Backend: `productLevelReadiness` calculation
- [ ] Backend: Segment filtering in GLOBAL mode
- [ ] UI: Conditional rendering based on `mode`
- [ ] Export API: Global export without `site` parameter

### Integration Tests

- [ ] Call `/api/products/18-test/completion` with RetailOps tenant → verify `mode: "GLOBAL"`
- [ ] Call same endpoint with non-RetailOps tenant → verify `mode: "SITE_SCOPED"`
- [ ] Verify classification attributes block products in GLOBAL mode
- [ ] Verify global export API returns all ready products

### E2E Tests

- [ ] Login as RetailOps user → verify product-level UI
- [ ] Login as non-RetailOps user → verify per-site UI
- [ ] Execute global export → verify CSV contains expected products
- [ ] Execute per-site export → verify CSV filtered by site

---

## Rollback Plan

### Phase 1 Rollback

**Trigger:** Backend errors, API response format issues  
**Action:** Revert backend PR  
**Impact:** No UI changes (backward compatible)

### Phase 2 Rollback

**Trigger:** GLOBAL mode evaluation errors  
**Action:** Set RetailOps tenant `exportMode: "SITE_SCOPED"`  
**Impact:** UI continues to render per-site (no code change needed)

### Phase 3 Rollback

**Trigger:** UI rendering errors, browser console errors  
**Action:** Revert UI PR  
**Impact:** Backend continues to send both modes (UI ignores new fields)

### Phase 4 Rollback

**Trigger:** Classification enforcement blocks too many products  
**Action:** Set "Product Classification" segment `enabled: false`  
**Impact:** Products become export-ready again (instant rollback)

### Phase 5 Rollback

**Trigger:** Export execution errors  
**Action:** Revert export API PR  
**Impact:** UI falls back to sending `site: "global"` (synthetic site)

---

## Risk Assessment

| Risk | Probability | Impact | Mitigation |
|------|-------------|--------|------------|
| Classification enforcement blocks all products | Medium | High | Phase 4: Check data quality before enabling segment |
| UI conditional logic breaks for edge cases | Low | Medium | Phase 3: Comprehensive E2E tests |
| Export API errors without site parameter | Low | High | Phase 5: Validate export logic with test tenant |
| Firestore config update fails | Low | High | Phase 4: Test config update in staging first |

---

## Success Metrics

- [ ] RetailOps tenant can export without selecting sites
- [ ] Classification attributes are enforced (products without category/class/department are blocked)
- [ ] Non-RetailOps tenants continue to use per-site export (no regression)
- [ ] No increase in error rates or support tickets

---

## Timeline

| Phase | Duration | Dependencies |
|-------|----------|--------------|
| Phase 1: Extend API Response | 1-2 days | None |
| Phase 2: GLOBAL Mode Logic | 2-3 days | Phase 1 complete |
| Phase 3: UI Conditional Rendering | 2-3 days | Phase 2 complete |
| Phase 4: Segment Configuration | 1-2 days | Phase 3 complete, data quality check |
| Phase 5: Export API Update | 1-2 days | Phase 4 complete |

**Total estimated time:** 7-12 days (development + testing + staging verification)

---

## Post-Migration Validation

After all phases complete:

1. **Smoke Tests:**
   - [ ] RetailOps tenant: Load Export Manager, verify product-level UI
   - [ ] Non-RetailOps tenant: Load Export Manager, verify per-site UI
   - [ ] Execute global export, verify CSV output

2. **Regression Tests:**
   - [ ] Run full E2E test suite
   - [ ] Verify no errors in backend logs
   - [ ] Check browser console for UI errors

3. **Performance Tests:**
   - [ ] Verify API response times (< 500ms for product-level evaluation)
   - [ ] Verify export execution times (no degradation)

4. **Data Quality:**
   - [ ] Check % of products blocked by classification enforcement
   - [ ] Verify expected products appear in global export CSV

---

## Open Items

1. [ ] Confirm tenant config structure (`settings/tenantConfig` vs `tenants/{id}`)
2. [ ] Decide if `website` should remain required in GLOBAL mode
3. [ ] Define synthetic site value (`"global"` vs `"retailops"` vs empty array)
4. [ ] Validate segment weight distribution after adding classification segment

---

## Summary

**Migration strategy:**
- ✅ Phased rollout (5 phases)
- ✅ Non-breaking changes at each phase
- ✅ Instant rollback at any phase
- ✅ Backward compatible for non-RetailOps tenants
- ✅ Clear success criteria and testing plan

**Next steps:** HES B (implementation) will detail exact code changes, PR structure, and test coverage.
