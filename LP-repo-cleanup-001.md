# LP-repo-cleanup-001: Repo Inventory + Classification

**From:** Lisa  
**To:** Homer  
**Phase:** repo-cleanup  
**LP:** LP-repo-cleanup-001  
**Status:** ISSUED  
**Date:** 2026-01-08

---

## Objective

Produce a comprehensive inventory and classification of all GitHub repository artifacts (branches, PRs, issues, release tags) with repeatable classification rules. **NO CHANGES** are to be executed — this is discovery and analysis only.

---

## Scope

### 1. Inventory Collection

Collect and document the following from `twgallo13/ROPI-V2.1`:

#### A) Branches
- List ALL branches (not just open)
- For each branch, capture:
  - Branch name
  - Last commit date
  - Last commit SHA
  - Last author
  - Whether protected
  - Associated PR (if any)

#### B) Pull Requests
- List ALL PRs (open, closed, merged)
- For each PR, capture:
  - PR number
  - Title
  - State (open/closed/merged)
  - Labels (current)
  - Author
  - Created date
  - Last updated date
  - Linked LP (if present in title/body/labels)
  - Branch name
  - Merge status

#### C) Issues
- List ALL issues (open, closed)
- For each issue, capture:
  - Issue number
  - Title
  - State (open/closed)
  - Labels (current)
  - Author
  - Created date
  - Last updated date

#### D) Release Tags
- List ALL release tags (if any exist)
- For each tag, capture:
  - Tag name
  - Target commit SHA
  - Created date
  - Associated release notes (if any)

---

### 2. Classification Rules Definition

Define explicit, repeatable rules for classifying each artifact. Rules must be objective and measurable.

#### Suggested Classification Categories:

1. **Active / Keep**
   - Criteria: Associated with open work, recent activity (< 30 days), or protected status
   
2. **Stale / Close**
   - Criteria: No activity for > 90 days, no open PRs, not referenced by other work
   
3. **Replace / Superseded**
   - Criteria: Explicitly superseded by another PR/branch/issue (document replacement)
   
4. **Delete Candidate**
   - Criteria: Merged and branch not deleted, or abandoned with clear justification
   - Must include risk assessment: "Safe to delete" or "Uncertain — convert to archive/keep"

#### Branch Protection Rules

Document which branches are protected and must NEVER be deleted:
- `aoss-main` (default branch) — PROTECTED
- Any other protected branches identified

#### Naming Pattern Analysis

Identify and document common naming patterns:
- `LP-*` branches
- `feature/*` branches
- `chore/*` branches
- `fix/*` branches
- Adhoc/unnamed branches

---

### 3. Classification Application

Apply classification rules to each artifact and produce a structured output with:

- Artifact identifier (branch name, PR #, issue #, tag name)
- Artifact type (branch/PR/issue/tag)
- Classification (Active/Keep, Stale/Close, Replace/Superseded, Delete Candidate)
- Justification (which rule applied)
- Risk notes (if Delete Candidate: safe vs. uncertain)
- Recommended action (if any)

---

## Deliverables

Homer must produce the following artifacts:

### 1. Raw Inventory (JSON or CSV)
- `inventory-branches.json` — all branches with metadata
- `inventory-prs.json` — all PRs with metadata
- `inventory-issues.json` — all issues with metadata
- `inventory-tags.json` — all release tags with metadata

### 2. Classification Rules Document (Markdown)
- `classification-rules.md` — formal definition of rules used
- Must be repeatable and objective

### 3. Classified Inventory (Markdown Summary)
- `classified-inventory.md` — summary of artifacts by classification
- Include counts: 
  - X branches (Y active, Z stale, W delete candidate)
  - X PRs (Y open, Z closed, W merged)
  - X issues (Y open, Z closed)
  - X tags

### 4. HES (Homer Execution Summary)
- `HES-LP-repo-cleanup-001.json` — evidence of inventory collection
- Must include:
  - Commands run (e.g., `gh pr list`, `gh api repos/...`)
  - Timestamp of data collection
  - Commit SHA at time of collection
  - File paths to deliverables
  - Result: `VERIFIED SUCCESS` (inventory complete) or `VERIFIED FAILURE` (with blocker)

---

## Execution Rules

1. **Read-only operations ONLY** — no writes, no deletes, no closes, no label changes
2. **Use GitHub API or gh CLI** to collect data programmatically
3. **Capture raw data first** before applying classification
4. **Document collection method** so it can be reproduced
5. **No interpretation or recommendations** beyond applying defined rules
6. **Stop if blocked** — do not guess or infer

---

## Acceptance Criteria

This LP is complete when:

- [ ] All four inventory files delivered (branches, PRs, issues, tags)
- [ ] Classification rules document delivered
- [ ] Classified inventory summary delivered
- [ ] HES delivered with immutable evidence
- [ ] No changes executed (read-only verification)
- [ ] Lisa receives deliverables for review

---

## Safety Notes

- This LP makes NO changes to the repository
- All data collection is read-only
- Classification rules are for planning only — no automated actions
- Delete candidates require explicit approval in subsequent LPs

---

**Status:** ISSUED  
**Next Action:** Homer to execute and deliver artifacts  
**Expected Timeline:** 1 execution cycle (no dependencies)

---

## Homer — Execution Directive

You are authorized to begin execution of LP-repo-cleanup-001.

Produce all deliverables and HES, then return control to Lisa for review.

Do NOT proceed to LP-002 without explicit authorization.
