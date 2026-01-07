# Phase 1 Temporary Logging Status

## Location
- File: `packages/api/src/services/completionDrivenExportReadiness.ts`
- Lines: Two `console.info` statements
  - Line ~360: Product-level readiness log
  - Line ~395: Catalog-level readiness log

## Status
**Logs are feature-flagged and disabled by default.**

Control:
- Enable: Set environment variable `EXPORT_GLOBAL_LOGS=true` during development/staging
- Default behavior after merge: **NO LOGS** (disabled unless explicitly enabled)

## Log Format
```
[ExportReadiness:Phase1] mode=GLOBAL (product), productLevelReadiness= { "ready": true, "completionPct": 92, ... }
[ExportReadiness:Phase1] mode=GLOBAL (catalog), productLevelReadiness= { /* response */ }
```

## Removal Timeline
- **Post-HES C verification:** These logs are optional for troubleshooting
- **Pre-production:** Logs can be removed or converted to debug-level logging
- **Current status:** Safe to keep; they only emit when explicitly enabled

## Migration Path
When moving to production:
1. Option A: Remove the console.info lines entirely
2. Option B: Convert to structured logging (Cloud Logging) with sampling
3. Option C: Keep as-is with environment flag (recommended for continued troubleshooting)
