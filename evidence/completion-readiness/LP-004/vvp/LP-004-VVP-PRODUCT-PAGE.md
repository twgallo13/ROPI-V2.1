# VVP: Product Page Completion Display

**LP:** LP-completion-readiness-004  
**Date:** YYYY-MM-DD  
**Verifier:** _____________  
**Environment:** https://staging.yourapp.com  

## Overview

This VVP verifies that the Product page correctly displays product completion information including ready status, completion percentage, operator explanation, and gates publish/export actions based on completion readiness.

---

## Before You Start

- [ ] You have access to staging environment
- [ ] You are logged in as an admin user
- [ ] You have at least one test product with incomplete attributes
- [ ] You have at least one test product with complete attributes

---

## Verification Steps

### Step 1: View Incomplete Product

1. Navigate to Products page at `/products`
2. Select a product that has incomplete attributes (less than 100% complete)
3. You should see a **Completion Status** section on the product page

**Expected Elements:**
- Completion percentage display (e.g., "75% Complete")
- Ready status indicator (should show "Not Ready" or similar)
- Operator explanation text describing what is missing
- Publish button should be disabled or show warning
- Export button should be disabled or show warning

**Pass Criteria:**
- [ ] Completion percentage is displayed and matches expected value
- [ ] Ready status shows "Not Ready" or equivalent
- [ ] Operator explanation lists specific missing attributes or requirements
- [ ] Publish/export actions are gated (disabled or with warning)

---

### Step 2: View Operator Explanation Details

1. In the same incomplete product view
2. Read the operator explanation text
3. You should see specific, actionable information

**Expected Content:**
- List of missing required attributes
- Which segments are blocking (e.g., "Description & SEO")
- Which sites are affected (for multi-site products)
- Clear indication of what to fix

**Pass Criteria:**
- [ ] Operator explanation is present and readable
- [ ] Explanation lists specific missing items
- [ ] Explanation indicates which segments are blocking
- [ ] For multi-site products, explanation shows which sites are blocking

---

### Step 3: View Complete Product

1. Navigate to a product that has all required attributes filled
2. You should see completion status showing ready

**Expected Elements:**
- Completion percentage display showing "100% Complete" or similar
- Ready status indicator (should show "Ready" or similar)
- Operator explanation may show "All requirements met" or be hidden
- Publish button should be enabled
- Export button should be enabled

**Pass Criteria:**
- [ ] Completion percentage shows 100%
- [ ] Ready status shows "Ready" or equivalent
- [ ] Publish/export actions are enabled
- [ ] No blocking warnings are displayed

---

### Step 4: Test Publish/Export Gating

1. Attempt to publish/export the incomplete product from Step 1
2. You should be blocked or warned

**Expected Behavior:**
- Dialog, toast, or inline message explaining product is not ready
- Action is prevented or requires confirmation override

**Pass Criteria:**
- [ ] Publish action is gated for incomplete product
- [ ] Export action is gated for incomplete product
- [ ] User receives clear feedback about why action is blocked

---

### Step 5: Test Publish/Export Allow

1. Attempt to publish/export the complete product from Step 3
2. You should be allowed to proceed

**Expected Behavior:**
- Publish/export action proceeds normally
- No blocking messages

**Pass Criteria:**
- [ ] Publish action is allowed for complete product
- [ ] Export action is allowed for complete product
- [ ] No unexpected warnings or blocks

---

## Verification Sign-Off

| Step | Pass/Fail | Notes |
|------|-----------|-------|
| 1: View Incomplete Product | ☐ Pass ☐ Fail | |
| 2: View Operator Explanation | ☐ Pass ☐ Fail | |
| 3: View Complete Product | ☐ Pass ☐ Fail | |
| 4: Test Publish/Export Gating | ☐ Pass ☐ Fail | |
| 5: Test Publish/Export Allow | ☐ Pass ☐ Fail | |

**Overall Result:** ☐ PASS ☐ FAIL

**Verifier Signature:** _______________  
**Date:** _______________  

---

## Notes

Attach screenshots to this VVP showing:
1. Incomplete product with completion display
2. Operator explanation detail
3. Complete product with ready status
4. Blocked publish/export attempt
5. Successful publish/export attempt

Save screenshots in: `evidence/completion-readiness/LP-004/vvp/screenshots/`
