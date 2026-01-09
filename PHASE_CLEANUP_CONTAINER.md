# PHASE: Cleanup & Repo Alignment

**PhaseSlug:** `repo-cleanup`  
**Phase Owner:** Lisa  
**Executor:** Homer  
**Status:** Ready  
**Created:** 2026-01-08

---

## Objective

Execute a safe, systematic cleanup and organization pass on the ROPI-V2.1 GitHub repository to achieve full alignment with:

- **Start Phase Workflow V5.1** (Notion reference)
- **GOVERNANCE.md** (repo authoritative)
- **AI_BOOTSTRAP.md** (mandatory re-entry contract)

**Source of truth:** Repository wins. If Notion and repo conflict → repo wins and work pauses until repo is repaired.

---

## Authority & Role Boundaries

- **Lisa (Phase Owner):** Plans, scopes, issues LPs, orchestrates with Homer. Does NOT execute repo changes.
- **Homer (Executor):** Executes LPs (branch ops, PR ops, labeling, deletion, merges), produces receipts (HES/VVP).
- **John (Acceptance Authority):** Reviews receipts and confirms reality. Does NOT execute.

---

## Phase Type & LP Numbering

- **Phase Type:** Cleanup Phase (not versioned)
- **LP Format:** `LP-repo-cleanup-NNN` (sequential)
- **LP Scope:** One LP = one intent. No combined "mega LP."

---

## AI Re-Entry Contract Affirmation

**AI_BOOTSTRAP.md Compliance:**  
✅ CONFIRMED — Lisa and Homer re-affirm compliance with AI_BOOTSTRAP.md as mandatory re-entry contract.

**Governance Alignment:**  
✅ CONFIRMED — GOVERNANCE.md reviewed and understood. All work follows phase-based workflow with LP-scoped execution.

**Critical Rules Acknowledged:**
- Phases are NOT versioned
- LPs are sequential and immutable: `LP-repo-cleanup-001`, `LP-repo-cleanup-002`, etc.
- Each LP maps to exactly one PR
- Repo is source of truth (overrides Notion if conflict exists)
- Evidence-bound execution required (HES for all changes)

---

## Cleanup Scope Overview

The cleanup work is broken into separate immutable LPs covering:

### LP-A: Repo Inventory + Classification
- Produce comprehensive list of branches, PRs, issues, release tags
- Classify each item: Active/Keep, Stale/Close, Replace/Superseded, Delete candidate
- Define repeatable classification rules (naming patterns, staleness criteria, protected branches)
- **No changes executed** — inventory and classification only

### LP-B: Labeling + State Normalization
- Standardize labels for PRs/issues (blocked, needs-info, superseded, wontfix, cleanup, governance, workflow, stale-candidate)
- Apply labels consistently
- Add brief closure notes where needed (no vague "closing")

### LP-C: PR Hygiene
- Close PRs that are superseded/abandoned with clear reason + pointer (if replacement exists)
- Ensure remaining PRs have:
  - Clear title + scope
  - Linked LP (if applicable)
  - No mixed intents

### LP-D: Branch Hygiene (Safe)
- Identify branches safe to delete
- Ensure default branch protections are correct
- Delete only explicitly approved branches
- Convert uncertain cases to "archive/keep" rather than delete

### LP-E: Governance/Workflow Alignment Patch
- If V5.1 / GOVERNANCE / AI_BOOTSTRAP are missing, outdated, or inconsistent inside repo:
  - Open PR to correct repo docs (repo wins)
- If Notion conflicts exist, note as discrepancy but do NOT treat Notion as authority

---

## Safety Rules (Non-Negotiable)

1. **Prefer close + label over delete** when uncertainty exists
2. **No force-pushes** unless governance explicitly allows and it's LP-authorized
3. **No merges/deploys** as part of cleanup unless dedicated LP exists and John approves receipts
4. **Immutable artifacts required:** All changes must produce HES evidence

---

## Evidence Requirements (Receipts)

For each LP execution, Homer must provide:

1. **Before/after snapshots** — counts of branches/PRs/issues
2. **Link list of items changed** — PRs closed, branches deleted, labels applied
3. **HES** — what changed, why, proof (immutable references)
4. **VVP artifacts** — if validation is relevant

---

## Acceptance Gate

Do NOT declare "cleanup complete" until:

1. Inventory list + classification rules delivered
2. Executed LP receipts from Homer provided
3. Single "current repo state summary" presented for verification

---

## Phase Readiness Checklist

- [x] `AI_BOOTSTRAP.md` exists and compliance affirmed
- [x] `GOVERNANCE.md` exists and alignment confirmed
- [x] Phase container document created (this file)
- [x] PhaseSlug defined: `repo-cleanup`
- [x] LP numbering format established: `LP-repo-cleanup-NNN`
- [ ] LP-001 issued and ready for execution

---

## LP Sequence Plan

| LP ID | Scope | Status |
|-------|-------|--------|
| LP-repo-cleanup-001 | Repo inventory + classification | Ready to issue |
| LP-repo-cleanup-002 | Labeling + state normalization | Pending LP-001 |
| LP-repo-cleanup-003 | PR hygiene | Pending LP-002 |
| LP-repo-cleanup-004 | Branch hygiene (safe) | Pending LP-003 |
| LP-repo-cleanup-005 | Governance/workflow alignment patch | Pending LP-004 |

---

## Notes

- Phase is NOT versioned — this is a cleanup container
- Work proceeds sequentially: LP-001 → LP-002 → LP-003 → LP-004 → LP-005
- No LP may begin until prior LP receipts are accepted
- If any governance rule is unclear during execution, work must STOP and raise the issue

---

**Phase Status:** READY  
**Next Action:** Issue LP-repo-cleanup-001
