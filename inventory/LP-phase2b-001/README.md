# LP-phase2b-001: Completion Model — UI & Export Gate Integration

**LP:** LP-phase2b-001  
**Phase:** Phase 2B (UI & Export Gate)  
**Owner:** Lisa (Phase Owner)  
**Executor:** Homer  
**Acceptance Authority:** Theo

**Status:** 🟡 IN_PROGRESS  
**Tracking Issue:** [#469](https://github.com/twgallo13/ROPI-V2.1/issues/469)  
**PR:** TBD

---

## Objective

Integrate the deterministic Completion Evaluation Engine (LP-phase2a-001) into the product UI and implement the Export Gate UX so product readiness is visible, actionable, and gated at the UI level.

---

## Scope

**Single Intent: UI/Client Integration Only**

1. **UI Components:**
   - `CompletionCard` — Display per-product completion percentage, status (ready/partial/blocked), and segment breakdown
   - `ExportGatePanel` — Export gate with blocking reasons (if status is partial/blocked)
   - `GlobalModeCard` — "Advanced / site details" toggle for site-specific completion data

2. **Admin UI:**
   - `pages/admin/completion-rules` — Read-only view of completion rules versions history

3. **Testing:**
   - Unit tests for all components
   - E2E tests for 3 export flows: ready, partial, blocked

4. **Accessibility:**
   - Accessibility audit (axe or similar)
   - i18n strings file for all user-facing text

5. **Feature Flag:**
   - Wire up feature flag to toggle Phase 2B UI behavior

**Out of Scope:**
- No backend logic changes (use Engine APIs from LP-phase2a-001)
- No data migrations
- No new API endpoints (all endpoints exist from Phase 2A)

---

## Preconditions

| Precondition | Status | Evidence |
|--------------|--------|----------|
| LP-phase2a-001 merged to aoss-main | ✅ SATISFIED | Merge SHA: `74ebc31a6c25324bf9b60ec6602d3c990f61e6af` |
| Engine APIs available on staging | ⏳ PENDING | Verify `GET /api/products/{id}/completion` endpoint |
| Design sign-off on UI/UX | ⏳ PENDING | Approval for CompletionCard, ExportGatePanel, GlobalModeCard |
| Feature flag & preview environment | ⏳ PENDING | Phase 2B toggle configuration required |
| AI re-entry confirmation | ✅ SATISFIED | Recorded in HES |

---

## Deliverables

### UI Components
- [ ] `packages/web/src/components/CompletionCard.tsx`
- [ ] `packages/web/src/components/ExportGatePanel.tsx`
- [ ] `packages/web/src/components/GlobalModeCard.tsx`

### Admin UI
- [ ] `packages/web/src/pages/admin/completion-rules.tsx` (read-only versions view)

### Tests
- [ ] Unit tests for CompletionCard
- [ ] Unit tests for ExportGatePanel
- [ ] Unit tests for GlobalModeCard
- [ ] E2E test: Ready product export flow
- [ ] E2E test: Partial product export blocked flow
- [ ] E2E test: Blocked product export blocked flow

### Accessibility
- [ ] Accessibility audit report (axe or similar)
- [ ] i18n strings file (`packages/web/src/locales/en/completion.json`)

### Evidence
- [ ] Screenshots of all 5 sample flows
- [ ] Unit test output (machine-readable)
- [ ] E2E test output (machine-readable)
- [ ] CI run links
- [ ] Preview deployment URL
- [ ] Accessibility audit JSON

### Governance
- [ ] HES-LP-phase2b-001.json (complete with all sections)
- [ ] PR body with HES link and summary
- [ ] VVP request to Lisa when `result == VERIFIED_SUCCESS`

---

## Sample Checks (E2E Flows)

### Flow 1: Ready Product — Export Allowed
**Scenario:** User views product with ≥80% completion  
**Expected:** Export UI enabled, no blocking reasons  
**Command:** `pnpm --filter @ropi-aoss/web test:e2e --grep 'export flow ready product'`  
**Status:** ⏳ PENDING

### Flow 2: Partial Product — Export Blocked with Reasons
**Scenario:** User views product with 40-80% completion  
**Expected:** Export UI disabled, blocking reasons displayed  
**Command:** `pnpm --filter @ropi-aoss/web test:e2e --grep 'export flow partial product'`  
**Status:** ⏳ PENDING

### Flow 3: Blocked Product — Export Blocked with Details
**Scenario:** User views product with <40% completion  
**Expected:** Export UI disabled, detailed blocking reasons with segment breakdown  
**Command:** `pnpm --filter @ropi-aoss/web test:e2e --grep 'export flow blocked product'`  
**Status:** ⏳ PENDING

### Flow 4: Admin — View Completion Rules Versions
**Scenario:** Admin views completion rules history  
**Expected:** Read-only versions list, no edit buttons  
**Command:** `pnpm --filter @ropi-aoss/web test:e2e --grep 'admin completion rules versions'`  
**Status:** ⏳ PENDING

### Flow 5: Global Mode Toggle — Site Details
**Scenario:** User toggles "Advanced / site details"  
**Expected:** Site-specific completion data displayed  
**Command:** `pnpm --filter @ropi-aoss/web test:e2e --grep 'global mode toggle'`  
**Status:** ⏳ PENDING

---

## Acceptance Criteria

- [ ] UI displays deterministic engine values exactly as API responses for 5 sample products
- [ ] Export Gate flows:
  - [ ] **Ready:** Export UI enabled, no blocking reasons
  - [ ] **Partial/Blocked:** Export UI disabled, blocking reasons clearly displayed
- [ ] Unit tests: All component tests pass
- [ ] E2E tests: All 3 export flows pass in CI
- [ ] Accessibility: No critical or serious failures in axe audit
- [ ] HES `sample_checks[]`: All 5 flows reproducible and PASS
- [ ] HES `result == "VERIFIED_SUCCESS"`
- [ ] Theo acceptance sign-off

---

## How to Verify Locally

### 1. Start Local Development Environment
```bash
# From repository root
pnpm install
pnpm --filter @ropi-aoss/web dev
```

### 2. Run Unit Tests
```bash
pnpm --filter @ropi-aoss/web test:unit
```

### 3. Run E2E Tests
```bash
# Start local emulator
pnpm --filter @ropi-aoss/api emulator

# Run E2E tests
pnpm --filter @ropi-aoss/web test:e2e
```

### 4. Run Accessibility Audit
```bash
# With axe DevTools browser extension:
# 1. Open product page in browser
# 2. Open DevTools
# 3. Navigate to axe tab
# 4. Click "Analyze"
# 5. Export results to JSON
```

### 5. Test with Sample Products
Use test products from LP-phase2a-001:
- **Ready:** `product-0001` (100% completion)
- **Partial:** `product-0005` (60% completion)
- **Blocked:** `product-0007` (40% completion)

```bash
# Evaluate product using Phase 2A engine
node packages/engine/bin/evaluate.js \
  --input inventory/LP-phase2a-001/tests/inputs/product-0001.json \
  --out /tmp/test-output.json \
  --seed 12445
```

---

## Evidence Directory Structure

```
inventory/LP-phase2b-001/
├── HES-LP-phase2b-001.json       # Primary audit trail
├── README.md                      # This file
├── commands_executed.txt          # Full command history
└── evidence/
    ├── unit_test_output.txt       # Unit test results
    ├── e2e_test_output.txt        # E2E test results
    ├── accessibility_audit.json   # Axe audit results
    ├── i18n_strings.json          # Localization strings
    ├── ci_links.txt               # CI run URLs
    ├── preview_deployment.txt     # Preview URL
    ├── api_verification.txt       # API endpoint verification
    ├── feature_flag_config.json   # Feature flag configuration
    └── screenshots/
        ├── flow1_ready_product.png
        ├── flow1_export_panel.png
        ├── flow2_partial_product.png
        ├── flow2_blocking_reasons.png
        ├── flow3_blocked_product.png
        ├── flow3_segment_breakdown.png
        ├── flow4_admin_versions_list.png
        ├── flow4_admin_version_details.png
        ├── flow5_toggle_collapsed.png
        └── flow5_toggle_expanded.png
```

---

## Related Links

- **Tracking Issue:** [#469](https://github.com/twgallo13/ROPI-V2.1/issues/469)
- **LP-phase2a-001 (Engine):** [Closure Doc](https://github.com/twgallo13/ROPI-V2.1/blob/aoss-main/inventory/LP-phase2a-001/LP-PHASE2A-001-CLOSURE.md)
- **LP-phase2a-001 PR:** [#468](https://github.com/twgallo13/ROPI-V2.1/pull/468)
- **Governance:** [GOVERNANCE.md](https://github.com/twgallo13/ROPI-V2.1/blob/aoss-main/GOVERNANCE.md)
- **AI Bootstrap:** [AI_BOOTSTRAP.md](https://github.com/twgallo13/ROPI-V2.1/blob/aoss-main/AI_BOOTSTRAP.md)

---

## Timeline

- **Start:** 2026-01-09
- **Target Completion:** TBD (depends on precondition verification)
- **VVP Request:** After `result == VERIFIED_SUCCESS`
- **Merge:** After Theo acceptance sign-off

---

**End of LP-phase2b-001 README**
