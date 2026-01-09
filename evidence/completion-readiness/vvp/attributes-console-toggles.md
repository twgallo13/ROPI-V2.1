# VVP: Attributes Console Flag Toggles

**LP:** LP-completion-readiness-006  
**Feature:** Attribute flag toggles persist to Firestore and affect evaluations  
**Verification Date:** YYYY-MM-DD  
**Verifier:** Homer  
**Result:** PENDING

## Objective
Verify that AttributeDetailPanel toggles for `required_for_completion` and `required_for_export` persist to Firestore and change product evaluation outcomes.

## Prerequisites
- Admin access to Attributes Console
- Firestore console access
- Test product with known attribute data
- Staging environment

## Test Scenarios

### Scenario 1: Toggle `required_for_completion` Flag

**Attribute:** Product Description (or similar test attribute)  
**Product:** {product-id}

**Steps:**
1. Navigate to Attributes Console → Product Description
2. Capture current Firestore `settings/attributes/keys/{attributeId}` document
3. Note current product evaluation (GET /api/products/{product-id}/completion)
4. Toggle `required_for_completion` from false to true
5. Verify Firestore document updated
6. Verify audit event created
7. Re-evaluate product
8. Observe evaluation change

**Initial Firestore State:**
```json
{
  "attribute_id": "product_description",
  "required_for_completion": false,
  "required_for_export": false,
  "definition_version": "1.2.3"
}
```

**Initial Product Evaluation:**
```json
{
  "ready": true,
  "completionPct": 100,
  "blockingReasons": []
}
```

**UI Action:**
- Toggle `required_for_completion` to `true`

**Expected Firestore State After Toggle:**
```json
{
  "attribute_id": "product_description",
  "required_for_completion": true,
  "required_for_export": false,
  "definition_version": "1.2.3",
  "updatedAt": "2026-01-08T12:00:00Z",
  "updatedBy": "homer@example.com"
}
```

**Expected Product Evaluation After Toggle:**
(If product is missing product_description)
```json
{
  "ready": false,
  "completionPct": 85,
  "blockingReasons": [
    "Missing required attribute: Product Description"
  ]
}
```

**Actual Results:**
- [ ] Firestore updated: _____
- [ ] updatedAt timestamp: _____
- [ ] updatedBy: _____
- [ ] Audit event created: _____
- [ ] Product evaluation changed: _____
- [ ] New ready status: _____
- [ ] New blocking reasons: _____

**Screenshots:**
- UI before: `artifacts/LP-completion-readiness-006/screenshots/attributes-toggle-before-{attribute-id}.png`
- UI after: `artifacts/LP-completion-readiness-006/screenshots/attributes-toggle-after-{attribute-id}.png`
- Firestore snapshot: `artifacts/LP-completion-readiness-006/screenshots/attributes-firestore-{attribute-id}.png`
- Product eval before: `artifacts/LP-completion-readiness-006/screenshots/product-eval-before-{product-id}.png`
- Product eval after: `artifacts/LP-completion-readiness-006/screenshots/product-eval-after-{product-id}.png`

---

### Scenario 2: Toggle `required_for_export` Flag

**Attribute:** Brand (or similar test attribute)  
**Product:** {product-id}

**Steps:**
1. Navigate to Attributes Console → Brand
2. Capture current Firestore state
3. Note current catalog export readiness
4. Toggle `required_for_export` from false to true
5. Verify Firestore updated
6. Verify audit event
7. Re-evaluate catalog export readiness
8. Observe change

**Expected Results:**
- ✅ Firestore `settings/attributes/keys/{attributeId}` updated
- ✅ Audit event created with user and timestamp
- ✅ Export readiness evaluation reflects new requirement
- ✅ If attribute missing, export blocked

**Actual Results:**
- [ ] Firestore updated: _____
- [ ] Audit event: _____
- [ ] Export readiness changed: _____

**Screenshot:**
`artifacts/LP-completion-readiness-006/screenshots/attributes-export-flag-toggle.png`

---

### Scenario 3: Audit Event Verification

**Steps:**
1. Perform attribute toggle
2. Query audit log or Firestore audit collection
3. Verify event contains:
   - Event type (e.g., "attribute_requirement_changed")
   - User (e.g., "homer@example.com")
   - Timestamp
   - Attribute ID
   - Old value
   - New value

**Expected Audit Event:**
```json
{
  "event_id": "...",
  "event_type": "attribute_requirement_changed",
  "user": "homer@example.com",
  "timestamp": "2026-01-08T12:00:00Z",
  "attribute_id": "product_description",
  "field": "required_for_completion",
  "old_value": false,
  "new_value": true
}
```

**Actual Results:**
- [ ] Audit event found: _____
- [ ] Event contains all fields: _____

**Screenshot:**
`artifacts/LP-completion-readiness-006/screenshots/attributes-audit-event.png`

---

## Verification Checklist

- [ ] Toggle `required_for_completion` persists to Firestore
- [ ] Toggle `required_for_export` persists to Firestore
- [ ] Toggles create audit events with user/timestamp
- [ ] Product evaluation changes when `required_for_completion` toggled
- [ ] Export evaluation changes when `required_for_export` toggled
- [ ] Firestore writes include updatedAt/updatedBy
- [ ] UI reflects current Firestore state

---

## Sign-Off

**Result:** PENDING / PASS / FAIL  
**Notes:**

**Approved By:** Homer  
**Date:** YYYY-MM-DD
