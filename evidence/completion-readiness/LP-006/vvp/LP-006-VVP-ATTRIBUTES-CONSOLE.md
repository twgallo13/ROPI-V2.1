# VVP: Attributes Console Flag Toggle

**LP:** LP-completion-readiness-006  
**Date:** YYYY-MM-DD  
**Verifier:** _____________  
**Environment:** https://staging.yourapp.com  

## Overview

This VVP verifies that the Attributes Console (Attribute Detail Panel) correctly toggles `required_for_completion` and `required_for_export` flags, writes changes to Firestore settings/attributes/keys/{attributeId}, generates audit events, and changes affect product completion evaluations.

---

## Before You Start

- [ ] You have access to staging environment
- [ ] You are logged in as an admin user
- [ ] You have access to Firestore console or verification tool
- [ ] You have a test product using attributes you will modify
- [ ] Note the test product's current completion percentage

---

## Verification Steps

### Step 1: Navigate to Attributes Console

1. Navigate to Attributes page at `/admin/attributes` or similar
2. Select an attribute to view its detail panel
3. You should see attribute details including requirement flags

**Expected Elements:**
- Attribute detail panel or modal
- `required_for_completion` toggle/checkbox
- `required_for_export` toggle/checkbox
- Save button

**Pass Criteria:**
- [ ] Attributes console loads successfully
- [ ] Attribute detail panel displays
- [ ] Requirement flag toggles are visible

---

### Step 2: View Current Flag State

1. Review the current state of requirement flags for selected attribute:
   - `required_for_completion` (checked or unchecked)
   - `required_for_export` (checked or unchecked)
2. Note current state

**Pass Criteria:**
- [ ] Current flag state is clearly displayed
- [ ] Flags reflect Firestore state

---

### Step 3: Toggle required_for_completion Flag

1. Toggle the `required_for_completion` flag (if checked, uncheck it; if unchecked, check it)
2. Click Save or Apply
3. You should see success confirmation

**Expected Behavior:**
- Toggle changes state visually
- Save button is enabled
- Success toast/message appears after save

**Pass Criteria:**
- [ ] Flag toggle changes state
- [ ] Save action succeeds
- [ ] Success feedback is displayed

---

### Step 4: Verify Firestore Write (required_for_completion)

1. Check Firestore console or use verification script
2. Navigate to `settings/attributes/keys/{attributeId}` document
3. Verify `required_for_completion` field matches the toggled state

**Expected Firestore State:**
- Document `settings/attributes/keys/{attributeId}` exists
- Field `required_for_completion` reflects the new state (true or false)
- Document has updated timestamp

**Pass Criteria:**
- [ ] Firestore document reflects the UI change
- [ ] `required_for_completion` field matches toggled state
- [ ] Document has updated timestamp

---

### Step 5: Verify Audit Event

1. Check audit log/events (if available in UI or Firestore)
2. You should see an audit event for the flag change

**Expected Audit Event:**
- Event type: attribute flag change
- Attribute ID
- Field changed: required_for_completion
- Old value → New value
- User who made change
- Timestamp

**Pass Criteria:**
- [ ] Audit event is logged
- [ ] Audit event contains attribute ID and field changed
- [ ] Audit event shows old and new values

---

### Step 6: Toggle required_for_export Flag

1. Toggle the `required_for_export` flag
2. Click Save or Apply
3. Verify Firestore write and audit event (repeat Steps 4-5 for this flag)

**Pass Criteria:**
- [ ] `required_for_export` flag toggle works
- [ ] Firestore document reflects the change
- [ ] Audit event is logged

---

### Step 7: Verify Evaluation Outcome Change

1. Navigate to a test product that uses the attribute you modified
2. Check the product's completion percentage and status
3. You should see a change in completion evaluation

**Expected Behavior:**
- If you marked attribute as `required_for_completion=true` and product lacks it:
  - Completion percentage should decrease
  - Product may show "Not Ready" or blocking reason
- If you marked attribute as `required_for_completion=false`:
  - Completion percentage may increase
  - Product may become ready if this was the only blocker

**Pass Criteria:**
- [ ] Product completion reflects attribute flag change
- [ ] Completion percentage changes appropriately
- [ ] Operator explanation reflects new requirements

---

### Step 8: Reload and Verify Persistence

1. Reload the Attributes console page
2. View the attribute detail again
3. You should see the saved flag states

**Pass Criteria:**
- [ ] Saved flag states are displayed after reload
- [ ] No data loss or reset
- [ ] UI matches Firestore state

---

## Verification Sign-Off

| Step | Pass/Fail | Notes |
|------|-----------|-------|
| 1: Navigate to Attributes Console | ☐ Pass ☐ Fail | |
| 2: View Current Flag State | ☐ Pass ☐ Fail | |
| 3: Toggle required_for_completion | ☐ Pass ☐ Fail | |
| 4: Verify Firestore Write | ☐ Pass ☐ Fail | |
| 5: Verify Audit Event | ☐ Pass ☐ Fail | |
| 6: Toggle required_for_export | ☐ Pass ☐ Fail | |
| 7: Verify Evaluation Outcome | ☐ Pass ☐ Fail | |
| 8: Reload and Verify | ☐ Pass ☐ Fail | |

**Overall Result:** ☐ PASS ☐ FAIL

**Verifier Signature:** _______________  
**Date:** _______________  

---

## Notes

Attach screenshots to this VVP showing:
1. Attributes console with attribute detail panel
2. Flag toggle before and after change
3. Success message after save
4. Firestore console showing updated attribute document
5. Audit event log entry
6. Product page showing changed completion percentage/status
7. Page reload showing persisted flag states

Save screenshots in: `evidence/completion-readiness/LP-006/vvp/screenshots/`
