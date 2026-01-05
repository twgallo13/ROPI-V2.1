# VVP: Export Unlock & Routing

**LP:** LP-export-unlock-1.0.0
**Date:** 2026-01-05
**Verifier:** _______________ (Non-developer)
**Environment:** https://ropi-aoss-staging.web.app

---

## Purpose

This Visual Verification Protocol verifies that the `/export` page correctly gates export functionality based on `completion.ready` status. There are three distinct states to verify:

1. **Loading State** — Export controls disabled with loading indicator
2. **Ready State** — Export enabled and UI fully interactive (`completion.ready === true`)
3. **Blocked State** — Modal shows blocking reasons (`completion.ready === false`)

---

## Before You Start

- [ ] You have access to the staging environment (https://ropi-aoss-staging.web.app)
- [ ] You are logged in as an admin user
- [ ] You have cleared browser cache or are using an incognito window
- [ ] You have the ability to take screenshots

---

## Verification Steps

### Step 1: Navigate to Export Page

1. Open your browser
2. Go to https://ropi-aoss-staging.web.app/export
3. You should see the Export Manager page loading

**Expected Result:**
- Page title shows "Export Manager"
- While loading, you should briefly see a loading indicator (⏳ "Checking export readiness...")

**Pass Criteria:** Export Manager page loads without errors

**Screenshot Slot:**
![Step 1 - Export Page Loads](./screenshots/step1-export-page.png)

| Pass | Fail |
|------|------|
| ☐    | ☐    |

**Notes:** _______________________________________________

---

### Step 2: Verify Loading State (if observable)

1. Refresh the page (F5 or Ctrl+R)
2. Observe the brief loading state before content appears

**Expected Result:**
- Loading indicator (⏳) appears briefly
- Text shows "Checking export readiness..."
- No export button or options visible during loading

**Pass Criteria:** Loading state shows disabled controls

**Screenshot Slot:**
![Step 2 - Loading State](./screenshots/step2-loading-state.png)

| Pass | Fail | N/A (too fast to capture) |
|------|------|---------------------------|
| ☐    | ☐    | ☐                         |

**Notes:** _______________________________________________

---

### Step 3: Verify Export Ready State (completion.ready === true)

**Prerequisites:** The catalog must meet completion requirements for this state.

1. After loading completes, observe the page content
2. Look for the green "✅ Export Ready" indicator
3. Verify export controls are visible and enabled

**Expected Result:**
- Green checkmark (✅) with "Export Ready" heading
- Completion percentage shown (e.g., "Completion: 95% / 80% threshold")
- Site dropdown selector is visible and interactive
- Format dropdown selector is visible and interactive
- "Start Export" button is visible and NOT grayed out
- Clicking "Start Export" initiates export (or shows success message)

**Pass Criteria:** 
- Export Ready state displays with green indicator
- Export button is enabled (not grayed/disabled)
- Dropdowns are selectable

**Screenshot Slot:**
![Step 3 - Export Ready](./screenshots/step3-export-ready.png)

| Pass | Fail |
|------|------|
| ☐    | ☐    |

**Notes:** _______________________________________________

---

### Step 4: Verify Export Blocked State (completion.ready === false)

**Prerequisites:** The catalog must NOT meet completion requirements for this state. This may require temporarily modifying completion rules or using a test environment with incomplete products.

1. Navigate to https://ropi-aoss-staging.web.app/export
2. If completion requirements are not met, observe the blocked state

**Expected Result:**
- Red/orange warning indicator (🚫) with "Export Blocked" heading
- A modal overlay appears automatically showing:
  - "Export Blocked" title
  - Summary of why export is blocked
  - List of blocking reasons
  - Catalog statistics (total products, blocked count, ready count)
  - Action items to resolve
- Current completion percentage shown (below threshold)
- "Refresh Status" button is visible
- No export button or "Export Blocked" button (disabled)

**Pass Criteria:**
- Blocked state shows warning indicator
- Modal displays blocking reasons from completion data
- No way to start export when blocked

**Screenshot Slot:**
![Step 4 - Export Blocked Modal](./screenshots/step4-export-blocked.png)

| Pass | Fail |
|------|------|
| ☐    | ☐    |

**Notes:** _______________________________________________

---

### Step 5: Verify Modal Can Be Closed and Refreshed

1. If the blocked modal is open, click the "✕" close button
2. Modal should close, showing the blocked summary card
3. Click "Refresh Status" button
4. Completion status should be re-fetched

**Expected Result:**
- Modal closes when X is clicked
- Blocked summary card remains visible
- Refresh button triggers re-fetch (may show brief loading)

**Pass Criteria:** Modal interaction works correctly

**Screenshot Slot:**
![Step 5 - Modal Closed](./screenshots/step5-modal-closed.png)

| Pass | Fail |
|------|------|
| ☐    | ☐    |

**Notes:** _______________________________________________

---

### Step 6: Verify No Legacy Gating References

1. Open browser Developer Tools (F12)
2. Go to Network tab
3. Refresh the page
4. Look for API calls

**Expected Result:**
- API call to `/api/admin/exports/readiness` or similar completion endpoint
- No client-side references to `exportReadiness.overall` threshold (this is internal)

**Pass Criteria:** Page uses completion API for gating

| Pass | Fail |
|------|------|
| ☐    | ☐    |

**Notes:** _______________________________________________

---

### Step 7: Verify Product Editor Publish Button (Optional)

1. Navigate to a product: https://ropi-aoss-staging.web.app/products/{product-id}
2. Observe the "Publish" button in the header

**Expected Result:**
- If product completion is ready: Publish button is enabled
- If product completion is not ready: Publish button is disabled with tooltip "Publish blocked - completion requirements not met"
- Button shows "Checking..." briefly while loading

**Pass Criteria:** Publish button gating matches completion.ready

**Screenshot Slot:**
![Step 7 - Publish Button](./screenshots/step7-publish-button.png)

| Pass | Fail | N/A |
|------|------|-----|
| ☐    | ☐    | ☐   |

**Notes:** _______________________________________________

---

## Verification Sign-Off

| Step | Description | Pass/Fail | Notes |
|------|-------------|-----------|-------|
| 1 | Export page loads | ☐ Pass ☐ Fail | |
| 2 | Loading state (controls disabled) | ☐ Pass ☐ Fail ☐ N/A | |
| 3 | Ready state (export enabled) | ☐ Pass ☐ Fail | |
| 4 | Blocked state (modal with reasons) | ☐ Pass ☐ Fail | |
| 5 | Modal close and refresh | ☐ Pass ☐ Fail | |
| 6 | Completion API usage | ☐ Pass ☐ Fail | |
| 7 | Product publish button | ☐ Pass ☐ Fail ☐ N/A | |

---

## Overall Result

**☐ PASS** — All critical steps (1, 3, 4, 5) passed
**☐ FAIL** — One or more critical steps failed

---

## Verifier Information

**Verifier Name:** _______________________________________________

**Verifier Role:** _______________________________________________

**Verification Date:** _______________________________________________

**Verifier Signature:** _______________________________________________

---

## Additional Notes / Issues Found

_Use this space to document any issues, observations, or suggestions:_

_______________________________________________
_______________________________________________
_______________________________________________
