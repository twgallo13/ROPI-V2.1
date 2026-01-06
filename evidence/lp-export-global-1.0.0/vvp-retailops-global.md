# VVP: RetailOps Global Export Mode (HES B)
**LP-export-global-1.0.0 | HES B Deliverable**  
**Author:** Homer (AI Agent)  
**Date:** 2026-01-06  
**Status:** Design Ready  
**Supersedes:** vvp-retailops-global-hes-a.md

---

## Test Products

**Product A (Partial Classification):** mpn `18-test` (product ID 18)
- Has: sku, mpn, name, brand, category
- Missing: class, department
- Expected GLOBAL completion: ~72% (classification segment incomplete)

**Product B (Full Classification):** mpn `211737-90h1-8`
- Has: All core attributes + full classification (category, class, department)
- Expected GLOBAL completion: 100%

---

## Test Case 1: GLOBAL Mode API Response

**Goal:** Verify `/api/products/:id/completion` returns GLOBAL mode structure.

**Steps:**
1. Open browser DevTools (F12) → Network tab
2. Navigate to `https://staging.ropi.ai/products/18`
3. Find request to `/api/products/18/completion`
4. Copy JSON response

**Expected Response (Product 18):**
```json
{
  "mode": "GLOBAL",
  "ready": false,
  "completionPct": 72,
  "threshold": 80,
  "hasBlockingSites": false,
  "productLevelReadiness": {
    "aggregatedCompletionPct": 72,
    "segmentScores": [
      { "segmentId": "core-attributes", "score": 100, "weightPct": 50 },
      { "segmentId": "product-classification", "score": 33, "weightPct": 20, "missingAttributes": ["class", "department"] }
    ],
    "missingGlobalAttributes": ["class", "department"],
    "websiteOptional": false,
    "sitesEvaluated": ["ropi-web", "ropi-app"]
  },
  "operatorExplanation": {
    "summary": "Export blocked: product 72% complete (threshold: 80%)",
    "siteStatus": []
  }
}
```

**Pass/Fail:**
- ✅ PASS: Response has `mode: "GLOBAL"`, `productLevelReadiness` object, `siteStatus` empty
- ❌ FAIL: `mode: "SITE_SCOPED"` or missing `productLevelReadiness`

---

## Test Case 2: UI Site Dropdown Hidden in GLOBAL Mode

**Goal:** Verify ExportPage hides site dropdown in GLOBAL mode.

**Steps:**
1. Navigate to `https://staging.ropi.ai/export`
2. Inspect page UI

**Expected UI:**
- ✅ "🌍 Global Export Mode" badge visible
- ✅ "Product-level evaluation" help text visible
- ✅ Website dropdown HIDDEN
- ✅ Format dropdown visible (CSV/JSON)

**Pass/Fail:**
- ✅ PASS: Site dropdown hidden, GLOBAL badge visible
- ❌ FAIL: Site dropdown visible

**Screenshot:** global-export-ui.png

---

## Test Case 3: Export Request Has NO Site Parameter

**Goal:** Verify export API call excludes `site` field in GLOBAL mode.

**Steps:**
1. On Export page, select format (CSV)
2. Click "Export Products"
3. In DevTools Network tab, find POST to `/api/admin/exports/dry-run`
4. Inspect Request Payload

**Expected Request Body:**
```json
{
  "format": "csv",
  "limit": 100,
  "includeMeta": true
}
```

**Note:** NO `site` field present.

**Pass/Fail:**
- ✅ PASS: Request body has NO `site` field
- ❌ FAIL: Request includes `{ "site": "..." }`

---

## Test Case 4: Classification Segment Enforced

**Goal:** Verify classification attributes (category/class/department) contribute 20% to completion.

**Test 4a: Product 18 (Missing class, department)**

**API Call:**
```bash
curl https://staging.ropi.ai/api/products/18/completion \
  -H "Authorization: Bearer $TOKEN"
```

**Expected:**
- `completionPct`: ~72% (down from ~85% without classification)
- `productLevelReadiness.segmentScores` includes:
  ```json
  {
    "segmentId": "product-classification",
    "score": 33,
    "weightPct": 20,
    "missingAttributes": ["class", "department"]
  }
  ```

**Test 4b: Product 211737-90h1-8 (Full classification)**

**Expected:**
- `completionPct`: 100%
- `productLevelReadiness.segmentScores` includes:
  ```json
  {
    "segmentId": "product-classification",
    "score": 100,
    "weightPct": 20,
    "missingAttributes": []
  }
  ```

**Pass/Fail:**
- ✅ PASS: Classification segment present with 20% weight
- ❌ FAIL: Classification segment missing or 0% weight

---

## Test Case 5: Feature Flag Toggle (Instant Rollback)

**Goal:** Verify mode toggle via Firestore instantly switches UI/API behavior.

**Steps:**

**5a: Enable GLOBAL mode**
```javascript
// Run in Firebase Console or Node.js
await admin.firestore()
  .collection('settings')
  .doc('default')
  .collection('exportSettings')
  .doc('config')
  .update({ mode: 'GLOBAL' });
```

**Verify:** Refresh Export page → site dropdown hidden, GLOBAL badge visible

**5b: Disable GLOBAL mode (rollback)**
```javascript
await admin.firestore()
  .collection('settings')
  .doc('default')
  .collection('exportSettings')
  .doc('config')
  .update({ mode: 'SITE_SCOPED' });
```

**Verify:** Refresh Export page → site dropdown visible, GLOBAL badge hidden

**Pass/Fail:**
- ✅ PASS: UI toggles within 5 minutes (no code deployment needed)
- ❌ FAIL: UI requires code deployment to switch modes

**Time to Rollback:** < 5 minutes

---

## Test Case 6: Backward Compatibility (Existing Clients)

**Goal:** Verify existing clients (not checking `mode` field) continue working.

**Steps:**
1. Make API call to `/api/products/18/completion`
2. Parse response, ignore `mode` and `productLevelReadiness` fields
3. Use only `ready`, `completionPct`, `threshold` fields (existing contract)

**Expected:**
- Old clients see standard fields (ready, completionPct, threshold)
- New fields are optional (backward compatible)

**Pass/Fail:**
- ✅ PASS: Response includes all legacy fields
- ❌ FAIL: Legacy fields missing or changed

---

## Test Case 7: Website Optional in GLOBAL Mode

**Goal:** Verify products without `website` field are NOT blocked in GLOBAL mode.

**Steps:**
1. Create test product with NO website field
2. Call `/api/products/:id/completion` (GLOBAL mode)

**Expected:**
- `productLevelReadiness.websiteOptional`: true
- `productLevelReadiness.sitesEvaluated`: ["__GLOBAL__"]
- `ready`: Based on completion% only (NOT blocked by missing website)

**Pass/Fail:**
- ✅ PASS: Product evaluated despite missing website
- ❌ FAIL: Product blocked with "No sites selected" error

---

## Test Case 8: CompletionExportGatePanel (Product Detail)

**Goal:** Verify product detail page shows product-level completion in GLOBAL mode.

**Steps:**
1. Navigate to `https://staging.ropi.ai/products/18`
2. Scroll to "Completion / Export" panel

**Expected UI:**
- ✅ "🌍 Completion / Export (GLOBAL)" header
- ✅ Completion gauge: 72%
- ✅ Segment breakdown visible (Core: 100%, Classification: 33%)
- ✅ "Missing Attributes (Product-Level)" section: class, department
- ✅ "Sites Evaluated: ropi-web, ropi-app" info text
- ✅ NO per-site accordion (siteStatus empty)

**Pass/Fail:**
- ✅ PASS: Product-level view, no per-site breakdown
- ❌ FAIL: Per-site accordion visible

**Screenshot:** global-completion-panel.png

---

## Summary: Pass/Fail Criteria

| Test Case | Pass Criteria | Fail Criteria |
|-----------|---------------|---------------|
| 1: API Response | `mode: "GLOBAL"`, `productLevelReadiness` present | Missing fields or `mode: "SITE_SCOPED"` |
| 2: UI Dropdown | Site dropdown HIDDEN, badge visible | Site dropdown visible |
| 3: Export Request | NO `site` field in request body | `site` field present |
| 4: Classification | 20% weight, missing attrs detected | Segment missing or 0% weight |
| 5: Feature Toggle | UI switches within 5 min (no deploy) | Requires code deployment |
| 6: Backward Compat | All legacy fields present | Legacy fields missing |
| 7: Website Optional | Products without website evaluated | Blocked with "No sites" error |
| 8: Product Panel | Product-level view, no site accordion | Per-site accordion visible |

---

## Access Requirements

- Staging credentials (see [access-blockers.txt](access-blockers.txt) if blocked)
- Firestore Admin SDK access (for feature flag toggle tests)
- Browser DevTools access
- Product edit permissions

---

**Document Status:** ✅ Ready for QA  
**Approval Required:** Lisa (LP Governance Lead)  
**Next Artifact:** tests-plan.md
