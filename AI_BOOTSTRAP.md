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
- `lp_label_prefix`: `lp:` (labels start `lp:<PhaseSlug>-<SemVer>`)

---

## Quick Prompts (copy/paste for chat)

Use these prompts to start or resume phases without terminal commands.

### 1. Start a New Phase

```
Start phase "<PhaseSlug>" version <SemVer>.

Before any action:
1. Read AI_BOOTSTRAP.md and GOVERNANCE.md.
2. List open PRs with lp:* labels — confirm no conflicting phase.
3. Request explicit Phase Readiness (PRD link, acceptance criteria, scope).
4. Do NOT create branches or PRs until I approve the PRD.

Output: Draft PRD for my review.
```

### 2. Resume an Existing Chat

```
Resume phase "<PhaseSlug>-<SemVer>".

Steps:
1. Read AI_BOOTSTRAP.md and GOVERNANCE.md.
2. List open PRs with label lp:<PhaseSlug>-<SemVer>.
3. Summarize: current step, last HES, pending actions.
4. Wait for my instruction before any new action.

Output: Status summary and next recommended action.
```

### 3. Request a HES (Handoff Evidence Summary)

```
Produce a HES for step <StepLetter> of phase "<PhaseSlug>-<SemVer>".

Include:
- Branch and commit SHA
- PR number and URL
- Files changed (with line counts)
- CI status (gh pr checks output)
- Labels applied
- Any verification evidence (grep, curl, Firestore checks)
- Final line: "Phase step <StepLetter>: VERIFIED SUCCESS" or "BLOCKED: <reason>"
```

### 4. Request a PRD (Phase Requirements Document)

```
Draft a PRD for phase "<PhaseSlug>-<SemVer>".

Include:
- Phase title and slug
- Problem statement (one paragraph)
- Acceptance criteria (numbered list)
- Scope: files, packages, Firestore paths affected
- Out of scope (explicit exclusions)
- Steps (A, B, C, ...) with HES checkpoints
- Rollback plan

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

```
Close phase "<PhaseSlug>-<SemVer>".

Steps:
1. Confirm all PRs with lp:<PhaseSlug>-<SemVer> are merged or closed.
2. Update any remaining labels to state:merged or state:closed.
3. Summarize: PRs merged, commits, deploy status, Firestore verification.
4. Output: Final phase closure HES.
```

---

This file is the AI re-entry contract. Any AI session must follow it before taking actions.
