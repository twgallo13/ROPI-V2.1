# VVP — RetailOps Global Export Mode (Non-Developer Runnable)

**LP:** LP-export-global-1.0.0 HES A  
**Version:** 1.0.0  
**Date:** 2026-01-06  
**Target:** QA / Non-Developer Users

---

## Purpose

This VVP (Verification & Validation Plan) provides **step-by-step instructions** for QA users to verify that RetailOps global export mode works correctly. All steps can be performed via browser UI and simple API calls (using browser DevTools or curl).

---

## Prerequisites

- **Access to staging environment:** https://staging.example.com (replace with actual URL)
- **Admin credentials** for staging
- **Browser:** Chrome or Firefox (with DevTools)
- **Test products:**
  - `mpn 18-test`
  - Product ID `211737-90h1-8`

---

## VVP Test Cases

### Test Case 1: Verify Product-Level Readiness API (GLOBAL Mode)

**Goal:** Confirm that the completion API returns `mode: "GLOBAL"` and `productLevelReadiness` for RetailOps tenant.

**Steps:**

1. **Open browser DevTools:**
   - Press `F12` or `Cmd+Option+I` (Mac)
   - Go to **Network** tab

2. **Navigate to product editor:**
   - Login to staging as admin user
   - Go to **Products** page
   - Search for product `mpn 18-test` or product ID `211737-90h1-8`
   - Click **Edit** to open product editor

3. **Capture API request:**
   - In DevTools Network tab, find request to `/api/products/:id/completion`
   - Click on the request
   - Go to **Response** tab
   - Copy the JSON response

4. **Verify response structure:**

   **Expected fields:**
   ```json
   {
     "mode": "GLOBAL",
     "productLevelReadiness": {
       "ready": true,  // or false
       "completionPct": 85,  // example value
       "threshold": 80,
       "blockingReasons": [],  // or array of reasons
       "missingAttributes": []  // or array of attribute IDs
     },
     "operatorExplanation": {
       "summary": "Product is export-ready (85% complete)",
       "mode": "GLOBAL",
       "productCompletionBreakdown": [...],
       "siteStatus": []  // Should be empty in GLOBAL mode
     }
   }
   ```

5. **Pass/Fail Criteria:**
   - ✅ **PASS:** Response includes `mode: "GLOBAL"` and `productLevelReadiness` object
   - ❌ **FAIL:** Missing fields or `mode: "SITE_SCOPED"`

**Screenshot:** Capture DevTools Response tab showing `mode: "GLOBAL"`

---

### Test Case 2: Verify Classification Attributes Are Enforced

**Goal:** Confirm that products without classification attributes (`category`, `class`, `department`) are blocked from export.

**Test 2a: Product WITH Classification Attributes**

1. **Select a product with complete classification data:**
   - Navigate to product `211737-90h1-8`
   - Open product editor
   - Verify in **Core Information** tab:
     - `category` field is filled
     - `class` field is filled (if visible)
     - `department` field is filled (if visible)

2. **Check completion panel:**
   - Scroll to bottom of product editor
   - Look for **Completion / Export Gate Panel**
   - Verify status: ✅ **Product is Export-Ready**
   - Verify completion percentage: >= 80%

3. **Pass/Fail Criteria:**
   - ✅ **PASS:** Product shows as export-ready with >= 80% completion
   - ❌ **FAIL:** Product blocked even though all attributes are present

**Test 2b: Product WITHOUT Classification Attributes**

1. **Create or select a test product missing classification:**
   - Go to **Products** page
   - Click **+ Add Product**
   - Fill in:
     - SKU: `test-no-classification-001`
     - MPN: `test-mpn-001`
     - Name: `Test Product No Classification`
     - Brand: `Test Brand`
     - **Leave `category`, `class`, `department` EMPTY**
   - Click **Save**

2. **Check completion panel:**
   - Verify panel shows: 🚫 **Export Blocked**
   - Verify completion percentage: < 80%
   - Check **Completion by Segment** section:
     - Look for "Product Classification" segment
     - Verify it shows missing attributes: `category`, `class`, `department`

3. **Pass/Fail Criteria:**
   - ✅ **PASS:** Product is blocked, completion < 80%, missing classification attributes listed
   - ❌ **FAIL:** Product is marked export-ready despite missing classification

**Screenshot:** Capture completion panel showing blocked status and missing classification attributes

---

### Test Case 3: Verify Product-Level UI (No Per-Site Dropdown)

**Goal:** Confirm that RetailOps tenant sees product-level export UI (no per-site dropdown).

**Steps:**

1. **Navigate to Export Manager:**
   - Login as RetailOps admin user
   - Go to **Export Manager** page (usually in main navigation)

2. **Verify UI elements:**
   - ✅ **Should NOT see:** Per-site dropdown (ropi-web, shiekh, karmaloop, mltd)
   - ✅ **Should see:** Product-level export card:
     ```
     ✅ Export Ready
     Product Completion: 85% (threshold: 80%)
     [Start Export] button
     ```

3. **Pass/Fail Criteria:**
   - ✅ **PASS:** No site dropdown, product-level completion card visible
   - ❌ **FAIL:** Site dropdown present (indicates SITE_SCOPED mode)

**Screenshot:** Capture Export Manager page showing product-level UI

---

### Test Case 4: Verify Per-Site UI for Non-RetailOps Tenant

**Goal:** Confirm that non-RetailOps tenants still see per-site export UI (unchanged behavior).

**Steps:**

1. **Login as non-RetailOps user** (if multi-tenant setup available)
   - Or: Manually set tenant config `exportMode: "SITE_SCOPED"` and repeat test

2. **Navigate to Export Manager:**
   - Go to **Export Manager** page

3. **Verify UI elements:**
   - ✅ **Should see:** Per-site dropdown (ropi-web, shiekh, karmaloop, mltd)
   - ✅ **Should see:** Site-specific export options

4. **Navigate to product editor:**
   - Open any product
   - Scroll to **Completion / Export Gate Panel**
   - ✅ **Should see:** Per-site accordion with site status (✅/❌ per site)

5. **Pass/Fail Criteria:**
   - ✅ **PASS:** Site dropdown and per-site panels visible
   - ❌ **FAIL:** Product-level UI shown (indicates incorrect mode)

**Screenshot:** Capture Export Manager and product panel showing per-site UI

---

### Test Case 5: Execute Global Export

**Goal:** Verify that global export executes without site selection.

**Steps:**

1. **Navigate to Export Manager** (RetailOps tenant)

2. **Click "Start Export" button**

3. **Check DevTools Network tab:**
   - Find POST request to `/api/admin/exports/dry-run`
   - Click on request
   - Go to **Payload** or **Request** tab
   - Verify request body:
     ```json
     {
       "format": "csv",
       "limit": 100,
       "includeMeta": true
       // NOTE: NO 'site' field should be present
     }
     ```

4. **Verify export result:**
   - After export completes, check success message
   - Download CSV (if applicable)
   - Verify CSV contains products from all sites (not filtered by site)

5. **Pass/Fail Criteria:**
   - ✅ **PASS:** Export executes, request body has no `site` field, CSV contains expected products
   - ❌ **FAIL:** Export fails or request includes `site` parameter

**Screenshot:** Capture DevTools Payload tab showing request body without `site` field

---

### Test Case 6: Verify API Response for Blocked Product

**Goal:** Confirm that blocked products return correct blocking reasons.

**Steps:**

1. **Create a product with missing attributes:**
   - Create product `test-blocked-001` with:
     - SKU: `test-blocked-001`
     - MPN: `test-blocked-mpn`
     - Name: `Test Blocked Product`
     - **Missing:** `category`, `class`, `department`, `brand`

2. **Open product editor and capture API response:**
   - Open DevTools Network tab
   - Navigate to product editor for `test-blocked-001`
   - Find `/api/products/:id/completion` request
   - Copy JSON response

3. **Verify response:**
   ```json
   {
     "mode": "GLOBAL",
     "productLevelReadiness": {
       "ready": false,
       "completionPct": 45,  // example value < threshold
       "threshold": 80,
       "blockingReasons": [
         "Missing classification attributes",
         "Completion below threshold"
       ],
       "missingAttributes": ["category", "class", "department", "brand"]
     }
   }
   ```

4. **Pass/Fail Criteria:**
   - ✅ **PASS:** `ready: false`, `blockingReasons` populated, `missingAttributes` lists expected IDs
   - ❌ **FAIL:** `ready: true` or missing blocking details

**Screenshot:** Capture API response showing blocked product details

---

## Summary Checklist

| Test Case | Description | Status |
|-----------|-------------|--------|
| TC1       | Product-level readiness API (GLOBAL mode) | ⬜ |
| TC2a      | Product WITH classification = export-ready | ⬜ |
| TC2b      | Product WITHOUT classification = blocked | ⬜ |
| TC3       | Product-level UI (no site dropdown) | ⬜ |
| TC4       | Per-site UI for non-RetailOps tenant | ⬜ |
| TC5       | Execute global export (no site param) | ⬜ |
| TC6       | Blocked product API response | ⬜ |

---

## Expected Results Summary

**RetailOps Tenant (GLOBAL Mode):**
- ✅ API returns `mode: "GLOBAL"`
- ✅ `productLevelReadiness` field present
- ✅ `siteStatus` is empty or omitted
- ✅ UI shows product-level completion (no site dropdown)
- ✅ Export executes without site parameter
- ✅ Classification attributes enforced (category, class, department)

**Non-RetailOps Tenant (SITE_SCOPED Mode):**
- ✅ API returns `mode: "SITE_SCOPED"`
- ✅ `siteStatus` array populated
- ✅ UI shows per-site dropdown and per-site panels
- ✅ Export requires site selection

---

## Troubleshooting

### Issue: API returns `mode: "SITE_SCOPED"` for RetailOps tenant

**Possible causes:**
1. Tenant config `exportMode` not set to `"GLOBAL"`
2. Backend not deployed with GLOBAL mode logic

**Resolution:**
- Check Firestore `settings/tenantConfig` or `tenants/retailops`
- Verify `exportMode: "GLOBAL"` is set
- If missing, update config manually

---

### Issue: Classification attributes not enforced

**Possible causes:**
1. "Product Classification" segment is disabled in completion rules
2. Segment weight is 0%
3. Segment `categories` does not include `"classification"`

**Resolution:**
- Check Firestore `settings/exportSettings/completionRules`
- Verify "Product Classification" segment is enabled
- Verify `categories: ["classification"]` in segment config

---

### Issue: UI still shows per-site dropdown for RetailOps tenant

**Possible causes:**
1. UI not deployed with conditional rendering logic
2. Browser cache not cleared
3. API returning incorrect `mode`

**Resolution:**
- Hard refresh browser (Ctrl+Shift+R or Cmd+Shift+R)
- Check API response in DevTools (verify `mode: "GLOBAL"`)
- Verify UI deployment (check build hash or version)

---

## Test Data Requirements

**Products needed for testing:**

1. **Complete product** (all attributes including classification):
   - SKU: `211737-90h1-8`
   - Category: `Apparel`
   - Class: `Footwear`
   - Department: `Men's Shoes`

2. **Incomplete product** (missing classification):
   - SKU: `18-test` (or create new)
   - Missing: `category`, `class`, `department`

3. **Test product** (create new for blocking test):
   - SKU: `test-blocked-001`
   - Minimal attributes only (sku, mpn, name)

---

## Sign-Off

**QA Tester Name:** _______________________  
**Date:** _______________________  
**All Tests Passed:** ⬜ Yes ⬜ No (see notes below)

**Notes:**
_________________________________________________________________
_________________________________________________________________
_________________________________________________________________

---

## Appendix: Manual API Testing (Alternative to UI)

If UI is not available, QA can test API endpoints directly using curl:

**A. Get Product Completion (GLOBAL mode)**
```bash
curl -H "Authorization: Bearer $ADMIN_TOKEN" \
  https://staging.example.com/api/products/211737-90h1-8/completion \
  | jq '.mode, .productLevelReadiness'
```

**Expected output:**
```json
"GLOBAL"
{
  "ready": true,
  "completionPct": 85,
  "threshold": 80,
  "blockingReasons": [],
  "missingAttributes": []
}
```

**B. Get Export Readiness (catalog-level)**
```bash
curl -H "Authorization: Bearer $ADMIN_TOKEN" \
  https://staging.example.com/api/admin/exports/readiness \
  | jq '.mode, .ready, .catalogStats'
```

**Expected output:**
```json
"GLOBAL"
true
{
  "totalProducts": 150,
  "blockedByCompletionCount": 12,
  "blockedBySiteCount": 0,
  "readyCount": 138
}
```

**C. Execute Dry-Run Export (GLOBAL mode)**
```bash
curl -X POST \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"format":"csv","limit":10,"includeMeta":true}' \
  https://staging.example.com/api/admin/exports/dry-run \
  | jq '.summary, .exportedProducts'
```

**Expected output:**
```json
{
  "exportedProducts": 10,
  "totalCandidates": 138,
  "blockedByCompletion": 12
}
```

---

## Summary

This VVP provides **non-developer runnable** test cases for verifying RetailOps global export mode. All steps can be performed via browser UI and DevTools, with optional curl commands for API-level testing.

**Next steps:** Run VVP in staging after implementation is complete (post-HES B).
