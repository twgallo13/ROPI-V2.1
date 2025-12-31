<!-- PR Template: LP-controlled PR -->

## LP Version ID
LP-<MAJOR.MINOR.PATCH>

<!-- Example: LP-2.0.1, LP-2.0.2 -->

---

## Objective
<!-- One sentence describing what this PR accomplishes -->

---

## Files Changed
<!-- List of files changed with brief description -->
- `path/to/file.ts` — Description of change
- `path/to/other.ts` — Description of change

---

## Notion References
<!-- Links to relevant Notion docs -->
- [Reference Name](https://www.notion.so/...)

---

## Staging Validation Checklist
<!-- Link to staging checklist and evidence -->

See [STAGING_CHECKLIST.md](.github/STAGING_CHECKLIST.md) for required items.

### Required Evidence (paste links/logs below)
- [ ] **Firestore Backup ID (GCS path):** `gs://...`
- [ ] **CI Pass Link:** [CI Run](#)
- [ ] **Firebase Deploy Logs:** (paste or link)
- [ ] **Validation Test Results:**
  - [ ] Test A: _description_ — PASS/FAIL
  - [ ] Test B: _description_ — PASS/FAIL
  - [ ] Test C: _description_ — PASS/FAIL

---

## Exact Actions Performed
<!-- Detailed list of what was done -->
- [ ] Action 1
- [ ] Action 2
- [ ] Action 3

---

## Testing Instructions
1. Step 1
2. Step 2
3. Step 3

---

## Acceptance Criteria
- [ ] PR title begins with `LP-<MAJOR.MINOR.PATCH>`
- [ ] Branch name: `lp/<version>-<short-desc>`
- [ ] Commit messages include LP tag
- [ ] CI checks green
- [ ] Staging validation evidence provided
- [ ] Manual test steps performed & pass

---

## Merge Strategy
<!-- Choose one: Squash / Rebase / Merge Commit -->
Squash merge (default for feature branches)

---

## Reviewer Checklist
- [ ] PR follows LP template
- [ ] Tests pass
- [ ] Code style / lint checks pass
- [ ] Staging evidence complete
- [ ] No breaking changes or remediation plan provided

---

## Labels
<!-- Apply relevant labels -->
- [ ] `LP-2.0.x` (version series)
- [ ] Type: `feature` | `bugfix` | `hotfix` | `chore` | `docs` | `security`
- [ ] Area: `frontend` | `backend` | `infra` | `api` | `sdk` | `firestore`
- [ ] Status: `staging` | `ready-for-review` | `blocked`


