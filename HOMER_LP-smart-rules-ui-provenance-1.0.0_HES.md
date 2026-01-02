# HOMER Session: LP-smart-rules-ui-provenance-1.0.0 — S5 Product UI Provenance UX & Edit Behavior

**Session ID:** LP-smart-rules-ui-provenance-1.0.0
**Date:** 2025-07-01
**Status:** IMPLEMENTATION COMPLETE — PENDING STAGING SMOKE TESTS

---

## Summary

Implemented Smart Rule provenance display and edit behavior for the Product Editor:

1. **FieldBadge Component** - Lightning bolt badge (SVG icon) with accessible tooltip showing rule details
2. **Provenance Types** - FieldProvenance and ActivityLogEntry interfaces in product.ts
3. **Edit Behavior** - Human edits replace Smart Rule provenance deterministically with activity log entry
4. **Integration** - Badge integrated into CoreInformationTab (gender, age_group) and ProductAttributesTab (all attributes)
5. **Tests** - 45 unit tests (23 FieldBadge + 22 provenance) all passing

---

## Handoff & Evidence Summary (HES)

| Item | Value |
|------|-------|
| **PR URL** | https://github.com/twgallo13/ROPI-V2.1/pull/414 |
| **PR Number** | #414 |
| **Branch** | `lp-smart-rules-ui-provenance-1.0.0` |
| **Commit SHA** | `a17eab4` |
| **Base Branch** | `aoss-main` @ `77453b4f36cd8e3f8486d162e4876052d6bb67d3` |
| **Tests Added** | 45 (23 FieldBadge + 22 provenance) |
| **Tests Passing** | ✅ All 45 S5 tests pass |
| **CI Status** | Pending |

---

## Files Changed

### New Files

| File | Lines | Purpose |
|------|-------|---------|
| `packages/web/src/components/product/FieldBadge.tsx` | 246 | Smart Rule badge with accessible tooltip |
| `packages/web/src/components/product/FieldBadge.css` | 244 | Badge styling with dark mode |
| `packages/web/src/services/productService.ts` | 284 | Provenance helpers for Firestore |
| `packages/web/src/components/product/__tests__/FieldBadge.test.tsx` | 350+ | 23 unit tests |
| `packages/web/src/services/__tests__/productService.provenance.test.ts` | 250+ | 22 unit tests |

### Modified Files

| File | Changes |
|------|---------|
| `packages/web/src/types/product.ts` | Added FieldProvenance, ActivityLogEntry interfaces |
| `packages/web/src/hooks/useProduct.ts` | Enhanced updateField with provenance replacement logic |
| `packages/web/src/hooks/useProduct.test.ts` | Added mocks for auth, arrayUnion, productService |
| `packages/web/src/components/product/CoreInformationTab.tsx` | Integrated FieldBadge for gender, age_group |
| `packages/web/src/components/product/ProductAttributesTab.tsx` | Integrated FieldBadge for all attribute fields |

---

## Key Implementation Details

### Provenance Key Format

Field paths are converted to provenance keys by replacing dots with underscores:
- `attributes.gender` → `attributes_gender`
- `attributes.age_group` → `attributes_age_group`

This avoids nested object issues in Firestore and allows direct key lookup.

### FieldProvenance Interface

```typescript
interface FieldProvenance {
  source: 'smartRule' | 'human' | 'import' | 'api';
  ruleId?: string;
  ruleName?: string;
  appliedAt: string;
  input?: Record<string, unknown>;
  reason?: string;
  actor?: string | { uid: string; name: string; };
}
```

### ActivityLogEntry Interface

```typescript
interface ActivityLogEntry {
  actor: string | { uid: string; name: string; };
  action: 'user_replaced_smartrule' | 'smartrule_auto_apply' | 'user_edit' | 'conflict_resolved';
  timestamp: string;
  details: {
    fieldPath?: string;
    previousProvenance?: FieldProvenance;
    newValue?: unknown;
    [key: string]: unknown;
  };
}
```

### Edit Behavior Flow

1. User edits a field in Product Editor
2. `useProduct.updateField()` checks for existing Smart Rule provenance
3. If Smart Rule provenance exists:
   - Create human provenance entry
   - Create activity log entry with `action: 'user_replaced_smartrule'`
   - Include both in Firestore `updateDoc()` call
4. Firestore uses `arrayUnion()` for atomic activity log append

---

## Accessibility Features

| Feature | Implementation |
|---------|---------------|
| Keyboard focus | Badge button is focusable via Tab |
| Keyboard toggle | Enter/Space opens/closes tooltip |
| Keyboard dismiss | Escape closes tooltip |
| Screen reader | `aria-label="Smart Rule: {ruleName}"` |
| Expanded state | `aria-expanded` attribute updates |
| Tooltip role | `role="tooltip"` with `aria-live="polite"` |
| Close button | Focusable with `aria-label="Close tooltip"` |
| Decorative icon | `aria-hidden="true"` on SVG |

---

## Test Coverage

### FieldBadge Tests (23)

**Rendering (5):**
- Renders badge for Smart Rule provenance
- Renders nothing when provenance is undefined
- Renders nothing when provenance source is human
- Renders nothing when provenance source is import
- Displays lightning bolt icon as SVG

**Tooltip Content (8):**
- Shows tooltip on click
- Displays rule name in tooltip
- Displays rule ID in tooltip
- Displays reason in tooltip
- Displays input RICS category in tooltip
- Displays field path in tooltip
- Displays formatted date in tooltip
- Hides tooltip on second click

**Keyboard Accessibility (5):**
- Opens tooltip on Enter key
- Opens tooltip on Space key
- Closes tooltip on Escape key
- Has correct ARIA attributes
- Updates aria-expanded when tooltip is open

**Edge Cases (4):**
- Handles provenance without optional fields
- Handles empty input object
- Handles invalid date string gracefully
- Handles very long rule names

**Admin Link (1):**
- Renders link to admin rule view when ruleId is present

### Provenance Tests (22)

**getProvenanceKey (3):**
- Converts field path to provenance key with underscores
- Handles simple field paths
- Handles deeply nested paths

**createHumanProvenance (4):**
- Creates provenance with source=human
- Includes actor information
- Sets appliedAt to current timestamp
- Does not include ruleId or ruleName

**createReplacementActivityLog (6):**
- Creates log entry with action user_replaced_smartrule
- Includes actor information
- Includes field path in details
- Includes previous provenance in details
- Includes new value in details
- Sets timestamp

**getProvenanceFromProduct (3):**
- Returns provenance for field with provenance
- Returns undefined for field without provenance
- Returns undefined for product without provenance map

**hasSmartRuleProvenance (4):**
- Returns true for field with Smart Rule provenance
- Returns false for field with human provenance
- Returns false for field without provenance
- Returns false for product without provenance map

**Edit Behavior Integration (2):**
- Provenance key lookup workflow
- Preserves other field provenances when replacing one

---

## Staging Smoke Tests (Pending)

### Test A - Display
- [ ] Load product with Smart Rule provenance
- [ ] Verify lightning bolt badge appears on field
- [ ] Click badge → tooltip shows rule details

### Test B - Edit
- [ ] Edit Smart Rule-filled field
- [ ] Verify badge disappears (human provenance)
- [ ] Check Firestore: provenance.source = 'human'
- [ ] Check Firestore: activityLog contains entry

### Test C - Failure Recovery
- [ ] Simulate network error during edit
- [ ] Verify UI reverts to previous value
- [ ] Verify clear error message shown

---

## Product Document Examples

### Before Edit (Smart Rule)

```json
{
  "id": "product_123",
  "attributes": {
    "gender": "Men"
  },
  "provenance": {
    "attributes_gender": {
      "source": "smartRule",
      "ruleId": "rule_gender_from_rics",
      "ruleName": "Gender from RICS Category",
      "appliedAt": "2025-01-15T10:30:00.000Z",
      "input": {
        "ricsCategory": "Men's Footwear"
      },
      "reason": "Matched RICS category pattern for Men"
    }
  }
}
```

### After Edit (Human)

```json
{
  "id": "product_123",
  "attributes": {
    "gender": "Women"
  },
  "provenance": {
    "attributes_gender": {
      "source": "human",
      "appliedAt": "2025-01-15T11:00:00.000Z",
      "actor": "user@example.com"
    }
  },
  "activityLog": [
    {
      "actor": "user@example.com",
      "action": "user_replaced_smartrule",
      "timestamp": "2025-01-15T11:00:00.000Z",
      "details": {
        "fieldPath": "attributes.gender",
        "previousProvenance": {
          "source": "smartRule",
          "ruleId": "rule_gender_from_rics",
          "ruleName": "Gender from RICS Category"
        },
        "newValue": "Women"
      }
    }
  ]
}
```

---

## Dependencies

- S4 merge completed: `77453b4f36cd8e3f8486d162e4876052d6bb67d3`
- No new npm packages added
- Uses existing Firebase/Firestore setup

---

## References

- [Product Completion Workflows (W2)](https://www.notion.so/2ba45ee1ec5a80698690f9492961ed8b)
- PR #413 (S4 merge): Merged into aoss-main
- PR #414 (S5): This implementation

---

## Next Steps

1. Wait for CI to pass
2. Lisa reviews staging smoke tests A-C
3. Upon VERIFIED SUCCESS → Merge PR #414 into aoss-main
4. Proceed to S6 (if defined)

---

**IMPLEMENTATION COMPLETE** — Awaiting staging verification
