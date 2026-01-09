LP: LP-phase2a-001
Phase: Phase 2A (Engine)
PhaseSlug: phase2a

Owner: Lisa (Phase Owner)
Executor: Homer (Execution Agent)
Acceptance Authority: Theo

## Objective
Implement the deterministic Completion Evaluation Engine (pure math scoring) and canonical persistence for completion rules so Export Gate becomes authoritative and deterministic.

## Preconditions (must be verified in HES before any work)
- Cleanup Phase LP-cleanup-001..005 VERIFIED SUCCESS and artifacts persisted (PR #465 merged).
- GOVERNANCE.md and AI_BOOTSTRAP.md alignment confirmed (LP-cleanup-005).
- Branch protection and repo permissions available for required operations.
- Homer & Lisa re-affirm AI_BOOTSTRAP.md compliance (AI re-entry confirmation in HES).

## Scope (one intent)
- Implement a server-side, deterministic Completion Evaluation Engine that computes per-product completion percentages and segment scores using canonical AttributeType mappings.
- Add Firestore persistence:
  - `settings/exportSettings/completionRules` (live)
  - `settings/exportSettings/completionRulesVersions/{rulesVersion}` (immutable versions)
- Add API endpoints:
  - `GET /admin/settings/exportSettings/completionRules`
  - `PUT /admin/settings/exportSettings/completionRules` (write guarded)
  - `GET /admin/settings/exportSettings/completionRules/versions`
  - `GET /api/products/{id}/completion` (read-only deterministic evaluation)
- Include unit tests (deterministic math), integration tests, and CI checks to demonstrate deterministic outputs.
- Add VVP checklist and HES template for this LP.

## Deliverables
- Engine implementation code (server-side) with unit tests and docs.
- Persistence implementation + example rules JSON and versioning logic.
- API endpoints implemented and documented (OpenAPI or README).
- HES-LP-phase2a-001.json (Homer) with:
  - ai_reentry_confirmation (Lisa + Homer)
  - VVP evidence (test vectors, deterministic outputs)
  - commands_executed and CI run links
  - sample_checks (10 deterministic examples)
  - result: VERIFIED_SUCCESS / VERIFIED_FAILURE
- PR with implementation + tests, linked to this LP.

## HES Requirements (minimum)
- HES must be JSON and include:
  - from, to, lp, phase
  - ai_reentry_confirmation
  - inventory_snapshot_before (if applicable)
  - commands_executed
  - evidence links (unit test outputs, CI logs)
  - sample_checks: at least 10 product inputs with expected deterministic outputs
  - result

## Safety rules
- No production deploys without HES VERIFIED_SUCCESS and Acceptance sign-off.
- No data-destructive migrations in this LP. Any migration requires a separate LP + telemetry window.
- No force-pushes or direct main branch pushes unless specifically authorized by Lisa in the LP HES.
- Follow the same LP format rules: one LP = one intent, single LP label on PR, one HES per LP.

## Branch / PR strategy
- Branch: `feature/lp-phase2a-001-completion-engine`
- PR title: `LP-phase2a-001: Completion Model — Engine Implementation (Phase 2A)`
- PR labels: `state:in-progress`, `lp:phase2a-001`, `type:feature`
- PR must include HES-LP-phase2a-001.json in evidence or be linked to it.

## Acceptance criteria
- Deterministic engine math verified against provided test vectors.
- Firestore persistence implemented with versioning and read/write API verified.
- HES demonstrates deterministic test pass and CI green.
- Acceptance Authority (Theo) verifies HES and provides final acceptance; only then merge.

## Start (immediate)
- After Lisa posts the Formal Authorization (above) and PR #465 is merged, Homer should:
  1. Confirm preconditions and post ai_reentry_confirmation in HES.
  2. Create branch `feature/lp-phase2a-001-completion-engine`.
  3. Execute work per scope and produce HES-LP-phase2a-001.json.

---
**End of LP-phase2a-001**
