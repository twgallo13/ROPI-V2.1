# Repository State Summary — LP-cleanup-001

**Generated:** 2026-01-08T20:08:02.967Z

## Inventory Counts

| Category | Count |
|----------|-------|
| Branches | 169 |
| Open PRs | 50 |
| Open Issues | 30 |
| Tags | 43 |

## Risk Distribution

| Risk Level | Count |
|------------|-------|
| HIGH | 45 |
| MEDIUM | 27 |
| LOW | 219 |
| NONE | 1 |

## Label Issues

- PRs missing lp:* label: **45**
- PRs missing state:* label: **45**
- Issues with no labels: **3**

## Top 10 Risk Items

1. **[HIGH]** pr 463 - MISSING_LP
   - PR missing lp:* label
   - Updated 0d ago

2. **[HIGH]** pr 458 - MISSING_LP
   - PR missing lp:* label
   - Updated 1d ago

3. **[HIGH]** pr 442 - MISSING_LP
   - PR missing lp:* label
   - Updated 4d ago

4. **[HIGH]** pr 429 - MISSING_LP
   - PR missing lp:* label
   - Updated 5d ago

5. **[HIGH]** pr 428 - MISSING_LP
   - PR missing lp:* label
   - Updated 5d ago

6. **[HIGH]** pr 427 - MISSING_LP
   - PR missing lp:* label
   - Updated 5d ago

7. **[HIGH]** pr 426 - MISSING_LP
   - PR missing lp:* label
   - Updated 5d ago

8. **[HIGH]** pr 416 - MISSING_LP
   - PR missing lp:* label
   - Updated 6d ago

9. **[HIGH]** pr 404 - MISSING_LP
   - PR missing lp:* label
   - Updated 7d ago

10. **[HIGH]** pr 403 - MISSING_LP
   - PR missing lp:* label
   - Updated 7d ago

## Repository Metadata

- **Default branch:** aoss-main
- **Visibility:** public
- **Protected branches:** Insufficient permissions to check
- **Required reviews:** N/A (permissions limited)

## Classification Rules Applied

### branch
- **ACTIVE_MAIN**: Branch is default branch (aoss-main)
- **ACTIVE_PROTECTED**: Branch is protected and not default
- **ACTIVE_PR_OPEN**: Branch has open PR associated
- **STALE_NO_PR**: Branch has no open PR and last commit > 30 days ago
- **RECENT_NO_PR**: Branch has no open PR but last commit < 30 days ago
- **ORPHANED**: Branch author inactive or pattern suggests abandonment

### pr
- **ACTIVE_IN_PROGRESS**: PR has state:in-progress label or recent activity < 7 days
- **ACTIVE_REVIEW**: PR has state:review or state:approved label
- **STALE_NO_ACTIVITY**: PR has no activity > 14 days
- **BLOCKED**: PR has blocked:* label
- **MISSING_LP**: PR missing lp:* label
- **READY_TO_MERGE**: PR approved and no blocking labels

### issue
- **ACTIVE_ASSIGNED**: Issue is assigned and updated < 14 days
- **STALE_ASSIGNED**: Issue is assigned but no activity > 14 days
- **UNASSIGNED_RECENT**: Issue unassigned but created/updated < 14 days
- **STALE_UNASSIGNED**: Issue unassigned and no activity > 14 days
- **TRACKING_ISSUE**: Issue used for phase tracking (label pattern)

### tag
- **RELEASE_TAG**: Tag associated with GitHub release
- **LIGHTWEIGHT_TAG**: Lightweight tag (no annotation)
- **ORPHANED_TAG**: Tag points to commit not in main branch history
