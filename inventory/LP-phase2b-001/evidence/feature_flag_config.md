# Feature Flag Configuration — Phase 2B UI Toggle

**Status:** ⏳ AWAITING DEPLOYMENT  
**Flag Name:** `features.completion.phase2b.enabled`  
**Deployed By:** Homer  
**Date:** PENDING

---

## Flag Configuration

### Flag Details
```json
{
  "name": "features.completion.phase2b.enabled",
  "type": "boolean",
  "default": false,
  "description": "Enable Phase 2B UI components: CompletionCard, ExportGatePanel, GlobalModeCard",
  "rollout_strategy": "gradual",
  "rollback_time": "<5 minutes",
  "owner": "Lisa (Phase Owner)",
  "related_lp": "LP-phase2b-001"
}
```

---

## Deployment Commands

### Prerequisites
```bash
# Set environment variables (DO NOT COMMIT SECRETS)
export FIREBASE_PROJECT_STAGING="ropi-aoss-staging"
export FIREBASE_PROJECT_PREVIEW="ropi-aoss-preview"
```

### Deploy to Preview Environment
```bash
# Option 1: Via Firestore CLI (if using Firestore for feature flags)
firebase firestore:set \
  settings/tenant/exportSettings/config \
  --project $FIREBASE_PROJECT_PREVIEW \
  --data '{"features":{"completion":{"phase2b":{"enabled":true}}}}'

# Option 2: Via feature flag management tool (adjust as needed)
ffctl set features.completion.phase2b.enabled \
  --env=preview \
  --value=true \
  --project=$FIREBASE_PROJECT_PREVIEW
```

### Deploy to Staging Environment
```bash
# Start with allowlist (specific test users only)
firebase firestore:set \
  settings/tenant/exportSettings/config \
  --project $FIREBASE_PROJECT_STAGING \
  --data '{
    "features": {
      "completion": {
        "phase2b": {
          "enabled": false,
          "rollout": {
            "strategy": "allowlist",
            "percentage": 0,
            "allowlist": ["test-user-1@example.com", "test-user-2@example.com"]
          }
        }
      }
    }
  }'

# After verification, enable for all staging users
firebase firestore:update \
  settings/tenant/exportSettings/config \
  --project $FIREBASE_PROJECT_STAGING \
  --data '{"features.completion.phase2b.enabled": true}'
```

---

## Verification Commands

### Verify Flag in Preview
```bash
# Check feature flag via API
curl -sS "https://ropi-aoss-preview.web.app/api/feature-flags" \
  -H "Accept: application/json" \
  -H "Authorization: Bearer $PREVIEW_API_TOKEN" | \
  jq '.features["features.completion.phase2b.enabled"]'

# Expected output: true
```

### Verify Flag in Staging
```bash
# Check feature flag via API
curl -sS "https://ropi-aoss-staging.web.app/api/feature-flags" \
  -H "Accept: application/json" \
  -H "Authorization: Bearer $STAGING_API_TOKEN" | \
  jq '.features["features.completion.phase2b.enabled"]'

# Expected output: true (or allowlist configuration)
```

### Verify UI Route Availability
```bash
# Check that preview app exposes Phase 2B UI components
curl -sS "https://ropi-aoss-preview.web.app/status/feature/completionPhase2b" \
  -H "Accept: application/json" | \
  jq '.'

# Expected output:
# {
#   "feature": "completionPhase2b",
#   "enabled": true,
#   "components": ["CompletionCard", "ExportGatePanel", "GlobalModeCard"],
#   "checked_at": "2026-01-09T..."
# }
```

---

## Deployment Record

| Environment | Flag Value | Deployed At | Deployed By | Verification Output |
|-------------|------------|-------------|-------------|---------------------|
| Preview     | ⏳ PENDING | -           | -           | -                   |
| Staging     | ⏳ PENDING | -           | -           | -                   |
| Production  | ⏳ PENDING | -           | -           | -                   |

---

## Verification Results

### Preview Environment
- [ ] Flag deployed successfully
- [ ] Verification API shows `enabled: true`
- [ ] Preview app UI route accessible
- [ ] Components render without errors

**Verification Output:**
```
⏳ PENDING - Run verification commands and paste output here
```

### Staging Environment
- [ ] Flag deployed successfully
- [ ] Verification API shows `enabled: true` or allowlist configuration
- [ ] Staging app UI route accessible
- [ ] Components render without errors

**Verification Output:**
```
⏳ PENDING - Run verification commands and paste output here
```

---

## Rollback Procedure

### Immediate Rollback (<5 minutes)
```bash
# Disable flag in Firestore
firebase firestore:update \
  settings/tenant/exportSettings/config \
  --project $FIREBASE_PROJECT_STAGING \
  --data '{"features.completion.phase2b.enabled": false}'

# Or via ffctl
ffctl set features.completion.phase2b.enabled \
  --env=staging \
  --value=false

# Verify rollback
curl -sS "https://ropi-aoss-staging.web.app/api/feature-flags" \
  -H "Accept: application/json" | \
  jq '.features["features.completion.phase2b.enabled"]'

# Expected: false
```

---

## Next Steps After Deployment

Once flag is deployed and verified in preview/staging:

1. Update HES:
   ```json
   {
     "name": "Feature flag and preview environment",
     "status": "SATISFIED",
     "evidence_path": "inventory/LP-phase2b-001/evidence/feature_flag_config.md",
     "evidence_details": "Flag features.completion.phase2b.enabled deployed to preview (true) and staging (allowlist). Verified: YYYY-MM-DDTHH:MM:SSZ"
   }
   ```

2. Add `commands_executed` entries with timestamps and exit codes
3. Begin UI component implementation with feature flag guards

---

**Current Status:** ⏳ AWAITING DEPLOYMENT

**Required Actions:**
1. ✅ Obtain Firebase/feature flag deployment credentials
2. ✅ Deploy flag to preview environment
3. ✅ Deploy flag to staging environment (allowlist or full)
4. ✅ Run verification commands
5. ✅ Save verification outputs to this file
6. ✅ Update HES precondition to SATISFIED
