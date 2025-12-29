#!/usr/bin/env bash
# Archive-only cleanup (safe)
# - 7 day grace window for merged > 7 days OR last commit older than 7 days
# - creates remote archive ref: refs/heads/archive/<branch>-<ts>
# - creates backup tag: backup/<branch>-<ts> -> origin/<branch> sha
# - NO deletion of branches
#
# Usage:
#   scripts/archive_branches_archive_only.sh --dry-run
#   scripts/archive_branches_archive_only.sh           # perform archive (no delete)
#
set -euo pipefail

DRY_RUN=false
while [[ $# -gt 0 ]]; do
  case $1 in
    --dry-run) DRY_RUN=true; shift ;;
    *) echo "Unknown option $1"; exit 1 ;;
  esac
done

TIMESTAMP=$(date -u +%Y%m%dT%H%M%SZ)
NOW_EPOCH=$(date +%s)
MERGED_AGE_SECONDS=$((7*24*3600))   # 7 days
STALE_AGE_SECONDS=$((7*24*3600))    # 7 days

PROTECTED_REGEX="^(aoss-main|main|develop|master|release|archive/|lisa/|lp/|refs/heads/archive/)"

LOG_DIR=/tmp/archive-cleanup-${TIMESTAMP}
mkdir -p "$LOG_DIR"
BACKUP_LOG="${LOG_DIR}/cleanup-backups-${TIMESTAMP}.txt"
CANDIDATES="${LOG_DIR}/branches-to-delete.txt"
OPEN_PRS="${LOG_DIR}/pr-open-heads.txt"
MERGED_OLD="${LOG_DIR}/merged-old.txt"
STALE_BRANCHES="${LOG_DIR}/stale-branches.txt"
ALL_REMOTE="${LOG_DIR}/all-remote-branches.txt"

echo "Archive-only cleanup (7-day windows)"
echo "DRY_RUN=${DRY_RUN}"
echo "Logs in ${LOG_DIR}"

# 1) collect open PR head branches
echo "Collecting open PR headRefNames..."
gh pr list --state open --json headRefName --limit 500 > "${LOG_DIR}/open-prs.json"
jq -r '.[].headRefName' "${LOG_DIR}/open-prs.json" | sort -u > "$OPEN_PRS"

# 2) merged PR heads older than 7 days
echo "Collecting merged PR heads older than 7 days..."
gh pr list --state merged --json headRefName,mergedAt --limit 500 > "${LOG_DIR}/merged-prs.json"
jq -r --argjson now "$NOW_EPOCH" --argjson threshold "$MERGED_AGE_SECONDS" \
  '.[] | select(.mergedAt != null) | select(($now - (.mergedAt | fromdateiso8601)) > $threshold) | .headRefName' \
  "${LOG_DIR}/merged-prs.json" | sort -u > "$MERGED_OLD" || true

# 3) remote branches and stale (>7 days)
echo "Collecting remote branches..."
git fetch origin --prune || true
git for-each-ref --format='%(refname:short)' refs/remotes/origin/ | sed 's#^origin/##' | sort -u > "$ALL_REMOTE"

> "$STALE_BRANCHES"
while read -r br; do
  [[ -z "$br" ]] && continue
  # skip protected
  if [[ "$br" =~ $PROTECTED_REGEX ]]; then
    continue
  fi
  # skip archive refs
  if [[ "$br" == archive/* ]]; then
    continue
  fi
  # get last commit epoch for remote branch
  if ! git rev-parse --verify --quiet "origin/$br" >/dev/null; then
    continue
  fi
  last_epoch=$(git log -1 --format=%ct "origin/$br" 2>/dev/null || echo 0)
  age=$((NOW_EPOCH - last_epoch))
  if (( age > STALE_AGE_SECONDS )); then
    echo "$br" >> "$STALE_BRANCHES"
  fi
done < "$ALL_REMOTE"
sort -u "$STALE_BRANCHES" -o "$STALE_BRANCHES" || true

# 4) combine candidates: merged_old OR stale, excluding open PR head branches and protected
echo "Assembling candidate list (merged-old OR stale) excluding open PR head branches..."
> "$CANDIDATES"
# add merged-old
comm -23 <(sort -u "$MERGED_OLD") <(sort -u "$OPEN_PRS") >> "$CANDIDATES" 2>/dev/null || true
# add stale
comm -23 <(sort -u "$STALE_BRANCHES") <(sort -u "$OPEN_PRS") >> "$CANDIDATES" 2>/dev/null || true

# remove protected patterns
grep -Ev "$PROTECTED_REGEX" "$CANDIDATES" | sort -u > "${CANDIDATES}.filtered" || true
mv "${CANDIDATES}.filtered" "$CANDIDATES"

echo "Candidates written to: $CANDIDATES"
wc -l "$CANDIDATES" || true

# 5) Archive each candidate
echo "Starting archive pass (archive refs + backup tag). Dry-run=${DRY_RUN}"
echo "Backups will be recorded in $BACKUP_LOG"
: > "$BACKUP_LOG"

while read -r BRANCH; do
  [[ -z "$BRANCH" ]] && continue
  echo "Processing candidate: $BRANCH"

  # ensure the remote branch exists
  if ! git ls-remote --exit-code --heads origin "$BRANCH" >/dev/null 2>&1; then
    echo "  Skipping $BRANCH: origin/$BRANCH not found" >> "$BACKUP_LOG"
    continue
  fi

  ARCHIVE_REF="archive/${BRANCH}-${TIMESTAMP}"
  TAG_NAME="backup/${BRANCH}-${TIMESTAMP}"

  # fetch remote branch locally to ensure we have a ref
  if $DRY_RUN; then
    echo "[DRY] git fetch origin $BRANCH:$BRANCH"
    echo "[DRY] git push origin origin/$BRANCH:refs/heads/$ARCHIVE_REF"
    echo "[DRY] git rev-parse origin/$BRANCH (for tag)"
    echo "[DRY] git tag -a $TAG_NAME -m 'backup before archive: $BRANCH' <sha>"
    echo "[DRY] git push origin $TAG_NAME"
    echo "-----"
    continue
  fi

  # fetch to ensure local ref
  git fetch origin "$BRANCH:$BRANCH" || true

  # push archive ref
  echo "  Pushing archive ref origin/$ARCHIVE_REF ..."
  git push origin "origin/$BRANCH:refs/heads/$ARCHIVE_REF" || {
    echo "  Warning: archive push failed for $BRANCH" >> "$BACKUP_LOG"
  }

  # create and push tag
  SHA=$(git rev-parse --verify "origin/$BRANCH" 2>/dev/null || true)
  if [[ -n "$SHA" ]]; then
    git tag -a "$TAG_NAME" -m "backup before archive: $BRANCH" "$SHA" || true
    git push origin "$TAG_NAME" || true
    echo "Archived and tagged $BRANCH -> $ARCHIVE_REF , tag $TAG_NAME -> $SHA" >> "$BACKUP_LOG"
  else
    echo "  Could not determine SHA for origin/$BRANCH" >> "$BACKUP_LOG"
  fi

  echo "  Done: $BRANCH"
done < "$CANDIDATES"

echo "Archive pass complete. Backup log: $BACKUP_LOG"
echo "Candidates: $CANDIDATES"
echo "NOTE: This script performs ARCHIVE ONLY and does NOT delete remote branches."
