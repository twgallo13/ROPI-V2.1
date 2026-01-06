# LP-export-readiness-diagnostics-1.0.0 HES C - Staging Verification Plan

**Date:** 2026-01-06  
**Status:** IN PROGRESS  
**Phase:** HES C - Staging Verification  
**PRs Created:** #451, #452, #453, #454

---

## PR Status

| PR | Branch | Status | Merge Order |
|----|--------|--------|-------------|
| [#453](https://github.com/twgallo13/ROPI-V2.1/pull/453) | `fix/auth-injection-export-readiness-2026-01-07` | Open | 1st (CRITICAL) |
| [#452](https://github.com/twgallo13/ROPI-V2.1/pull/452) | `fix/attribute-export-schema-2026-01-07` | Open | 2nd (CRITICAL) |
| [#451](https://github.com/twgallo13/ROPI-V2.1/pull/451) | `fix/remove-legacy-export-panel-2026-01-07` | Open | 3rd (UI) |
| [#454](https://github.com/twgallo13/ROPI-V2.1/pull/454) | `audit/sdk-firestore-attributes-2026-01-07` | Open | Anytime (Chore) |

---

## HES C Verification Checklist

### A. Readiness Endpoint / Auth ✅

**Requirement:** Confirm `GET https://<staging>/api/admin/exports/readiness` returns 200 (when ready) and 423 (when blocked).

**Steps:**
1. Merge PR #453 (auth injection fix) → deploy to staging
2. Make authenticated request to `/api/admin/exports/readiness`
3. Capture full HTTP request/response showing:
   - Authorization header with Bearer token
   - 200 status with readiness payload
   - 423 status when blocked (if applicable)

**Evidence Files:**
- `evidence/lp-export-readiness-diagnostics/readiness-200-after.txt`
- `evidence/lp-export-readiness-diagnostics/readiness-423-after.txt` (if applicable)
- `evidence/lp-export-readiness-diagnostics/network-export-readiness-auth.txt`

**Status:** ⏳ PENDING

---

### B. Export Manager UI / Legacy Panel ✅

**Requirement:** Verify Export Manager mounted with no legacy panel.

**Steps:**
1. Merge PR #451 (remove legacy panel) → deploy to staging
2. Load `/export` page
3. Load `/products/:id` (product editor)
4. Capture screenshots showing:
   - Export Manager UI with single CompletionExportGatePanel
   - No duplicate ExportReadinessPanel
5. Capture network trace showing readiness request

**Evidence Files:**
- `evidence/lp-export-readiness-diagnostics/legacy-ui-after.png`
- `evidence/lp-export-readiness-diagnostics/export-manager-network.txt`

**Status:** ⏳ PENDING

---

### C. Product-Level Correctness ✅

**Requirement:** Verify product 211737-90h1-8 shows correct export state.

**Steps:**
1. GET `/api/products/211737-90h1-8/completion`
2. Verify response includes:
   - `siteStatus` with `shiekh.com`
   - `ready: true` OR correct blocking reasons
3. Load product in UI and capture screenshot

**Evidence Files:**
- `evidence/lp-export-readiness-diagnostics/product-211737-completion-after.txt`
- `evidence/lp-export-readiness-diagnostics/product-211737-ui.png`

**Status:** ⏳ PENDING

---

### D. Attribute Update Validation ✅

**Requirement:** Verify `export: true` no longer causes 400 errors.

**Steps:**
1. Merge PR #452 (export schema fix) → deploy to staging
2. POST `/api/admin/settings/attributes/class` with `export: true`
3. Verify 200 response
4. POST same endpoint with `export: { key: 'test' }`
5. Verify 200 response

**Evidence Files:**
- `evidence/lp-export-readiness-diagnostics/attribute-update-200-after.txt`
- `evidence/lp-export-readiness-diagnostics/attribute-schema-validation.txt`

**Status:** ⏳ PENDING

---

### E. SDK ↔ Firestore Audit ✅

**Requirement:** Include audit artifacts and remediation recommendations.

**Steps:**
1. Merge PR #454 (audit scripts) → deploy to staging
2. Confirm evidence files exist:
   - `evidence/sdk-product-attribute-audit-2026-01-06.json`
   - `evidence/sdk-product-attribute-audit-2026-01-06.csv`
3. Create remediation summary

**Evidence Files:**
- `evidence/lp-export-readiness-diagnostics/sdk-product-attribute-audit-2026-01-06.json` ✅ EXISTS
- `evidence/lp-export-readiness-diagnostics/sdk-product-attribute-audit-2026-01-06.csv` ✅ EXISTS
- `evidence/lp-export-readiness-diagnostics/attribute-audit-summary.md` ⏳ TODO

**Status:** 🔄 PARTIAL

---

### F. Live-Update Behavior ✅

**Requirement:** Verify if readiness updates without full page reload.

**Steps:**
1. Load Export Manager UI
2. PATCH a product to change completion state
3. Observe if Export Manager updates automatically
4. Capture network trace

**Evidence Files:**
- `evidence/lp-export-readiness-diagnostics/live-update-evidence.txt`

**Expected:** NOT IMPLEMENTED (planned follow-up) - document as deviation.

**Status:** ⏳ PENDING

---

### G. CI + Deploy Receipts ✅

**Requirement:** Include CI run IDs and staging deploy run ID.

**Steps:**
1. Capture CI run URLs for each PR
2. Capture staging deploy run ID
3. Record merged commit SHAs

**Evidence Files:**
- `evidence/lp-export-readiness-diagnostics/ci-runs.txt`
- `evidence/lp-export-readiness-diagnostics/staging-deploy.txt`

**Status:** ⏳ PENDING

---

### H. Final HES C JSON ✅

**Requirement:** Produce `HES_C_LP-export-readiness-diagnostics-1.0.0.json`.

**Contents:**
```json
{
  "from": "HES B - Implementation",
  "to": "HES C - Staging Verification",
  "lp": "LP-export-readiness-diagnostics-1.0.0",
  "date": "2026-01-06",
  "checkpoint": "C",
  "filesChanged": [...],
  "commitShas": [...],
  "prNumbers": [451, 452, 453, 454],
  "ciRuns": [...],
  "deployInfo": {...},
  "verification": {
    "A_readiness_endpoint": "PASS|FAIL",
    "B_export_manager_ui": "PASS|FAIL",
    "C_product_correctness": "PASS|FAIL",
    "D_attribute_validation": "PASS|FAIL",
    "E_sdk_audit": "PASS|FAIL",
    "F_live_update": "DEVIATION",
    "G_ci_deploy": "PASS|FAIL"
  },
  "deviations": [...],
  "result": "VERIFIED SUCCESS|VERIFIED FAILURE"
}
```

**Status:** ⏳ PENDING

---

## Acceptance Criteria

| Criterion | Status | Evidence |
|-----------|--------|----------|
| Readiness endpoint returns 200 with auth | ⏳ | readiness-200-after.txt |
| Frontend includes Authorization header | ⏳ | network-export-readiness-auth.txt |
| Product 211737-90h1-8 recognized | ⏳ | product-211737-completion-after.txt |
| `export: true` no longer 400 | ⏳ | attribute-update-200-after.txt |
| Legacy panel removed | ⏳ | legacy-ui-after.png |
| Audit produced | ✅ | sdk-product-attribute-audit-2026-01-06.json |
| No backend regressions | ⏳ | ci-runs.txt |

---

## Next Steps

1. ✅ Create 4 PRs (#451-454)
2. ⏳ Merge PR #453 (auth fix) FIRST
3. ⏳ Deploy to staging
4. ⏳ Execute verification steps A-G
5. ⏳ Collect all evidence files
6. ⏳ Generate HES C JSON
7. ⏳ If PASS → proceed to HES D
8. ⏳ If FAIL → document and remediate

---

**Current Phase:** Awaiting PR merge and staging deploy
