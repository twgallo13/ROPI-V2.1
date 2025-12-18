# Branching and Commit Rules — Lisa

**PVS:** PVS-0.1.0

## Branch Naming
All Lisa-led branches must follow:

```
lisa/PVS-MAJOR.MINOR.PATCH/short-description
```

Examples:
- `lisa/PVS-0.1.0/setup-lisa-governance`
- `lisa/PVS-0.1.1/fix-attribute-defaults`

## Commit Message Format
Every commit touching Lisa branches must start with the PVS tag:

```
PVS-MAJOR.MINOR.PATCH: Short imperative message

Optional: longer description and references
Refs: PVS-MAJOR.MINOR.PATCH
```

Example:

```
PVS-0.1.0: Add PR lifecycle docs and GH Action
Refs: PVS-0.1.0
```

## Branch Lifecycle
- Create branch from `aoss-main` (or other Lisa-specified base).
- Push branch to origin: `git push origin lisa/PVS-...`
- All development on the branch until Lisa approves merge.
- After merge, delete branch locally and remotely.

## PRs
- PR title must include `PVS-...` at start.
- PR description must follow the template in `.github/PULL_REQUEST_TEMPLATE.md`.

## Notes
- Non-Lisa branches that affect attributes or areas under Lisa governance must be converted to Lisa branches before merge.
