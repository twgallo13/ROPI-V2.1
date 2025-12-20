# LP-0.8.0 PR Attribute Triage Document

**Generated:** 2025-12-20T01:44:00Z  
**Task:** LP-0.8.0 — Autonomous fix, merge, and cleanup of attribute-related branches & PRs  
**Executor:** Homer  

---

## Summary

32 open PRs found in repository. **14 PRs** touch attribute-related code paths.

---

## Attribute-Related PRs

| PR# | Title | Head Branch | Base | Mergeable | CI Status | Created | Priority | Notes |
|-----|-------|-------------|------|-----------|-----------|---------|----------|-------|
| #303 | LP-0.8.0: attribute samples / audit evidence | `lisa/ops/audit-samples-LP-0.8.0` | aoss-main | ✅ | ⏳ Pending | 2025-12-20 | 🔴 P0 | Audit evidence - current task |
| #302 | LP-0.8.0: backup attributes before attribute fixes | `lisa/ops/backup-LP-0.8.0` | aoss-main | ✅ | ⏳ Pending | 2025-12-20 | 🔴 P0 | Safety backup - current task |
| #292 | [PVS-0.3.3] Audit UI: timeline, diffs, revert, usage & export | `lisa/PVS-0.3.3/audit-ui` | aoss-main | TBD | 3 comments | 2025-12-19 | 🟡 P2 | UI additions depend on backend audit endpoints |
| #289 | [PVS-0.3.1] Mapping API: header aliases, value synonyms | `lisa/PVS-0.3.1/mapping-api` | aoss-main | TBD | 2 comments | 2025-12-19 | 🟡 P2 | Mapping API - already merged? |
| #288 | [PVS-0.2.9] Values Manager: full CUD, bulk edit, reorder, synonyms | `lisa/PVS-0.2.9/values-cud` | aoss-main | TBD | 3 comments | 2025-12-19 | 🟠 P1 | **KEY PR** - ValuesManager component |
| #278 | [PVS-0.2.2] Normalize legacy attribute schema on GET | `lisa/PVS-0.2.2/normalize-schema` | aoss-main | TBD | 2 comments | 2025-12-19 | 🔴 P0 | **KEY PR** - Fixes blank-on-load issue |
| #277 | [PVS-0.2.1] Attributes Console: baseline audit | `lisa/PVS-0.2.1/baseline-audit` | aoss-main | TBD | 2 comments | 2025-12-19 | 🟡 P2 | Audit documentation |
| #276 | [PVS-0.1.9] Wire importer → product editor → PDP | `lisa/PVS-0.1.9/wire-importer` | aoss-main | TBD | 3 comments | 2025-12-18 | 🟡 P2 | End-to-end wiring |
| #275 | [PVS-0.1.8] Generate unified attribute mapping CSV | `lisa/PVS-0.1.8/mapping-csv` | aoss-main | TBD | 3 comments | 2025-12-18 | 🟢 P3 | Generator & docs only |
| #274 | [PVS-0.1.7] Apply staging normalization, verify API, merge PR #271 | `lisa/PVS-0.1.7/staging-normalization` | aoss-main | TBD | 2 comments | 2025-12-18 | 🟠 P1 | Staging validation |
| #273 | [PVS-0.1.6] Normalize attributes — staging dry-run | `lisa/PVS-0.1.6/normalize-staging-dryrun` | aoss-main | TBD | 2 comments | 2025-12-18 | 🟢 P3 | Dry-run & report |
| #272 | [PVS-0.1.5] Verify attribute update merge, add API test | `lisa/PVS-0.1.5/verify-normalize-tests` | aoss-main | TBD | 1 comment | 2025-12-18 | 🟢 P3 | Test verification |
| #256 | report(attribute-inspection): staging unknown attributes | report/attribute-unknown-audit | aoss-main | TBD | 4 comments | 2025-12-11 | 🟢 P3 | Audit report only |
| #154 | AOSS_FRONTEND_NAV_v1.0 | - | aoss-main | TBD | - | Pre-2025-12 | 🟢 P3 | App shell foundation |

---

## Priority Ranking & Merge Order

### Phase 1: Safety & Audit (Current)
| Order | PR | Action | Rationale |
|-------|-----|--------|-----------|
| 1 | #302 | ✅ Created | Pre-merge backup of 330 attribute docs |
| 2 | #303 | ✅ Created | Audit samples documenting legacy schema state |

### Phase 2: Core Schema Fix
| Order | PR | Action | Rationale |
|-------|-----|--------|-----------|
| 3 | #278 | Rebase & Merge | Fixes blank-on-load by normalizing legacy fields on GET |

### Phase 3: Values Manager
| Order | PR | Action | Rationale |
|-------|-----|--------|-----------|
| 4 | #288 | Rebase & Merge | Full CUD for attribute values - depends on #278 |

### Phase 4: Audit UI (if backend ready)
| Order | PR | Action | Rationale |
|-------|-----|--------|-----------|
| 5 | #292 | Verify & Merge | Audit UI - requires backend endpoints |

### Phase 5: Cleanup & Documentation
| Order | PR | Action | Rationale |
|-------|-----|--------|-----------|
| 6+ | #274, #273, #272, #276, #277, #275 | Review & Close/Merge | Supporting PRs |

---

## Key Findings from Audit Samples (PR #303)

All sampled attributes use **legacy `string[]` format** for `allowed_values`:

| Attribute | data_type | allowed_values | allowed_values_meta |
|-----------|-----------|----------------|---------------------|
| primary_color | enum | string[17] | ❌ missing |
| age_group | enum | string[5] | ❌ missing |
| rics_source.brand | undefined | undefined | ❌ missing |
| descriptive.gender | enum | string[7] | ❌ missing |

**No `allowed_values_meta` exists on any attribute in Firestore.**

---

## Code Path Coverage

| Target Path | PRs Touching |
|-------------|--------------|
| `packages/web/src/components/ValuesManager` | #288 |
| `packages/web/src/pages/Settings/AttributeManager.tsx` | #278, #288 |
| `packages/web/src/pages/Settings/AttributesConsole.tsx` | #277, #288, #292 |
| `packages/web/src/pages/Settings/AttributeDetailPanel.tsx` | #288, #292 |
| `packages/api/src/services/attributesService.ts` | #278, #274, #273 |
| `packages/api/src/endpoints/admin/settings.ts` | #278, #289 |
| `packages/sdk/src/schema/attribute.ts` | #278 |
| `packages/sdk/src/normalizers/attributes.ts` | #278 |

---

## Recommended Actions

### Immediate (LP-0.8.0 Scope)
1. ✅ **PR #302**: Backup - already created
2. ✅ **PR #303**: Audit samples - already created
3. 🔄 **PR #278**: Rebase to aoss-main, run tests, merge
4. 🔄 **PR #288**: Rebase to aoss-main (after #278), run tests, merge

### Deferred (Post LP-0.8.0)
5. **PR #292**: Review after audit backend verified
6. **PR #274-#277**: Close if superseded by #278

### Stale / Close Candidates
- PRs older than 21 days with no activity should be reviewed for closure
- PR #154 may be superseded by newer app shell work

---

## Links

- [PR #302 - Backup](https://github.com/twgallo13/ROPI-V2.1/pull/302)
- [PR #303 - Audit Samples](https://github.com/twgallo13/ROPI-V2.1/pull/303)
- [PR #278 - Normalize Schema](https://github.com/twgallo13/ROPI-V2.1/pull/278)
- [PR #288 - Values Manager](https://github.com/twgallo13/ROPI-V2.1/pull/288)
- [PR #292 - Audit UI](https://github.com/twgallo13/ROPI-V2.1/pull/292)

---

**End of Triage Document**
