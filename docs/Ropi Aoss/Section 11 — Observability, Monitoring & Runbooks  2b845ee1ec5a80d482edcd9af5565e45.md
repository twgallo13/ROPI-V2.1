# Section 11 — Observability, Monitoring & Runbooks (Ops)

[← Back to ROPI AOSS (Main Page)](Ropi%20AOSS%202b645ee1ec5a80e5b64fd04cea9e0d52.md)

# Section 11 — Observability, Monitoring & Runbooks

This section provides monitoring configurations, SLOs, logging standards, and incident runbooks for ROPI operations.

# 11.0 — Observability Overview & AOSS Ops Contract

Observability in **AOSS** guarantees that every workflow, automated rule, and AI-driven transformation is:

- Measurable
- Debuggable
- Explainable
- Stable
- Reliable
- Cost-efficient
- Safe for automation

The Observability framework spans:

- **Workflows:**
    - `W1 — Observations Capture` [Workflow W1 — Observations Capture & Apply to Product](Workflow%20W1%20%E2%80%94%20Observations%20Capture%20&%20Apply%20to%20Prod%202b845ee1ec5a81b5a4a6d3ea439ec277.md)
    - `W2 — Full Product Completion` [🧩 **Workflow W2 — Full Product Completion (One-Person Process)**](%F0%9F%A7%A9%20Workflow%20W2%20%E2%80%94%20Full%20Product%20Completion%20(One-Perso%202ba45ee1ec5a809cbc1fd8daebc3f147.md)
    - `Product Completion Workflows` [Product Completion Workflows](Product%20Completion%20Workflows%202ba45ee1ec5a80698690f9492961ed8b.md)
- **AI Systems:**
    - AI Complete [Section 4 Smart Rules](Section%204%20Smart%20Rules%202b845ee1ec5a80e98270ea192ae29f97.md)
    - AI Describe [Section 5 — AI Describe Engine ](Section%205%20%E2%80%94%20AI%20Describe%20Engine%202b845ee1ec5a80ba8666e0f2d722b83f.md)
- **Import/Export Engine:**
    
    [Import Engine — Row Schema (Section 3.1)](Import%20Engine%20%E2%80%94%20Row%20Schema%20(Section%203%201)%202b845ee1ec5a81b4afa9d1375e153900.md)
    
- **Smart Rules:**
    
    [Section 4 Smart Rules](Section%204%20Smart%20Rules%202b845ee1ec5a80e98270ea192ae29f97.md)
    
- **APIs and Integrations:**
    
    [Section 6 — API Contracts & Integration (AOSS v1.0)](Section%206%20%E2%80%94%20API%20Contracts%20&%20Integration%20(AOSS%20v1%200%202b845ee1ec5a80c3baf0d2a9e415e0b5.md)
    
- **Firebase Cloud Functions & Firestore**
    
    [**Section 9 — Firebase Implementation & Security**](Section%209%20%E2%80%94%20Firebase%20Implementation%20&%20Security%202b845ee1ec5a80ea8f5ecd0c08d31847.md)
    
- **CI/CD:**
    
    [Section 10 — CI / CD, Testing, Release & Stability](Section%2010%20%E2%80%94%20CI%20CD,%20Testing,%20Release%20&%20Stability%202b845ee1ec5a80ccaf70e49777a2b677.md)
    

## Observability Responsibilities

Observability governs:

- SLOs & SLIs
- Structured logs
- Metrics
- Dashboards
- Tracing
- Alerts
- Runbooks
- Cost monitoring
- Incident response
- Backup & restore

AOSS uses a unified log schema, a unified SLO model, and a unified tracing strategy across **all systems** so AI and humans can operate from a single source of truth.---

# 11.1 — SLOs & SLIs

Service-Level Objectives (SLOs) define the operational contract of the AOSS platform.

These SLOs apply across:

- Importing
- Observations
- AI systems
- Smart Rules
- Firestore
- APIs
- Admin tooling

### 11.1.1 — API SLOs

- Availability: **99.95%**
- P95 latency: **< 450ms**
- Timeout rate: **< 0.05%**
- Error rate: **< 0.1%**

**Key SLIs:**

- `request_count`
- `error_count`
- `duration_ms`
- `cold_starts`

### 11.1.2 — Import Pipeline SLOs

- 95% of imports complete in **< 3 seconds**
- Normalization errors < **1%**
- AI insight latency < **4 seconds**
- Retry rate < **0.1%**

**Key SLIs:**

- `import_latency`
- `normalization_errors`
- `row_ingest_count`
- `ai_insight_latency`

### 11.1.3 — AI Describe SLOs

- P75 latency < **1.8 seconds**
- Rewrite cycles ≤ **3**
- Model error rate < **0.25%**
- Vision caption extraction < **1.3 seconds**

### 11.1.4 — AI Complete SLOs

- Attribute inference accuracy ≥ **98%**
- Derived attribute accuracy ≥ **95%**
- Low-confidence flag rate < **7%**

### 11.1.5 — Smart Rules SLOs

- Evaluation latency < **250ms**
- Conflict rate < **0.1%**
- Auto-corrections < **3%**
- Human overrides ALWAYS win and must be preserved over any automated suggestion.

### 11.1.6 — Firestore SLOs

- Write latency < **12ms**
- Read latency < **8ms**
- Transaction retries < **0.5%**---

# 11.2 — Structured Logging

AOSS uses one unified logging contract that applies to:

- Cloud Functions
- Import pipeline
- Observations ingestion
- AI Complete
- AI Describe
- Smart Rules
- Admin actions
- API Gateway

Each log entry must include:

- Workflow context
- Actor context
- Operation context
- Span + trace IDs
- Success/failure status
- Payload metadata
- **11.2.1 — Core JSON Schema**
    
    ```json
    {
      "ts": "2025-01-01T12:00:00Z",
      "severity": "INFO|WARN|ERROR|DEBUG",
      "service": "import|describe|complete|rules|api|task|imageAnalysis",
      "workflow": "W1|W2|import|describe|complete|rules|admin",
      "traceId": "uuid",
      "spanId": "uuid",
      "duration_ms": 153,
      "actorId": "string|null",
      "productId": "string|null",
      "operation": "string",
      "status": "success|failure|retry",
      "message": "string",
      "payload": {}
    }
    ```
    
    **Required fields:**
    
    - `traceId`
    - `spanId`
    - `service`
    - `workflow`
    - `operation`
    - `status`
- **11.2.2 — Example Logs**
    
    **Import Success**
    
    ```json
    {
      "service": "import",
      "workflow": "import",
      "operation": "normalize",
      "status": "success",
      "duration_ms": 213,
      "productId": "P12345",
      "payload": { "attributesChanged": 11 }
    }
    ```
    
    **AI Describe Failure**
    
    ```json
    {
      "service": "describe",
      "workflow": "W2",
      "status": "failure",
      "operation": "ai_describe",
      "duration_ms": 1850,
      "message": "Model refused",
      "payload": { "model": "gpt-4o", "attempt": 1 }
    }
    ```
    

# 11.3 — Metrics & Dashboards

This section defines the metric families used to monitor AOSS health. These metrics are surfaced in dashboards, SLO checks, and alerts.

- **11.3.1 — Import Metrics**
    - `import_latency` — time from file ingest to normalized rows
    - `row_ingest_count` — number of rows processed per import
    - `normalization_errors` — count of rows rejected by normalization
    - `ai_insight_latency` — latency for AI-based enrichment on imports
    - `import_failures` — count of failed imports
- **11.3.2 — Smart Rules Metrics**
    - `rules_eval_latency` — evaluation time per ruleset
    - `conflicts_detected` — number of rule conflicts detected
    - `overrides_created` — number of manual overrides created
    - `suggestions_created` — number of Smart Rules suggestions produced
- **11.3.3 — AI Describe Metrics**
    - `describe_latency` — end-to-end latency for Describe requests
    - `rewrite_cycles` — number of rewrite passes per description
    - `hallucination_flags` — count of outputs flagged as hallucination-prone
    - `output_word_count` — distribution of description lengths
    - `model_usage_distribution` — breakdown by model version used
- **11.3.4 — AI Complete Metrics**
    - `inferred_attributes_count` — number of attributes inferred per run
    - `complete_latency` — latency for AI Complete to finish
    - `low_confidence_flags` — frequency of low-confidence results
    - `manual_overrides` — count of attributes manually overridden by humans
- **11.3.5 — Cost Metrics**
    - `token_usage_daily` — tokens used per day aggregated by workflow
    - `cost_per_product` — estimated cost to fully complete one product
    - `describe_cost` — cost attributed to Describe operations
    - `retry_cost` — cost due to retries / failures
    - `ai_quota_utilization` — percentage of model quota used
- **11.3.6 — Firebase / Infra Metrics**
    - `cold_starts` — number of Cloud Function cold starts
    - `cpu_utilization` — CPU usage for key services
    - `memory_usage` — memory usage for key services
    - `firestore_errors` — Firestore operation errors
    - `firestore_latency` — Firestore read/write latency distribution---
- **11.3.7 — AI Describe Performance & Caching Metrics**
    
    The following settings live in `/app/settings/ai-performance` and must be reflected in monitoring dashboards and alerts:
    
    - `maxConcurrentPerUser`, `maxConcurrentGlobal`
    - `maxItemsPerAsyncJob`
    - `enableResultCaching`, `cacheTTLMinutes`
    - `onLimitBehavior`, `maxQueueDepth`
    - `enableTimingMetrics`
    
    **Dashboards should show:**
    
    - Current Describe throughput (requests/min)
    - Queue depth (if queueing is enabled)
    - Cache hit rate and average latency
    - Rate of limit-related errors (queue full, limit exceeded, rejects)
    
    **Runbooks for Describe performance incidents must reference these settings as levers for mitigation.**
    

# 11.4 — Alerts & Notification Policy

- **11.4.0 — Overview**
    
    Alerts notify operators (human or AI) when AOSS is operating outside expected performance or correctness boundaries.
    
    All alerts must:
    
    - Use structured JSON payloads
    - Include `traceId` and `spanId`
    - Reference the related workflow (W1, W2, Import, AI Describe, AI Complete, Smart Rules)
    - Link to the relevant runbook
    - Include contextual metadata for debugging
    
    Alerts are routed through:
    
    1. Auto-deduplication
    2. AI Triage Agent (Lela Ops)
    3. Runbook routing logic
- **11.4.1 — Core Alert Payload**
    
    ```json
    {
      "ts": "2025-01-01T12:00:00Z",
      "category": "latency|failure|slo_violation|quota|cost|data_integrity",
      "workflow": "W1|W2|import|describe|complete|rules|admin",
      "service": "import|describe|complete|rules|api|task",
      "severity": "info|warn|critical",
      "traceId": "uuid",
      "spanId": "uuid",
      "message": "string",
      "runbook": "url-or-reference",
      "metadata": {}
    }
    ```
    
- **11.4.2 — Required Alert Types**
    
    **Import Pipeline Alerts**
    
    - Import latency breach
    - Normalization errors > 1%
    - ai_insight_latency > 4s
    - Fatal ingest error
    - CSV structural mismatch
    
    **AI Describe Alerts**
    
    - P75 latency violation
    - Rewrite cycles > 3
    - Model refusal spikes
    - Hallucination-risk flags
    
    **AI Complete Alerts**
    
    - Derived attribute accuracy < 95%
    - Low-confidence flag rate > 7%
    - Auto-corrections > 3%
    
    **Smart Rules Alerts**
    
    - Rule conflict rate > 0.25%
    - Rule evaluation latency breach
    
    **Workflow Alerts (W1/W2)**
    
    - Observation ingestion failures
    - Image Analysis failure
    - ai_insights missing
    
    **Infra Alerts**
    
    - Firestore latency breaches
    - Function cold start spikes
    - Quota exhaustion
    - Cost anomaly detection

# 11.5 — Runbooks (Unified v1.1)

- **11.5.0 — Runbook Format**
    
    All runbooks follow this template:
    
    ## Summary
    
    One-sentence explanation of the failure.
    
    ## Trigger Conditions
    
    - Alerts involved
    - Related SLOs
    - Related metrics
    
    ## Immediate Actions
    
    1. Validate alert authenticity
    2. Check real-time dashboards
    3. Fetch logs using traceId
    4. Identify impacted workflows/services
    
    ## Detailed Steps
    
    - API endpoints to check
    - Firestore paths
    - Smart Rules conflict analysis
    - AI operations to retry
    
    ## Recovery
    
    - How to restore service
    - Backfill or reprocess steps
    
    ## Verification
    
    - Metrics return to SLO
    - Logs show successful completion
    
    ## Escalation
    
    - When to escalate
    - Who to notify
- **11.5.1 — Required Runbooks**
    
    ### Import Pipeline Failure
    
    - CSV ingest errors
    - Normalization mismatch
    - ai_insights generation issues
    
    ### AI Describe Failure
    
    - Model refusals
    - Latency spikes
    - Rewrite loop escalation
    
    ### AI Complete Failure
    
    - Missing attributes
    - Low-confidence spikes
    
    ### Smart Rules Failure
    
    - Rule conflicts
    - Evaluation timeout
    
    ### Observations Workflow Failure (W1/W2)
    
    - ai_insights missing
    - Observation ingestion blocked
    
    ### Firestore / Infra Failure
    
    - Cold starts
    - Quota exhaustion

# 11.6 — Cost & Quota Monitoring

- **11.6.0 — Overview**
    
    Cost monitoring ensures AOSS stays predictable, efficient, and below budget.
    
    AI model usage is the primary cost driver.
    
- **11.6.1 — Cost Metrics**
    - `token_usage_daily`
    - `token_usage_per_workflow`
    - `cost_per_product`
    - `describe_cost`
    - `retry_cost`
    - `quota_utilization`
- **11.6.2 — Cost Anomalies**
    
    Trigger alerts when:
    
    - Token cost > 30% above baseline
    - Describe cost spikes > 25% within an hour
    - Retry cost > $1/hour
    - Quota exhaustion projected within 12 hours
- **11.6.3 — Cost Dashboards**
    
    Dashboards include:
    
    - Usage by workflow (W1, W2, Import, Describe, Complete)
    - Model distribution
    - Token cost over time
    - Retry frequency
    - Per-product cost

# 11.7 — Distributed Tracing

- **11.7.0 — Overview**
    
    Tracing reconstructs every step of:
    
    - W1 Observations Capture
    - W2 Full Product Completion
    - Import → Normalize → Describe → Complete
    - Smart Rules evaluations
    - Firestore writes
    - API requests
    
    It enables latency analysis, root cause detection, and workflow debugging.
    
- **11.7.1 — Required Span Fields**
    
    ```
    spanId
    traceId
    workflow
    service
    operation
    actorId (nullable)
    productId (nullable)
    duration_ms
    status
    metadata
    ```
    
- **11.7.2 — Example Trace (W2)**
    
    ```jsx
    W2 Product Completion (traceId: abc123)
    ├── Import Lookup
    ├── Observations Applied
    ├── Smart Rules Evaluated
    ├── AI Complete Inference
    ├── AI Describe Generation
    ├── Firestore Write
    └── Activity Log Entry
    ```
    

# 11.8 — Incident Templates

- **11.8.0 — Overview**
    
    Incident templates ensure consistent, high-quality responses to operational disruptions.
    
    They enable:
    
    - Faster triage
    - Accurate root-cause analysis
    - Consistent handoff between humans and AI
    - Clear long-term corrective actions
    
    All AOSS incidents must use one of the templates below.
    
- **11.8.1 — Severity 1 Incident Template**
    
    ```
    **SEV-1 Incident Report**
    Impact: <describe business impact>
    
    **When did this begin?**
    <timestamp of first alert>
    
    **Who/what detected it?**
    AI Triage Agent OR Human Operator
    
    **Affected Systems**
    • W1
    • W2
    • Import pipeline
    • AI Complete
    • AI Describe
    • Firestore
    • API
    
    **What broke? (Root Trigger)**
    <summarize critical failure>
    
    **Timeline**
    T0 — alert triggered
    T1 — triage started
    T2 — mitigation began
    T3 — recovery confirmed
    
    **Logs**
    Include:
    • traceId(s)
    • related spans
    • failed operations
    • correlated metrics
    
    **Fix Applied**
    <describe remediation>
    
    **Verification**
    • SLOs returned to baseline
    • No repeating alerts
    • Product workflow stable
    
    **Preventative Actions**
    <required long-term fixes>
    
    **Owner**
    <team or person>
    ```
    
- **11.8.2 — Severity 2 Incident Template**
    
    ```
    # SEV-2 Incident Report
    Summary: <one-line>
    
    ## Detection
    <alert, metric>
    
    ## Affected Areas
    <workflows/services>
    
    ## Impact
    <customer or internal?>
    
    ## Logs
    traceId:
    spanId:
    workflow:
    service:
    
    ## Fix Applied
    <steps>
    
    ## Verification
    <metrics restored?>
    
    ## Follow-up
    <optional actions>
    ```
    
- **11.8.3 — Severity 3 Incident Template**
    
    ```
    # SEV-3 Incident Report
    
    ## Summary
    <brief>
    
    ## Trigger
    <brief>
    
    ## Impact
    <minor degradation>
    
    ## Notes
    <any relevant data>
    
    ## Resolution
    <resolved or monitored?>
    ```
    

# 11.9 — Backup & Recovery

- **11.9.0 — Overview**
    
    Backup and recovery protect AOSS from:
    
    - Data corruption
    - AI mis-writes
    - Misapplied Smart Rules
    - Failed imports
    - Firestore outages
    - Operator mistakes
    
    AOSS backup strategy uses:
    
    - Firestore exports
    - GCS object versioning
    - Workflow-aware restoration
- **11.9.1 — Backup Procedures**
    
    ### Nightly Backups
    
    - Export Firestore → GCS
    - Include collections:
        - products
        - observations
        - activityLog
        - ai_suggestions
        - settings
    - Apply GCS object versioning
    
    ### On-Demand Backups
    
    Triggered before:
    
    - Smart Rules updates
    - AI model upgrades
    - Major admin changes
    - Migration events
- **11.9.2 — Restore Procedures**
    
    ### Steps
    
    1. Validate backup integrity
    2. Restore to staging Firestore
    3. Run replay verification:
        - Smart Rules
        - AI Describe
        - Activity Log
    4. Compare accuracy + derived attributes
    5. Promote to production after checks pass
- **11.9.3 — Verification After Restore**
    
    Verification MUST confirm:
    
    - Firestore SLO health
    - Smart Rules idempotency
    - AI Describe stability
    - Reprocessing validation of 5–10 products
    - No drift in output

# 11.10 — Observability Glossary

### SLO

Long-term reliability target.

### SLI

Measurement that determines SLO compliance.

### Trace

Sequence of spans describing a workflow execution.

### Span

Individual operation within a trace.

### Cold Start

Serverless initialization delay.

### Hallucination Flag

AI Describe indicator of possible fabricated output.

### Rewrite Cycle

Recursive refinement pass during AI Describe.

### Low-Confidence Flag

AI Complete indicator requiring human review.

### Conflict Storm

Rule conflict spike requiring Smart Rules stabilization.

### Token Leakage

Unexpected or excessive token consumption.

### Cost Anomaly

Spending irregularity detected in AI usage.

### Runbook

Operational response procedure.

### Incident

Any event where AOSS violates SLOs or correctness expectations.

### Deduplication Layer

Removes duplicate alerts before routing.

### Triage

AI/human sorting process for classifying alerts.

### Navigation

← Previous Section: [Section 10 — CI/CD]({{https://www.notion.so/2b845ee1ec5a80ccaf70e49777a2b677}})

→ Next Section: [Section 12 — Migration & Cutover]({{https://www.notion.so/2b845ee1ec5a80658739f5ce9d768e11}})

[← Back to ROPI AOSS (Main Page)]({{https://www.notion.so/2b645ee1ec5a80e5b64fd04cea9e0d52}})