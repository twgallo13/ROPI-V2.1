# Attribute Cleanup Plan (bootstrap) — PVS-0.1.0

**Goal:** Create an organized plan & task list for canonicalizing attributes: imports → editor → PDP, plus repo-level governance.

## Milestones
### Milestone 0 — Setup Lisa governance (this PR)
- Add PR template and governance docs
- Add PVS history file
- Add GH Action PR metadata checks

### Milestone 1 — Repo inventory & cleanup (PVS-0.1.1)
- Inventory branches and PRs
- Identify stale branches and dead forks
- Rename & clean per Lisa's rules

### Milestone 2 — Attributes cleanup (PVS-0.2.0)
- Fix nav routing and move Attributes into Settings
- Add missing edit fields (`required_for_export`, `import_required`, `required_for_completion`, `external_header`)
- Fix "blank until resave" with server-side validation/merge
- Add "Sync attribute" UI control
- Sync canonical registry to Firestore and run dry-run migration

### Milestone 3 — PR Lifecycle completion (PVS-0.3.0)
- Convert open PRs into Lisa governance
- Final audit & signoff

## Initial tasks (this doc bootstraps further tasks)
- Produce a canonical attribute mapping CSV (script)
- Implement migration dry-run scripts
- Create E2E checks for attribute editor and import preview

## Acceptance Criteria (attributes)
- All attributes saved with canonical defaults
- Editor supports full editable attribute set
- Imports map headers → canonical ids
- PDP shows consumer-facing attributes correctly

## Notes / References
- Sync script location: `packages/api/src/tasks/syncAttributeRegistry.ts`
- Attribute schema: `packages/sdk/src/schema/attribute.ts`
