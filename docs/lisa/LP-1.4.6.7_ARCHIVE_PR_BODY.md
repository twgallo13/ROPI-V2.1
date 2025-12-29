LP-importer-mapping-recon-1.4.6.7 — Add archive-only cleanup scripts and HES

Summary
-------
This PR adds two repository maintenance scripts and a short HES documenting the archive-only run performed on 2025-12-29. The scripts are conservative and reversible; they create remote archive refs and backup tags for candidate branches without deleting any remote branches.

Files added
----------
- scripts/archive_branches_archive_only.sh  (archive-only pass; 7-day windows; --dry-run supported)
- scripts/cleanup_run.sh                    (wrapper for archive/delete modes; interactive)
- docs/lisa/HOMER_LP-1.4.6.7_ARCHIVE_HES.md (summary of archive pass & key artifacts)

Why
---
We performed an audit and executed an archive-only pass to tidy branches while preserving history. This PR records the scripts and HES for audit, reproducibility, and future controlled deletion.

Verification & artifacts
------------------------
The archive-only dry-run and subsequent archive pass produced evidence in `/tmp/archive-cleanup-20251229T132234Z/` including:
- branches-to-delete.txt
- cleanup-backups-20251229T132234Z.txt
- archive & backup tag samples (git ls-remote)
All artifacts must be attached to the LP HES after PR merge.

Risks & governance
------------------
- No deletions performed by the archive-only script. Deletion is interactive and guarded by confirmation in the wrapper.
- Protected branches (aoss-main, main, lp/*, lisa/*, archive/*) are excluded.

Request
-------
Please review. After CodeRabbit/CI succeed, approve and merge. Ops/QA to confirm archive artifacts attached to HES and sign-off for future deletion flows.
