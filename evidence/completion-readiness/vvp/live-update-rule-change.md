# VVP: Live Update - Rule Change

**LP:** LP-completion-readiness-007  
**Feature:** Live updates when completion rules change  
**Verification Date:** YYYY-MM-DD  
**Verifier:** Homer  
**Result:** PENDING

## Objective
Verify that when completion rules change (e.g., `exportUnlockThresholdPct` adjusted), catalog export readiness reflects the change promptly.

## Prerequisites
- Admin access to Export Settings and Export page
- Catalog with known completion status
- Staging environment
- Ability to capture timestamped screenshots

## Test Scenario: Completion Rule Change

### Timeline

#### T0: Initial State (Baseline)

**Timestamp:** _____

**Completion Rules:**
```json
{
  "schemaVersion": "1.0.0",
  "rulesVersion": "2026-01-08",
  "exportUnlockThresholdPct": 95,
  "segments": [...]
}
```

**Catalog Status:**
- Total products: 100
- Catalog completion: 92%
- Export readiness: **BLOCKED** (below 95% threshold)

**Export UI Display:**
- Status: Blocked / Not Ready
- Message: "Catalog completion is 92%, below required 95% threshold"

**Screenshot:**
- Export Settings: `artifacts/LP-completion-readiness-007/screenshots/live-update-rule-t0-settings.png`
- Export Page: `artifacts/LP-completion-readiness-007/screenshots/live-update-rule-t0-export.png`

---

#### T1: Completion Rule Changed

**Timestamp:** _____

**Action:** Change `exportUnlockThresholdPct` from 95 to 90 in Export Settings

**Expected Firestore Update:**
```json
{
  "schemaVersion": "1.0.0",
  "rulesVersion": "2026-01-08",
  "exportUnlockThresholdPct": 90,
  "segments": [...]
}
```

**Screenshot:**
- Export Settings after save: `artifacts/LP-completion-readiness-007/screenshots/live-update-rule-t1-saved.png`

---

#### T2: Refresh/Live Update Trigger

**Timestamp:** _____

**Refresh Method:** (manual refresh / live update / polling)

**Action:**
- [ ] Navigate back to Export page
- [ ] Manual page refresh
- [ ] Automatic live update
- [ ] API re-fetch triggered by event

**Screenshot:**
`artifacts/LP-completion-readiness-007/screenshots/live-update-rule-t2-refresh.png`

---

#### T3: Export Reflects Change

**Timestamp:** _____

**Expected Catalog Status:**
- Total products: 100
- Catalog completion: 92% (unchanged)
- Export readiness: **READY** (now above 90% threshold)

**Expected Export UI Display:**
- Status: Ready / ✓ Ready to Export
- Message: "Catalog completion is 92%, meets required 90% threshold"

**Actual Export UI Display:**
- Status: _____
- Message: _____
- Export button enabled: _____

**Screenshot:**
`artifacts/LP-completion-readiness-007/screenshots/live-update-rule-t3-export-updated.png`

---

### Timing Analysis

**Total Elapsed Time:** T3 - T0 = _____ seconds

**Breakdown:**
- T0 → T1 (rule change and save): _____ seconds
- T1 → T2 (navigate/refresh): _____ seconds
- T2 → T3 (UI reflects change): _____ seconds

**Target:** Changes reflected within 5 seconds of refresh/live update

---

## Alternative Scenario: Threshold Increase (Ready → Blocked)

### Initial State
- Catalog completion: 92%
- Threshold: 90%
- Export readiness: READY

### Change
- Increase threshold to 95%

### Expected Outcome
- Catalog completion: 92% (unchanged)
- Export readiness: BLOCKED

**Verified:** Yes / No

---

## Operator Explanation Actionability

**Operator Explanation Text (Blocked State):**
_____

**Operator Explanation Text (Ready State):**
_____

**Actionable Items:**
1. _____
2. _____

**Is Actionable?** Yes / No

**Assessment:**
- [ ] Explains threshold requirement clearly
- [ ] Shows current catalog completion vs threshold
- [ ] Provides guidance on achieving threshold (if blocked)
- [ ] Positive confirmation if ready

---

## Verification Checklist

- [ ] Rule change persists to Firestore `settings/exportSettings`
- [ ] Export page updates after refresh/live update
- [ ] Catalog readiness reflects new threshold
- [ ] Operator explanation updates appropriately
- [ ] Export button state changes accordingly
- [ ] Update occurs within acceptable time window
- [ ] Both threshold increase and decrease scenarios work

---

## Sign-Off

**Result:** PENDING / PASS / FAIL  
**Notes:**

**Approved By:** Homer  
**Date:** YYYY-MM-DD
