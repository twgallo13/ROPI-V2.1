# VVP: Export Settings Editor

**LP:** LP-completion-readiness-006  
**Date:** YYYY-MM-DD  
**Verifier:** _____________  
**Environment:** https://staging.yourapp.com  

## Overview

This VVP verifies that the Export Settings page correctly loads, displays, validates, and persists completion rules to Firestore settings/exportSettings.

---

## Before You Start

- [ ] You have access to staging environment
- [ ] You are logged in as an admin user
- [ ] You have access to Firestore console or verification tool to check settings/exportSettings document

---

## Verification Steps

### Step 1: Navigate to Export Settings

1. Navigate to Export Settings page at `/admin/settings/export` or similar path
2. You should see the completion rules configuration interface

**Expected Elements:**
- Schema version display or field
- Rules version display or field
- Export unlock threshold percentage field (0-100)
- Segments list with weights
- Save/Apply button

**Pass Criteria:**
- [ ] Export Settings page loads successfully
- [ ] Completion rules section is visible
- [ ] All expected fields are present

---

### Step 2: View Current Completion Rules

1. Review the currently loaded completion rules
2. Note the current values for:
   - Schema version
   - Rules version
   - Export unlock threshold (percentage)
   - Segment weights

**Expected Display:**
- All required fields are populated
- Segment weights display correctly
- Total weight should be approximately 100

**Pass Criteria:**
- [ ] Schema version is displayed
- [ ] Rules version is displayed
- [ ] Export unlock threshold is displayed (0-100)
- [ ] Segments are listed with weights
- [ ] Enabled segment weights sum to approximately 100

---

### Step 3: Edit Completion Rules (Valid Change)

1. Make a valid change to the completion rules:
   - Change export unlock threshold to a different value (e.g., 75 → 80)
   - OR adjust a segment weight (ensuring total remains ~100)
2. Click Save/Apply button
3. You should see a success message

**Expected Behavior:**
- Form validates the change
- Success toast/message appears
- No error messages

**Pass Criteria:**
- [ ] Valid change is accepted
- [ ] Success feedback is displayed
- [ ] No validation errors

---

### Step 4: Verify Firestore Persistence

1. Check Firestore console or use verification script
2. Navigate to `settings/exportSettings` document
3. Verify the change from Step 3 is persisted

**Expected Firestore State:**
- Document `settings/exportSettings` exists
- Field `completionRules.exportUnlockThresholdPct` (or relevant field) shows the new value
- Document has updated timestamp

**Pass Criteria:**
- [ ] Firestore document reflects the UI change
- [ ] All required fields are present in Firestore
- [ ] Document structure matches expected schema

---

### Step 5: Test Validation (Invalid Change)

1. Attempt to make an invalid change:
   - Set export unlock threshold to > 100 or < 0
   - OR set segment weights that don't sum to approximately 100
2. Attempt to save
3. You should see validation error

**Expected Behavior:**
- Form shows validation error
- Save is prevented
- Error message explains what is invalid

**Pass Criteria:**
- [ ] Invalid threshold (>100 or <0) is rejected
- [ ] Invalid segment weights are rejected
- [ ] Clear error message is displayed
- [ ] No invalid data is persisted to Firestore

---

### Step 6: Reload and Verify Persistence

1. After saving valid change in Step 3, reload the page
2. You should see the saved values

**Expected Behavior:**
- Page loads with previously saved values
- No data loss
- Values match Firestore state

**Pass Criteria:**
- [ ] Saved values are displayed after reload
- [ ] No data loss or reset to defaults
- [ ] UI matches Firestore state

---

## Verification Sign-Off

| Step | Pass/Fail | Notes |
|------|-----------|-------|
| 1: Navigate to Export Settings | ☐ Pass ☐ Fail | |
| 2: View Current Rules | ☐ Pass ☐ Fail | |
| 3: Edit Rules (Valid) | ☐ Pass ☐ Fail | |
| 4: Verify Firestore Persistence | ☐ Pass ☐ Fail | |
| 5: Test Validation (Invalid) | ☐ Pass ☐ Fail | |
| 6: Reload and Verify | ☐ Pass ☐ Fail | |

**Overall Result:** ☐ PASS ☐ FAIL

**Verifier Signature:** _______________  
**Date:** _______________  

---

## Notes

Attach screenshots to this VVP showing:
1. Export Settings page with completion rules displayed
2. Valid change being made
3. Success message after save
4. Firestore console showing updated settings/exportSettings document
5. Validation error for invalid change
6. Page reload showing persisted values

Save screenshots in: `evidence/completion-readiness/LP-006/vvp/screenshots/`
