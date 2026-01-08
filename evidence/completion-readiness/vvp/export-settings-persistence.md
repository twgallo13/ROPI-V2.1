# VVP: Export Settings Persistence

**LP:** LP-completion-readiness-002, LP-completion-readiness-006  
**Feature:** Export Settings editor persists to Firestore  
**Verification Date:** YYYY-MM-DD  
**Verifier:** Homer  
**Result:** PENDING

## Objective
Verify that the Export Settings editor validates and persists completion rules to Firestore `settings/exportSettings`, and that changes are reflected in runtime evaluations.

## Prerequisites
- Admin access to Export Settings page
- Firestore console access for verification
- Staging environment

## Test Scenarios

### Scenario 1: Edit and Persist Completion Rules

**Steps:**
1. Navigate to Export Settings page
2. Capture current Firestore `settings/exportSettings` document
3. Edit completion rules in UI (e.g., change `exportUnlockThresholdPct`)
4. Save changes
5. Verify Firestore document updated
6. Capture screenshot

**Initial Firestore State:**
```json
{
  "completionRules": {
    "schemaVersion": "1.0.0",
    "rulesVersion": "2026-01-08",
    "exportUnlockThresholdPct": 95,
    "segments": [...]
  }
}
```

**UI Changes:**
- Change `exportUnlockThresholdPct` from 95 to 90

**Expected Firestore State After Save:**
```json
{
  "completionRules": {
    "schemaVersion": "1.0.0",
    "rulesVersion": "2026-01-08",
    "exportUnlockThresholdPct": 90,
    "segments": [...]
  }
}
```

**Actual Results:**
- [ ] UI edit successful: _____
- [ ] Firestore updated: _____
- [ ] Update timestamp: _____

**Screenshots:**
- UI before: `artifacts/LP-completion-readiness-002/screenshots/export-settings-before.png`
- UI after: `artifacts/LP-completion-readiness-002/screenshots/export-settings-after.png`
- Firestore snapshot: `artifacts/LP-completion-readiness-002/screenshots/export-settings-firestore.png`

---

### Scenario 2: Validation Prevents Invalid Rules

**Steps:**
1. Navigate to Export Settings page
2. Attempt to set `exportUnlockThresholdPct` to invalid value (e.g., 150)
3. Attempt to save
4. Observe validation error
5. Capture screenshot

**Expected Results:**
- ✅ UI shows validation error
- ✅ Save button disabled or error prevents save
- ✅ Firestore document unchanged

**Actual Results:**
- [ ] Validation error shown: _____
- [ ] Error message: _____
- [ ] Firestore unchanged: _____

**Screenshot:**
`artifacts/LP-completion-readiness-002/screenshots/export-settings-validation-error.png`

---

### Scenario 3: Segment Weight Validation

**Steps:**
1. Edit segment weights so they don't sum to ~100
2. Attempt to save
3. Observe validation error
4. Correct weights to sum to ~100
5. Save successfully

**Expected Results:**
- ✅ Invalid weight sum shows error
- ✅ Valid weight sum allows save
- ✅ Firestore updated with valid weights

**Actual Results:**
- [ ] Weight sum validation working: _____
- [ ] Error message clear: _____
- [ ] Firestore updated correctly: _____

**Screenshot:**
`artifacts/LP-completion-readiness-002/screenshots/export-settings-segment-validation.png`

---

## Runtime Impact Verification

### Verify Changes Affect Evaluations

**Steps:**
1. Note current catalog readiness with threshold at 95%
2. Change threshold to 90%
3. Re-evaluate catalog readiness
4. Observe readiness change (if applicable)

**Expected:**
- ✅ Lower threshold may make catalog ready if completion % is between 90-95%

**Actual:**
- [ ] Before change: catalog ready = _____
- [ ] After change: catalog ready = _____
- [ ] Threshold change affected evaluation: _____

---

## Verification Checklist

- [ ] Export Settings UI loads completion rules
- [ ] UI validates rules before save
- [ ] Invalid rules prevented from saving
- [ ] Valid rules persist to Firestore `settings/exportSettings`
- [ ] Firestore write includes correct schema fields
- [ ] Changes reflected in loadCompletionRules()
- [ ] Changes affect runtime evaluations

---

## Sign-Off

**Result:** PENDING / PASS / FAIL  
**Notes:**

**Approved By:** Homer  
**Date:** YYYY-MM-DD
