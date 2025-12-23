# Section 12 — Migration, Staging & Cutover Plan

# Section 12 — Migration, Staging & Cutover Plan

This section outlines the full AOSS v1.1 migration strategy, staging environment, schema upgrades, workflow validation, and cutover/rollback procedures.

## 12.0 — Migration Overview (v1.1)

The migration to **AOSS-backed ROPI** introduces stricter schema enforcement, workflow stability (W1/W2), auditability guarantees, and deep AI integration.

### 12.0.1 Migration Principles

1. **Zero Data Loss**
2. **Deterministic Outcomes**
3. **Workflow Consistency**
4. **Reversible at Any Time**
5. **Observability-Driven**

---

## 12.1 — Migration Strategy (v1.1)

AOSS migration consists of three strategy layers:

### 12.1.1 Strategy Layers

### A. Schema Migration Layer

- Upgrade to canonical schema v1.1
- Introduce new `_migration` metadata
- Remove deprecated fields

### B. Workflow Migration Layer

- Validate W1/W2 stability
- Confirm Smart Rules idempotency
- Validate AI Describe drift tolerance
- Validate AI Complete inferred attribute stability

### C. System Migration Layer

- Cloud Functions
- API endpoints
- Admin Console
- Export engine

### 12.1.2 Cutover "North Star" Requirements

- Product counts match
- W1/W2 execute identically
- AI Describe drift < threshold
- Smart Rules produce zero conflict storms
- Error rate within SLOs

### 12.1.3 Migration Phases

| Phase | Description | Duration |
| --- | --- | --- |
| 1. Discovery | Audit legacy fields, create mapping | 1-2 days |
| 2. Staging Setup | Create staging env, seed data | 1 day |
| 3. Dry Run | Test migration on staging | 1-2 days |
| 4. Pilot | Small production batch | 1 day |
| 5. Bulk Migration | Full production migration | 1-2 days |
| 6. Cutover | Switch to new system | 2-4 hours |
| 7. Verification | Post-cutover checks | 1 day |

---

## 12.2 — Staging Environment (v1.1)

The staging environment is the mandatory validation zone before production cutover.

### 12.2.1 Staging Environment Requirements

### A. Data Requirements

- Full or partial product dataset
- Observations
- ActivityLog
- Smart Rules snapshot
- AI Describe/Complete model versions

### B. Infrastructure Requirements

- Cloud Functions mirrored
- Firestore security rules matched
- Section 11 observability dashboards
- Cost alerts at lower thresholds

### C. Workflow Requirements

- W1 Observations
- W2 Full Product Completion
- Smart Rules
- AI Describe
- AI Complete

### 12.2.2 Staging Validation Checklist

- [ ]  Migration scripts run without errors
- [ ]  All schema validation passes
- [ ]  All workflow traces complete
- [ ]  AI Describe drift < threshold
- [ ]  Smart Rules match production behavior

---

## 12.3 — Data Migration (Product Schema v1.1)

### 12.3.1 Canonical Schema Mapping

Each product must be updated to include:

- sku_core
- descriptive
- pricing
- technical
- source
- statusFlags
- timestamps
- _migration

### 12.3.2 Field Integrity Rules

1. Required fields
2. Strict format fields
3. Backfill rules
    - gender normalization
    - color normalization
    - category tokenization

### 12.3.3 Migration Output Requirements

- `_migration.version = "1.1"`
- `migratedAt` timestamp
- Structured logs emitted (Section 11.2)
- Workflow traces emitted (Section 11.7)
- Migration SLO: <0.1% failure

### 12.3.4 Data Validation After Migration

- Sample 50 random products
- Validate AI Describe
- Validate Smart Rules
- Validate export cycle
- Validate product count

---

## 12.4 — Cutover Plan (v1.1)

The cutover procedure is the controlled transition from the legacy product pipeline to the AOSS-backed ROPI v1.1 system.

### 12.4.1 Cutover Phases Overview

1. **Pre-Cutover (T–24 hours)** – backups, freeze planning, staging verification
2. **Cutover Window (T–0)** – migration lock, final sync, deploy new functions
3. **Stabilization (T+2 hours)** – SLO verification, W1/W2 integrity
4. **Post-Cutover (T+24 hours)** – drift checks, AI output stability
5. **Sign-Off (T+72 hours)** – all teams confirm successful migration

---

### 12.4.2 Pre-Cutover Checklist (T–24h)

- [ ]  Staging verification complete
- [ ]  Firestore production backup taken
- [ ]  Rollback plan validated
- [ ]  On-call engineer assigned
- [ ]  Merchandising notified
- [ ]  Legacy pipelines freeze scheduled
- [ ]  Migration scripts dry-run validated

---

### 12.4.3 Cutover Window (T–0)

- [ ]  Freeze legacy import pipelines
- [ ]  Run final delta migration
- [ ]  Verify product count matches
- [ ]  Deploy new Cloud Functions
- [ ]  Deploy new frontend build
- [ ]  Verify Firestore indexes
- [ ]  Run smoke tests:
    - New product creation
    - Observation creation
    - AI Describe
    - AI Complete
    - Export pipeline

---

### 12.4.4 Stabilization Window (T+2h)

- [ ]  Check Section 11 SLO dashboards
- [ ]  Check AI Describe drift < tolerance
- [ ]  Check Smart Rules conflict storms = 0
- [ ]  Run W1 → W2 end-to-end test
- [ ]  Verify no Firestore rule violations
- [ ]  Monitor error logs

---

### 12.4.5 Cutover Completion (T+24h)

- [ ]  Validation script (50-item sample)
- [ ]  Re-run Smart Rules sampling
- [ ]  Re-run AI Describe sampling
- [ ]  Validate exports in UI
- [ ]  Validate activityLog integrity

---

## 12.5 — Rollback Strategy (v1.1)

Rollback is a controlled return to the last known stable system.

Rollback must be **fully reversible**, **observable**, and **auditable**.

### 12.5.1 Rollback Triggers

Rollback is required when any of the following occur:

| Condition | Action |
| --- | --- |
| > 5% of products missing critical fields | Immediate rollback |
| Export engine fails completely | Rollback |
| W1 or W2 workflows break | Rollback |
| AI Describe or AI Complete errors > SLO | Investigate → rollback |
| Observability signals SLO violation | Investigate → rollback |
| Verified user-facing data loss | Immediate rollback |

---

### 12.5.2 Rollback Steps

1. **Freeze new writes**
2. **Disable Cloud Functions (AOSS path)**
3. **Restore Firestore backup**
4. **Redeploy previous backend + frontend**
5. **Re-enable legacy pipelines (if applicable)**
6. **Run verification script**
7. **Send rollback communication**

---

### 12.5.3 Rollback Verification

- [ ]  Product count matches backup count
- [ ]  No missing documents
- [ ]  Observations visible
- [ ]  AI Describe/Complete functional
- [ ]  Smart Rules suggestions stable
- [ ]  Export pipeline functional

---

### 12.5.4 Rollback Communication Template

```
**ROLLBACK NOTICE**

Time: [timestamp]

Reason: [summary]

Backup restored: [backup-id]

Status: System returned to stable version

Next steps: root cause analysis + reschedule cutover
```

---

## 12.6 — Verification (v1.1)

Verification ensures the migrated data and workflows match expected behavior.

### 12.6.1 Data Verification

- Product count verification
- Missing field scan
- Deprecated field scan
- Observation integrity check
- ai_insights → attribute application

---

### 12.6.2 Workflow Verification

Test W1 → W2 workflows:

1. Create observation
2. Verify ai_insights
3. Apply Smart Rules
4. Run AI Describe
5. Run AI Complete
6. Validate attribute outputs
7. Check validation engine

---

### 12.6.3 AI Verification

- AI Describe drift < 5%
- AI Complete consistency across equivalent SKUs
- No hallucination flags (see Section 11 Glossary)

---

### 12.6.4 Export Verification

- Export pipeline stable
- Launch Calendar reflects correct categories
- Downstream formats validated

---

### 12.6.5 Observability Verification

- SLO compliance
- Error rates < thresholds
- No conflict storms
- No denied writes
- Trace completeness per Section 11.7

---

## 12.7 — Post-Cutover QA (v1.1)

### 12.7.1 T+24h QA

- [ ]  AI Describe output sampling
- [ ]  Validation engine final pass
- [ ]  Smart Rules stability check
- [ ]  Observation → AI Apply review
- [ ]  Export pipeline QA
- [ ]  Error rate SLO confirmation

---

### 12.7.2 T+72h QA

- [ ]  Full dataset sampling
- [ ]  Attribute integrity scan
- [ ]  Duplicates scan
- [ ]  Category tokenization audit
- [ ]  Merch & Ops sign-off

---

### 12.7.3 Final Sign-Off

Migration is complete when:

- All teams sign off
- Error rates remain within SLO
- All workflows validated
- AI drift stable
- Smart Rules stable
- Observability dashboards green

---

## 12.8 — Migration Safety Nets (v1.1)

Migration must always protect the business from incorrect outputs, broken workflows, or AI instability.

### 12.8.1 Live Guards

- Real-time SLO monitoring (Section 11.1)
- Error-rate alarms during W1/W2 execution
- Immediate rollback triggers on drift

### 12.8.2 Hard Guards

- Firestore backup snapshots
- AI model version pinning
- Smart Rules freeze during cutover

### 12.8.3 Soft Guards

- Validation banners for staff
- Side-by-side Describe comparison
- Attribution logging for every migrated SKU

### 12.8.4 AI Guard Rails

- No hallucination flags allowed
- AI Complete < 95% confidence → flagged
- No auto-write while conflicts detected

---

## 12.9 — Migration Runbooks (v1.1)

### 12.9.1 Runbook: Migration Script Failure

Symptoms:

- Migration halts mid-run
- Data mismatch count > 0
- Schema errors thrown

Actions:

1. Freeze writes
2. Capture logs
3. Re-run migration on staging
4. Validate delta differences
5. Retry production migration

### 12.9.2 Runbook: AI Drift Detected

Symptoms:

- Describe drift > threshold
- Attribute mismatch between staging & production

Actions:

1. Pin AI model version
2. Re-run Describe sampling
3. Compare diff reports
4. Rollback if drift persists

### 12.9.3 Runbook: Smart Rules Conflict Storm

Symptoms:

- 
    
    > 0.25% conflict rate
    > 
- Rule chain fails to resolve

Actions:

1. Load fallback ruleset
2. Disable problematic rule groups
3. Re-run conflict detection
4. Escalate to rule owners

---

## 12.10 — Final Migration Summary (v1.1)

### 12.10.1 Responsibilities by Role

**Engineering**

- Run migration scripts
- Validate schemas
- Ensure AI stability
- Maintain SLOs
- Deploy cutover functions

**Merchandising**

- Validate attribute outputs
- Validate pricing & category correctness
- Validate descriptions

**Data Team**

- Perform sampling audits
- Validate drift reports
- Validate staging vs production parity

**Operations**

- Manage freeze windows
- Validate exports
- Validate launch calendar

### 12.10.2 Success Criteria

Migration is complete when:

- W1/W2 workflows fully functional
- AI drift < 5%
- Smart Rules conflicts = 0
- No SLO violations for 72 hours
- All teams sign off

### 12.10.3 Required Documentation

- Schema diffs
- Migration logs
- Drift reports
- Ruleset evaluations
- Export validations
- Final sign-off

---

### Navigation

← Previous Section: [Section 11 — Observability]({{https://www.notion.so/2b845ee1ec5a80d482edcd9af5565e45}})

→ Next Section: [Section 13 — Admin Console & Training]({{https://www.notion.so/2b845ee1ec5a80fd845cd4180814f782}})

[← Back to ROPI AOSS (Main Page)]({{https://www.notion.so/2b645ee1ec5a80e5b64fd04cea9e0d52}})