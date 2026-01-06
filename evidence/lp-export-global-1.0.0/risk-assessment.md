# Risk Assessment: RetailOps Global Export Mode
**LP-export-global-1.0.0 | HES B Deliverable**  
**Author:** Homer (AI Agent)  
**Date:** 2026-01-06  
**Status:** Design Ready

---

## Risk Matrix

| ID | Risk | Probability | Impact | Severity | Mitigation |
|----|------|-------------|--------|----------|------------|
| R1 | Breaking change for existing clients | Low | High | **Medium** | Optional mode field, backward compatible |
| R2 | Classification weight incorrect (affects scores) | Medium | Medium | **Medium** | Phase 4 independent, instant rollback |
| R3 | Website-optional logic breaks exports | Low | High | **Medium** | Explicit VVP test case, unit tests |
| R4 | Feature flag cache causes mode mismatch | Low | Medium | **Low** | No caching on config endpoint |
| R5 | Firestore access blocked (deployment blocker) | Medium | Medium | **Medium** | Manual config via Firebase Console |
| R6 | Product-level aggregation performance degrades | Low | Medium | **Low** | Performance benchmarks < 500ms |
| R7 | UI doesn't update after mode toggle | Low | Low | **Low** | Page refresh required (documented) |
| R8 | RetailOps integration failures | Medium | High | **High** | Phased rollout, monitor logs |

---

## Detailed Risk Analysis

### R1: Breaking Change for Existing Clients
**Probability:** Low  
**Impact:** High (breaks integrations)  
**Severity:** Medium

**Description:** Existing clients expect specific API response structure. Adding new fields (`mode`, `productLevelReadiness`) could break clients with strict JSON parsing.

**Mitigation:**
1. New fields are **optional** (not in every response by default)
2. `mode` field only present when explicitly detected
3. Existing fields (`ready`, `completionPct`, `threshold`) preserved in same format
4. Backward compatibility integration test suite (see tests-plan.md Section 4.1)

**Monitoring:**
- Track API error rates post-deployment
- Alert on 5xx errors > 1% threshold
- Rollback trigger: Error rate > 2% for 5 minutes

**Rollback:** Set Firestore `mode: "SITE_SCOPED"` → API returns legacy structure

---

### R2: Classification Weight Incorrect
**Probability:** Medium  
**Impact:** Medium (completion scores incorrect)  
**Severity:** Medium

**Description:** Adding classification segment with 20% weight may cause unexpected completion% drops for products missing category/class/department.

**Mitigation:**
1. Phase 4 is INDEPENDENT of Phases 2-3 (can be rolled back without affecting GLOBAL mode)
2. VVP Test Case 4 explicitly verifies classification weighting
3. Unit tests verify classification segment contributes exactly 20%
4. Document expected completion% changes (18: 85% → 72%)

**Monitoring:**
- Track completion% distribution before/after Phase 4
- Alert on > 20% of products suddenly becoming export-blocked

**Rollback:** Firestore update: Set `product-classification` segment `enabled: false`

---

### R3: Website-Optional Logic Breaks Exports
**Probability:** Low  
**Impact:** High (blocks exports for products without website)  
**Severity:** Medium

**Description:** Per Lisa's Option 1 decision, website field is OPTIONAL in GLOBAL mode. If implementation incorrect, could block legitimate exports.

**Mitigation:**
1. Explicit VVP Test Case 7: Product without website field
2. Unit test: `aggregateProductLevelReadiness()` handles empty `websites[]`
3. Code comment at L330-336: "GLOBAL mode: website optional"
4. `websiteOptional: true` flag in response (makes behavior transparent)

**Monitoring:**
- Track products with `websiteOptional: true` in API responses
- Alert if ANY product blocked with "No sites selected" error in GLOBAL mode

**Rollback:** Revert to SITE_SCOPED mode (requires website selection)

---

### R4: Feature Flag Cache Causes Mode Mismatch
**Probability:** Low  
**Impact:** Medium (UI shows wrong mode)  
**Severity:** Low

**Description:** `/api/admin/exports/config` endpoint response cached by browser/CDN, causing stale mode detection.

**Mitigation:**
1. Config endpoint returns `Cache-Control: no-cache, no-store, must-revalidate`
2. UI fetches config on EVERY page mount (not cached in React state)
3. VVP Test Case 5 verifies mode toggle within 5 minutes
4. Documentation: "Page refresh required after mode toggle"

**Monitoring:**
- Track time-to-refresh after Firestore config update
- Alert if > 10 minutes (indicates cache issue)

**Rollback:** Clear CDN cache manually, update cache headers

---

### R5: Firestore Access Blocked
**Probability:** Medium  
**Impact:** Medium (delays deployment)  
**Severity:** Medium

**Description:** HES A identified Firestore access blocked for staging credentials. This blocks Phase 2-4 Firestore config updates.

**Mitigation:**
1. Document exact Firestore permissions required (see access-blockers.txt update)
2. Provide Firebase Console UI instructions as fallback
3. Request Firestore access from DevOps **before** Phase 2 starts
4. Scripts tested with mock Firestore (can be adapted for manual UI updates)

**Monitoring:**
- N/A (pre-deployment blocker)

**Workaround:** Use Firebase Console UI to manually update `settings/{tenant}/exportSettings/config`

---

### R6: Product-Level Aggregation Performance Degrades
**Probability:** Low  
**Impact:** Medium (slow API responses)  
**Severity:** Low

**Description:** `aggregateProductLevelReadiness()` evaluates ALL product sites, potentially O(n*m) complexity (n=sites, m=segments).

**Mitigation:**
1. Performance benchmark test: < 500ms for 5 sites (tests-plan.md Section 5.1)
2. Evaluate sites in parallel (if possible)
3. Cache segment evaluation results per site (future optimization)
4. Monitor API response times in production

**Monitoring:**
- Track P95 response time for `/api/products/:id/completion`
- Alert if P95 > 1000ms

**Rollback:** Set `mode: "SITE_SCOPED"` → existing single-site evaluation (faster)

---

### R7: UI Doesn't Update After Mode Toggle
**Probability:** Low  
**Impact:** Low (user confusion)  
**Severity:** Low

**Description:** UI fetches mode on mount only. Mode toggle requires page refresh.

**Mitigation:**
1. Document in VVP: "Refresh page after mode toggle"
2. Future enhancement: WebSocket for real-time config updates (not in HES B scope)
3. UI shows loading state while fetching mode

**Monitoring:**
- Track user complaints about stale UI (manual)

**Rollback:** N/A (expected behavior)

---

### R8: RetailOps Integration Failures
**Probability:** Medium  
**Impact:** High (blocks RetailOps export)  
**Severity:** HIGH

**Description:** RetailOps expects specific JSON structure. GLOBAL mode response structure different from current API.

**Mitigation:**
1. **Phased rollout:** Enable GLOBAL mode for TEST tenant first (not RetailOps production)
2. Coordinate with RetailOps integration team **before** Phase 3
3. Provide sample API responses (see target-contract-retailops.md Section 4)
4. Backward compatibility: Existing RetailOps clients can ignore new fields
5. Monitor RetailOps export success rates post-deployment

**Monitoring:**
- Track RetailOps API call error rates
- Alert on export failures > 5% baseline

**Rollback:** Feature flag disable (Firestore `mode: "SITE_SCOPED"`)

---

## Monitoring Signals

### Critical Signals (Immediate Rollback Trigger)
- `/api/products/:id/completion` error rate > 2% for 5+ minutes
- RetailOps export success rate < 90% for 10+ minutes
- Products with websites blocked with "No sites selected" error in GLOBAL mode

### Warning Signals (Investigate, Monitor)
- Completion% distribution shift > 20% after Phase 4
- API P95 response time > 1000ms for 10+ minutes
- Mode toggle takes > 10 minutes to reflect in UI

### Info Signals (Track Trends)
- % of products with `websiteOptional: true`
- GLOBAL vs SITE_SCOPED mode usage by tenant
- Classification segment contribution to completion%

---

## Rollback Procedures

### Instant Rollback (< 5 minutes)
**Trigger:** Critical signal detected

**Steps:**
1. Update Firestore config:
```javascript
await admin.firestore()
  .collection('settings')
  .doc('default')
  .collection('exportSettings')
  .doc('config')
  .update({
    mode: 'SITE_SCOPED',
    rollbackReason: 'Production incident',
    rollbackTimestamp: admin.firestore.FieldValue.serverTimestamp()
  });
```
2. Verify API responses revert to SITE_SCOPED structure
3. Notify RetailOps team
4. Post-mortem: Identify root cause

### Code Revert (5-10 minutes)
**Trigger:** Feature flag rollback insufficient

**Steps:**
```bash
git revert <phase-2-commit> <phase-3-commit>
npm run build
npm run deploy:api
npm run deploy:web
```

### Partial Rollback (Phase 4 Only)
**Trigger:** Classification segment weight incorrect

**Steps:**
```javascript
// Disable classification segment only
const docRef = admin.firestore()
  .collection('settings')
  .doc('default')
  .collection('completionRules')
  .doc('config');

const currentDoc = await docRef.get();
const segments = currentDoc.data().segments.map(seg => 
  seg.id === 'product-classification' ? { ...seg, enabled: false } : seg
);
await docRef.update({ segments });
```

---

## Risk Timeline

| Phase | New Risks Introduced | Mitigation Status |
|-------|----------------------|-------------------|
| 1 | R1 (Breaking changes) | ✅ Mitigated (optional fields) |
| 2 | R3 (Website optional), R5 (Firestore access), R6 (Performance) | ✅ Tested, monitored |
| 3 | R4 (Cache issues), R7 (UI stale) | ✅ No-cache headers, documented |
| 4 | R2 (Classification weight), R8 (RetailOps) | ⚠️ Independent rollback, coordinate with RetailOps |

---

## Success Criteria (Risk Mitigation Validation)

### Phase 2 Acceptance
- [ ] Backward compatibility test suite passes (R1)
- [ ] Performance benchmarks < 500ms (R6)
- [ ] Website-optional test passes (R3)
- [ ] Feature flag toggle test < 5 min (R4)

### Phase 3 Acceptance
- [ ] UI mode toggle test passes (R7)
- [ ] No-cache headers verified (R4)
- [ ] E2E tests pass for both modes (R1)

### Phase 4 Acceptance
- [ ] Classification weight verified (R2)
- [ ] Product 18 completion% drops to 72% (R2)
- [ ] Instant segment disable test passes (R2)

### Production Deployment
- [ ] RetailOps team notified and coordinated (R8)
- [ ] Monitoring dashboards configured (all risks)
- [ ] Rollback playbook shared with on-call team (all risks)

---

**Document Status:** ✅ Ready for Risk Review  
**Approval Required:** Lisa (LP Governance Lead)  
**Next Artifact:** access-blockers.txt update, HES B manifest
