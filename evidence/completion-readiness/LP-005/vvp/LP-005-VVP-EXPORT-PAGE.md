# VVP: Export Page Readiness Display

**LP:** LP-completion-readiness-005  
**Date:** YYYY-MM-DD  
**Verifier:** _____________  
**Environment:** https://staging.yourapp.com  

## Overview

This VVP verifies that the Export page correctly displays catalog-level export readiness, shows operator explanation when blocked, and enforces conservative blocking policy (ANY blocked product → export blocked).

---

## Before You Start

- [ ] You have access to staging environment
- [ ] You are logged in as an admin user
- [ ] You have a test catalog with at least one incomplete product
- [ ] You have a test catalog with all products complete

---

## Verification Steps

### Step 1: View Blocked Export (Incomplete Products)

1. Navigate to Export page at `/admin/exports` or similar
2. Ensure your catalog has at least one incomplete product
3. You should see export readiness status showing "Blocked" or "Not Ready"

**Expected Elements:**
- Export readiness status indicator (red/warning state)
- Operator explanation describing why export is blocked
- Export button should be disabled or show clear warning
- Indication of conservative policy: "1 or more products not ready"

**Pass Criteria:**
- [ ] Export readiness shows blocked/not ready status
- [ ] Operator explanation is displayed
- [ ] Explanation indicates how many products are blocking
- [ ] Export action is disabled or clearly gated

---

### Step 2: View Operator Explanation Detail (Blocked State)

1. In the blocked export view, read the operator explanation
2. You should see specific, actionable information

**Expected Content:**
- Count of blocked products (e.g., "3 of 50 products are not ready")
- Summary of blocking reasons
- Link or button to view list of blocked products
- Clear indication that export is blocked due to completion policy

**Pass Criteria:**
- [ ] Operator explanation shows count of blocked products
- [ ] Explanation describes blocking reasons
- [ ] Explanation provides actionable next steps
- [ ] User can navigate to see which products are blocking

---

### Step 3: Test Export Action (Blocked State)

1. Attempt to start an export while catalog is blocked
2. You should be prevented or warned

**Expected Behavior:**
- Export button is disabled, OR
- Clicking export shows modal/dialog explaining why export is blocked
- HTTP 423 (Locked) status if checking via API

**Pass Criteria:**
- [ ] Export action is prevented when catalog is blocked
- [ ] User receives clear feedback about blocking
- [ ] No export job is created

---

### Step 4: View Ready Export (All Products Complete)

1. Ensure all products in catalog are complete (100% ready)
2. Navigate to Export page
3. You should see export readiness status showing "Ready"

**Expected Elements:**
- Export readiness status indicator (green/success state)
- Operator explanation may show "All products ready" or be minimal
- Export button should be enabled
- No blocking warnings

**Pass Criteria:**
- [ ] Export readiness shows ready status
- [ ] No blocking warnings are displayed
- [ ] Export button is enabled
- [ ] Positive confirmation that export can proceed

---

### Step 5: Test Export Action (Ready State)

1. Attempt to start an export while catalog is ready
2. You should be allowed to proceed

**Expected Behavior:**
- Export button is enabled and clickable
- Clicking export starts export process normally
- HTTP 200 (OK) status if checking via API

**Pass Criteria:**
- [ ] Export action is allowed when catalog is ready
- [ ] Export job is created successfully
- [ ] No unexpected warnings or blocks

---

### Step 6: API Verification (Optional Technical Check)

If you have API access (via Postman, curl, or browser DevTools):

1. Call `GET /api/admin/exports/readiness` when catalog is blocked
2. Verify response status is 423 and includes readiness payload
3. Call `GET /api/admin/exports/readiness` when catalog is ready
4. Verify response status is 200

**Pass Criteria:**
- [ ] Blocked state returns HTTP 423 with readiness payload
- [ ] Ready state returns HTTP 200
- [ ] Readiness payload conforms to CompletionDrivenExportReadiness interface

---

## Verification Sign-Off

| Step | Pass/Fail | Notes |
|------|-----------|-------|
| 1: View Blocked Export | ☐ Pass ☐ Fail | |
| 2: View Operator Explanation | ☐ Pass ☐ Fail | |
| 3: Test Export Action (Blocked) | ☐ Pass ☐ Fail | |
| 4: View Ready Export | ☐ Pass ☐ Fail | |
| 5: Test Export Action (Ready) | ☐ Pass ☐ Fail | |
| 6: API Verification (Optional) | ☐ Pass ☐ Fail ☐ Skip | |

**Overall Result:** ☐ PASS ☐ FAIL

**Verifier Signature:** _______________  
**Date:** _______________  

---

## Notes

Attach screenshots to this VVP showing:
1. Blocked export page with readiness status
2. Operator explanation in blocked state
3. Blocked export attempt (button disabled or warning modal)
4. Ready export page with green status
5. Successful export initiation
6. (Optional) API response screenshots showing 423 and 200 responses

Save screenshots in: `evidence/completion-readiness/LP-005/vvp/screenshots/`
