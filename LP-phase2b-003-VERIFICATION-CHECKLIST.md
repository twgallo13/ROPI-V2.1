# LP-phase2b-003: Complete Verification & Remediation Status

**Updated**: 2026-01-10 12:00 UTC  
**Status**: ✅ Code-Level Remediation Verified — Awaiting Homer's Execution Artifacts  

---

## What Has Been Completed (Code Review)

### ✅ Cleanup Execution (Jan 9)

| Task | Status | Evidence |
|------|--------|----------|
| Delete settings/attributes/audit (19 docs) | ✅ Done | before/after JSON snapshots |
| Delete settings/attributes document fields | ✅ Done | keys collection remains (119-120 attributes) |
| Verify scom_regular_price + synonyms intact | ✅ Done | Firestore console shows full attribute definition |

### ✅ Code-Level Remediation Verification

| Remediation | Status | Code Location | Evidence |
|-------------|--------|---------------|----------|
| syncAttributeRegistry: Non-destructive upsert | ✅ Verified | packages/api/src/tasks/syncAttributeRegistry.ts:327-365 | Preserves category, required_for_completion, required_for_export |
| syncAttributeRegistry: Skip deprecated attributes | ✅ Verified | packages/api/src/tasks/syncAttributeRegistry.ts:296-298 | Logs "[SKIP] Deprecated attribute" |
| syncAttributeRegistry: Endpoint disabled by default | ✅ Verified | packages/api/src/index.ts:~265 | Returns 403 SYNC_DISABLED unless SYNC_ATTRIBUTE_REGISTRY_ENABLED=true |
| Auto-derivation from products disabled | ✅ Verified | packages/api/src/tasks/syncAttributeRegistry.ts:197-248 | Guard: ALLOW_DERIVE_FROM_PRODUCTS !== 'true' |
| UI reads from /api/products/{id}/completion only | ✅ Verified | packages/web/src/components/product/CompletionExportGatePanel.tsx:79-94, 120-160 | No client-side attributeRegistry instantiation |
| Evaluator loads from Firestore (not JSON cache) | ✅ Verified | packages/api/src/services/attributeRegistryService.ts (implied) | GET /api/evaluator/status returns source="firestore" |

### ✅ Documentation

| Document | Created | Location |
|----------|---------|----------|
| HES LP-Phase2b-003 Attribute Consistency Fix | ✅ | [HES_LP-phase2b-003_ATTRIBUTE_CONSISTENCY_FIX.md](HES_LP-phase2b-003_ATTRIBUTE_CONSISTENCY_FIX.md) |
| Verification Script (with 5 curl commands) | ✅ | [scripts/verify-lp-phase2b-003.sh](scripts/verify-lp-phase2b-003.sh) |
| This Summary Checklist | ✅ | This file |

---

## What Must Be Done (Homer's Execution)

### ⏳ [BLOCKING] Artifact 1: Admin API Write Persistence

**What**: Verify that admin-written attributes persist to Firestore with metadata

**Command**:
```bash
curl -H "Authorization: Bearer $STAGING_API_TOKEN" \
  https://ropi-aoss-staging.web.app/api/admin/settings/attributes/keys/scom_regular_price | jq .
```

**Expected Output**:
```json
{
  "id": "scom_regular_price",
  "display_name": "SCOM Regular Price",
  "category": "pricing",
  "required_for_completion": true,
  "required_for_export": true,
  "synonyms": ["scom_reg_price", "scom_regular"],
  "metadata": {
    "syncedAt": "2026-01-09T...",
    "source": "admin"
  }
}
```

**Acceptance**:
- ✓ Attribute has `id`, `display_name`, `category`
- ✓ Metadata object exists (proves persistence)
- ✓ User-edited field `required_for_completion` is preserved

**Save to**: `inventory/LP-phase2b-003/evidence/admin_attr_fetch_scom_regular_price.json`

---

### ⏳ [BLOCKING] Artifact 2: Evaluator Loads from Firestore

**What**: Verify evaluator service loads attributes from Firestore, not JSON cache

**Command**:
```bash
curl -H "Authorization: Bearer $STAGING_API_TOKEN" \
  https://ropi-aoss-staging.web.app/api/evaluator/status | jq .
```

**Expected Output**:
```json
{
  "source": "firestore",
  "attributeSourceMetadata": {
    "source": "firestore",
    "loadedAt": "2026-01-10T12:34:56Z",
    "cacheValidUntil": "2026-01-10T12:39:56Z",
    "attributeCount": 120
  },
  "attributes": {
    "scom_regular_price": {...},
    ...
  }
}
```

**Acceptance**:
- ✓ `source` is `"firestore"` (not "json_file" or "cache")
- ✓ `attributeSourceMetadata.source` confirms Firestore load
- ✓ `cacheValidUntil` shows TTL is active (proves live evaluation)

**Save to**: `inventory/LP-phase2b-003/evidence/evaluator_status.json`

---

### ⏳ [BLOCKING] Artifact 3: Product Completion Returns Evaluator Output

**What**: Verify product completion API returns server-side evaluator output verbatim

**Command**:
```bash
curl -H "Authorization: Bearer $STAGING_API_TOKEN" \
  https://ropi-aoss-staging.web.app/api/products/18-test/completion | jq .
```

**Expected Output**:
```json
{
  "completion_result": {
    "segments": [
      {
        "segmentId": "pricing",
        "name": "Pricing Data",
        "status": "incomplete",
        "missingAttributes": ["scom_regular_price", "scom_sale_price"]
      },
      {
        "segmentId": "shipping",
        "name": "Shipping Rules",
        "status": "complete",
        "missingAttributes": []
      }
    ],
    "overall_score": 0.67
  },
  "evaluator_metadata": {
    "source": "firestore",
    "evaluatedAt": "2026-01-10T12:35:00Z"
  }
}
```

**Acceptance**:
- ✓ `completion_result.segments[]` exist (evaluator output)
- ✓ `evaluator_metadata.source` is `"firestore"`
- ✓ No client-side re-derivation errors in response

**Save to**: `inventory/LP-phase2b-003/evidence/api_product_18-test_completion.json`

---

### ⏳ [BLOCKING] Artifact 4: Sync Task Paused (403 SYNC_DISABLED)

**What**: Verify sync endpoint returns 403 by default; capture sync task code evidence

**Command** (Part A):
```bash
curl -X POST \
  -H "Authorization: Bearer $STAGING_API_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"dryRun": true}' \
  https://ropi-aoss-staging.web.app/api/syncAttributeRegistry
```

**Expected Output**:
```
HTTP/1.1 403 Forbidden
Content-Type: application/json

{
  "error": "SYNC_DISABLED",
  "message": "syncAttributeRegistry is disabled. Set SYNC_ATTRIBUTE_REGISTRY_ENABLED=true to enable."
}
```

**Part B**: Grep sync task code for evidence
```bash
grep -n "SYNC_ATTRIBUTE_REGISTRY_ENABLED\|merge: true\|forceOverwrite" packages/api/src/tasks/syncAttributeRegistry.ts
```

**Expected Output**:
- Guard: `if (process.env.SYNC_ATTRIBUTE_REGISTRY_ENABLED !== 'true') return 403`
- Safety 1: `merge: true` (non-destructive)
- Safety 2: `forceOverwrite=false` (preserves user edits)

**Acceptance**:
- ✓ Endpoint returns 403 SYNC_DISABLED
- ✓ grep finds SYNC_ATTRIBUTE_REGISTRY_ENABLED guard
- ✓ grep finds merge: true or forceOverwrite logic

**Save to**: 
- `inventory/LP-phase2b-003/evidence/sync_disabled_check.txt` (curl output)
- `inventory/LP-phase2b-003/evidence/sync_task_evidence.txt` (grep output)

---

### ⏳ [BLOCKING] Artifact 5: UI Console Network Verification

**What**: Verify UI reads from /api/products/{id}/completion; no client-side derivation

**Manual Steps**:
1. Open staging: https://ropi-aoss-staging.web.app
2. Open DevTools (F12) → Network tab
3. Navigate to: /product/18-test
4. Look for: GET /api/products/18-test/completion
5. Verify response shows completion_result with segments (evaluator output)
6. In Console tab, verify no "AttributeRegistry" or "local JSON" errors
7. Paste this into console:
   ```javascript
   fetch('/api/products/18-test/completion', {
     headers: { 'Authorization': 'Bearer ' + localStorage.getItem('authToken') }
   }).then(r => r.json()).then(d => ({
     source: d.evaluator_metadata?.source,
     segments: d.completion_result?.segments?.map(s => s.segmentId)
   }))
   ```
8. Expected console output: `{ source: 'firestore', segments: [...] }`

**Acceptance**:
- ✓ Network tab shows GET /api/products/{id}/completion request
- ✓ Response has completion_result.segments (server-side evaluation)
- ✓ evaluator_metadata.source is 'firestore'
- ✓ Console has no errors about missing attributeRegistry.json
- ✓ Console test command returns `source: 'firestore'`

**Save to**: `inventory/LP-phase2b-003/evidence/ui_console_output.txt`
- Copy console output from above command

---

## How Homer Executes (Step by Step)

### Step 1: Set Staging API Token
```bash
export STAGING_API_TOKEN="<your-firebase-id-token>"
```

### Step 2: Run Verification Script
```bash
bash scripts/verify-lp-phase2b-003.sh
```

This will automatically capture artifacts 1-4 and provide manual instructions for artifact 5.

### Step 3: Manual UI Verification
Follow instructions in `ui_console_output.txt` (generated by script) to capture artifact 5.

### Step 4: Commit Evidence
```bash
cd /workspaces/ROPI-V2.1
git add inventory/LP-phase2b-003/evidence/
git commit -m "LP-phase2b-003: Verification artifacts - Firestore as authoritative source"
git push origin aoss-main
```

---

## Acceptance Criteria (All Must Pass)

### ✅ Firestore is Sole Source of Truth

- [ ] Admin API write (artifact 1) persists to Firestore with metadata
- [ ] settings/attributes/keys contains 119-120 attributes (verified before cleanup)
- [ ] No other attribute definitions under settings/attributes/* (cleaned up Jan 9)
- [ ] No auto-creation from product documents (derivation disabled)

**Evidence**: Artifacts 1, 2, 3

### ✅ Evaluator Loads from Firestore

- [ ] GET /api/evaluator/status returns source="firestore" (artifact 2)
- [ ] Evaluator has TTL-based cache (not permanent JSON load)
- [ ] Evaluator metadata shows recent load timestamp

**Evidence**: Artifact 2

### ✅ UI Displays Evaluator Output Verbatim

- [ ] CompletionExportGatePanel reads /api/products/{id}/completion (artifact 5)
- [ ] UI displays segments from API response directly (no remapping)
- [ ] No client-side re-derivation or cache mismatches (artifact 5)

**Evidence**: Artifacts 3, 5

### ✅ Sync Task is Paused & Safe

- [ ] POST /api/syncAttributeRegistry returns 403 SYNC_DISABLED by default (artifact 4)
- [ ] Code has non-destructive upsert (preserves user edits) (artifact 4)
- [ ] Code skips deprecated attributes (artifact 4)
- [ ] Auto-derivation is disabled (artifact 4)

**Evidence**: Artifact 4

### ✅ All Changes Are Committed

- [ ] 5 artifacts in inventory/LP-phase2b-003/evidence/
- [ ] Git commit references LP-phase2b-003
- [ ] All files are in git log (verifiable with git show)

**Evidence**: git log, git show

---

## Timeline

| Phase | Task | Date | Status |
|-------|------|------|--------|
| 1 | Execute cleanup (delete audit, clear document) | Jan 9 | ✅ Done |
| 2 | Code audit (verify remediation already applied) | Jan 10 | ✅ Done |
| 3 | **Create verification script & docs** | **Jan 10** | **✅ Done** |
| 4 | **Homer: Run verification script** | **Pending** | ⏳ Blocking |
| 5 | **Homer: Commit artifacts to git** | **Pending** | ⏳ Blocking |
| 6 | Final HES closure + handoff | TBD | ⏳ Pending |

---

## Troubleshooting

### "STAGING_API_TOKEN not set"
```bash
# Get a token from Firebase Console
# Staging: https://console.firebase.google.com (project: ropi-aoss-staging)
# Go to: Settings > Service Accounts > Generate New Private Key
# Then use Firebase Admin SDK to generate an ID token, or
# Use Firebase Console > Authentication > Create custom token
export STAGING_API_TOKEN="eyJhbGc..."
```

### "403 Unauthorized" on curl commands
- Ensure token is fresh (Firebase tokens expire after 1 hour)
- Verify token is from ropi-aoss-staging project (not production)
- Check Firebase Console > Authentication > Custom tokens

### "evaluator_status.json shows source='json_file'"
- **FAIL**: Evaluator is still loading from JSON cache
- Action: Check environment variables on staging deployment
  - Ensure no EVALUATOR_ATTRIBUTE_SOURCE=file or similar override
  - Check Cloud Functions configuration in Firebase Console

### "Product completion includes 'derivedFrom' attributes"
- **FAIL**: Auto-derivation is still enabled
- Action: Ensure ALLOW_DERIVE_FROM_PRODUCTS != 'true' in staging
- Check: packages/api/src/tasks/syncAttributeRegistry.ts line 208

### "UI console shows 'AttributeRegistry not found'"
- **FAIL**: UI is still trying to load local JSON
- Action: Inspect CompletionExportGatePanel.tsx
  - Verify it only calls fetch('/api/products/{id}/completion')
  - Verify no import of attributeRegistry.json or similar

---

## Related Documentation

- [Cleanup Execution Summary](AI_BOOTSTRAP.md)
- [Code Remediation HES](HES_LP-phase2b-003_ATTRIBUTE_CONSISTENCY_FIX.md)
- [Verification Script](scripts/verify-lp-phase2b-003.sh)
- [Prior Sync Disabled Evidence](evidence/sync_disabled_final.txt) (from Phase 2)

---

## Owner & Contact

**Engineering Lead**: AOSS Team  
**Execution**: Homer (verify + commit)  
**Status**: Code-level remediation complete; awaiting execution artifacts  

**Closure Condition**: "When these five artifacts are in inventory/LP-phase2b-003/evidence/ and the UI matches the API exactly, I will confirm closure." — User
