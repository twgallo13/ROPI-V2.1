# LP-Phase2b-003 Verification Steps

**Objective**: Capture 5 concrete artifacts proving that:
1. Admin API writes to Firestore persist
2. Evaluator loads from Firestore
3. Product completion API returns authoritative output
4. Sync job is paused or non-destructive
5. UI reads from API only (no client-side derivation)

**Prerequisites**:
- Access to staging environment: https://ropi-aoss-staging.web.app
- Admin auth token: set `STAGING_API_TOKEN` env var
- Example: `export STAGING_API_TOKEN="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."`

---

## 1. Verify Admin Write Persisted

**Run this**:
```bash
export STAGING_API_TOKEN="<your-token>"
export ATTR_KEY="name"  # or "sku", "category", etc.

curl -sS -H "Authorization: Bearer $STAGING_API_TOKEN" \
  "https://ropi-aoss-staging.web.app/api/admin/settings/attributes/keys/$ATTR_KEY" | jq . \
  > inventory/LP-phase2b-003/evidence/admin_attr_fetch_${ATTR_KEY}.json

echo "Saved to: inventory/LP-phase2b-003/evidence/admin_attr_fetch_${ATTR_KEY}.json"
cat inventory/LP-phase2b-003/evidence/admin_attr_fetch_${ATTR_KEY}.json
```

**Acceptance**: Response includes:
- `attribute_id`: (should match `$ATTR_KEY`)
- `label`: (readable label)
- `category`: (your set category value)
- `updatedAt`: (timestamp showing persistence)

---

## 2. Verify Evaluator Status (Firestore Load)

**Run this**:
```bash
curl -sS -H "Authorization: Bearer $STAGING_API_TOKEN" \
  "https://ropi-aoss-staging.web.app/api/evaluator/status" | jq . \
  > inventory/LP-phase2b-003/evidence/evaluator_status.json

echo "Saved to: inventory/LP-phase2b-003/evidence/evaluator_status.json"
cat inventory/LP-phase2b-003/evidence/evaluator_status.json
```

**Acceptance**: Response includes:
- `lastLoadedAt`: (recent timestamp)
- `source`: "firestore"
- `attributes`: (count ≥ 100)
- `cacheValidUntil`: (future timestamp)

---

## 3. Verify Product Completion API Output

**Run this**:
```bash
curl -sS \
  -H "Authorization: Bearer $STAGING_API_TOKEN" \
  "https://ropi-aoss-staging.web.app/api/products/18-test/completion" | jq . \
  > inventory/LP-phase2b-003/evidence/api_product_18-test_completion.json

echo "Saved to: inventory/LP-phase2b-003/evidence/api_product_18-test_completion.json"
cat inventory/LP-phase2b-003/evidence/api_product_18-test_completion.json
```

**Acceptance**: Response includes:
- `completion_result.segments[]`: array with segment definitions
- Each segment has: `segmentId`, `name`, `status`, `requiredAttributes[]`, `missingAttributes[]`
- `overall_completion_score`: numeric percentage
- `evaluator_metadata.loadedAt`, `source`: "firestore"

---

## 4. Verify Sync Task Status (Evidence of Pause)

**Run this**:
```bash
# Check if syncAttributeRegistry endpoint is disabled
curl -sS -X POST \
  -H "Authorization: Bearer $STAGING_API_TOKEN" \
  "https://ropi-aoss-staging.web.app/api/syncAttributeRegistry" 2>&1 | head -20 \
  > inventory/LP-phase2b-003/evidence/sync_disabled_check.txt

echo "---" >> inventory/LP-phase2b-003/evidence/sync_disabled_check.txt
echo "Expected: 403 Forbidden or SYNC_DISABLED message" >> inventory/LP-phase2b-003/evidence/sync_disabled_check.txt

cat inventory/LP-phase2b-003/evidence/sync_disabled_check.txt
```

**Locally, also inspect**:
```bash
# Show the guard code in syncAttributeRegistry.ts
grep -A 5 "SYNC_ATTRIBUTE_REGISTRY_ENABLED\|SYNC_DISABLED" \
  packages/api/src/tasks/syncAttributeRegistry.ts \
  >> inventory/LP-phase2b-003/evidence/sync_task_evidence.txt

# Show the endpoint guard
grep -A 5 "syncAttributeRegistry" \
  packages/api/src/index.ts | grep -A 5 "SYNC_DISABLED" \
  >> inventory/LP-phase2b-003/evidence/sync_task_evidence.txt

echo "\n✅ Sync task verification complete" >> inventory/LP-phase2b-003/evidence/sync_task_evidence.txt
```

**Acceptance**: 
- Endpoint returns 403 or "SYNC_DISABLED"
- Guard code visible: `if (process.env.SYNC_ATTRIBUTE_REGISTRY_ENABLED !== 'true') return 403`
- Or: non-destructive merge logic preventing overwrites

---

## 5. Verify UI Reads from API Only

**In browser console** (on product page, e.g., https://ropi-aoss-staging.web.app/products/18-test):
```javascript
// Check what the CompletionExportGatePanel fetches
fetch('/api/products/18-test/completion', {
  headers: { 'Authorization': 'Bearer <your-token>' }
}).then(r => r.json()).then(data => {
  console.log('API Response:', data);
  console.log('Segments:', data.completion_result.segments);
  console.log('Source:', data.evaluator_metadata.source);
});

// Inspect DOM for test IDs
const panels = document.querySelectorAll('[data-testid="completion-panel"], [data-testid="export-gate-panel"]');
console.log('Found panels:', panels.length);
panels.forEach(p => console.log(p.innerHTML.slice(0, 200)));
```

**Save console output**:
```bash
# Copy the console output (from browser DevTools) and paste into:
cat > inventory/LP-phase2b-003/evidence/ui_console_output.txt << 'EOF'
[Paste your console output here]
EOF
```

**Acceptance**:
- fetch() call succeeds
- Response has `completion_result.segments` array
- `evaluator_metadata.source === "firestore"`
- DOM shows the segments data rendered from API response
- No client-side "remapping" or duplicate API calls

---

## Summary: 5 Artifacts to Commit

After running all steps above, you should have:

1. **admin_attr_fetch_*.json** — Single attribute from admin API
2. **evaluator_status.json** — Evaluator loads from Firestore
3. **api_product_18-test_completion.json** — Authoritative completion output
4. **sync_disabled_check.txt** + **sync_task_evidence.txt** — Sync is paused
5. **ui_console_output.txt** — UI reads from API only

**Commit all to**: `inventory/LP-phase2b-003/evidence/`

Then run:
```bash
git add inventory/LP-phase2b-003/evidence/*.json inventory/LP-phase2b-003/evidence/*.txt
git commit -m "LP-phase2b-003: Verification artifacts - API, evaluator, UI all using Firestore as source of truth"
git push
```

---

## Troubleshooting

**curl: (6) Could not resolve host**
- Check VPN connection to staging
- Verify STAGING_API_TOKEN is set: `echo $STAGING_API_TOKEN`

**403 Unauthorized**
- Token may be expired. Get a fresh token from staging auth.
- Ensure token has admin scope.

**No response from /api/evaluator/status**
- Endpoint may not exist yet. Check deployed API version.
- Fallback: inspect evaluator service logs for last load timestamp.

**Missing attributes in admin_attr_fetch**
- Attribute may not exist in Firestore.
- Try a common one: "name", "sku", "category", "brand"
- Or check settings/attributes/keys in Firestore console directly.
