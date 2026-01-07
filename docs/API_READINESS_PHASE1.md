# Export Readiness Phase 1 Extension

Scope: Non-breaking API extension to expose RetailOps global mode metadata without changing evaluation semantics.

Fields (optional):
- mode: "GLOBAL" | "SITE_SCOPED" (exposure-only)
- productLevelReadiness: { ready, completionPct, threshold, hasBlockingSites }

## Feature Flag Configuration

**Canonical Firestore form** (recommended):
```json
// Document: settings/exportSettings
{
  "exportGlobalMode": {
    "enabled": true,      // boolean - feature toggle
    "mode": "GLOBAL"      // "GLOBAL" | "SITE_SCOPED"
  }
}
```

**Legacy/compatibility keys** (normalized):
- `globalExportModeEnabled` (boolean)
- `enableGlobalFields` (boolean)
- `mode` (string; root level)

**Env fallback** (local/CI convenience):
`EXPORT_GLOBAL_MODE_FEATURE=true`

## Logging

Temporary staging verification logs are gated by `EXPORT_GLOBAL_LOGS=true`. Logs are disabled by default after merge. To enable logs during staging:

```bash
export EXPORT_GLOBAL_LOGS=true
```

Log lines include:
```
[ExportReadiness:Phase1] mode=GLOBAL (product), productLevelReadiness= { /* JSON */ }
[ExportReadiness:Phase1] mode=GLOBAL (catalog), productLevelReadiness= { /* JSON */ }
```

## Examples

Product (feature enabled):
```json
{
  "ready": true,
  "completionPct": 92,
  "threshold": 80,
  "hasBlockingSites": false,
  "blockingReasons": [],
  "operatorExplanation": { /* existing fields */ },
  "mode": "GLOBAL",
  "productLevelReadiness": {
    "ready": true,
    "completionPct": 92,
    "threshold": 80,
    "hasBlockingSites": false
  },
  "evaluationTimestamp": "2026-01-07T00:00:00Z",
  "rulesVersion": 1
}
```

Catalog (feature enabled):
```json
{
  "ready": false,
  "completionPct": 0,
  "threshold": 80,
  "hasBlockingSites": true,
  "blockingReasons": [ /* samples */ ],
  "operatorExplanation": { /* existing fields */ },
  "catalogStats": { /* existing fields */ },
  "mode": "GLOBAL",
  "productLevelReadiness": {
    "ready": false,
    "completionPct": 0,
    "threshold": 80,
    "hasBlockingSites": true
  },
  "evaluationTimestamp": "2026-01-07T00:00:00Z",
  "rulesVersion": 1
}
```

Notes:
- No change to gating semantics or thresholds in Phase 1.
- `siteStatus` remains unchanged and present in `operatorExplanation`.
- Feature flag controls visibility only; evaluation results are identical whether flag is on or off.
