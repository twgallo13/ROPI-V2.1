# LP-phase2b-001: Completion Model — UI & Export Gate Integration (Phase 2B)

**Tracking Issue:** #469  
**LP:** LP-phase2b-001  
**Phase:** Phase 2B (UI & Export Gate)

---

## Objective

Integrate the deterministic Completion Evaluation Engine into the product UI and implement the Export Gate UX so product readiness is visible, actionable, and gated at the UI level.

---

## Preconditions

All preconditions from LP-phase2b-001 must be satisfied before merge:

- ✅ **LP-phase2a-001 merged to production**
  - Merge commit: `74ebc31a6c25324bf9b60ec6602d3c990f61e6af`
  - Engine available at: `packages/engine/bin/evaluate.js`
  - Evidence: [PR #468](https://github.com/twgallo13/ROPI-V2.1/pull/468)

- ⏳ **Stable Engine APIs on staging**
  - Endpoint: `GET /api/products/{id}/completion`
  - Status: Pending verification
  - Evidence: `inventory/LP-phase2b-001/evidence/api_verification.txt`

- ⏳ **Design sign-off on UI/UX**
  - Components: CompletionCard, ExportGatePanel, GlobalModeCard
  - Status: Pending approval
  - Evidence: `inventory/LP-phase2b-001/evidence/design_signoff.md`

- ⏳ **Feature flag configuration**
  - Flag: `features.completion.phase2b.enabled`
  - Status: Pending deployment
  - Evidence: `inventory/LP-phase2b-001/evidence/feature_flag_config.json`

- ✅ **AI re-entry confirmation**
  - Lisa & Homer confirmed AI_BOOTSTRAP.md compliance
  - Evidence: `inventory/LP-phase2b-001/HES-LP-phase2b-001.json`

---

## Scope (Single Intent)

**UI/Client Integration Only:**

### UI Components
- `packages/web/src/components/CompletionCard` — Per-product completion display
- `packages/web/src/components/ExportGatePanel` — Export gate with blocking reasons
- `packages/web/src/components/GlobalModeCard` — Site details toggle

### Admin UI
- `pages/admin/completion-rules` — Read-only versions view

### Testing
- Unit tests for all components
- E2E tests for 3 export flows (ready, partial, blocked)

### Accessibility
- Accessibility audit (axe or similar)
- i18n strings file

### Feature Flag
- Wire up feature flag for Phase 2B UI toggle

**Out of Scope:**
- No backend logic changes
- No data migrations
- No new API endpoints

---

## Implementation Plan

### Phase 1: Precondition Verification
1. Verify Engine APIs on staging
2. Obtain design approval
3. Configure feature flag

### Phase 2: Component Implementation
1. Build CompletionCard component
2. Build ExportGatePanel component
3. Build GlobalModeCard component
4. Build admin completion-rules page

### Phase 3: Testing
1. Write unit tests for all components
2. Write E2E tests for 3 export flows
3. Run accessibility audit
4. Capture screenshots for HES

### Phase 4: Evidence Capture
1. Generate machine-readable test outputs
2. Capture CI run links
3. Document preview deployment
4. Update HES with all evidence

### Phase 5: VVP
1. Verify all sample_checks pass
2. Update HES `result` to VERIFIED_SUCCESS
3. Request VVP from Lisa
4. Obtain Theo acceptance sign-off

---

## Deliverables Checklist

### UI Components
- [ ] CompletionCard.tsx (with unit tests)
- [ ] ExportGatePanel.tsx (with unit tests)
- [ ] GlobalModeCard.tsx (with unit tests)

### Admin UI
- [ ] admin/completion-rules.tsx (read-only)

### Tests
- [ ] Unit test output (machine-readable)
- [ ] E2E test output (machine-readable)
- [ ] All tests passing in CI

### Accessibility
- [ ] Accessibility audit JSON (0 critical failures)
- [ ] i18n strings file

### Evidence
- [ ] Screenshots (10 total for 5 flows)
- [ ] CI run links
- [ ] Preview deployment URL
- [ ] API verification results

### Governance
- [ ] HES complete with all sections
- [ ] All sample_checks reproducible and PASS
- [ ] VVP request posted
- [ ] Theo acceptance obtained

---

## Acceptance Criteria

- [ ] UI displays deterministic engine values exactly as API responses for 5 sample products
- [ ] Export Gate flows: ready → allow; partial/blocked → disallow with reasons
- [ ] Unit & E2E tests: All pass in CI
- [ ] Accessibility: No critical failures
- [ ] HES `sample_checks[]`: All 5 flows PASS
- [ ] HES `result == "VERIFIED_SUCCESS"`
- [ ] Theo acceptance sign-off

---

## Related

- **Tracking Issue:** [#469](https://github.com/twgallo13/ROPI-V2.1/issues/469)
- **HES:** [`inventory/LP-phase2b-001/HES-LP-phase2b-001.json`](inventory/LP-phase2b-001/HES-LP-phase2b-001.json)
- **README:** [`inventory/LP-phase2b-001/README.md`](inventory/LP-phase2b-001/README.md)
- **Preconditions:** [`inventory/LP-phase2b-001/PRECONDITIONS.md`](inventory/LP-phase2b-001/PRECONDITIONS.md)
- **LP-phase2a-001:** [Closure Doc](https://github.com/twgallo13/ROPI-V2.1/blob/aoss-main/inventory/LP-phase2a-001/LP-PHASE2A-001-CLOSURE.md)

---

## Labels

- `state:planned` → `state:in-progress`
- `lp:phase2b-001`
- `type:feature`
- `phase:phase2b`

---

## Safety Rules

- No production deploys without HES VERIFIED_SUCCESS and Theo acceptance
- No data-destructive migrations
- No force-pushes or direct main branch pushes unless authorized by Lisa
- Feature flag must enable instant rollback (<5 min)
- One LP = one intent, single LP label on PR, one HES per LP

---

**Ready to begin once all preconditions are SATISFIED.**
