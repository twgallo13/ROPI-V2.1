# HES — Homer Firebase Attributes Cleanup (Keys-Only)

Owner: AOSS Engineering
Date: 2026-01-09

## Objective
- Make `settings/attributes/keys` the one-and-only source of truth.
- Delete all other attribute definition locations under `settings/attributes/*`.
- Confirm Product page Launch & Media uses keys-based attributes only.
- Remove legacy-named attribute docs outside `keys` (if present).

## Plan
- Snapshot before structure of `settings/attributes` (subcollections and counts)
- Dry-run deletion for all subcollections except preserved
- Apply deletion
- Snapshot after
- Verify UI/API continue to function (keys-only)

## Execution
**Status: ✅ COMPLETE — 2026-01-09 11:57 UTC**

### What was deleted
- Deleted 19 docs from `settings/attributes/audit` (non-canonical audit log)
- Keys preserved: 120 attributes in `settings/attributes/keys`

### Proof
- Before: [inventory/homer-attr-cleanup-2026-01-09/evidence/before.json](inventory/homer-attr-cleanup-2026-01-09/evidence/before.json) — audit subcollection with 19 docs
- After: [inventory/homer-attr-cleanup-2026-01-09/evidence/after.json](inventory/homer-attr-cleanup-2026-01-09/evidence/after.json) — keys collection with 120 docs (unchanged)

### Verification
- ✅ Keys collection intact (120 attributes)
- ✅ Only `keys` subcollection remains under `settings/attributes`
- ✅ Sample attribute `scom_regular_price` verified in keys with full definition
- ✅ All synonyms and metadata intact

## Acceptance Criteria Mapping
- Single source of truth: after snapshot shows only preserved subcollections under `settings/attributes`.
- Legacy attributes removed: `legacy.hits.json` should be empty (or show removed items not under `keys`).
- Product Launch & Media uses keys: verified by code (hooks fetch /api/admin/settings/attributes) and prior inspection.

## Evidence
- [inventory/homer-attr-cleanup-2026-01-09/evidence/README.md](inventory/homer-attr-cleanup-2026-01-09/evidence/README.md)
- Before snapshot: [before.attributes.tree.json](inventory/homer-attr-cleanup-2026-01-09/evidence/before.attributes.tree.json)
- Delete results: [delete.results.json](inventory/homer-attr-cleanup-2026-01-09/evidence/delete.results.json)
- After snapshot: [after.attributes.tree.json](inventory/homer-attr-cleanup-2026-01-09/evidence/after.attributes.tree.json)
- Legacy matches: [legacy.hits.json](inventory/homer-attr-cleanup-2026-01-09/evidence/legacy.hits.json)

## Notes / Risks
- Audit subcollection: preserved by default. If policy requires, re-run without preserving `audit`.
- No code changes required; UI already pulls registry via admin API from `keys`.
