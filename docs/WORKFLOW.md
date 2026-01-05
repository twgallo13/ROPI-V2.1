# Development Workflow Policy

> ⚠️ **DEPRECATED — Superseded by GOVERNANCE.md**
>
> This document is retained for historical reference only.
> For authoritative workflow rules, see [`GOVERNANCE.md`](../GOVERNANCE.md).
> Deprecation date: 2026-01-05

---

> **Version:** aoss.v0.3.0  
> **Last Updated:** 2024-12-05  
> **Maintainer:** Homer (AI Agent)

This document defines the mandatory workflow standards for the ROPI-V2.1 repository. All contributors must follow these rules to maintain a clean, predictable, and consistent development process.

---

## Table of Contents

1. [Branch Naming Convention](#branch-naming-convention)
2. [Target Branch Rules](#target-branch-rules)
3. [Pull Request Requirements](#pull-request-requirements)
4. [Required Labels](#required-labels)
5. [Branch Management](#branch-management)
6. [CI/CD Requirements](#cicd-requirements)
7. [Workflow Summary](#workflow-summary)

---

## Branch Naming Convention

### Rule

All branches **must** follow the naming pattern:

```
feature/<slug>
```

### Valid Examples

```
feature/auth-login
feature/infra/repo-workflow-guard
feature/frontend/product-editor
feature/api/observations-endpoint
```

### Invalid Examples

```
fix-bug                    ❌ Missing 'feature/' prefix
dev/my-changes             ❌ Wrong prefix
feature_my_branch          ❌ Wrong separator
Feature/my-branch          ❌ Case sensitive - must be lowercase
```

### Slug Guidelines

- Use lowercase letters, numbers, and hyphens only
- Use `/` for category organization (e.g., `feature/infra/task-name`)
- Keep slugs descriptive but concise
- No spaces or special characters

---

## Target Branch Rules

### Rule

All pull requests **must** target `aoss-main`.

- `aoss-main` is the only allowed target branch for feature PRs
- Direct commits to `aoss-main` are prohibited
- All changes must go through the PR process

---

## Pull Request Requirements

### Mandatory PR Template

Every PR automatically includes a template that must be completed. The template includes:

1. **Summary of Changes** - Clear description of what the PR does
2. **Files Changed** - Table of modified files
3. **Acceptance Criteria** - Checklist of requirements
4. **Tests Added or Updated** - Testing documentation
5. **Documentation Updated** - Doc changes if applicable
6. **Labels Checklist** - Verification of required labels
7. **Pre-Merge Checklist** - Final verification
8. **Summary Back to Lisa** - Required summary for task tracking

### PR Title

- PR title must be present and descriptive
- Use imperative mood (e.g., "Add feature" not "Added feature")
- Keep under 72 characters

---

## Required Labels

Every PR **must** have labels from each of these three categories:

### Type Labels (pick one)

| Label | Description |
|-------|-------------|
| `feature` | New functionality |
| `bugfix` | Bug fix |
| `hotfix` | Critical production fix |
| `chore` | Maintenance, refactoring |
| `docs` | Documentation only |

### Area Labels (pick one)

| Label | Description |
|-------|-------------|
| `frontend` | Web app / UI changes |
| `backend` | Server / Cloud Functions |
| `infra` | Infrastructure, CI/CD, config |
| `api` | API changes |
| `sdk` | SDK package changes |

### Priority Labels (pick one)

| Label | Description |
|-------|-------------|
| `p0-critical` | Must merge immediately |
| `p1-high` | High priority, merge soon |
| `p2-medium` | Normal priority |
| `p3-low` | Low priority, can wait |

---

## Branch Management

### Active Branch Limit

- **Maximum 5 active feature branches** at any time
- Clean up completed or stale branches regularly
- Use the GitHub branch overview to monitor

### Branch Deletion After Merge

- **All branches must be deleted after merge**
- GitHub's "Delete branch" button should be used immediately
- Configure repository to auto-delete branches if possible

### Idle Timeout

- **Branches idle for 14 days will be flagged for deletion**
- "Idle" means no commits for 14 consecutive days
- Update or close stale branches promptly

### No Dangling Work

- Every branch must be associated with an active task
- No untracked or orphaned branches
- No work-in-progress branches without clear purpose

---

## CI/CD Requirements

### CI Must Pass

- All CI checks **must pass** before merge
- Failed CI blocks merge
- Do not bypass CI failures

### Required CI Checks

1. Linting / Code style validation
2. Type checking
3. Unit tests
4. Build verification
5. PR validation (branch name, labels, target)

### No Force Merging

- Never merge with failing CI
- Never use admin override to bypass checks
- Fix the issue or get help

---

## Workflow Summary

### For Every New Task

```
1. Create branch:     git checkout -b feature/<slug>
2. Make changes:      Implement the task
3. Commit & push:     git push -u origin feature/<slug>
4. Open PR:           Target aoss-main
5. Add labels:        Type + Area + Priority
6. Complete template: Fill in all sections
7. Request review:    Get approval
8. Merge:             After CI passes and approval
9. Delete branch:     Immediately after merge
10. Report to Lisa:   Include "Summary Back to Lisa"
```

### Quick Reference Card

| Rule | Requirement |
|------|-------------|
| Branch naming | `feature/<slug>` |
| Target branch | `aoss-main` |
| Labels | Type + Area + Priority |
| Max active branches | 5 |
| Idle timeout | 14 days |
| CI status | Must pass |
| Branch after merge | Delete immediately |
| PR template | Complete all sections |
| Lisa summary | Required in every PR |

---

## Enforcement

These rules are enforced by:

1. **GitHub Action** (`validate-pr.yml`) - Validates branch name, labels, target branch
2. **PR Template** - Guides contributors through requirements
3. **Code Review** - Reviewers verify compliance
4. **This Document** - Reference for all contributors

Violations will cause CI to fail and block merge.

---

## Questions?

If you have questions about this workflow:

1. Check this document first
2. Review the PR template for guidance
3. Ask Lisa for clarification

---

*This policy ensures clean, predictable, and consistent development across the ROPI-V2.1 repository.*
