<!-- PR Template: LP-controlled PR (Launch Prompt) -->
<!-- 
  For LP PRs:
  - Title MUST start with LP-X.X.X:
  - Branch MUST be lp/X.X.X-description
  - Complete the Staging Checklist section below
  - See .github/STAGING_CHECKLIST.md for full template
-->

### LP Version ID
LP-<MAJOR.MINOR.PATCH>

### Task Goal
(One sentence describing what this LP accomplishes)

### Exact actions performed
- File A changed
- File B added
- Script X run (local dry-run)

### Files changed / diff summary
(Short bullets or list)

### References
- Issues: #xxx
- Docs: docs/LP-X.X.X.md
- Prior PRs: #123

---

## Staging Validation Checklist

<!-- 
  REQUIRED for all LP PRs
  Complete this checklist with evidence before requesting review
  See .github/STAGING_CHECKLIST.md for detailed requirements
-->

### Pre-Deployment
- [ ] **Firestore Backup:** `gs://ropi-aoss-backups/lp-X.X.X-firestore-backup-YYYYMMDDTHHMMSSZ`
- [ ] **CI Status:** [Link to passing CI run]

### Deployment Evidence
- [ ] **Deploy Type:** firestore:rules / functions / hosting / N/A
- [ ] **Deploy Command:** `firebase deploy --only <target> --project=ropi-bccee`
- [ ] **Deploy Logs:** (paste or attach)

### Validation Tests
| Test | Type | Expected | Actual | Status |
|------|------|----------|--------|--------|
| Test A | unit/integration/manual | Expected result | Actual result | PASS/FAIL |
| Test B | unit/integration/manual | Expected result | Actual result | PASS/FAIL |
| Test C | API/E2E/manual | Expected result | Actual result | PASS/FAIL |

### Migration Tasks (if applicable)
- [ ] **Dry-run output:** (paste key results)
- [ ] **Limited staging run:** (batch size & results)
- [ ] **Sample snapshots:** Before/After comparison verified

### Breaking Changes
- [ ] **Any breaking changes?** Yes / No
- [ ] If Yes, remediation plan documented

---

## Acceptance Criteria

- [ ] PR title begins with `LP-X.X.X:`
- [ ] Branch name: `lp/X.X.X-<short-desc>`
- [ ] Commit messages include LP tag
- [ ] CI checks green
- [ ] All staging checklist items complete
- [ ] Manual test steps performed & pass

---

## Labels

- [ ] **LP Version label**: `LP-2.0.x` (or appropriate series)
- [ ] **Type label**: `feature` | `bugfix` | `hotfix` | `chore` | `docs`
- [ ] **Area label**: `frontend` | `backend` | `infra` | `api` | `sdk`
- [ ] **Priority label**: `p0-critical` | `p1-high` | `p2-medium` | `p3-low`

---

## Pre-Merge Checklist

- [ ] PR targets `aoss-main` branch
- [ ] Branch follows naming convention: `lp/X.X.X-<slug>`
- [ ] CI checks pass
- [ ] LP Staging Checklist workflow passes
- [ ] Code review approved
- [ ] **Branch will be deleted after merge**

---

## Merge Strategy

**Squash merge** (required for LP PRs)

---

## Summary Back to User

<!-- REQUIRED: Provide a summary that includes: -->
<!-- - What was accomplished -->
<!-- - Any deviations from the original task -->
<!-- - Any follow-up items or blockers -->
<!-- - Confirmation of completion -->

**Status:** 

**What was done:**



**Deviations or issues:**



**Follow-up items:**



