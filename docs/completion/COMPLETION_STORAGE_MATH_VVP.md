# Completion Storage Layout, Deterministic Math, and VVP

## 1. Storage Layout

### Live rules document:
`settings/exportSettings/completionRules`

### Immutable version snapshots:
`settings/exportSettings/completionRulesVersions/{rulesVersion}`

### Audit log (append-only):
`settings/exportSettings/completionRulesAudit/{eventId}`

### Selected websites:
Read from the product record at evaluation time (no duplication in rules).

---

## 2. Deterministic Weighted Completion Math

### Definitions:

Let S be the set of enabled segments.

Each segment s has:
- `weightPct` (integer)
- `ruleType` (ALL_REQUIRED or ANY_REQUIRED)
- `requiredCount`
- `missingCount`

### Segment score:

If `requiredCount == 0`:
- score = 1.0

If `ruleType == ALL_REQUIRED`:
- score = (requiredCount - missingCount) / requiredCount

If `ruleType == ANY_REQUIRED`:
- score = 1.0 if missingCount < requiredCount
- score = 0.0 otherwise

### Completion percentage:

```
completionPct =
round( sum(score(s) * weightPct(s)) / 100 * 100 )
```

Completion percentage is always 0–100 and deterministic.

### Export gate:

```
exportAllowed =
completionPct >= exportUnlockThresholdPct
```

Default `exportUnlockThresholdPct` = 100 (configurable).

---

## 3. Validation & Verification Plan (VVP)

### A. Settings control proof
- Change a segment weight
- Save settings
- Verify Completion % changes immediately without deploy

### B. Exclusions proof
- Product with zero images and no pricing
- All required segments satisfied
- Completion reaches threshold
- Export allowed

### C. Site-aware descriptions proof
- Product with two selected sites
- One site missing description or SEO
- Completion blocked
- UI shows blocking segment, site, and missing fields
- Fill missing fields
- Completion unblocks

### D. Rule type proof
- Set a segment to ANY_REQUIRED
- Provide one of several required attributes
- Segment contributes full weight
- Switch back to ALL_REQUIRED
- Segment blocks as expected

### E. No dead controls proof
- Toggle every UI control
- Save
- Observe a corresponding change in completion output

All checks must pass before phase closure.
