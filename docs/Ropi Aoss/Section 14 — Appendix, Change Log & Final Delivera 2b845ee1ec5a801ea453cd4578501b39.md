# Section 14 — Appendix, Change Log & Final Deliverables

[← Back to ROPI AOSS (Main Page)](Ropi%20AOSS%202b645ee1ec5a80e5b64fd04cea9e0d52.md)

**Owner:** John / Theo

**Version:** AOSS v1.0 — Appendix v1.0

**Date:** 2025-11-25

---

# Section 14 — Appendix, Change Log & Final Deliverables

---

## 14.0 How to use this section

This section is the single-stop reference for handing ROPI to another team or AI. It contains the master manifest of artifacts, a human- and machine-readable changelog, the operational handoff checklist, the top risks & mitigations, an operations cheat-sheet, and supporting templates (contacts, scripts, FAQs, postmortem templates, and the staging dry-run report format).

---

## 14.1 Master manifest (`manifest.csv`)

Place as `BUILD_ROPI_AOSS_v1/14-appendix/manifest.csv`.

```
path,description,owner,last_updated
01-pages/launch-calendar.md,Public Launch Calendar page spec,Product,2025-11-25
02-schema/product.schema.json,Product JSON Schema v1.0,Engineering,2025-11-25
02-schema/types.d.ts,Generated Typescript types (master),Engineering,2025-11-25
04-smart-rules/smartrule.schema.json,Smart Rule JSON Schema,Engineering,2025-11-25
04-smart-rules/packs/footwear.v1.json,Footwear rule pack seed,Merch,2025-11-25
05-ai-describe/template-schema.json,AI template schema & sample templates,AI/Product,2025-11-25
06-api/openapi.yaml,OpenAPI v1 spec for ROPI API,Engineering,2025-11-25
07-frontend/theme.tokens.json,Design tokens (colors/typography),Design,2025-11-25
08-types/types.d.ts,Canonical TypeScript bindings,Engineering,2025-11-25
08-sdk/openapi-client,Generated OpenAPI client,Engineering,2025-11-25
09-firebase/firestore.rules,Firestore security rules,Ops/SRE,2025-11-25
09-firebase/firestore.indexes.json,Firestore composite indexes,Ops/SRE,2025-11-25
10-ci/ci.yml,CI workflow (PR checks),Engineering,2025-11-25
11-ops/slo-definitions.md,SLO definitions & metrics,Ops/SRE,2025-11-25
12-migration/mapping-table.csv,Legacy -> canonical field mapping,DataOps,2025-11-25
13-admin/admin-console-spec.md,Admin UI & field-level microcopy,Product,2025-11-25
14-appendix/CHANGELOG.md,Master changelog,Product,2025-11-25
14-appendix/handoff-checklist.md,Handoff checklist & signoff template,Product,2025-11-25
14-appendix/risk-register.md,Top risks & mitigations,SRE/Product,2025-11-25
14-appendix/contacts.md,Contacts & escalation matrix,Operations,2025-11-25
14-appendix/scripts.md,Operational scripts & one-liners,Engineering,2025-11-25
14-appendix/faq.md,Top 20 FAQ & troubleshooting,Support,2025-11-25
14-appendix/decision-index.md,Major design decisions & rationale,Product,2025-11-25
14-appendix/staging-dryrun-report.md,Sample staging dry-run report,Engineering,2025-11-25

```

14-appendix/[decision-index.md](http://decision-index.md),Major design decisions & rationale,Product,2025-11-25

14-appendix/[staging-dryrun-report.md](http://staging-dryrun-report.md),Sample staging dry-run report,Engineering,2025-11-25

11-ops/[observability.md](http://observability.md),Observability & Ops (Section 11): SLOs, logging schema, alerts, runbooks, backup/restore procedures,Ops/SRE,2025-11-25

```

```

---

## 14.2 CHANGELOG (`CHANGELOG.md`)

Path: `BUILD_ROPI_AOSS_v1/14-appendix/CHANGELOG.md`

```markdown
# ROPI AOSS — Changelog

All notable changes to ROPI AOSS are documented in this file.

## [1.0.0] — 2025-11-25
### Added
- Full AOSS v1.0: Sections 1–14, including:
  - Navigation & Pages (Section 1)
  - Canonical Schema & Types (Section 2)
  - Workflows (Section 3)
  - Smart Rules & Automation (Section 4)
  - AI Describe Engine (Section 5)
  - API Contracts & Integration (Section 6)
  - Frontend & Product Editor (Section 7)
  - TypeScript Bindings & SDK (Section 8)
  - Firebase Implementation & Security (Section 9)
  - CI/CD & Testing (Section 10)
  - Observability & Runbooks (Section 11)
  - Migration & Cutover Plan (Section 12)
  - Admin Console & Training content (Section 13)
  - Appendix & final deliverables (Section 14)
### Notes
- This release represents the complete V1.0 AOSS deliverable for ROPI.
- Admin Console & Training content (Section 13)
  - Appendix & final deliverables (Section 14)
  - Added Observability v1.0 (Section 11) including SLO definitions, structured logging contract, alerting policies, runbooks, and AI cost monitoring requirements.
### Notes
- This release represents the complete V1.0 AOSS deliverable for ROPI.

```

**How to extend:** For future changes, add an entry with semantic version and short bullet list of changes. Always record owner and date.

---

## 14.3 Handoff checklist (`handoff-checklist.md`)

Path: `BUILD_ROPI_AOSS_v1/14-appendix/handoff-checklist.md`

```markdown
# ROPI — Handoff Checklist

**Owner:** ____________________
**Date:** ____________________

## Pre-handoff verification
- [ ] All AOSS sections present in repo (manifest validated)
- [ ] `02-schema` JSON Schemas validated by AJV
- [ ] `06-api/openapi.yaml` contract validated (spectral)
- [ ] `08-scripts/generate.sh` reproduces `08-types` and `08-sdk`
- [ ] Firestore rules uploaded and linted (`firestore.rules`)
- [ ] Storage rules in place (`storage.rules`)
- [ ] CI checks pass on `main` (ci.yml)
- [ ] Staging environment seeded and smoke-tested

## Documentation & admin
- [ ] Notion Help Center pages imported or linked
- [ ] Admin console spec loaded into product docs
- [ ] Training curriculum scheduled and materials ready

## Ops & monitoring
- [ ] Dashboards created & shared with SRE
- [ ] Alerting configured (PagerDuty/Slack)
- [ ] Backup schedule verified
- [ ] IAM & secret policies documented

## Migration & cutover
- [ ] Migration scripts tested on staging (dry-run)
- [ ] Cutover checklist agreed and owners assigned
- [ ] Rollback playbook verified

## Final signoffs
- Product: ____________________ (name + date)
- Engineering: ____________________ (name + date)
- SRE / Ops: ____________________ (name + date)
- Security & Compliance: ____________________ (name + date)

```

Use this as the authoritative go/no-go checklist for handoff.

---

## 14.4 Risk register (`risk-register.md`)

Path: `BUILD_ROPI_AOSS_v1/14-appendix/risk-register.md`

```markdown
# ROPI Top Risks & Mitigations — v1.0

| ID | Risk | Likelihood | Impact | Mitigation | Owner |
|----|------|------------|--------|------------|-------|
| R-001 | AI hallucination produces false product claims | Medium | High | Factuality checks post-AI; block/flag outputs; require human confirmation for product name & critical claims | AI Owner |
| R-002 | Firestore cost blowout due to unbounded documents | Medium | High | Archiver + retention policy; auto-export to cold storage when >5k archived docs; monitor usage & alerts | SRE |
| R-003 | Import CSV format drift causes large failure rate | Medium | Medium | Mapping presets, import validation, error CSVs, sample CSV templates | DataOps |
| R-004 | Smart rule autoApply incorrectly overwrites human edits | Low | High | Safety rules: no autoApply on user-edited fields; audit logs; admin gate for autoApply for large batches | Product |
| R-005 | AI cost overrun | Medium | High | Budget guard (disable sync), per-model caps, daily spend alerts | Finance/AI Owner |
| R-006 | Archiver deletes required data accidentally | Low | High | Two-step archiver (export then delete), manual restore procedure, test restore monthly | SRE |
| R-007 | Security breach of secret / model key | Low | Critical | Secret Manager, rotation policy, limited service account IAM, incident playbook | Security |
| R-008 | Export format broke Magento ingest | Low | Medium | Export profile tests, staging import into Magento; sample exports & acceptance tests | Integration Owner |
| R-009 | Hotspotting in Firestore causing latency | Low | Medium | Denormalize products_search, shard keys, avoid large writes to a single doc | SRE |
| R-010 | Unauthorized changes to Smart Rules | Low | High | Audit log, publish gating, admin-only permissions | Product/Security |

```

Add rows as new risks are discovered. Each risk must include owner and a remediation target date.

---

## 14.5 Contacts & escalation matrix (`contacts.md`)

Path: `BUILD_ROPI_AOSS_v1/14-appendix/contacts.md`

```markdown
# ROPI Contacts & Escalation Matrix

## Primary contacts
- **Product Owner**: John Doe — john@shiekhshoes.org — PST
- **Lead Engineer**: Theo Gallo — theo@shiekhshoes.org — PST
- **SRE / Ops Lead**: [Name] — ops@shiekhshoes.org — PST
- **AI Owner**: [Name] — ai@shiekhshoes.org
- **Merch Lead**: [Name] — merch@shiekhshoes.org
- **Security / Compliance**: [Name] — security@shiekhshoes.org

## On-call & Pager info
- PagerDuty: team `ropi-ops` (escalation rules defined in Ops)
- Slack channels:
  - `#ropi-ops` — production ops notifications
  - `#ropi-ai` — AI/describe discussions
  - `#ropi-support` — general support & triage

## Escalation ladder (example)
1. Tier 1 (MerchOps) — `#ropi-support`
2. Tier 2 (SRE/Ops) — `#ropi-ops`, on-call
3. Tier 3 (Engineering) — Theo / Lead Engineer
4. Product / Exec notification if incident P0

**Emergency phone list** (fill in real phone/pager numbers in your environment)
- SRE Primary: +1-xxx-xxx-xxxx
- Lead Engineer: +1-xxx-xxx-xxxx

```

Edit and extend with real phone/pager numbers and timezones.

---

## 14.6 Scripts & operational one-liners (`scripts.md`)

Path: `BUILD_ROPI_AOSS_v1/14-appendix/scripts.md`

```markdown
# Useful Operational Scripts & One-Liners

## Local dev & emulator
- Start emulator (Auth, Firestore, Functions, Storage):

```

firebase emulators:start --only auth,firestore,functions,storage

```

- Seed staging:

```

node scripts/seed.js --env=staging

```

## Generate types & clients
- Run codegen:

```

cd BUILD_ROPI_AOSS_v1/08-scripts

./generate.sh

```

## Firestore & Storage backups
- Export Firestore to GCS:

```

gcloud firestore export gs://ropi-backups/exports/$(date +%Y%m%d)

```

## Archiver dry-run
- Call archiver with dry-run flag:

```

gcloud functions call archiver --data '{"dryRun":true}'

```

## Firestore simple query (gcloud)
- Count products with ready_for_export true:

```

gcloud alpha firestore documents list --collection=products --filter='statusFlags.ready_for_export=true' --project=ropi-prod | jq length

```

## Regenerate & commit
- Regenerate types & client then show changes:

```

BUILD_ROPI_AOSS_v1/08-scripts/generate.sh

git status --porcelain

```

## Quick job checks
- List last 10 import jobs (Cloud Functions logs or Firestore):

```

gcloud firestore documents list --collection=imports --limit=10 --order=desc

```

```

These commands are templates — adapt to your tooling and IAM.

---

## 14.7 FAQ (`faq.md`)

Path: `BUILD_ROPI_AOSS_v1/14-appendix/faq.md`

```markdown
# ROPI FAQ — Top 20

1. **Q:** How does ROPI decide Gender?
   **A:** Smart Rules evaluate `source.rics.category` tokens and observations. If a high-confidence rule matches (>= 0.9) and field is empty, ROPI auto-applies; otherwise a suggestion appears.

2. **Q:** What do I do when AI description invents facts?
   **A:** Use the Activity Log to revert the AI write, flag the description with `factual` low, and open an AI template change request. See AI Outage Runbook.

3. **Q:** How long will products remain in the system?
   **A:** By default, products are archived after 180 days from `exported_at` or `imported_at`, retained 6 more months before deletion. Admins can change via Settings.

4. **Q:** What should I do when import shows `missing_mpn`?
   **A:** Download the `errors` CSV from the import job, fix the MPN column, and re-upload the rows. See Import lab.

5. **Q:** Who can publish Smart Rules?
   **A:** Admins only. Merch may author drafts and test, but publish requires admin approval.

6. **Q:** Can we regenerate descriptions for multiple sites?
   **A:** Yes — regenerate per-site via Product Editor or bulk via `ai/describe/start` jobs. When multiple sites are selected in one job, results are per-site and written only for the site requested.

7. **Q:** Where are raw AI outputs stored?
   **A:** `aiJobs/{jobId}` contains job metadata; raw responses are stored in GCS `ai-raw/{jobId}.json` if large.

8. **Q:** What if the archiver deletes something we need?
   **A:** Admins can restore from `archives/ropi/*.ndjson` exports. See Archiver restore runbook.

9. **Q:** How do we add a new color to allowed values?
   **A:** Admin → Attribute Manager → edit `Primary Color` allowed values and synonyms. Optionally run re-normalization background job.

10. **Q:** Is the public Launch Calendar editable?
    **A:** The public page shows `launchCards` snapshot (public fields). Internal users edit via `/app/launch-calendar` and internal messages are not public.

(…add 10 more as needed…)

```

Add more FAQs over time. This file is the first 10 — expand to 20 as requested.

---

## 14.8 Decision index (`decision-index.md`)

Path: `BUILD_ROPI_AOSS_v1/14-appendix/decision-index.md`

```markdown
# Major Design Decisions & Rationale

This document lists the major design decisions made during AOSS v1.0 and their rationale.

## D-001 — Firestore-first search
**Decision:** Use a denormalized `products_search` collection on Firestore instead of Algolia for v1.
**Rationale:** Simpler ops, fewer external dependencies, sufficient for scale up to low tens of thousands of products; migration path to Algolia later is described.
**Implication:** Implement Cloud Function sync and composite indexes; add guide to migrate to Algolia later.

## D-002 — Store per-site descriptions and export HTML
**Decision:** Store per-site HTML (sanitized) at `descriptive.siteDescriptions[site]` and export descriptions as HTML in CSV.
**Rationale:** Keeps per-site SEO content explicit and export stable for Magento and RO.
**Implication:** Strict sanitization policy and WYSIWYG guidance.

## D-003 — UUID placeholder handling
**Decision:** If product name looks like a UUID tracking code on import, leave `sku_core.name` blank.
**Rationale:** Prevents garbage names; forces human confirmation.
**Implication:** Importer includes `looksLikeTrackingUuid` guard.

## D-004 — Archiver 6mo + retention max 5k
**Decision:** Archive after 6 months and keep 6 months archived; when archived count > 5000 export older archived items to cold storage.
**Rationale:** Cost control and retrieval capability.
**Implication:** Archiver scheduled job & admin knobs.

## D-005 — Smart Rules safety
**Decision:** Smart Rules cannot auto-overwrite user-edited fields; autoApply only if field empty and confidence threshold passed.
**Rationale:** Preserve human authority and avoid regressions.
**Implication:** Track `_appliedRules` metadata and log all auto-applies.

(…add more decisions and links to sections…)

```

---

## 14.9 Staging dry-run report template (`staging-dryrun-report.md`)

Path: `BUILD_ROPI_AOSS_v1/14-appendix/staging-dryrun-report.md`

```markdown
# Staging Dry-Run Report — [DATE]

**Migration Run ID:** run-2025-11-25-001
**Operator:** [name]
**Source:** legacy-exports/2025-11-xx.csv
**Target environment:** staging

## Summary
- Rows processed: 10,000
- Products created: 9,850
- Errors: 150
  - Schema errors: 48
  - Missing MPN: 60
  - Parse errors: 42

## Top 5 error types
1. `missing_mpn` — 60 rows — sample rows: 14, 209, ...
2. `invalid_date` — 30 rows — sample rows: 110, 240
3. `unknown_color` — 25 rows
4. `json_parse_error` — 20 rows
5. `name_uuid_detected` — 15 rows

## Smart Rules & AI stats
- Smart Rules auto-applied (successful): 6,200
- Suggestions produced (manual review): 3,700
- Conflicts detected: 112
- AI Describe sample runs (100 products):
  - avg overall score: 8.6
  - failures (factuality<0.6): 3

## Issues & actions
- Action A: Add synonyms mapping for legacy color codes (owner: DataOps)
- Action B: Address date parsing for legacy format `MM/DD/YY` (owner: Engineering)
- Action C: Add mapping for old 'department' token 'Kids' -> AgeGroup mapping (owner: Product)

## Conclusion
Dry-run passed success criteria for schema-valid documents (> 98% valid) and Smart Rules produced acceptable auto-apply rates. Recommend small pilot in production with a 2,000-row batch before full migration.

```

Use this structure to report every staging run.

---

## 14.10 Postmortem template (`postmortem.md`)

---

## 14.4 Settings / AI / Workflow Cross-Reference Index

This section is a quick-reference map for how all major Settings modules connect to schemas, workflows, and runtime engines.

### 1. Settings Hub Overview

**Page:** Admin UI Build Spec — Settings CRUD

**Route:** `/app/settings`

**Component:** `SettingsDashboard`

Cards and their routes:

- Attributes → `/app/settings/attributes`
- Smart Rules → `/app/settings/smart-rules`
- AI Templates → `/app/settings/ai-templates`
- AI Settings → `/app/settings/ai`
- Search & Filters → `/app/settings/search`
- Import Settings → `/app/settings/import-settings`
- Export Settings → `/app/settings/export-settings`
- Archiver & Retention → `/app/settings/archiver`
- Users → `/app/settings/users`
- Bulk Actions Settings → `/app/settings/bulk-actions`
- Workflow Settings → `/app/settings/workflows`
- AI Performance & Caching → `/app/settings/ai-performance`
- Roles & Permissions → `/app/settings/permissions`

All modules live under the `admin` role by default and are further constrained by Roles & Permissions.

---

### 2. Settings ↔ Schemas ↔ Engines

This table summarizes how each Settings module maps to core schemas and runtime engines:

| Settings Module | Route | Primary Schema / Collection | Affects Engine / Workflow |
| --- | --- | --- | --- |
| Attributes | `/app/settings/attributes` | Product Schema (2.1), Attribute Registry | Product CRUD, Import, Describe preconditions |
| Smart Rules | `/app/settings/smart-rules` | Smart Rules JSON | Pre-process for Describe, filters, exports |
| AI Templates | `/app/settings/ai-templates` | `settings/ai/prompts/{templateKey}` | AI Describe Engine (Section 5) |
| AI Settings | `/app/settings/ai` | `settings/system/aiSettings` | Describe defaults, tone, limits, bulk behavior |
| Search & Filters | `/app/settings/search` | `settings/searchSettings`, Attribute Registry | Product list search, filter facets, API filters |
| Import Settings | `/app/settings/import-settings` | `settings/importSettings` | Import Engine (Section 3.1/3.2) |
| Export Settings | `/app/settings/export-settings` | `settings/exportSettings` | Export / feeds (Section 6) |
| Archiver & Retention | `/app/settings/archiver` | `settings/archiverSettings` (future) | Data lifecycle and cleanup |
| Users | `/app/settings/users` | `users/*` | Admin access, roles, ownership |
| Bulk Actions Settings | `/app/settings/bulk-actions` | `settings/bulkActionsSettings` | Product list bulk actions |
| Workflow Settings | `/app/settings/workflows` | `settings/workflowSettings` | W1, W2, completion preconditions |
| AI Performance & Caching | `/app/settings/ai-performance` | `settings/system/aiPerformanceSettings` | Describe throughput, caching, queuing |
| Roles & Permissions | `/app/settings/permissions` | `settings/permissionSettings` | Access to all modules / actions |

---

### 3. Settings ↔ Workflow Map

**Workflow W1 — Observations Capture & Apply to Product**

- Uses:
    - Workflow Settings (`enableW1Observations`)
    - Smart Rules (how observations are applied / normalized)
    - Attributes & Attribute Registry (which fields can be observed)
    - Search Settings (filtering observed vs non-observed items)

**Workflow W2 — Full Product Completion (One-Person Process)**

- Uses:
    - Workflow Settings:
        - `requiredFieldsForCompletion`
        - `describePreconditions`
        - `autoRunDescribeAfterSave`
    - AI Templates (matched audience templates)
    - AI Settings (defaults, tone, limits)
    - Import Settings (how initial values got in)
    - Export Settings (ensuring completed data flows downstream)
    - Bulk Actions Settings (when completion is done in bulk)

---

### 4. Settings ↔ AI Describe Engine Map

**AI Templates (`/app/settings/ai-templates`)**

- Controls: format, tone, conditions, SEO patterns, banned terms
- Section 5: Template System, selection algorithm, prompt construction.

**AI Settings (`/app/settings/ai`)**

- Controls: default template per site, tone presets, bulk/async flags, limits.
- Section 5: Tone resolution, rate limits, error codes.

**AI Performance & Caching (`/app/settings/ai-performance`)**

- Controls: concurrency, cache TTL, queue behavior.
- Section 5: Performance & Caching integration, Section 11: monitoring.

**Workflow Settings (`/app/settings/workflows`)**

- Controls: Describe preconditions and auto-run logic.
- Section 5: Describe UX integration and error/blocker cases.

---

### 5. Settings ↔ Search / Import / Export Map

- **Search & Filters (`/app/settings/search`):**
    - Defines which attributes are searchable and filterable.
    - Tied to:
        - Attribute Registry flags (`search`, `filter`)
        - Product list behavior
        - API `filters` param (Section 6)
- **Import Settings (`/app/settings/import-settings`):**
    - Defines normalization rules, default mappings, and error policy.
    - Import → Normalize → Smart Rules → Describe → Export.
- **Export Settings (`/app/settings/export-settings`):**
    - Defines field mappings per site and transforms.
    - Uses Describe-generated SEO fields and registry-validated attributes.

---

### 6. Roles & Permissions Overlay

**Roles & Permissions (`/app/settings/permissions`)** define who can:

- View vs edit Settings modules
- Run Describe, Bulk Describe, and Smart Rules
- Change AI-critical configs (templates, settings, performance)

This module must be considered when:

- Onboarding new admins or managers
- Running any training (Section 13)
- Handing AOSS to a new team or AI

---

### 7. Handoff / Operator Checklist (Settings Focus)

For any handoff of AOSS, operators must know how to find:

- Settings Hub (`/app/settings`)
- AI Templates, AI Settings, and AI Performance & Caching
- Search & Filters, Import, Export modules
- Workflow & Bulk Actions Settings
- Roles & Permissions

This cross-reference index should be used as the **starting map** for any new admin or AI agent responsible for operating AOSS.

---

## 14.10 Postmortem template ([`postmortem.md`](http://postmortem.md))

Path: `BUILD_ROPI_AOSS_v1/14-appendix/postmortem.md`

```markdown
# Incident Postmortem — [Short title]

**Incident ID:** inc-YYYYMMDD-001
**Severity:** P0|P1|P2
**Start:** 2025-11-25Txx:xxZ
**End:** 2025-11-25Txx:xxZ
**Owner:** [name]

## Summary
Short summary of what happened, impact, and services affected.

## Timeline
- [time] — Event 1
- [time] — Event 2
- ...

## Root cause
Describe root cause and contributing factors.

## Detection & Response
How we detected, immediate mitigations, who was involved.

## Impact
Number of affected products / users, business impact estimate.

## Resolution & recovery
Step-by-step how service was restored.

## Post-incident actions
- Action 1 — owner — due date
- Action 2 — owner — due date

## Lessons learned
One-paragraph list of key learnings.

## Validation & closure
- [ ] Action items completed
- [ ] Production monitors validated

```

---

## 14.11 Final notes & next steps

## 14.4 Recommended Next Workstreams

The following items were previously identified as future additions. Most are now complete and linked into their respective sections.

- **Security IAM documentation** — Completed in [**Section 9 — Firebase Implementation & Security**](Section%209%20%E2%80%94%20Firebase%20Implementation%20&%20Security%202b845ee1ec5a80ea8f5ecd0c08d31847.md)
- Additional Smart Rules examples (optional extensions)
- Expanded AI Describe templates for more product categories
- Enhanced Media QA automation (future release)

**Immediate operational workstreams:**

1. Seed Section 4 Smart Rules pack (footwear) into staging and run full staging dry-run.
2. Create `codegen-check` job in CI and enable it on PRs.
3. Run pilot migration with 2k rows in production off-hours.
4. Schedule training sessions for Merch & Photographers.

---

---

### Navigation

← Previous Section: [**Section 13 — Admin Console, Help & Training**](Section%2013%20%E2%80%94%20Admin%20Console,%20Help%20&%20Training%202b845ee1ec5a80fd845cd4180814f782.md)

[← Back to ROPI AOSS (Main Page)](Ropi%20AOSS%202b645ee1ec5a80e5b64fd04cea9e0d52.md)