# Migrate Observations linkedField → fieldLink — Dry Run

**Generated:** 2025-12-19T10:37:52.641Z

**Mode:** DRY RUN (no writes to Firestore)

## Summary

| Metric | Count |
|--------|-------|
| Total observations with linkedField | 1 |
| Proposed mappings (auto) | 0 |
| Manual review required | 1 |
| No action (empty/null) | 0 |

## Mapping Breakdown by Reason

| Reason | Count |
|--------|-------|

## Sample Proposed Mappings (first 30)

```
```

## Manual Review Required (top 25)

| Doc ID | linkedField | Reason |
|--------|-------------|--------|
| GtizAUMihJvpLyScdJnK | `sdf` | no automatic mapping |

## All Manual Review Doc IDs

```
GtizAUMihJvpLyScdJnK
```

---

**Next Steps:**
1. Review the manual_review items above
2. Update canonicalAttributeMap.approved.json if new aliases needed
3. After business signoff, run: `node scripts/migrate-observation-linkedfields.js --apply`

Lisa LP-1.0.3