# VVP: Live Update - Attribute Change

**LP:** LP-completion-readiness-007  
**Feature:** Live updates when attribute changes  
**Verification Date:** YYYY-MM-DD  
**Verifier:** Homer  
**Result:** PENDING

## Objective
Verify that when an attribute requirement changes (e.g., `required_for_completion` toggled), products reflect the change promptly and operator explanations update accordingly.

## Prerequisites
- Admin access to Attributes Console and Product page
- Test product with known attribute data
- Staging environment
- Ability to capture timestamped screenshots

## Test Scenario: Attribute Requirement Change

### Timeline

#### T0: Initial State (Baseline)

**Timestamp:** _____

**Attribute:** Product Description  
**Current State:**
```json
{
  "attribute_id": "product_description",
  "required_for_completion": false
}
```

**Product:** {product-id}  
**Product Has Description:** No  
**Product Evaluation:**
```json
{
  "ready": true,
  "completionPct": 100,
  "blockingReasons": []
}
```

**Screenshot:**
- Attributes Console: `artifacts/LP-completion-readiness-007/screenshots/live-update-attr-t0-console.png`
- Product Page: `artifacts/LP-completion-readiness-007/screenshots/live-update-attr-t0-product.png`

---

#### T1: Attribute Requirement Changed

**Timestamp:** _____

**Action:** Toggle `required_for_completion` to `true` for Product Description

**Expected Firestore Update:**
```json
{
  "attribute_id": "product_description",
  "required_for_completion": true,
  "updatedAt": "2026-01-08T12:00:00Z"
}
```

**Screenshot:**
- Attributes Console after toggle: `artifacts/LP-completion-readiness-007/screenshots/live-update-attr-t1-toggle.png`

---

#### T2: Refresh/Live Update Trigger

**Timestamp:** _____

**Refresh Method:** (manual refresh / live update / polling)

**Action:**
- [ ] Manual page refresh
- [ ] Automatic live update
- [ ] API re-fetch triggered by event

**Screenshot:**
`artifacts/LP-completion-readiness-007/screenshots/live-update-attr-t2-refresh.png`

---

#### T3: Product Reflects Change

**Timestamp:** _____

**Expected Product Evaluation:**
```json
{
  "ready": false,
  "completionPct": 85,
  "blockingReasons": [
    "Missing required attribute: Product Description"
  ],
  "operatorExplanation": "Product cannot be published or exported. Missing: Product Description."
}
```

**Actual Product Evaluation:**
- ready: _____
- completionPct: _____
- blockingReasons: _____
- operatorExplanation: _____

**UI Changes Observed:**
- [ ] Ready status changed to blocked
- [ ] Completion % decreased
- [ ] Operator explanation appeared
- [ ] Publish button disabled

**Screenshot:**
`artifacts/LP-completion-readiness-007/screenshots/live-update-attr-t3-product-updated.png`

---

### Timing Analysis

**Total Elapsed Time:** T3 - T0 = _____ seconds

**Breakdown:**
- T0 → T1 (toggle action): _____ seconds
- T1 → T2 (refresh trigger): _____ seconds
- T2 → T3 (UI reflects change): _____ seconds

**Target:** Changes reflected within 5 seconds of refresh/live update

---

## Operator Explanation Actionability

**Operator Explanation Text:**
_____

**Actionable Items:**
1. _____
2. _____
3. _____

**Is Actionable?** Yes / No

**Assessment:**
- [ ] Clear what's wrong
- [ ] Clear how to fix
- [ ] Links to relevant pages/attributes
- [ ] Explains impact (publish/export blocked)

---

## Verification Checklist

- [ ] Attribute requirement change persists to Firestore
- [ ] Product page updates after refresh/live update
- [ ] Product evaluation reflects new requirement
- [ ] Operator explanation updates appropriately
- [ ] Publish/export controls update accordingly
- [ ] Update occurs within acceptable time window
- [ ] Operator explanation is actionable

---

## Sign-Off

**Result:** PENDING / PASS / FAIL  
**Notes:**

**Approved By:** Homer  
**Date:** YYYY-MM-DD
