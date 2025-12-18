### PVS Tag
PVS-0.1.0

### Task Goal
Add Lisa governance artifacts: PR lifecycle doc, PVS history, branch & commit rules, PR template, PR metadata validation GH Action, and a bootstrap attribute-cleanup plan.

### Exact actions performed
- Added `docs/lisa/PR_Lifecycle.md`
- Added `docs/lisa/pvs-history.md`
- Added `docs/lisa/branching-and-commits.md`
- Added `docs/lisa/attribute-cleanup-plan.md`
- Added `.github/PULL_REQUEST_TEMPLATE.md`
- Added `.github/workflows/validate-pr-metadata.yml`

### Files changed / diff summary
- `+ docs/lisa/PR_Lifecycle.md`
- `+ docs/lisa/pvs-history.md`
- `+ docs/lisa/branching-and-commits.md`
- `+ docs/lisa/attribute-cleanup-plan.md`
- `+ .github/PULL_REQUEST_TEMPLATE.md`
- `+ .github/workflows/validate-pr-metadata.yml`

### References
- Lisa governance plan (internal phase instructions)
- Attribute schema and sync scripts in repo (`packages/sdk/src/schema/attribute.ts`, `packages/api/src/tasks/syncAttributeRegistry.ts`)

### Expected Outputs / Artifacts
- Governance docs under `docs/lisa/`
- PR template enforced for subsequent PRs
- GH action that validates the PVS tag and Acceptance Criteria presence in PRs

### Acceptance Criteria
- [ ] PR title includes `PVS-0.1.0`
- [ ] Branch name `lisa/PVS-0.1.0/setup-lisa-governance`
- [ ] Commit message includes `PVS-0.1.0`
- [ ] Added files exist at listed paths
- [ ] GH Action present at `.github/workflows/validate-pr-metadata.yml`
- [ ] PR labeled: `lisa/pvs`, `type:chore`, `area:attributes`

### Testing Instructions
1. Confirm files exist on the branch after pushing.
2. Open PR and verify the GH Action runs and validates title/body.
3. Ensure PR can be labeled and reviewer assigned.

### Merge Strategy
Squash-and-merge (for a single commit PR)

### Reviewer checklist (for Lisa)
- [ ] Meets PR template
- [ ] Files added and formatted
- [ ] CI checks green
- [ ] Labels set: `lisa/pvs`, `type:chore`, `area:attributes`
