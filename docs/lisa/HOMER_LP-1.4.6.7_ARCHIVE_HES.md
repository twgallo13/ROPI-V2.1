# HOMER_LP-1.4.6.7_ARCHIVE_HES.md

## LP: LP-importer-mapping-recon-1.4.6.7 — Archive-only cleanup HES

### Summary
On 2025-12-29 an archive-only cleanup pass was executed to reduce branch noise while preserving history. The pass created remote archive refs and backup tags for 196 candidate branches. No remote branches were deleted.

### Scripts added
- `scripts/archive_branches_archive_only.sh` — conservative archive-only script (7-day windows; dry-run supported)
- `scripts/cleanup_run.sh` — wrapper supporting `--archive-only` and later interactive `--delete --days=N`

### Key artifacts (on the runner)
- `/tmp/archive-cleanup-20251229T132234Z/branches-to-delete.txt` — candidate list (196 branches)
- `/tmp/archive-cleanup-20251229T132234Z/cleanup-backups-20251229T132234Z.txt` — record of archive refs + backup tags created
- `/tmp/archive-sample.txt` — sample remote archive refs
- `/tmp/backup-tags-sample.txt` — sample backup tags

### Rationale
Project is young (~2 weeks) and active. Archival keeps history and reduces noise while enabling easy recovery. Permanent deletes are deferred until post-stabilization.

### Verification
- All candidates were archived (archive refs `archive/<branch>-<ts>` created).
- Backup tags `backup/<branch>-<ts>` created for branches where origin HEAD existed.
- No deletions were performed during this run.

### Next steps
- Keep archive refs/tags for ≥30 days before any permanent deletion.
- When ready, run `scripts/cleanup_run.sh --delete --days=7` interactively to prune with confirmation.
