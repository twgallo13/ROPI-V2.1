#!/usr/bin/env bash
# Wrapper for branch cleanup workflows
# - Default: archive-only using archive_branches_archive_only.sh
# - Optional: interactive delete of archived branches with --delete
# - Supports --days=N to set grace window (applied to archive step)
# - Always produces audit logs and safety checks

set -euo pipefail

MODE="archive"   # archive | delete
DRY_RUN=false
DAYS=7

usage() {
  cat <<USAGE
Usage:
  scripts/cleanup_run.sh [--archive-only] [--delete] [--days=N] [--dry-run]

Options:
  --archive-only   Perform archive pass only (default)
  --delete         After archive, interactively delete eligible branches
  --days=N         Grace window in days for merged/stale (default: 7)
  --dry-run        Preview actions without making changes

Notes:
  - Archive step creates refs/heads/archive/<branch>-<ts> and backup/<branch>-<ts> tags
  - Delete step requires explicit confirmation and will skip branches with open PRs
USAGE
}

while [[ $# -gt 0 ]]; do
  case "$1" in
    --archive-only) MODE="archive"; shift ;;
    --delete) MODE="delete"; shift ;;
    --days=*) DAYS="${1#*=}"; shift ;;
    --dry-run) DRY_RUN=true; shift ;;
    -h|--help) usage; exit 0 ;;
    *) echo "Unknown option: $1"; usage; exit 1 ;;
  esac
done

# Ensure required tools
command -v gh >/dev/null || { echo "gh CLI is required"; exit 1; }
command -v git >/dev/null || { echo "git is required"; exit 1; }
command -v jq >/dev/null || { echo "jq is required"; exit 1; }

ARCHIVE_SCRIPT="$(dirname "$0")/archive_branches_archive_only.sh"
[[ -x "$ARCHIVE_SCRIPT" ]] || { echo "Archive script not found or not executable: $ARCHIVE_SCRIPT"; exit 1; }

echo "Cleanup wrapper starting... MODE=$MODE DAYS=$DAYS DRY_RUN=$DRY_RUN"

# Step 1: Run archive pass (respecting days via env vars)
echo "Running archive pass (days=$DAYS, dry-run=$DRY_RUN)..."
MERGED_AGE_DAYS="$DAYS" STALE_AGE_DAYS="$DAYS" \
  "$ARCHIVE_SCRIPT" $($DRY_RUN && echo "--dry-run" || true)

# Find latest archive log dir
LOG_DIR=$(ls -dt /tmp/archive-cleanup-* | head -n1)
if [[ -z "${LOG_DIR:-}" || ! -d "$LOG_DIR" ]]; then
  echo "Could not determine archive log dir."; exit 1
fi
echo "Archive logs: $LOG_DIR"

CANDIDATES="$LOG_DIR/branches-to-delete.txt"
if [[ ! -s "$CANDIDATES" ]]; then
  echo "No candidates found; nothing to do."; exit 0
fi

if [[ "$MODE" != "delete" ]]; then
  echo "Archive-only mode complete. Candidate list: $CANDIDATES"
  exit 0
fi

# Step 2: Interactive delete (only if not dry-run)
if $DRY_RUN; then
  echo "[DRY] Would proceed to interactive delete for branches in $CANDIDATES"
  exit 0
fi

echo "Preparing to delete branches listed in: $CANDIDATES"
echo "Safety checks: skipping branches with open PRs; require backups to exist."

read -r -p "Type DELETE to permanently delete remote branches listed above: " CONFIRM
if [[ "$CONFIRM" != "DELETE" ]]; then
  echo "Deletion aborted."; exit 0
fi

TS=$(date -u +%Y%m%dT%H%M%SZ)
DELETED_LOG="/tmp/deleted-branches-$TS.txt"
> "$DELETED_LOG"

while read -r BRANCH; do
  [[ -z "$BRANCH" ]] && continue

  # Skip if open PR exists
  OPEN_COUNT=$(gh pr list --state open --head "$BRANCH" --json number --limit 1 | jq 'length')
  if [[ "$OPEN_COUNT" -gt 0 ]]; then
    echo "Skipping $BRANCH: open PR exists" | tee -a "$DELETED_LOG"
    continue
  fi

  # Require an archive ref or backup tag for safety
  ARCHIVE_REF=$(git ls-remote --heads origin "refs/heads/archive/${BRANCH}-*" | head -n1 | awk '{print $2}') || true
  BACKUP_TAG=$(git ls-remote --tags origin "refs/tags/backup/${BRANCH}-*" | head -n1 | awk '{print $2}') || true
  if [[ -z "$ARCHIVE_REF" && -z "$BACKUP_TAG" ]]; then
    echo "Skipping $BRANCH: no archive ref / backup tag found" | tee -a "$DELETED_LOG"
    continue
  fi

  # Delete remote branch
  echo "Deleting origin/$BRANCH ..."
  if git push origin --delete "$BRANCH"; then
    echo "deleted $BRANCH" | tee -a "$DELETED_LOG"
  else
    echo "Failed to delete $BRANCH" | tee -a "$DELETED_LOG"
  fi
done < "$CANDIDATES"

echo "Deletion pass complete. Log: $DELETED_LOG"
