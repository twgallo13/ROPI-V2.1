# LP-completion-model-export-gate-1.0.0 — Execution Plan

**LP Identifier:** LP-completion-model-export-gate-1.0.0  
**Phase:** Completion Model → Export Gate (Settings-Driven, Site-Aware, Observable)  
**Issued:** 2026-01-03  
**Status:** ✅ **READY FOR EXECUTION**

---

## Executive Summary

This LP establishes **Completion** as the **single canonical export gate** in ROPI AOSS. All work is decomposed into **6 execution units** that build the end-to-end completion system:

1. **Settings persistence + versioning**
2. **Completion evaluation engine (settings-driven)**
3. **Settings UI (Completion Rules screen)**
4. **Export gate enforcement**
5. **Product blocking explanations (UI visibility)**
6. **VVP + Phase Close verification**

---

## Preconditions (Verified ✅)

| Precondition | Status | Evidence |
|--------------|--------|----------|
| Completion Contract authored | ✅ | `docs/completion/COMPLETION_CONTRACT.md` |
| Completion Rules UI Spec authored | ✅ | `docs/completion/COMPLETION_RULES_UI_SPEC.md` |
| Backend Config + Math spec authored | ✅ | `docs/completion/COMPLETION_RULES_BACKEND_CONFIG.md` + `COMPLETION_STORAGE_MATH_VVP.md` |
| Attribute Registry aligned | ✅ | `packages/sdk/config/attributeRegistry.json` v1.1.0 with categories, `requiredForExport` |
| No conflicting LP | ✅ | No active LPs blocking completion path |

---

## Non-Negotiable Invariants (Binding)

These invariants **must hold** throughout execution. Any violation halts work.

1. **Completion is the only export gate** — no parallel or fallback readiness logic
2. **Export impossible unless completion threshold met** — strict enforcement
3. **Media / pricing never block** — no exceptions
4. **No hard-coded readiness logic** — all behavior from settings + registry
5. **No UI control without effect** — every setting must affect computation
6. **No backend logic without UI visibility** — operators must see what the system does
7. **Site-aware descriptions** — missing description/SEO for any selected site blocks completion
8. **Ambiguity halts execution** — Lisa escalates if requirements unclear

---

## Execution Units (Sequential)

### **Unit 1: Settings Persistence + Versioning**

**Objective:** Store and version Completion Rules settings in Firestore.

**Deliverables:**

- [x] **Schema design:** `CompletionRulesConfig` object per backend spec
- [ ] **Firestore structure:**
  - `settings/exportSettings/completionRules` (live active rules)
  - `settings/exportSettings/completionRulesVersions/{rulesVersion}` (immutable snapshots)
  - Optional: `settings/exportSettings/completionRulesAudit/{eventId}` (audit log)
- [ ] **Validation logic:**
  - Segment weights sum to 100 (if enabled)
  - Required flags are valid enum values
  - Categories exist in registry
- [ ] **Versioning:**
  - Monotonic `rulesVersion` integer
  - Snapshot on every Save
  - Timestamp + actor tracking

**Acceptance:**

- Settings doc can be written, read, and versioned
- Validation blocks invalid configs
- Audit trail exists for all changes

---

### **Unit 2: Completion Evaluation Engine (Settings-Driven)**

**Objective:** Compute completion % deterministically from settings + registry + product data.

**Deliverables:**

- [ ] **Completion evaluation service:**
  - `calculateCompletionPct(product, rulesConfig, registry): number`
  - `getCompletionBlockingReasons(product, rulesConfig, registry): BlockingReason[]`
- [ ] **Segment evaluation logic:**
  - Resolve required attributes per segment (from registry + selector)
  - Evaluate ALL_REQUIRED vs ANY_REQUIRED
  - Handle site-aware descriptions + SEO
  - Compute segment score (0.0–1.0)
  - Weighted aggregation to completion %
- [ ] **Math compliance:**
  - Formula per `COMPLETION_STORAGE_MATH_VVP.md`
  - Deterministic (same inputs → same output)
  - Round to integer percentage
- [ ] **Blocking reasons:**
  - Segment name
  - Site (if site-aware)
  - Missing attribute IDs + labels

**Acceptance:**

- Completion % changes when settings change (no deploy needed)
- Media/pricing never affect score
- Site-aware descriptions block correctly
- Blocking reasons are explicit and complete

---

### **Unit 3: Settings UI (Completion Rules Screen)**

**Objective:** Provide single-screen settings surface to control completion behavior.

**Location:** Settings → Export Settings → Completion Rules

**Deliverables:**

- [ ] **Page layout:**
  - Header + contract panel
  - Export Unlock Threshold input (default 100)
  - Segments list (cards)
  - Exclusions panel (read-only)
- [ ] **Segment card UI:**
  - Name (editable)
  - Enabled toggle
  - Weight % input
  - Applies To scope (ALL_PRODUCTS or ONLY_SELECTED_SITES)
  - Completion Rule type (ALL vs ANY)
  - Attribute inclusion (read-only derived list)
  - Selector controls (categories, requirement flag, exclusions)
  - Preview (required count, missing count)
- [ ] **Built-in segment:**
  - Descriptions + SEO (per selected website)
  - Locked semantics (categories fixed, rule type fixed)
  - Operator can adjust: name, weight, enabled (with warning)
- [ ] **Validation UI:**
  - Error banner if weights ≠ 100
  - Disable Save if validation fails
  - Show warnings for risky changes (e.g., disabling site descriptions)
- [ ] **Save flow:**
  - Increment `rulesVersion`
  - Write to `settings/exportSettings/completionRules`
  - Create immutable snapshot
  - Record audit event
  - Show success notification

**Acceptance:**

- Every UI control has observable effect on completion
- Validation prevents invalid configs
- Built-in segment semantics cannot be broken
- Save creates version snapshot

---

### **Unit 4: Export Gate Enforcement**

**Objective:** Block export unless completion threshold met.

**Deliverables:**

- [ ] **Export service integration:**
  - Evaluate completion before export
  - If `completionPct < exportUnlockThresholdPct`: block with explicit message
  - Return blocking reasons to operator
- [ ] **Product list filtering:**
  - Show completion % per product
  - Filter by export-ready status (completion >= threshold)
- [ ] **Export button state:**
  - Disable if product not ready
  - Show tooltip with blocking reasons

**Acceptance:**

- Export impossible if completion < threshold
- Operator sees clear reason for block
- No fallback or override paths (strict gate)

---

### **Unit 5: Product Blocking Explanations (UI Visibility)**

**Objective:** Operators can always answer: "Why is this product not exportable?"

**Deliverables:**

- [ ] **Product Editor visibility:**
  - Completion % badge/indicator
  - Blocking segments list
  - Per-segment details (missing attributes + labels)
  - Site-specific blocks (if applicable)
- [ ] **Product List visibility:**
  - Completion % column
  - Export-ready status badge
  - Tooltip with blocking summary
- [ ] **Export preview:**
  - Show blocked products with reasons
  - List missing attributes by segment

**Acceptance:**

- For any blocked product, operator can identify:
  - Which segment blocks
  - Which site (if site-aware)
  - Which attributes are missing (by ID + label)
- No hidden or unexplained blocks

---

### **Unit 6: VVP + Phase Close Verification**

**Objective:** Evidence-bound verification that completion system works end-to-end.

**Deliverables:**

- [ ] **VVP execution:** Per `COMPLETION_STORAGE_MATH_VVP.md` checks
  - **A. Settings control proof:** Change weight → completion % changes
  - **B. Exclusions proof:** Media/pricing have zero effect
  - **C. Site-aware descriptions proof:** Missing description blocks, filling unblocks
  - **D. Rule type proof:** ANY vs ALL behavior verified
  - **E. No dead controls proof:** Every UI control affects output
- [ ] **HES (Homer Execution Summary):**
  - PRs created
  - Files changed
  - Tests added/passing
  - CI status
  - Deployment status
- [ ] **Phase Close checklist:**
  - All 6 units delivered
  - VVP passed with evidence
  - No open blockers
  - Documentation updated
  - Phase archived

**Acceptance:**

- VVP checks pass with operator-visible evidence
- HES is complete and compliant
- Phase can be closed

---

## Scope Boundaries (Explicit)

### In Scope

- Completion Rules settings surface (1 screen)
- Completion evaluation engine (deterministic math)
- Export gate enforcement (strict)
- Site-aware description + SEO blocking
- Operator-visible blocking explanations
- VVP + evidence-bound verification

### Out of Scope (Deferred or Excluded)

- ❌ KPI dashboards (completion % analytics)
- ❌ Analytics aggregation (completion trends)
- ❌ Performance tuning (optimization is post-MVP)
- ❌ Cross-system orchestration (e.g., inventory sync)
- ❌ Bulk completion editing (future feature)

---

## Dependencies

| Dependency | Status | Notes |
|------------|--------|-------|
| Attribute Registry v1.1.0 | ✅ Available | Categories + metadata aligned |
| Firestore rules (write access to settings) | ✅ Available | LP-smart-rules-firestore-rules-1.0.0 deployed |
| Export service | ✅ Available | `packages/api/src/services/exportService.ts` |
| Product Editor UI | ✅ Available | Can integrate completion visibility |

---

## Risks + Mitigations

| Risk | Mitigation |
|------|------------|
| Legacy completion logic may surface | Search codebase for `calculateExportReadiness`, replace with completion-based logic |
| Weighting semantics ambiguous | Math spec is explicit; defer optimization to post-MVP |
| Site-aware logic complex | Built-in segment has locked semantics; test VVP check C |
| Performance concerns | Defer optimization; prioritize correctness |

---

## Execution Authorization

**Homer is authorized to execute Units 1–6 sequentially.**

**Constraints:**

- One PR per unit (atomic, reviewable)
- HES per PR
- CI must pass before merge
- No work outside the 6 units without Lisa authorization
- Ambiguity halts execution → escalate to Lisa

**Reporting:**

- PR opened → notify Lisa
- PR merged → update execution plan
- VVP check complete → attach evidence
- Phase close → archive with final HES

---

## Next Steps (Immediate)

1. **Homer:** Begin Unit 1 (Settings Persistence + Versioning)
2. **Lisa:** Monitor execution state, enforce invariants, halt on ambiguity
3. **Verification:** After each unit, run relevant VVP checks

---

**Execution Plan Status:** ✅ **PUBLISHED**  
**Homer Authorization:** ✅ **GRANTED**  
**Phase Gate:** 🟢 **OPEN**

---

_This execution plan is the canonical work breakdown for LP-completion-model-export-gate-1.0.0. All work must align with this plan. Changes require Lisa authorization and re-versioning._
