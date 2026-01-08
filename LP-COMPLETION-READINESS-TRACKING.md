# LP Completion Readiness Verification Tracking

**Phase:** completion-readiness  
**Owner:** Homer  
**Issued:** 2026-01-08  
**Branch:** governance/lp-sequential-numbering-2026-01-07  

## Overview

This document tracks the 9 Learning Plans (LPs) for completion readiness verification. All LPs follow the sequential numeric format: `LP-completion-readiness-NNN`.

## Issuance Governance

- **LP Format:** LP-<PhaseSlug>-NNN (PhaseSlug = completion-readiness)
- **Numbering:** Sequential, numeric, will not be reset
- **Owner:** Homer (responsible for implementation, PRs, CI runs, HES + VVP evidence)
- **Evidence Storage:** `evidence/phaseX/` or attached to LP PR
- **Evidence Standards:** 
  - HES JSON must conform to [docs/HES_FORMAT.md](docs/HES_FORMAT.md)
  - VVPs must conform to [docs/VVP_TEMPLATE.md](docs/VVP_TEMPLATE.md)

---

## LP-completion-readiness-001 — Registry sync & verification

**Status:** 🔴 Not Started  
**Owner:** Homer

### Goal
Ensure `packages/sdk/config/attributeRegistry.json` is canonical and reliably synced to Firestore with meta (definition_version, syncedAt, syncedBy) and `settings/attributesMeta.registry_version === registry.version`.

### Tasks
1. ⬜ Harden `packages/api/src/tasks/syncAttributeRegistry.ts` to prefer packaged registry JSON and only fall back to Notion/derived per current fallback logic
2. ⬜ Execute `runSyncAttributeRegistry(dryRun=false)` in staging to sync registry into `settings/attributes/keys/*` and write `settings/attributesMeta`
3. ⬜ Run `scripts/verify-attributes-meta.js` against staging Firestore and confirm registry versions match

### Acceptance Criteria
- [ ] `settings/attributesMeta.registry_version` equals `packages/sdk/config/attributeRegistry.json` version
- [ ] At least one sample doc under `settings/attributes/keys/` has `definition_version === registry.version` and `syncedAt/syncedBy`

### Evidence Required
- HES with registry file SHA
- runSyncAttributeRegistry log
- verify-attributes-meta.js output
- Firestore snapshots (settings/attributesMeta + sampled attribute docs)

### Authoritative References
- [packages/sdk/config/attributeRegistry.json](packages/sdk/config/attributeRegistry.json)
- [packages/api/src/tasks/syncAttributeRegistry.ts](packages/api/src/tasks/syncAttributeRegistry.ts)
- [scripts/verify-attributes-meta.js](scripts/verify-attributes-meta.js)

---

## LP-completion-readiness-002 — Completion rules validation & persistence

**Status:** 🔴 Not Started  
**Owner:** Homer

### Goal
Ensure Firestore `settings/exportSettings.completionRules` exists and is valid per `validateCompletionRulesConfig`. The rules must be the authoritative runtime config.

### Tasks
1. ⬜ Load rules via `loadCompletionRules()` against staging Firestore
2. ⬜ Fix/validate missing fields (schemaVersion, rulesVersion, exportUnlockThresholdPct, segments)
3. ⬜ Ensure UI editing validates and persists only validated rules

### Acceptance Criteria
- [ ] `loadCompletionRules()` returns valid `CompletionRulesConfig` (schemaVersion, rulesVersion, exportUnlockThresholdPct 0–100, enabled segments weight ≈100)
- [ ] Export Settings UI persist → Firestore `settings/exportSettings`

### Evidence Required
- HES with Firestore snapshot of settings/exportSettings
- loadCompletionRules() logs
- Export Settings VVP

### Authoritative References
- [packages/api/src/services/completionRulesService.ts](packages/api/src/services/completionRulesService.ts)

---

## LP-completion-readiness-003 — Deterministic completion engine verification

**Status:** 🔴 Not Started  
**Owner:** Homer

### Goal
Verify `evaluateCompletion` is deterministic, registry-driven, enforces `required_for_completion`, and enforces Description/SEO site-blocking semantics.

### Tasks
1. ⬜ Create deterministic tests invoking `evaluateCompletion` with registry snapshot, rules snapshot, sample product snapshots (including multi-site). Include evaluatedAt timestamp
2. ⬜ Confirm failure/hasBlockingSites when Description/SEO built-in segment is missing on any selected site

### Acceptance Criteria
- [ ] Tests yield stable `totalCompletionPct` and `segmentResults` for given inputs
- [ ] Site-level description/SEO missing → `siteBlockingReasons` and `hasBlockingSites === true`

### Evidence Required
- HES with sample inputs, results, commit SHA, and test outputs

### Authoritative References
- [packages/api/src/services/completionEvaluationEngine.ts](packages/api/src/services/completionEvaluationEngine.ts)

---

## LP-completion-readiness-004 — Product completion API & product page UX

**Status:** 🔴 Not Started  
**Owner:** Homer

### Goal
Ensure `GET /api/products/{id}/completion` returns the full completion payload and Product UI displays ready, completionPct, and operatorExplanation, gating publish/export on `completion.ready`.

### Tasks
1. ⬜ Confirm API contract returns `ProductCompletionResult` with ready, completionPct, blockingReasons, operatorExplanation
2. ⬜ Verify Product UI consumes `useProductCompletion` correctly and gates publish/export

### Acceptance Criteria
- [ ] API sample response stored in HES
- [ ] VVP demonstrating product page shows operator explanation and publish/export control state change according to API

### Evidence Required
- HES with API logs
- Product page VVP screenshots

### Authoritative References
- [packages/web/src/hooks/useProductCompletion.ts](packages/web/src/hooks/useProductCompletion.ts)

---

## LP-completion-readiness-005 — Export readiness service & export gate enforcement

**Status:** 🔴 Not Started  
**Owner:** Homer

### Goal
Ensure export readiness implements conservative policy (ANY blocked product → export blocked), returns `CompletionDrivenExportReadiness`, and export endpoints return 200 when ready / 423 when blocked.

### Tasks
1. ⬜ Validate `calculateCompletionDrivenExportReadiness` for catalog-level conservative blocking and operatorExplanation payload
2. ⬜ Execute `POST /api/admin/exports/dry-run` and `GET /api/admin/exports/readiness` for blocked and ready scenarios

### Acceptance Criteria
- [ ] readiness payload conforms to `CompletionDrivenExportReadiness`
- [ ] Endpoints return 423 with readiness when blocked and 200 when ready

### Evidence Required
- HES with server logs for both scenarios
- Export UI VVP (Blocked vs Ready)

### Authoritative References
- [packages/api/src/services/completionDrivenExportReadiness.ts](packages/api/src/services/completionDrivenExportReadiness.ts)
- [packages/api/src/endpoints/export.ts](packages/api/src/endpoints/export.ts)

---

## LP-completion-readiness-006 — Admin UI: Export Settings editor & Attributes Console write-through

**Status:** 🔴 Not Started  
**Owner:** Homer

### Goal
Ensure Export Settings editor and Attributes Console persist validated changes to Firestore and changes affect evaluations.

### Tasks
1. ⬜ Confirm `ExportSettingsPage` persists validated rules to `settings/exportSettings`
2. ⬜ Confirm `AttributeDetailPanel` toggles `required_for_completion` / `required_for_export` and writes to `settings/attributes/keys/{attributeId}` (audit events)

### Acceptance Criteria
- [ ] UI edit → Firestore doc change
- [ ] Attribute flag toggles change evaluation outcome (HES before/after)

### Evidence Required
- VVPs
- Firestore write snapshots
- Audit events in HES

### Authoritative References
- [packages/web/src/pages/settings/ExportSettingsPage.tsx](packages/web/src/pages/settings/ExportSettingsPage.tsx)
- [packages/web/src/components/AttributeDetailPanel.tsx](packages/web/src/components/AttributeDetailPanel.tsx)

---

## LP-completion-readiness-007 — Live updates & operator explainability flow

**Status:** 🔴 Not Started  
**Owner:** Homer

### Goal
Define and validate operator workflow for live updates when attributes/rules change; ensure product/export reflect changes promptly and operator explanations are actionable.

### Tasks
1. ⬜ Document the live-update or refresh workflow and implement/verify on staging
2. ⬜ Create operator help text explaining operatorExplanation actionable items

### Acceptance Criteria
- [ ] VVP sequence: change attribute/rule → refresh/live update → product/export reflect change
- [ ] operator explanation provides actions
- [ ] HES with timeline

### Evidence Required
- Product & Export VVP pre/post screenshots
- HES timeline

### Authoritative References
- [packages/web/src/hooks/useExportCompletion.ts](packages/web/src/hooks/useExportCompletion.ts)

---

## LP-completion-readiness-008 — HES + VVP compliance & final sign-off process

**Status:** 🔴 Not Started  
**Owner:** Homer

### Goal
Ensure all verification artifacts conform to docs/HES_FORMAT.md and docs/VVP_TEMPLATE.md. Prepare final sign-off checklist.

### Tasks
1. ⬜ Provide HES templates for each LP verification step
2. ⬜ Provide VVP templates for Product, Export UI, Attributes console, Export Settings
3. ⬜ Define final sign-off: HES result: "VERIFIED SUCCESS" + VVP PASS

### Acceptance Criteria
- [ ] Sample HES and VVP that pass schema validation
- [ ] Dry-run sign-off

### Evidence Required
- HES JSON files
- VVP markdowns

### Authoritative References
- [docs/HES_FORMAT.md](docs/HES_FORMAT.md)
- [docs/VVP_TEMPLATE.md](docs/VVP_TEMPLATE.md)

---

## LP-completion-readiness-009 — No-legacy-fallbacks enforcement & normalization check

**Status:** 🔴 Not Started  
**Owner:** Homer

### Goal
Verify no silent legacy fallback behavior; ensure normalization code paths and normalized flag usage in evaluation.

### Tasks
1. ⬜ Audit `attributesService.fromFirestore` normalization and ensure completion engine uses normalized flags (`getNormalizedRequirementFlagValue`)
2. ⬜ Add tests toggling legacy fields to confirm evaluations use canonical fields

### Acceptance Criteria
- [ ] HES demonstrating normalization and evaluation using normalized flags

### Evidence Required
- HES with audit
- Test outputs
- Code pointers

### Authoritative References
- [packages/api/src/services/attributesService.ts](packages/api/src/services/attributesService.ts)
- completionEvaluationEngine.getNormalizedRequirementFlagValue

---

## Status Summary

| LP | Title | Status | Evidence |
|----|-------|--------|----------|
| LP-completion-readiness-001 | Registry sync & verification | 🔴 Not Started | - |
| LP-completion-readiness-002 | Completion rules validation & persistence | 🔴 Not Started | - |
| LP-completion-readiness-003 | Deterministic completion engine verification | 🔴 Not Started | - |
| LP-completion-readiness-004 | Product completion API & product page UX | 🔴 Not Started | - |
| LP-completion-readiness-005 | Export readiness service & export gate enforcement | 🔴 Not Started | - |
| LP-completion-readiness-006 | Admin UI: Export Settings editor & Attributes Console | 🔴 Not Started | - |
| LP-completion-readiness-007 | Live updates & operator explainability flow | 🔴 Not Started | - |
| LP-completion-readiness-008 | HES + VVP compliance & final sign-off | 🔴 Not Started | - |
| LP-completion-readiness-009 | No-legacy-fallbacks enforcement & normalization | 🔴 Not Started | - |

## Sign-off Requirements

All LPs must achieve:
- ✅ **HES Result:** "VERIFIED SUCCESS"
- ✅ **VVP Status:** PASS
- ✅ All acceptance criteria met
- ✅ Evidence artifacts stored in repository

---

**Last Updated:** 2026-01-08  
**Document Version:** 1.0.0
