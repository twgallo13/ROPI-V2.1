# LP-phase2b-003: Quick Start Guide for Homer

**Duration**: ~15 minutes  
**Artifacts Generated**: 5 files  
**Final Action**: Commit to git  

---

## TL;DR

```bash
# 1. Get your token (Firebase Console, ropi-aoss-staging project)
export STAGING_API_TOKEN="<firebase-id-token-from-staging>"

# 2. Run the verification script
bash scripts/verify-lp-phase2b-003.sh

# 3. Follow UI verification instructions printed by script
#    (Manual steps in browser console)

# 4. Commit artifacts
git add inventory/LP-phase2b-003/evidence/
git commit -m "LP-phase2b-003: Verification artifacts - Firestore as source of truth"
git push origin aoss-main
```

---

## What You're Verifying

| # | Artifact | What It Proves | Status |
|---|----------|---------------|--------|
| 1 | admin_attr_fetch_scom_regular_price.json | Admin writes persist to Firestore + metadata intact | ✅ Script captures |
| 2 | evaluator_status.json | Evaluator loads from Firestore (not JSON cache) | ✅ Script captures |
| 3 | api_product_18-test_completion.json | API returns evaluator output verbatim | ✅ Script captures |
| 4 | sync_disabled_check.txt + sync_task_evidence.txt | Sync endpoint returns 403 (disabled by default) | ✅ Script captures |
| 5 | ui_console_output.txt | UI reads from API; no client-side derivation | ⏳ Manual steps |

---

## Step 1: Get Firebase ID Token

**Option A: Firebase Console (Easy)**
1. Go to: https://console.firebase.google.com
2. Select: **ropi-aoss-staging** project
3. Go to: **Settings** (gear icon) → **Service Accounts**
4. Click: **Generate New Private Key**
5. Open the JSON file, find field: `"private_key"`
6. In terminal, get an ID token:
   ```bash
   # Use Firebase CLI (if installed)
   firebase auth:create-user --password=test@test.com \
     --project ropi-aoss-staging
   
   # OR: Use Firebase Console > Authentication > Custom Token
   # (Copy the token and export it)
   ```

**Option B: Direct Firebase CLI**
```bash
# If you have firebase-tools installed
firebase login
firebase auth:create-user --password=testpass \
  --project ropi-aoss-staging
# Then use that user's ID token
```

**Option C: Ask the team**
- Slack: @devops-channel
- Staging API token is usually available in shared credentials

### Export the Token

```bash
export STAGING_API_TOKEN="eyJhbGciOiJSUzI1NiIsImtpZCI..."
echo $STAGING_API_TOKEN  # Verify it's set
```

---

## Step 2: Run Verification Script

```bash
cd /workspaces/ROPI-V2.1
bash scripts/verify-lp-phase2b-003.sh
```

**Script automatically captures artifacts 1-4:**
- `inventory/LP-phase2b-003/evidence/admin_attr_fetch_scom_regular_price.json`
- `inventory/LP-phase2b-003/evidence/evaluator_status.json`
- `inventory/LP-phase2b-003/evidence/api_product_18-test_completion.json`
- `inventory/LP-phase2b-003/evidence/sync_disabled_check.txt`
- `inventory/LP-phase2b-003/evidence/sync_task_evidence.txt`

**Output**: Script will print instructions for artifact 5 (UI verification).

---

## Step 3: Manual UI Verification (Artifact 5)

The script prints detailed instructions. Quick version:

1. **Open staging in browser**: https://ropi-aoss-staging.web.app
2. **Open DevTools**: F12 → Network tab
3. **Navigate to**: /product/18-test
4. **Look for**: GET /api/products/18-test/completion
5. **Click the request**, check Response tab
6. **Verify**: Response shows `"completion_result": { "segments": [...] }`
7. **In Console tab**, paste:
   ```javascript
   fetch('/api/products/18-test/completion', {
     headers: { 'Authorization': 'Bearer ' + localStorage.getItem('authToken') }
   }).then(r => r.json()).then(d => console.log({
     source: d.evaluator_metadata?.source,
     segments: d.completion_result?.segments?.length
   }))
   ```
8. **Expected output**: `{ source: 'firestore', segments: 2 }`
9. **Copy the console output** and paste into file:
   ```bash
   echo "Console output here" > inventory/LP-phase2b-003/evidence/ui_console_output.txt
   ```

---

## Step 4: Commit to Git

```bash
cd /workspaces/ROPI-V2.1

# Verify artifacts exist
ls -lh inventory/LP-phase2b-003/evidence/

# Stage all artifacts
git add inventory/LP-phase2b-003/evidence/

# Commit with standard message
git commit -m "LP-phase2b-003: Verification artifacts - Firestore as authoritative source"

# Push to main
git push origin aoss-main
```

---

## Troubleshooting

### Error: "STAGING_API_TOKEN not set"
```bash
export STAGING_API_TOKEN="your-token-here"
bash scripts/verify-lp-phase2b-003.sh
```

### Error: "curl: (7) Failed to connect"
- Check internet connection
- Verify staging URL is accessible: https://ropi-aoss-staging.web.app
- Wait a few seconds and retry

### Error: "403 Unauthorized"
- Token might be expired (Firebase tokens last ~1 hour)
- Get a fresh token from Firebase Console
- Verify token is from **ropi-aoss-staging** (not production)

### Error: "curl: (28) Operation timed out"
- Staging might be slow or down
- Try again in a few minutes
- Check #devops Slack for status

### Artifact 2 shows source='json_file' instead of 'firestore'
- **Action needed**: This means evaluator is still caching from JSON
- Contact @devops to check staging environment configuration
- Check if EVALUATOR_ATTRIBUTE_SOURCE env var is set (should be "firestore")

### Artifact 3 shows 'derivedFrom' attributes
- **Action needed**: This means auto-derivation is still enabled
- Contact @devops to verify ALLOW_DERIVE_FROM_PRODUCTS is not set
- Check Cloud Function logs for "Deriving attributes from products"

### UI console shows "AttributeRegistry not found"
- **Action needed**: UI is still loading from local JSON cache
- Check browser console for full error
- Report to @frontend-team with screenshot

---

## Expected Results Summary

When everything is working:

✅ **Artifact 1** (admin_attr_fetch):
```json
{
  "id": "scom_regular_price",
  "category": "pricing",
  "required_for_completion": true,
  "metadata": { "syncedAt": "...", "source": "admin" }
}
```

✅ **Artifact 2** (evaluator_status):
```json
{
  "source": "firestore",
  "attributeSourceMetadata": {
    "source": "firestore",
    "attributeCount": 120
  }
}
```

✅ **Artifact 3** (product_completion):
```json
{
  "completion_result": { "segments": [...], "overall_score": 0.67 },
  "evaluator_metadata": { "source": "firestore" }
}
```

✅ **Artifact 4** (sync_disabled):
```
HTTP Status: 403
{
  "error": "SYNC_DISABLED"
}
```

✅ **Artifact 5** (ui_console):
```
Console output: { source: 'firestore', segments: 2 }
Network tab: GET /api/products/18-test/completion → 200 OK
```

---

## Timeline

| Step | Time | Action |
|------|------|--------|
| 1 | 2 min | Get Firebase token |
| 2 | 3 min | Run verification script |
| 3 | 5 min | Manual UI verification |
| 4 | 2 min | Review artifacts |
| 5 | 1 min | Commit to git |
| **Total** | **~15 min** | ✅ Done |

---

## Questions?

- **Script errors?** → Check troubleshooting above
- **Firebase token?** → Ask #devops-channel
- **UI not working?** → Report with screenshot + browser console log
- **Firestore not showing?** → Check Firebase Console > Firestore > settings/attributes/keys

---

## Success Criteria

You're done when:
1. ✅ All 5 artifacts exist in `inventory/LP-phase2b-003/evidence/`
2. ✅ Artifacts show source="firestore" (not "json_file")
3. ✅ Git commit with message "LP-phase2b-003: Verification artifacts" is on aoss-main
4. ✅ UI console shows `{ source: 'firestore', ... }`

**Result**: "Firestore is the sole source of truth. Evaluator loads from Firestore. UI displays evaluator output. Sync is paused. ✅ Verified."
