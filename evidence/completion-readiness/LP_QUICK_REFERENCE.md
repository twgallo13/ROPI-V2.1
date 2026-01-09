# LP Completion-Readiness Quick Reference

**Phase:** completion-readiness  
**Owner:** Homer  
**Total LPs:** 9

---

## LP Quick Links

| LP | Title | HES | VVP | Key Files |
|----|-------|-----|-----|-----------|
| 001 | Registry sync & verification | [HES](hes/LP-completion-readiness-001.json) | N/A | [attributeRegistry.json](../packages/sdk/config/attributeRegistry.json), [syncAttributeRegistry.ts](../packages/api/src/tasks/syncAttributeRegistry.ts) |
| 002 | Completion rules validation | [HES](hes/LP-completion-readiness-002.json) | [VVP](vvp/export-settings-persistence.md) | [completionRulesService.ts](../packages/api/src/services/completionRulesService.ts) |
| 003 | Deterministic engine | [HES](hes/LP-completion-readiness-003.json) | N/A | [completionEvaluationEngine.ts](../packages/api/src/services/completionEvaluationEngine.ts) |
| 004 | Product completion API & UX | [HES](hes/LP-completion-readiness-004.json) | [VVP](vvp/product-page-completion-display.md) | [useProductCompletion.ts](../packages/web/src/hooks/useProductCompletion.ts) |
| 005 | Export readiness & gate | [HES](hes/LP-completion-readiness-005.json) | [Blocked](vvp/export-ui-blocked.md), [Ready](vvp/export-ui-ready.md) | [completionDrivenExportReadiness.ts](../packages/api/src/services/completionDrivenExportReadiness.ts) |
| 006 | Admin UI persistence | [HES](hes/LP-completion-readiness-006.json) | [Settings](vvp/export-settings-persistence.md), [Attributes](vvp/attributes-console-toggles.md) | [ExportSettingsPage.tsx](../packages/web/src/pages/settings/ExportSettingsPage.tsx) |
| 007 | Live updates & explainability | [HES](hes/LP-completion-readiness-007.json) | [Attribute](vvp/live-update-attribute-change.md), [Rule](vvp/live-update-rule-change.md) | [useExportCompletion.ts](../packages/web/src/hooks/useExportCompletion.ts) |
| 008 | HES + VVP compliance | [HES](hes/LP-completion-readiness-008.json) | N/A | [HES_FORMAT.md](../docs/HES_FORMAT.md), [VVP_TEMPLATE.md](../docs/VVP_TEMPLATE.md) |
| 009 | No-legacy-fallbacks | [HES](hes/LP-completion-readiness-009.json) | N/A | [attributesService.ts](../packages/api/src/services/attributesService.ts) |

---

## LP-001: Registry Sync & Verification

**Goal:** Ensure `attributeRegistry.json` is canonical and synced to Firestore

**Key Tasks:**
1. Harden `syncAttributeRegistry.ts` to prefer packaged registry
2. Execute `runSyncAttributeRegistry(dryRun=false)` in staging
3. Run `scripts/verify-attributes-meta.js`

**Acceptance:**
- `settings/attributesMeta.registry_version` === registry.version
- Sample attribute doc has `definition_version`, `syncedAt`, `syncedBy`

**Evidence:** Registry SHA, sync log, verify script output, Firestore snapshots

---

## LP-002: Completion Rules Validation & Persistence

**Goal:** Ensure `settings/exportSettings.completionRules` is valid and authoritative

**Key Tasks:**
1. Load rules via `loadCompletionRules()` against staging
2. Fix/validate missing fields
3. Ensure UI editing validates and persists

**Acceptance:**
- `loadCompletionRules()` returns valid config
- Export Settings UI → Firestore

**Evidence:** Firestore snapshot, `loadCompletionRules()` log, Export Settings VVP

---

## LP-003: Deterministic Completion Engine Verification

**Goal:** Verify `evaluateCompletion` is deterministic and registry-driven

**Key Tasks:**
1. Create deterministic tests with snapshots
2. Confirm Description/SEO site-blocking semantics

**Acceptance:**
- Stable results for given inputs
- Site-level missing → `hasBlockingSites === true`

**Evidence:** Test inputs/results, commit SHA, test outputs

---

## LP-004: Product Completion API & Product Page UX

**Goal:** Ensure GET `/api/products/{id}/completion` returns full payload; UI displays correctly

**Key Tasks:**
1. Confirm API contract
2. Verify Product UI consumes `useProductCompletion` and gates publish/export

**Acceptance:**
- API sample response stored
- VVP shows operator explanation and gated controls

**Evidence:** API logs, Product page VVP screenshots

---

## LP-005: Export Readiness Service & Export Gate Enforcement

**Goal:** Ensure conservative policy (ANY blocked → catalog blocked) and correct HTTP status

**Key Tasks:**
1. Validate `calculateCompletionDrivenExportReadiness`
2. Execute dry-run and readiness endpoints for blocked/ready scenarios

**Acceptance:**
- Readiness payload conforms to schema
- 423 when blocked, 200 when ready

**Evidence:** Server logs, Export UI VVPs (Blocked vs Ready)

---

## LP-006: Admin UI: Export Settings & Attributes Console Write-Through

**Goal:** Ensure UI edits persist to Firestore and affect evaluations

**Key Tasks:**
1. Confirm ExportSettingsPage persists validated rules
2. Confirm AttributeDetailPanel toggles write to Firestore with audit events

**Acceptance:**
- UI edit → Firestore change
- Attribute flag toggle changes evaluation

**Evidence:** VVPs, Firestore snapshots, audit events

---

## LP-007: Live Updates & Operator Explainability Flow

**Goal:** Validate live-update workflow and actionable operator explanations

**Key Tasks:**
1. Document live-update workflow
2. Create operator help text
3. Verify product/export reflect changes promptly

**Acceptance:**
- VVP sequence with timeline
- Operator explanation provides actions

**Evidence:** Product & Export VVPs pre/post, HES timeline

---

## LP-008: HES + VVP Compliance & Final Sign-Off Process

**Goal:** Ensure artifacts conform to formats and define sign-off process

**Key Tasks:**
1. Provide HES templates for each LP
2. Provide VVP templates
3. Define final sign-off criteria

**Acceptance:**
- Sample HES and VVP pass schema validation
- Dry-run sign-off demonstrated

**Evidence:** HES/VVP templates, sign-off checklist

---

## LP-009: No-Legacy-Fallbacks Enforcement & Normalization Check

**Goal:** Verify no silent legacy fallback; ensure normalization in evaluation

**Key Tasks:**
1. Audit `attributesService.fromFirestore` normalization
2. Ensure completion engine uses `getNormalizedRequirementFlagValue`
3. Add tests toggling legacy fields

**Acceptance:**
- HES demonstrates normalization and normalized flag usage

**Evidence:** Audit, test outputs, code pointers

---

## Verification Workflow Summary

```
┌─────────────────┐
│ 1. Implement LP │
│    & Write Tests│
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ 2. Create PR    │
│    & Run CI     │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ 3. Execute      │
│    Verification │
│    Steps        │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ 4. Populate HES │
│    & VVP        │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ 5. Review &     │
│    Sign-Off     │
└─────────────────┘
```

## Key Commands

### Validate HES Files
```bash
# All at once
for f in evidence/completion-readiness/hes/*.json; do
  jq empty "$f" && echo "✓ $(basename $f)" || echo "✗ $(basename $f)"
done
```

### Check Progress
```bash
# Count approved LPs
grep -h '"result"' evidence/completion-readiness/hes/*.json | grep -c "VERIFIED SUCCESS"

# Show all statuses
for f in evidence/completion-readiness/hes/*.json; do
  echo "$(basename $f | cut -d. -f1): $(jq -r '.result' "$f")"
done
```

### Sync Registry (LP-001)
```bash
node -e "require('./packages/api/src/tasks/syncAttributeRegistry').runSyncAttributeRegistry(false)"
```

### Verify Attributes Meta (LP-001)
```bash
node scripts/verify-attributes-meta.js
```

---

## Sign-Off Flow

1. **Individual LP Sign-Off:**
   - Complete HES evidence
   - Complete VVP (if applicable)
   - All acceptance criteria met
   - Set `homer_approved: true`
   - Set `result: "VERIFIED SUCCESS"`

2. **Final Phase Sign-Off:**
   - All 9 LPs individually signed off
   - Review `SIGN_OFF_CHECKLIST.md`
   - Homer final approval

---

## Contact & Support

**Owner:** Homer  
**Phase:** completion-readiness  
**Evidence Directory:** `evidence/completion-readiness/`  
**Created:** 2026-01-08

**Resources:**
- [Evidence README](README.md)
- [Sign-Off Checklist](SIGN_OFF_CHECKLIST.md)
- [HES Format](../docs/HES_FORMAT.md)
- [VVP Template](../docs/VVP_TEMPLATE.md)
