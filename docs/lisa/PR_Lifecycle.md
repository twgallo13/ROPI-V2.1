# Lisa — Pull Request Lifecycle

**PVS:** PVS-0.1.0  
**Owner:** Lisa (ChatGPT)

## Purpose
This document defines the mandatory PR lifecycle for all code, docs, and infra changes governed by Lisa.

## Roles
- **Lisa** — PR governance, final decision maker.
- **Homer** — executor. Makes code changes, runs tests, opens PRs.
- **John** — relay. Sends Lisa's prompts to Homer and returns Homer's results to Lisa.

## PR Lifecycle Stages
1. **Open**
   - PR is opened from a branch named `lisa/PVS-.../<short>`.
   - PR title **must** start with the PVS tag `[PVS-MAJOR.MINOR.PATCH]`.
   - PR body **must** follow the PR template exactly.
   - Labels: `lisa/pvs`, `type:<patch|feature|chore>`, and `area:<attributes|...>`.

2. **Progress**
   - Homer implements requested changes on the same branch.
   - All commits must include the PVS tag in the commit message.
   - Lisa provides direction for modifications by issuing a new PVS patch (if required).
   - John relays Lisa's instructions verbatim to Homer.

3. **Review**
   - Lisa reviews PRs. Comments must be addressed by Homer with new commits (not force pushes that rewrite history for merged branches unless Lisa instructs).
   - Where third-party reviewers are used, Lisa summarizes and decides next actions.

4. **Merge or Close**
   - Lisa decides the merge strategy:
     - **Patch/cleanup:** Squash-and-merge.
     - **Large feature / major:** Rebase & merge (only if history must be preserved).
   - After merge, Homer deletes the branch.
   - Lisa updates `docs/lisa/pvs-history.md`.

5. **Cleanup**
   - Remove stale branches.
   - Update issues and documentation.

## PR Format (enforced)
Use the `.github/PULL_REQUEST_TEMPLATE.md` provided. PRs lacking the accepted format are blocked and must be updated.

## Checks & CI
Every PR must pass:
- PR title validation (PVS tag)
- PR body contains "Acceptance Criteria"
- Linting & build
- Unit tests & E2E where applicable
- Attribute schema validation for attribute-related changes

## Reviewer Checklist
When reviewing, ensure:
- PVS tagging matches branch and commits
- PR template sections are completed
- Tests & CI green
- Destructive changes documented and backups/rollbacks are listed

## Notes
- Lisa assigns PVS version numbers and updates `pvs-history.md`.
- This lifecycle is mandatory for any "lisa/*" branch.
