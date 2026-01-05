# Export Gate Enforcement Implementation

## Overview

This PR implements completion-based export readiness enforcement with site-aware blocking and operator-visible explanations. Export decisions are driven by a single canonical completion gate that considers description/SEO requirements per site.

## Key Components

### 1. ExportGateEnforcer
- **Single canonical gate**: Export readiness depends solely on completion %
- **Settings-driven**: Reads completion rules from `settings/exportSettings/completionRules`
- **Site-aware blocking**: Missing Description/SEO for any selected site blocks completion
- **No media/pricing blocking**: Only description/SEO attributes can block export
- **Operator-visible explanations**: Clear blocking reason payloads

### 2. Export API Enforcement
- **GET /api/products/:productId/export-readiness**: Check export readiness
- **POST /api/products/:productId/export**: Export with gate enforcement
- **POST /api/products/batch/export-readiness**: Batch readiness checks
- **Force override**: `force=true` allows exports despite blocking reasons

## Implementation Details

### Completion-Based Blocking
```typescript
// Export blocked if completion below threshold
const isCompletionSufficient = completion.totalCompletionPct >= minCompletion;

// Completion set to 0 if ANY site has blocking reasons
const totalCompletionPct = siteBlockingReasons.length > 0 ? 0 : rawCompletionPct;
```

### Site-Aware Description/SEO Blocking
```typescript
// Only Description/SEO attributes block per site
blockingAttributes: {
  'amazon': ['title', 'description', 'seo_title', 'seo_description'],
  'shopify': ['title', 'description', 'seo_title', 'seo_description']
}
```

### Deterministic Explanations
```typescript
formatBlockingExplanation(reasons: ExportBlockingReason[]): string {
  // Returns consistent, operator-readable blocking explanations
  // Example: "Export blocked:\n• Completion: 60% (need 75%)\n• amazon: Missing description, seo_title"
}
```

## Test Coverage

### Core Requirements Proven
- ✅ **Completion threshold blocking**: Export blocked when completion < threshold
- ✅ **Site-aware Description/SEO blocking**: Missing Description/SEO blocks export
- ✅ **No media/pricing blocking**: Media and pricing never block export
- ✅ **Smart Rules never define readiness**: Export decisions ignore Smart Rules
- ✅ **Deterministic explanations**: Consistent blocking reason formatting
- ✅ **API enforcement**: Export endpoints enforce completion gate

### Test Cases
```typescript
describe('Export Gate Enforcement', () => {
  it('blocks export when completion below threshold');
  it('blocks export when selected site missing Description/SEO');
  it('allows export when all selected sites have Description/SEO');
  it('never blocks for media/pricing attributes');
  it('formats blocking explanations deterministically');
  it('enforces gate in export API endpoints');
  it('allows force override for blocked exports');
});
```

## Contract Compliance

| Requirement | Implementation | Test |
|-------------|----------------|------|
| Single canonical gate | `totalCompletionPct >= minimumCompletionPct` | ✅ Threshold tests |
| Settings-driven | `getExportSettings()` reads completion rules | ✅ Settings loading |
| Site-aware blocking | Description/SEO missing blocks completion | ✅ Site blocking tests |
| No media/pricing blocking | Only description/SEO in `blockingAttributes` | ✅ Media/pricing allowed |
| Operator explanations | `formatBlockingExplanation()` | ✅ Explanation formatting |

## Usage Examples

### Check Export Readiness
```typescript
GET /api/products/prod_123/export-readiness?sites[]=amazon&sites[]=shopify

Response:
{
  "canExport": false,
  "completionPct": 60,
  "blockingReasons": [
    {
      "type": "COMPLETION_BELOW_THRESHOLD",
      "message": "Completion 60% is below required 75%",
      "currentCompletion": 60,
      "requiredCompletion": 75
    },
    {
      "type": "SITE_MISSING_REQUIRED", 
      "site": "amazon",
      "missingAttributes": ["description", "seo_title"]
    }
  ],
  "explanation": "Export blocked:\n• Completion: 60% (need 75%)\n• amazon: Missing description, seo_title"
}
```

### Export with Gate Enforcement
```typescript
POST /api/products/prod_123/export
{
  "sites": ["amazon", "shopify"]
}

Response (if blocked):
{
  "exported": false,
  "canExport": false,
  "explanation": "Export blocked:\n• Completion: 60% (need 75%)",
  "forceOverride": "Set force=true to override export gate"
}
```

## Files Added/Modified

### Core Implementation
- `packages/api/src/lib/export/ExportGateEnforcer.ts` - Core enforcement logic
- `packages/api/src/controllers/ExportController.ts` - API integration

### Tests
- `packages/api/src/lib/export/ExportGateEnforcer.test.ts` - Unit tests
- `packages/api/src/controllers/ExportController.test.ts` - Integration tests

## Dependencies

Depends on:
- **CompletionEngine** (from PR #429) - Provides completion evaluation
- **AttributeRegistry** - Provides attribute metadata
- Express.js - API framework

## Next Steps

This PR provides complete export gate enforcement. Future enhancements could include:
- UI components for displaying blocking explanations
- Export queue integration
- Audit logging for export decisions
- Advanced override permissions