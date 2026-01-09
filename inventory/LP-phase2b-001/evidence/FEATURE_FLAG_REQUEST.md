# Feature Flag Deployment Request — LP-phase2b-001

**Requested By:** Homer (AI Agent)  
**Date:** 2026-01-09  
**Status:** ⏳ PENDING FEATURE FLAG OWNER RESPONSE

---

## Request Summary

LP-phase2b-001 requires feature flag `features.completion.phase2b.enabled` to be deployed to preview/staging environments to satisfy precondition #3. This flag controls visibility of new UI components (CompletionCard, ExportGatePanel, GlobalModeCard).

---

## What We Need

**From:** Feature Flag Owner / Release Manager / Platform Team

1. **Deploy flag to preview environment:**
   - Flag name: `features.completion.phase2b.enabled`
   - Type: `boolean`
   - Default: `false`
   - Preview value: `true`

2. **Deploy flag to staging environment (optional, recommended):**
   - Same flag, value: `true` (or allowlist for specific test users)

3. **Verification endpoint:**
   - URL to query flag status (e.g., `https://<PREVIEW_HOST>/api/feature-flags`)
   - OR confirmation that preview UI route is accessible

---

## Example Deployment Commands

### Option 1: Using ffctl (Feature Flag CLI)
```bash
# Deploy to preview
ffctl set features.completion.phase2b.enabled --env=preview --value=true

# Optional: Deploy to staging with allowlist
ffctl set features.completion.phase2b.enabled --env=staging --value=false
ffctl set features.completion.phase2b.rollout --env=staging --allowlist="test-user-1@example.com,test-user-2@example.com"
```

### Option 2: Using Firebase Firestore (if flags stored in Firestore)
```bash
firebase firestore:set settings/tenant/exportSettings/config \
  --project ropi-aoss-preview \
  --data '{
    "features": {
      "completion": {
        "phase2b": {
          "enabled": true
        }
      }
    }
  }'
```

### Option 3: Using Feature Flag API
```bash
curl -X PATCH "https://api.featureflags.example.com/flags/features.completion.phase2b.enabled" \
  -H "Authorization: Bearer $FF_ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "environments": {
      "preview": {"enabled": true},
      "staging": {"enabled": false, "allowlist": ["test-user-1@example.com"]}
    }
  }'
```

---

## Verification Commands Homer Will Run

Once flag is deployed, Homer will execute:

```bash
# Verify flag in preview environment
curl -sS "https://<PREVIEW_HOST>/api/feature-flags" \
  -H "Accept: application/json" \
  -H "Authorization: Bearer $PREVIEW_API_TOKEN" | \
  jq '.features["features.completion.phase2b.enabled"]' \
  > inventory/LP-phase2b-001/evidence/feature_flag_config.txt

# Alternative: Check preview app route availability
curl -sS "https://<PREVIEW_HOST>/status/feature/completionPhase2b" \
  -H "Accept: application/json" \
  > inventory/LP-phase2b-001/evidence/preview_feature_flag_check.txt
```

---

## Expected Verification Output

**feature_flag_config.txt should contain:**
```json
{
  "name": "features.completion.phase2b.enabled",
  "enabled": true,
  "environment": "preview",
  "updated_at": "2026-01-09T..."
}
```

**OR (if using status endpoint):**
```json
{
  "feature": "completionPhase2b",
  "enabled": true,
  "components": ["CompletionCard", "ExportGatePanel", "GlobalModeCard"],
  "checked_at": "2026-01-09T..."
}
```

---

## Flag Configuration Details

```json
{
  "name": "features.completion.phase2b.enabled",
  "type": "boolean",
  "default": false,
  "description": "Enable Phase 2B UI components: CompletionCard, ExportGatePanel, GlobalModeCard",
  "rollout_strategy": "gradual",
  "rollback_time": "<5 minutes",
  "owner": "Lisa (Phase Owner)",
  "related_lp": "LP-phase2b-001",
  "client_side_usage": {
    "web": "packages/web/src/hooks/useFeatureFlags.ts",
    "components": [
      "packages/web/src/components/CompletionCard.tsx",
      "packages/web/src/components/ExportGatePanel.tsx",
      "packages/web/src/components/GlobalModeCard.tsx"
    ]
  }
}
```

---

## Rollback Procedure

If issues arise, flag can be disabled instantly:

```bash
# Immediate rollback
ffctl set features.completion.phase2b.enabled --env=preview --value=false

# Or via Firestore
firebase firestore:update settings/tenant/exportSettings/config \
  --project ropi-aoss-preview \
  --data '{"features.completion.phase2b.enabled": false}'

# Verification
curl -sS "https://<PREVIEW_HOST>/api/feature-flags" | \
  jq '.features["features.completion.phase2b.enabled"]'
# Expected: false
```

---

## What Happens After Deployment

1. Feature flag owner deploys flag to preview (and optionally staging)
2. Feature flag owner provides verification command or confirms deployment
3. Homer runs verification commands and saves output to `evidence/feature_flag_config.txt`
4. Homer updates HES with `commands_executed` entry
5. Homer marks `preconditions[3].status = "SATISFIED"` in HES
6. Lisa reviews evidence and approves precondition

---

## Response Requested

**Feature Flag Owner:** Please reply with either:

**Option A (Immediate):**
```bash
# Flag deployed to preview
export PREVIEW_HOST="<preview-host>"
curl "https://<PREVIEW_HOST>/api/feature-flags" | jq '.features["features.completion.phase2b.enabled"]'
# Output: true
```

**Option B (In Progress):**
"Feature flag deployment in progress. ETA: <date/time>. Will notify when complete."

**Option C (Alternative Approach):**
"Using alternative feature flag system. Commands: <describe>"

---

**Status:** ⏳ AWAITING DEPLOYMENT
**Contact:** twgallo13 (repository owner)
**Related:** PR #470, Issue #469, LP-phase2b-001
