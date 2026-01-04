## LP-completion-user-visibility-ui-1.4.0 — Draft Plan & UI Audit

### Scope
- Surface completion/export readiness to operators in-product (Product Edit) and during export workflows.
- Use the product completion endpoint (GET /api/products/:productId/completion) and readiness payload as the single explanation source.
- No changes to completion rule semantics or backend logic.
- All merges remain blocked by PR #433/#434/#435/#436.

### Key Surfaces to Update
1) Product Edit Drawer / Completion panel
   - Component: packages/web/src/components/product/CompletionExportGatePanel.tsx
2) Export workflow (catalog-level export)
   - Components: packages/web/src/pages/ExportPage.tsx, packages/web/src/components/export/ExportBlockedModal.tsx

### Current Audit Findings (Gaps)

**Product Completion Panel (CompletionExportGatePanel.tsx)**
- Uses legacy readiness shape: infers blocked from `blockingReasons.length` and defaults threshold to 80; ignores `ready` flag and may mislabel readiness when operatorExplanation shows blocking with empty reasons.
- Does not display segment completion breakdown (`completionBreakdown`) or action items from operatorExplanation; minimal site detail only.
- Does not show operatorExplanation summary or blockingIssues list; no “what to fix” guidance.
- No empty-state messaging when data missing/null; `completion=null` renders as blocked without context.
- Loading/error UX minimal; refresh exists but no retry/alert pattern.
- Token handling via localStorage fetch (acceptable), but no shared client or caching.

**Export Blocked Modal (ExportBlockedModal.tsx) / ExportPage.tsx**
- Modal renders operatorExplanation but export page always hardcodes dry-run request and ignores product-level completion endpoint for per-product surfacing in UI prior to export.
- No inline “View product” / deep-link to product from blocking reasons; only shows first 3 productIds but not clickable.
- Missing loader/empty states for readiness payload; assumes presence of operatorExplanation fields.
- ExportPage lacks pre-flight inline status; only shows modal after server 423.

### Proposed UI Updates (Forward Prep)

**Product Edit Panel**
- Consume `ready` flag, `threshold`, `completionPct`, `hasBlockingSites`, `blockingReasons`, and full `operatorExplanation`.
- Render sections:
  - Summary badge (Ready/Blocked) using `ready`.
  - Overall completion vs threshold.
  - Blocking Issues list from operatorExplanation.blockingIssues.
  - Site Status (expandable per site) with reasons and missing attributes.
  - Segment Breakdown with weight, score, missing attributes.
  - Action Required checklist.
- States: loading, error, empty/null (with retry).
- Accuracy: never infer blocked from missing data; only use `ready`/`hasBlockingSites`/threshold comparison.

**Export Workflow**
- Keep modal rendering operatorExplanation; add product deep-links when productId present.
- Pre-flight UI: show pending/blocked indicator before running export if readiness known (optional staging note if data not available until dry-run).
- Ensure catalogStats rendering resilient to null/absent fields.

### Tests (to add)
- Product panel renders ready/blocked based on `ready` flag and threshold.
- Shows blockingIssues, siteStatus, and segment breakdown when provided.
- Save/refresh honors loading/error/empty states; retry reloads.
- Export modal displays operatorExplanation sections and deep-links product IDs when present.

### Merge Discipline
- PR(s) must be marked **MERGE BLOCKED — depends on PR #433/#434/#435/#436**.

### Acceptance Readiness Checklist
- UI uses completion endpoint payload verbatim; no invented defaults.
- OperatorExplanation fully surfaced (summary, blockingIssues, siteStatus, completionBreakdown, actionRequired).
- Ready/blocked derived from backend `ready`/`hasBlockingSites`/threshold, not heuristics.
- Tests cover visibility, gating, and data absence resilience.