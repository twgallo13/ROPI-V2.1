# GOVERNANCE.md — Repository Governance / Execution Contract

> **Canonical Workflow Authority**
>
> This document (`GOVERNANCE.md`) is the **single authoritative workflow** for this repository.
> Any workflow rule, process, or convention not present in this document is **non-authoritative**.
> `docs/WORKFLOW.md` is deprecated for governance; it remains for reference only.

**Purpose:**  
This document is the single authoritative reference describing how work is proposed, executed, validated and completed in this repository. It maps the project-level governance you provided into repository artifacts and enforcement points so humans and AIs can operate deterministically.

---

## Overview (one-line)
Work proceeds in **phases**. Each phase is a bounded execution container governed by a single PhaseSlug and a sequence of LPs. Every LP maps to exactly one PR. All execution is evidence-bound: immutable artifacts (SHAs, PRs, CI run IDs, deploy URLs, Firestore reads) are required to verify claims.

## Core concepts
- **Phase** — bounded execution container (PhaseSlug, immutable once started). Not versioned. Lifecycle: Ready → Execute → Verify → Complete.  
- **LP (Lisa Protocol)** — `LP-<PhaseSlug>-<NNN>` (e.g., `LP-export-global-001`). Sequential numbering per phase. Each LP governs one deterministic execution and maps to exactly one PR. LPs are immutable.  
- **HES (Homer Execution Summary)** — strict evidence-only summary produced by Homer after each LP.  
- **Authority Roles:** Lisa (Phase Owner — governance, LP issuance), Homer (Executor — PRs, CI, deploy), Acceptance Authority (human verification only, never merge).

## Phase Readiness Gate (HARD)
Before any LP is issued, Lisa must confirm Phase Readiness with these evidence items (no exceptions):
1. **Docs:** `GOVERNANCE.md`, `AI_BOOTSTRAP.md`, `README.md` exist and link each other.  
2. **Registry:** `packages/sdk/config/attributeRegistry.json` exists and is documented in `docs/ATTRIBUTE-REGISTRY.md`.  
3. **Registry sync verification:** Firestore doc `settings/attributesMeta.registry_version` equals local registry `version` OR an approved plan to sync exists.  
4. **Service Account:** Deploy SA exists and repository environment contains `GCP_SA_KEY_BASE64` (or Workload Identity mapped).  
5. **CI & workflows:** Deploy workflow configured to use the SA; PR status checks exist.  
If any item is missing, the phase cannot start and Lisa must require evidence or pause.

### PRD (Phase Readiness Document) Authority & Acceptance Authority Role
- **PRD authorship & publication:** PRD is authored and published by Lisa as the Phase Owner.  
- **Execution gate:** PRD does **NOT** require Acceptance Authority approval to start LP execution.  
- **Acceptance Authority scope:** Limited to verifying observable outcomes (VVP + receipts) and accepting/rejecting phase completion. Acceptance Authority does not approve PRD, does not gate execution start, and does not merge or manage GitHub workflows.

## Phase Identity & LP Numbering (MANDATORY)

### Phase Identity (Immutable Once Started)
- **PhaseName** — human-readable phase name (e.g., "Export Global Features").  
- **PhaseSlug** — kebab-case identifier (e.g., `export-global`). Set once, never changes.  
- **Phase Versioning** — Phases are NOT versioned. A phase is a container. Changes to scope require a new phase.  

### LP Format & Sequencing
- LP format: `LP-<PhaseSlug>-<NNN>` where NNN is a zero-padded sequential number (001, 002, 003, …).  
  - Example: `LP-export-global-001`, `LP-export-global-002`, `LP-export-global-003`.  
- **Sequential rule:** Numbers never reset within a phase. Never reuse or skip numbers.  
- **Immutable rule:** Once an LP is issued, it cannot be edited or renumbered.

## LP → PR mapping (HARD)
- Each LP maps to one PR. The PR title or body must include the exact LP string.  
- PR labels: exactly one `state:*`, exactly one `lp:<PhaseSlug>-<NNN>`. Optional `type:*`. Add `cleanup:required` at open.
- Example label: `lp:export-global-001`

## Pull Request labels taxonomy (required)
- **State (exactly one):** `state:planned`, `state:in-progress`, `state:review`, `state:changes-requested`, `state:approved`, `state:merged`, `state:closed`  
- **LP (exactly one):** `lp:<PhaseSlug>-<NNN>` (e.g., `lp:export-global-001`)  
- **Type (optional):** `type:docs`, `type:infra`, `type:feature`, `type:fix`, `type:chore`  
- **Blocking:** `blocked:decision-needed`, `blocked:dependency`, `blocked:ci-failure`, `blocked:external`, `blocked:coderabbit-review`  
- **Cleanup:** `cleanup:required`, `cleanup:done`

## HES (Homer Execution Summary) — Strict schema (MANDATORY)
HES is produced by Homer after each LP execution and must be included in the PR body (or linked). HES must contain immutable references and no interpretation.

### Required HES fields:
1. `from: Homer` | `to: Lisa` | `lp: LP-<PhaseSlug>-<NNN>`  
2. `branch` — git branch name  
3. `prNumber` and `prUrl` — pull request identifier and URL  
4. `filesChanged` — array of file changes with actions (created, modified, deleted)  
5. `commitShas` — array of commit SHAs  
6. `ciRuns` — CI check results (name, runId, runUrl, status)  
7. `deployInfo` — deploy details if applicable (runId, stagingUrl, deployedAt)  
8. `verification` — per-criterion evidence (status: PASS or FAIL)  
9. `result` — final outcome: `VERIFIED SUCCESS` or `VERIFIED FAILURE` (no partials)  

**No interpretation. No recommendations. No fuzzy statements.**

## Phase Execution & Acceptance Criteria
- A phase completes only when: all LPs issued, all PRs merged/closed, branches cleaned, `cleanup:done` labels set, required CI checks passed, staging validated, and Lisa explicitly marks the phase complete.  
- Each acceptance criterion must be validated using immutable artifacts.

## CodeRabbit & Automation (enforcement)
- Every PR must include CodeRabbit review results. If CodeRabbit comments exist and are unresolved, add `blocked:coderabbit-review`. Only Lisa may remove that block.  
- GitHub Actions: enforce LP presence (LP-lint), HES check, and phase-readiness-check where applicable. Branch protection should require these actions before merge.

## Evidence requirements (exact)
All claims must reference:
- Repo name, branch, commit SHA(s), PR URL(s)  
- CI run IDs and URLs for required checks  
- Deploy run IDs and staging URLs  
- Firestore read commands or screenshots for `settings/attributesMeta` and at least one attribute doc  
Absence of evidence = non-verifiable = phase hold.

## Authority Boundaries (Non-Negotiable)
- **Lisa (Phase Owner):** Issues LPs, governs phase scope, validates HES, approves PRs for merge.  
- **Homer (Executor):** Executes LP directives exactly as written, creates PRs, produces HES, manages CI and deploy.  
- **Acceptance Authority (Human):** Verifies VVP and final receipts. Does NOT merge. Does NOT issue LPs.  
- **Merge Authority:** Homer or designated repo maintainer (never Acceptance Authority).

## Phase Readiness quick checklist (for PR templates)
- `packages/sdk/config/attributeRegistry.json` present and versioned  
- `settings/attributesMeta` Firestore doc either matches local version or sync scheduled  
- Deploy SA and GitHub secret `GCP_SA_KEY_BASE64` present  
- LP label applied (format: `lp:<PhaseSlug>-<NNN>`) and PR body includes HES or HES placeholder  
- `deploy-precheck` & `e2e` tests required  
- `e2e-smoke` tests required for changes touching observations code

## PR Template (reference)
Add the following to `.github/PULL_REQUEST_TEMPLATE.md` (example):

```
LP: LP-<PhaseSlug>-<NNN>
HES: [paste or link to HES here]
Labels: state:in-progress, lp:<PhaseSlug>-<NNN>, type:docs
Checklist: [ ] Phase readiness satisfied
```

## Phase completion & cleanup
- After merge & staging verified, the actor must add `cleanup:done`, remove temporary branches, and produce a final HES marking the phase `VERIFIED SUCCESS`.

---

## Execution Rules

If no new evidence is discovered after one complete repo scan, execution must stop and escalate for direction. Re-running searches without new inputs is not allowed.

---

## Change control & updates
This governance file is the authoritative policy. Changes must follow the LP process and be documented with a new LP and PR.
