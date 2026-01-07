# AI_BOOTSTRAP.md — AI & cold-start entry contract

**Purpose (one-paragraph):**  
This file is the deterministic, pointer-only AI bootstrap for the ROPI AOSS repository. It allows a new chat or agent to orient itself from GitHub as the source-of-truth before taking action. It is intentionally short and non-prescriptive — it only points to canonical artifacts and gives a minimal "how to resume" checklist.

## Canonical repo description (one line)
ROPI AOSS — Admin Order & Staging System. Monorepo: `packages/cli`, `packages/sdk`, `packages/api`, `packages/web`. The product attribute registry lives in `packages/sdk/config/attributeRegistry.json` and is the JSON source-of-truth that syncs to Firestore at `settings/attributes/keys/{attributeId}`.

## Canonical sources of truth (links only)
- `README.md` — Top-level orientation and links  
- `GOVERNANCE.md` — Repository governance (authoritative)  
- `docs/DEPLOYMENT.md` — Deployment runbook (SA, workflows)  
- `docs/ATTRIBUTE-REGISTRY.md` — Registry reference & sync flow  
- `packages/sdk/config/attributeRegistry.json` — Registry JSON (canonical)

## How to resume work in a new chat (MANDATORY)
1. Read `AI_BOOTSTRAP.md` (this file).  
2. Read `GOVERNANCE.md` (authoritative). Do not skip.  
3. List open PRs with `lp:*` labels and identify active PhaseSlug.  
4. Ask: "Which phase is active?" — wait for human/Lisa to confirm before any action.  
5. If asked to act, require explicit Phase Readiness evidence (see GOVERNANCE.md Phase Readiness Gate).

## Explicit prohibitions
- No assumptions about intent or environment.  
- No code changes without an LP-compliant PR and required HES.  
- Do not bypass `GOVERNANCE.md` rules.

## Minimal machine-readable hints (for agents)
- `registry_path`: `packages/sdk/config/attributeRegistry.json`  
- `registry_firestore_meta`: `settings/attributesMeta`  
- `lp_label_prefix`: `lp:` (labels formatted as `lp:<PhaseSlug>-<NNN>`, e.g., `lp:export-global-001`)

---

## Quick Prompts (copy/paste for chat)

Use these prompts to start or resume phases without terminal commands.

### 1. Start a New Phase

```
Start phase "<PhaseName>" (slug: <PhaseSlug>).

Before any action:
1. Read AI_BOOTSTRAP.md and GOVERNANCE.md.
2. List open PRs with lp:* labels — confirm no conflicting phase.
3. Request explicit Phase Readiness (PRD link, acceptance criteria, scope).
4. Do NOT create branches or PRs until I approve the PRD.
5. LP numbering starts at LP-<PhaseSlug>-001.

Output: Draft PRD for my review.
```

### 2. Resume an Existing Chat

```
Resume phase "<PhaseSlug>".

Steps:
1. Read AI_BOOTSTRAP.md and GOVERNANCE.md.
2. List open PRs with label lp:<PhaseSlug>-* (any LP number).
3. Summarize: current step, last HES, next LP number, pending actions.
4. Wait for my instruction before any new action.

Output: Status summary and next recommended action.
```

### 3. Request a HES (Homer Execution Summary)

```
Produce a HES for LP-<PhaseSlug>-<NNN>.

Include:
- Branch and commit SHA
- PR number and URL
- Files changed (with line counts)
- CI status (gh pr checks output)
- Labels applied (especially lp:<PhaseSlug>-<NNN>)
- Any verification evidence (grep, curl, Firestore checks)
- Final line: "LP-<PhaseSlug>-<NNN>: VERIFIED SUCCESS" or "BLOCKED: <reason>"
```

### 4. Request a PRD (Phase Readiness Document)

```
Draft a PRD for phase "<PhaseSlug>".

Include:
- PhaseName (human-readable)
- PhaseSlug (kebab-case, immutable)
- Problem statement (one paragraph)
- Acceptance criteria (numbered list)
- Scope: files, packages, Firestore paths affected
- Out of scope (explicit exclusions)
- LPs planned (A, B, C, ...) with HES checkpoints
- Rollback plan
- Note: First LP will be LP-<PhaseSlug>-001

Output: PRD for my approval before any implementation.
```

### 5. Quick Tests / Verification

```
Run verification for phase "<PhaseSlug>-<SemVer>".

Checks:
1. Confirm branch exists and is up to date with aoss-main.
2. Run CI checks (gh pr checks <PR_NUMBER>).
3. Verify Firestore paths if applicable (settings/attributesMeta, etc.).
4. Grep for known patterns to confirm changes applied.
5. Curl staging endpoint if applicable.

Output: Pass/fail summary with evidence.
```

### 6. Merge Authorization

```
I authorize merging PR #<NUMBER>.

Use squash merge and delete the branch:
gh pr merge <NUMBER> --squash --delete-branch --body "<commit message>"

After merge:
1. Update labels: remove state:in-progress, cleanup:required; add state:merged, cleanup:done.
2. Confirm branch deleted.
3. Return merge commit SHA and final PR state as evidence.
```

### 7. Close / Archive a Phase

### 7. Close / Archive a Phase

```
Close phase "<PhaseSlug>".

Steps:
1. Confirm all PRs with lp:<PhaseSlug>-* are merged or closed.
2. Update any remaining labels to state:merged or state:closed.
3. Summarize: all LPs completed, PRs merged, deploy status, Firestore verification.
4. Output: Final phase closure HES.
```

---

This file is the AI re-entry contract. Any AI session must follow it before taking actions.
