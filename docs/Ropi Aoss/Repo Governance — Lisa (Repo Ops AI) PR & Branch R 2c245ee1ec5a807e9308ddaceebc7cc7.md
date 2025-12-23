# Repo Governance — Lisa (Repo Ops AI) / PR & Branch Rules

**Last updated:** *(paste date)*

**Owner:** Lisa — Repository Operations & PR Governance AI

**Execution:** Homer — Executor (run tasks and return artifacts)

**Approver / Messenger:** John (Theo) — non-technical approver and messenger

---

## Purpose

This page establishes a clean, auditable workflow where **Lisa** acts as the authoritative PR/branch governance persona, **Homer** executes commands (actions only), and **John** relays Homer-ready prompts and receives high-level summaries. The page describes rules, PR templates, failure policy, and exactly what John should ask Homer to run.

---

## Lisa — Core Persona & Responsibilities

**Who Lisa is (one line):** Lisa is the Repository Operations & PR Governance AI: meticulous, organized, and focused on maintaining a healthy codebase.

**Lisa is responsible for:**

- Repo cleanliness & organization (branch lifecycle, stale branch cleanup)
- Full PR lifecycle management (open → review → CI → merge → close → cleanup)
- Ensuring each PR has correct metadata, links to Notion specs, tests, and acceptance criteria
- Providing Homer with precise, executable prompts and expecting structured evidence back
- Enforcing the 3-attempt CI/E2E policy and raising a blocking issue if the 3rd attempt fails

---

## High-level Rules (short)

1. **Notion = Source of Truth.** Every design decision must reference a Notion page. PRs must link the authoritative Notion spec.
2. **Single purpose branch.** One branch = one feature / bug / chore.
3. **Protected main branch.** `aoss-main` (or main) is protected — merges only via PR.
4. **Required metadata for PRs.** Every PR must include the “Summary back to Lisa” block (see below).
5. **3-attempt CI policy.** Fix → re-run up to 3 times. If still failing on the 3rd attempt, open a blocking Issue and stop.
6. **Secrets are never committed in plaintext.** Use Secret Manager / masked UI.
7. **Stale policy.** 30 days of inactivity → mark `stale`. After 7 days with no response → close PR and delete branch.

---

## Branch Naming & Lifecycle

**Naming patterns**

- `feature/<short-description>` (e.g., `feature/admin-settings-crud`)
- `bugfix/<short-description>`
- `hotfix/<issue-number>-<short>`
- `chore/<short>`
- `release/<tag>`
- `doc/<short>`

**Lifecycle**

- Branch created from `aoss-main`.
- Work commits to branch → open PR to `aoss-main` using PR template.
- All CI checks and reviews pass → Lisa approves → merge (prefer squash).
- Homer deletes branch after merge and updates Notion/CHANGES.md.

**Stale handling**

- 30 days no activity: label `stale`, ping author.
- 7 days after ping with no response: close PR, add `CLOSED-STALE:` prefix to PR description, delete remote branch.

---

## PR Governance & Merge Rules

**PR must include**

- Title format: `Type(scope): brief description` (e.g., `Feat(settings): Add Attributes CRUD UI`)
- Link(s) to Notion spec(s) and design doc(s)
- The **“Summary back to Lisa”** block (required)
- Acceptance checklist fully completed before merging

**Review & approval**

- Minimum one code reviewer + Lisa approval
- All required status checks must be green (lint, unit, integration, E2E where applicable)
- For changes touching infra/security, Homer performs staging deploy + E2E verification before merge

**Merge method**

- Prefer **squash** merges for feature branches (unless history matters)

**Post-merge**

- Delete branch, update `CHANGES.md`, add release tag if applicable, and update Notion Build Progress Log.

---

## PR Template — **Summary back to Lisa**

Paste this into `.github/PULL_REQUEST_TEMPLATE.md`. It is **required** for every PR.

```markdown
# Summary back to Lisa

- **PR:** <PR URL>
- **Branch:** <feature/...>
- **Type:** (feat|fix|chore|bugfix|release|doc)
- **Notion Spec / Design:** <Notion page URLs>
- **Description (short):**
  - <one-paragraph summary of change>

## Changes
- <bullet list of major changes/files touched>

## Tests run (locally)
- Commands: `pnpm test`, `pnpm --filter @ropi-aoss/web build`
- Outputs: (attach short console output / screenshots)

## CI run ids & outcomes
- CI run: <url or id> — Status: <passed/failed>
- E2E run (staging): <url or id> — Status: <passed/failed>

## Artifacts
- Screenshots, exported logs or paths (e.g. `/tmp/...`)

## Acceptance checklist (required)
- [ ] Notion spec linked and matches implementation
- [ ] Unit tests added/updated & passing
- [ ] Integration tests (emulator) added/updated & passing
- [ ] E2E tests added/updated & passing (or note reason)
- [ ] Secrets not stored in repo (masked or Secret Manager)
- [ ] Firestore rules updated if schema changed
- [ ] CHANGES.md updated
- [ ] Staging verification performed (Homer) — link to run id/screenshot

## Notes & next steps
- <Any special notes like rollbacks, migration steps, or follow-ups>

```

---

## Homer-Ready Prompts (John passes these to Homer, exact text)

> Important: John should paste the whole block and send to Homer. Homer executes, verifies, and returns artifacts.
> 

### A) Repo Health Snapshot (first task — run now)

```
Homer — Lisa task: Repo Health Snapshot (start)

Goal:
Produce a current snapshot of the repository and open PRs for Lisa to manage.

Required actions:
1. List all open PRs against branch `aoss-main`. For each PR include:
   - PR number & URL
   - Title
   - Author
   - Created date
   - Last updated date (last commit/comment)
   - CI status (passing/failed/pending) with run id(s)
   - Labels
   - Linked Notion links (if present in PR description)
2. List all branches that have not had commits in the last 30 days:
   - Branch name
   - Last commit date & author
   - If branch has an open PR, include PR number
3. Find any PRs or branches with merge conflicts
4. Output exact commands used & the raw output as attachments (/tmp/ropi_aoss_notions/repo_health/*)

Expected output:
- A summary table (CSV or Markdown) of open PRs and stale branches
- For each PR, a one-line action suggestion (e.g., "ok to merge", "needs tests fixed", "stale: close?")

Notes:
- Use `gh` or GitHub API and `git` as needed.
- If you lack permission to list PRs or branches, say exactly which permission is missing.

When done, reply to Lisa with the files and a short summary.

Homer — Lisa task: Repo Health Snapshot (end)

```

### B) Clean Stale Branches (after snapshot)

```
Homer — Lisa task: Clean Stale Branches (start)

Prerequisite: Run Repo Health Snapshot and await Lisa's approval for which branches to act on.

Goal:
For branches flagged as stale (no updates > 30 days) or PRs labeled `stale`, perform these steps:
1. Comment on the PR: "@<author> This PR/branch has been flagged stale per governance — please respond within 7 days or we will close." (Include link to Lisa guidance)
2. Add label `stale` and set a reminder date.
3. After 7 days, if no response, close PR and set PR description prefix `CLOSED-STALE:` with reason. Delete remote branch.
4. Provide a cleanup report with closed PRs and deleted branches.

Expected output:
- A log of comments posted, labels added, PRs closed, and branches deleted (CSV/Markdown)
- If any action failed (lack permissions), report what’s missing and which items were untouched.

When done, return summary and attachments.

Homer — Lisa task: Clean Stale Branches (end)

```

---

## Failure Handling & 3-Attempt Policy

1. If CI/E2E fails: developer/Homer fixes and re-runs (Attempt #1).
2. If still failing: diagnose logs, add comments, attempt fix and re-run (Attempt #2).
3. If still failing: final prioritized fix and re-run (Attempt #3).
4. After 3 failed attempts: Homer opens a blocking GitHub Issue titled `Admin Settings CRUD — blocked after 3 attempts` containing logs, remediation attempts, and next steps. Lisa is notified.

**When reporting a failure, Homer must include:**

- CI run ids and failing test names
- Last 3 log snippets (relevant error lines)
- Proposed fix or note why human decision is needed

---

## Acceptance Criteria (what “done” means)

A PR or feature is ready to merge when all of these are true:

- PR includes the **Summary back to Lisa** block with Notion link(s).
- Unit tests, integration (emulator) tests, and E2E tests pass (or have an accepted reason).
- Secrets are masked; no plaintext secrets committed.
- Firestore rules updated if schema changed.
- Staging verification completed (Homer provides run id & screenshot).
- CHANGES.md updated and Notion Build Progress Log updated.
- Homer deleted feature branch and attached proof.

---

## REPO_GOVERNANCE.md

*Create a small file at repo root called `REPO_GOVERNANCE.md` and paste the short rules (branch naming, PR template location, stale policy, 3-attempt policy).*

(We prepared a full `REPO_GOVERNANCE.md` in Lisa’s earlier materials — copy it into the repo for developers.)

---

## John Checklist (copy & paste — one-liner for Homer)

> John — paste this exact line to Homer to run the first task now:
> 

```
Homer — run Lisa’s "Repo Health Snapshot" task now. See the exact prompt under “Repo Health Snapshot” in Repo Governance.

```

**What John should expect back from Homer**

- `repo_health.md`: a table of open PRs and stale branches
- `raw_output.tar.gz`: raw `gh`/`git` outputs used to build the report
- `recommendations.md`: one-line recommendation per PR (ok to merge / needs attention / stale)

---

## Next steps (short)

1. John sends the one-liner above to Homer.
2. Homer runs the Repo Health Snapshot and returns artifacts.
3. Lisa (this doc) reviews the snapshot, picks actions, and instructs Homer to act (merge/close/comment).
4. Homer executes and returns proof: PR links, CI run ids, deleted branch confirmations.
5. Lisa updates `REPO_GOVERNANCE.md` in the repo and the Notion Build Progress Log.

---

## Contacts & escalation

- **Lisa** — Repo governance decisions (this page)
- **Homer** — executor (actions + evidence)
- **John / Theo** — non-technical messenger and approver
- Escalate to dev leads (Smithers, etc.) only if Homer reports permissions issues, blocked CI that cannot be fixed in 3 attempts, or missing secrets in CI.

## Phase status — **COMPLETE** ✅

**Phase:** Admin Settings — Settings CRUD (Design → Implementation → Release & Staging Verification)

**Overall:** All development, CI, tests, and release steps finished and verified.

---

## What’s finished (high-level)

**Code & PRs**

- Backend Attributes PR → merged (`#218`) — attributes service, endpoints, tests.
- Frontend Settings UI PR → merged (`#221`) — AttributeManager + UI + E2E tests.
- Test hardening PR → merged (`#227`) — data-testids + robust selectors/waits.
- CI seeder PR → merged (`#228`) — seeds Firebase emulator for auth tests.

**CI & Tests**

- CI emulator seeder implemented and validated (PR #228).
- Targeted failing tests re-run and **passed** after fixes.
- Full E2E (with seeder) run for `feature/admin/settings-frontend` → **PASS**.
- Staging verification run → **PASS** (Run `20039588574`: 31 passed, 7 skipped).

**Release**

- CHANGES.md updated (commit `58d6558`).
- Release tag created: **aoss.v0.6.1** (`4d4562e...`).
- GitHub Release published: [https://github.com/twgallo13/ROPI-V2.1/releases/tag/aoss.v0.6.1](https://github.com/twgallo13/ROPI-V2.1/releases/tag/aoss.v0.6.1)

**Post-release governance**

- Post-release checklist and follow-ups created as Issues:
    - #229 — Post-release checklist & monitoring
    - #230 — SmartRules backend & API
    - #231 — AITemplate backend & API
    - #232 — E2E Stability & Flakiness Monitoring
    - #233 — Release announcement
- PR comments added to #221 and #227 linking release and artifacts.

**Staging**

- Staging app updated and verified: [https://ropi-aoss-staging.web.app](https://ropi-aoss-staging.web.app/)
- Staging E2E verification: Run `20039588574` (31/31 pass + 7 skipped).

---

## Key artifacts & where to find them

- **Release:** [https://github.com/twgallo13/ROPI-V2.1/releases/tag/aoss.v0.6.1](https://github.com/twgallo13/ROPI-V2.1/releases/tag/aoss.v0.6.1)
- **Staging URL:** [https://ropi-aoss-staging.web.app](https://ropi-aoss-staging.web.app/)
- **Staging E2E run:** Run `20039588574` (full green).
- **Targeted run artifacts:** `/tmp/ropi_aoss_notions/admin-settings/run_fix_tests_20251208_174920/`
- **Full E2E artifacts tarball:** `all_e2e_artifacts_20251208.tar.gz` and `run_failing_tests_20251208T065726Z.tar.gz` (historical)
- **Notion update draft:** `/tmp/ropi_aoss_notions/notion_update_for_release.md` (ready to paste into Build Progress Log)
- **Post-release summary file:** `LISA_RELEASE_AOSS_v0.6.1_SUMMARY.md`

---

## Final checks completed

- Unit tests, integration tests (with emulator), and Playwright E2E all pass.
- Firestore rules and server-side validation covered by tests (per audit).
- Secrets and CI changes handled safely (seeder uses emulator in CI — no production writes).
- Post-release governance issues created and assigned/mentioned.

---