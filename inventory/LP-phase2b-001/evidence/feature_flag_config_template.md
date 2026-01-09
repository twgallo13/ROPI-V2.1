# Precondition: Feature Flag Configuration

**Status:** ⏳ PENDING DEPLOYMENT

## Requirement

Deploy feature flag configuration to enable/disable Phase 2B UI features with instant rollback capability (<5 minutes).

## Feature Flag Specification

### Flag Name
```
features.completion.phase2b.enabled
```

### Flag Location (Firestore)
```
settings/{tenant}/exportSettings/config
```

### Flag Structure
```json
{
  "features": {
    "completion": {
      "phase2b": {
        "enabled": false,
        "rollout": {
          "strategy": "gradual",
          "percentage": 0,
          "allowlist": []
        },
        "metadata": {
          "description": "Enable Phase 2B UI components: CompletionCard, ExportGatePanel, GlobalModeCard",
          "owner": "Lisa",
          "created_at": "2026-01-09T04:00:00Z",
          "last_modified": "2026-01-09T04:00:00Z"
        }
      }
    }
  }
}
```

## Rollout Strategy

### Phase 1: Preview Environment
- **Target:** Preview deployment only
- **Percentage:** 100%
- **Duration:** Until verified
- **Flag Value:** `enabled: true`

### Phase 2: Staging with Allowlist
- **Target:** Staging environment
- **Percentage:** 0% (allowlist only)
- **Allowlist:** Specific test users
- **Duration:** 48 hours
- **Flag Value:** `enabled: false`, `allowlist: ["test-user-1", "test-user-2"]`

### Phase 3: Staging Full Rollout
- **Target:** Staging environment
- **Percentage:** 100%
- **Duration:** 1 week
- **Flag Value:** `enabled: true`

### Phase 4: Production Gradual Rollout
- **Target:** Production environment
- **Percentage:** 0% → 25% → 50% → 100%
- **Duration:** 2 weeks
- **Monitoring:** Error rates, user feedback

## Client-Side Implementation

```typescript
// packages/web/src/hooks/useFeatureFlag.ts
import { useFirestore } from '@/hooks/useFirestore';

export function useCompletionPhase2B() {
  const { data: config } = useFirestore('settings/tenant/exportSettings/config');
  
  return config?.features?.completion?.phase2b?.enabled ?? false;
}

// Usage in components
function ProductPage() {
  const isPhase2BEnabled = useCompletionPhase2B();
  
  return (
    <>
      {isPhase2BEnabled && <CompletionCard />}
      {isPhase2BEnabled && <ExportGatePanel />}
      {/* Fallback to Phase 2A or legacy UI */}
    </>
  );
}
```

## Rollback Procedure

### Immediate Rollback (<5 minutes)
```bash
# Update Firestore config
firebase firestore:update settings/tenant/exportSettings/config \
  '{"features.completion.phase2b.enabled": false}'

# Or via Firebase Console:
# 1. Navigate to Firestore
# 2. Go to settings/tenant/exportSettings/config
# 3. Set features.completion.phase2b.enabled to false
# 4. Save
# 5. Clients auto-refresh within 1 minute
```

### Verification After Rollback
```bash
# Verify flag is disabled
firebase firestore:get settings/tenant/exportSettings/config | \
  jq '.features.completion.phase2b.enabled'
# Expected: false

# Monitor client metrics
# - Check error rates return to baseline
# - Verify Phase 2B components no longer render
```

## Deployment Steps

1. **Create Config Document:**
   ```bash
   firebase firestore:set settings/tenant/exportSettings/config \
     --data '{"features":{"completion":{"phase2b":{"enabled":false}}}}'
   ```

2. **Verify Config Readable:**
   ```bash
   firebase firestore:get settings/tenant/exportSettings/config
   ```

3. **Test Flag in Preview:**
   ```bash
   # Enable for preview
   firebase firestore:update settings/preview/exportSettings/config \
     '{"features.completion.phase2b.enabled": true}'
   
   # Verify UI components render
   # Open preview app and navigate to product page
   ```

4. **Document Flag Status:**
   Update this file with deployment timestamp and environment status

## Deployment Record

| Environment | Flag Status | Deployed At | Deployed By | Notes |
|-------------|-------------|-------------|-------------|-------|
| Preview     | ⏳ PENDING  | -           | -           | -     |
| Staging     | ⏳ PENDING  | -           | -           | -     |
| Production  | ⏳ PENDING  | -           | -           | -     |

---

**Once deployed to preview/staging, update precondition status to SATISFIED in HES.**
