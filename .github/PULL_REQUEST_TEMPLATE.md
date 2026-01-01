<!-- PR Template: Lisa-controlled PR -->
<!-- LP-observations-consolidation-1.5.0: Updated with LP requirements -->

LP: LP-<PhaseSlug>-<SemVer>
PhaseSlug: <phase-slug>

---

### PVS Tag
PVS-<MAJOR.MINOR.PATCH>

### Task Goal
(One sentence)

### Exact actions performed
- File A changed
- File B added
- Script X run (local dry-run)

### Files changed / diff summary
(Short bullets or list)

### References
- Issues: #xxx
- Docs: docs/lisa/xxx.md
- Prior PRs: #123

### Expected Outputs / Artifacts
(What should exist after merge: e.g., routes fixed, UI changes)

## Phase Readiness
<!-- Required: Attach Phase Readiness Declaration or link to phase documentation -->
- [ ] Phase readiness check passed
- [ ] Firestore meta version matches registry

### Acceptance Criteria
- [ ] PR title begins with `LP: LP-<PhaseSlug>-<SemVer>` or `PVS-<MAJOR.MINOR.PATCH>`
- [ ] PR has label `lp:<phaseSlug>-<semver>`
- [ ] Branch name follows convention
- [ ] Commit messages include LP/PVS tag
- [ ] CI checks green
- [ ] Manual test steps performed & pass

### Testing Instructions
1. Step 1
2. Step 2

### Merge Strategy
Squash / Rebase / Merge Commit — (chosen by Lisa)

### Reviewer checklist (for Lisa)
- [ ] Meets PR template
- [ ] Tests pass
- [ ] Code style / lint
- [ ] Schema validated

- [ ] **Type label**: `feature` | `bugfix` | `hotfix` | `chore` | `docs` | `infra`
- [ ] **Area label**: `frontend` | `backend` | `infra` | `api` | `sdk`
- [ ] **Priority label**: `p0-critical` | `p1-high` | `p2-medium` | `p3-low`
- [ ] **LP label**: `lp:<phaseSlug>-<semver>`

## Pre-Merge Checklist

- [ ] PR targets `aoss-main` branch
- [ ] Branch follows naming convention: `feature/<slug>` or `fix/<slug>`
- [ ] CI checks pass (lp-lint, pr-hes-checker, phase-readiness-check)
- [ ] Code review approved
- [ ] HES JSON posted (for Homer-executed LPs)
- [ ] **Branch will be deleted after merge**

---

## HES (Homer Execution Summary)
<!-- After execution, Homer will paste HES JSON here or in a comment -->
<!-- Required for merge - must include: from, to, lp, actions, outcome -->

```json
{
  "from": "Homer",
  "to": "Lisa",
  "lp": "LP-<PhaseSlug>-<SemVer>",
  "actions": [],
  "outcome": "PENDING"
}
```

---

## Summary Back to Lisa

<!-- REQUIRED: Provide a summary for Lisa that includes: -->
<!-- - What was accomplished -->
<!-- - Any deviations from the original task -->
<!-- - Any follow-up items or blockers -->
<!-- - Confirmation of completion -->

**Status:** 

**What was done:**



**Deviations or issues:**



**Follow-up items:**


