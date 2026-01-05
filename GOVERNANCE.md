# GOVERNANCE.md — Repository Governance / Execution Contract

**Purpose:**  
This document is the single authoritative reference describing how work is proposed, executed, validated and completed in this repository. It maps the project-level governance you provided into repository artifacts and enforcement points so humans and AIs can operate deterministically.

---

## Overview (one-line)
Work proceeds in **phases**. Each phase is governed by a single PhaseSlug and a sequence of LPs. Every LP maps to exactly one PR. All execution is evidence-bound: immutable artifacts (SHAs, PRs, CI run IDs, deploy URLs, Firestore reads) are required to verify claims.

## Core concepts
- **Phase** — high-level work unit (PhaseSlug). Lifecycle: Ready → Execute → Verify → Complete.  
- **LP (Lisa Prompt)** — `LP-<PhaseSlug>-<SemVer>`. Governs a single deterministic execution. LPs are immutable.  
- **HES (Homer Execution Summary)** — strict evidence-only summary produced by Homer after each LP.  
- **Authority:** Lisa (governance/orchestration), Homer (executor), John (human relay).

## Phase Readiness Gate (HARD)
Before any LP is issued, Lisa must confirm Phase Readiness with these evidence items (no exceptions):
1. **Docs:** `GOVERNANCE.md`, `AI_BOOTSTRAP.md`, `README.md` exist and link each other.  
2. **Registry:** `packages/sdk/config/attributeRegistry.json` exists and is documented in `docs/ATTRIBUTE-REGISTRY.md`.  
3. **Registry sync verification:** Firestore doc `settings/attributesMeta.registry_version` equals local registry `version` OR an approved plan to sync exists.  
4. **Service Account:** Deploy SA exists and repository environment contains `GCP_SA_KEY_BASE64` (or Workload Identity mapped).  
5. **CI & workflows:** Deploy workflow configured to use the SA; PR status checks exist.  
If any item is missing, the phase cannot start and Lisa must require evidence or pause.

## LP format & PhaseSlug rules (MANDATORY)
- LP format: `LP-<PhaseSlug>-<SemVer>` (e.g., `LP-service-account-ropi-deploy-1.0.0`).  
- PhaseSlug: kebab-case, short, constant for the phase.  
- Semantic version: major.minor.patch (phase-scoped).

## LP → PR mapping (HARD)
- Each LP maps to one PR. The PR title or body must include the LP string.  
- PR labels: exactly one `state:*`, exactly one `lp:<PhaseSlug>-<SemVer>`. Optional `type:*`. Add `cleanup:required` at open.

## Pull Request labels taxonomy (required)
- **State (exactly one):** `state:planned`, `state:in-progress`, `state:review`, `state:changes-requested`, `state:approved`, `state:merged`, `state:closed`  
- **LP (exactly one):** `lp:<PhaseSlug>-<SemVer>`  
- **Type (optional):** `type:docs`, `type:infra`, `type:feature`, `type:fix`, `type:chore`  
- **Blocking:** `blocked:decision-needed`, `blocked:dependency`, `blocked:ci-failure`, `blocked:external`, `blocked:coderabbit-review`  
- **Cleanup:** `cleanup:required`, `cleanup:done`

## HES (Homer Execution Summary) — Strict schema (MANDATORY)
HES is produced by Homer after each LP execution and must be included in the PR body (or linked). HES must contain immutable references and no interpretation.

### Required HES fields:
1. `From: Homer` `To: Lisa` `LP: LP-<PhaseSlug>-<SemVer>`  
2. Actions executed (branches created, commits SHAs)  
3. Artifacts created/modified (files, paths, commits)  
4. PR URLs and numbers (if created)  
5. CI run IDs and direct URLs for required checks  
6. Deploy or staging URLs and deploy run IDs (if applicable)  
7. Firestore evidence (full doc JSON for `settings/attributesMeta` and sample attribute docs)  
8. Exact command outputs or links to logs (gcloud auth lines, firebase deploy success)  
9. Explicit `VERIFIED SUCCESS` or `VERIFIED FAILURE` line (no partials)  

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

## Authority boundaries
- Lisa: final governance authority for phases, issues LPs, validates HES.  
- Homer: execute exactly as instructed, produce HES, and not alter governance.  
- John: human relay and approver when required.

## Phase Readiness quick checklist (for PR templates)
- `packages/sdk/config/attributeRegistry.json` present and versioned  
- `settings/attributesMeta` Firestore doc either matches local version or sync scheduled  
- Deploy SA and GitHub secret `GCP_SA_KEY_BASE64` present  
- LP label applied and PR body includes HES or HES placeholder  
- `deploy-precheck` & `e2e` tests required
- `e2e-smoke` tests required for changes touching observations code (LP-1.6.0)

## PR Template (reference)
Add the following to `.github/PULL_REQUEST_TEMPLATE.md` (example):

```
LP: LP-<PhaseSlug>-<SemVer>
HES: [paste or link to HES here]
Labels: state:in-progress, lp:<PhaseSlug>-<SemVer>, type:docs
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
