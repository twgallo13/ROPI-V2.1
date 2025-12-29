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

This file is the AI re-entry contract. Any AI session must follow it before taking actions.
