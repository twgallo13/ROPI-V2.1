# VVP: Product Page Completion Display

**LP:** LP-completion-readiness-004  
**Feature:** Product completion API & product page UX  
**Verification Date:** YYYY-MM-DD  
**Verifier:** Homer  
**Result:** PENDING

## Objective
Verify that the Product page correctly displays completion status (`ready`, `completionPct`, `operatorExplanation`) and gates publish/export controls based on the `completion.ready` flag.

## Prerequisites
- Product with incomplete data (blocked state)
- Product with complete data (ready state)
- Staging environment accessible
- Browser DevTools for API inspection

## Test Scenarios

### Scenario 1: Blocked Product Display

**Steps:**
1. Navigate to Product page for a product known to be blocked
2. Observe completion status display
3. Observe operator explanation
4. Check publish/export button states
5. Capture screenshot

**Expected Results:**
- ✅ Completion status shows `Not Ready` or equivalent
- ✅ Completion percentage displayed (e.g., "75% complete")
- ✅ Operator explanation visible and actionable (e.g., "Missing required attribute: Product Description")
- ✅ Publish button disabled or shows blocked state
- ✅ Export button disabled or shows blocked state

**Actual Results:**
- [ ] Status display: _____
- [ ] Completion %: _____
- [ ] Operator explanation: _____
- [ ] Publish control state: _____
- [ ] Export control state: _____

**Screenshot:**
`artifacts/LP-completion-readiness-004/screenshots/product-page-blocked-{product-id}.png`

---

### Scenario 2: Ready Product Display

**Steps:**
1. Navigate to Product page for a product known to be ready
2. Observe completion status display
3. Observe operator explanation (or absence of blocking reasons)
4. Check publish/export button states
5. Capture screenshot

**Expected Results:**
- ✅ Completion status shows `Ready` or equivalent
- ✅ Completion percentage displayed as 100%
- ✅ No blocking operator explanation (or shows "Product is ready")
- ✅ Publish button enabled
- ✅ Export button enabled (or contextually appropriate state)

**Actual Results:**
- [ ] Status display: _____
- [ ] Completion %: _____
- [ ] Operator explanation: _____
- [ ] Publish control state: _____
- [ ] Export control state: _____

**Screenshot:**
`artifacts/LP-completion-readiness-004/screenshots/product-page-ready-{product-id}.png`

---

### Scenario 3: State Change After Data Update

**Steps:**
1. Start with blocked product
2. Add missing required data
3. Refresh or wait for live update
4. Observe state change
5. Capture before/after screenshots

**Expected Results:**
- ✅ Product status transitions from blocked to ready
- ✅ Completion percentage increases
- ✅ Operator explanation updates or disappears
- ✅ Publish/export controls become enabled

**Actual Results:**
- [ ] Before state: _____
- [ ] After state: _____
- [ ] Transition time: _____ seconds
- [ ] Controls updated correctly: _____

**Screenshots:**
- Before: `artifacts/LP-completion-readiness-004/screenshots/product-page-state-change-before-{product-id}.png`
- After: `artifacts/LP-completion-readiness-004/screenshots/product-page-state-change-after-{product-id}.png`

---

## API Contract Verification

### GET /api/products/{id}/completion

**Request:**
```
GET /api/products/{product-id}/completion
Authorization: Bearer {token}
```

**Response (Blocked Product):**
```json
{
  "ready": false,
  "completionPct": 75,
  "blockingReasons": [
    "Missing required attribute: Product Description"
  ],
  "operatorExplanation": "Product cannot be published or exported. Missing: Product Description.",
  "segmentResults": [...],
  "evaluatedAt": "2026-01-08T12:00:00Z"
}
```

**Response (Ready Product):**
```json
{
  "ready": true,
  "completionPct": 100,
  "blockingReasons": [],
  "operatorExplanation": "Product is ready for publish and export.",
  "segmentResults": [...],
  "evaluatedAt": "2026-01-08T12:05:00Z"
}
```

---

## Verification Checklist

- [ ] Product page displays `ready` status correctly
- [ ] Product page displays `completionPct` correctly
- [ ] Product page displays `operatorExplanation` correctly
- [ ] Publish button gated on `completion.ready`
- [ ] Export button gated on `completion.ready`
- [ ] UI updates when product completion changes
- [ ] API contract matches expected schema
- [ ] useProductCompletion hook correctly consumes API

---

## Sign-Off

**Result:** PENDING / PASS / FAIL  
**Notes:**

**Approved By:** Homer  
**Date:** YYYY-MM-DD
