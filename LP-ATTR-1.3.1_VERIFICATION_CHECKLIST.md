# LP-ATTR-1.3.1 Final Verification Checklist

## Status: Ready for Verification
**Implementation:** ✅ Complete  
**Blocking Issue:** ❌ No valid admin credentials available in dev environment

---

## Run These Commands (Requires Valid Admin Token)

### 1. Generate Admin Token

```bash
export VITE_E2E_ADMIN_PASSWORD='<your-real-password>'
TOKEN=$(node scripts/generate-admin-token-rest.js 2>&1 | tail -1)
echo "Token length: $(echo $TOKEN | wc -c)"  # Should be >100 chars
```

**Current Status:** ❌ INVALID_LOGIN_CREDENTIALS  
**Action Needed:** Provide correct password for theo@shiekh.com

---

### 2. Dry-Run Import on Staging

```bash
curl -s -X POST "https://us-central1-ropi-bccee.cloudfunctions.net/importDryRun" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Origin: https://ropi-aoss-staging.web.app" \
  -F "file=@sample_without_name_brand.csv" \
  -o reports/lp-attr-1.3.1-staging-dryrun.json

# View summary
jq '.summary' reports/lp-attr-1.3.1-staging-dryrun.json

# Check for any errors (should be empty)
jq '.rows[] | select(.errors != null) | {rowIndex:.rowIndex, errors:.errors}' \
  reports/lp-attr-1.3.1-staging-dryrun.json
```

**Expected Result:**
```json
{
  "totalRows": 3,
  "validRows": 3,
  "invalidRows": 0,
  "warningRows": 0
}
```

**Critical Check:** NO `MISSING_REQUIRED_FIELD` errors for `name` or `brand`

---

### 3. Verify CORS Preflight (Already Done)

```bash
curl -i -X OPTIONS 'https://us-central1-ropi-bccee.cloudfunctions.net/api/importCSV' \
  -H 'Origin: https://ropi-aoss-staging.web.app' \
  -H 'Access-Control-Request-Method: POST'
```

**Status:** ✅ VERIFIED  
**Result:** HTTP/2 204 with `access-control-allow-origin: https://ropi-aoss-staging.web.app`  
**Log:** `logs/lp-attr-1.3.1-preflight.txt`

---

### 4. Verify CORS on POST (Already Done)

```bash
curl -i -X POST 'https://us-central1-ropi-bccee.cloudfunctions.net/importDryRun' \
  -H "Origin: https://ropi-aoss-staging.web.app" \
  -H "Authorization: Bearer test-token" \
  -F "file=@sample_without_name_brand.csv"
```

**Status:** ✅ VERIFIED  
**Result:** HTTP/2 401 (expected) with `access-control-allow-origin: https://ropi-aoss-staging.web.app`  
**Proof:** CORS headers present, request not blocked  
**Log:** `logs/lp-attr-1.3.1-import-post.txt`

---

### 5. Verify Web Import Preview (Manual UI Test)

**URL:** https://ropi-aoss-staging.web.app  
**Steps:**
1. Navigate to Import page
2. Upload `sample_without_name_brand.csv`
3. View preview

**Expected:**
- All 3 rows show ✅ OK (green status)
- No ❌ ERROR for missing Product Name or Brand
- Only MPN validation

**If Preview Still Shows Errors:**
- Hard-refresh: `Ctrl+Shift+R` (Windows) or `Cmd+Shift+R` (Mac)
- Try Incognito/Private browsing mode
- Check browser console for cached bundle

---

## Verification Status Matrix

| Check | Status | Evidence |
|-------|--------|----------|
| SDK Mapping Changed | ✅ | Commit 411cdf5 |
| CORS Origins Updated | ✅ | Commit 411cdf5 |
| SDK Build | ✅ | `logs/lp-attr-1.3.1-sdk-build.log` |
| API Build | ✅ | `logs/lp-attr-1.3.1-api-build.log` |
| Web Build | ✅ | `logs/lp-attr-1.3.1-web-build.log` |
| PR Preview Deployed | ✅ | CI Run 20483401568 |
| CORS Preflight (OPTIONS) | ✅ | `logs/lp-attr-1.3.1-preflight.txt` |
| CORS POST Response | ✅ | `logs/lp-attr-1.3.1-import-post.txt` |
| Staging Dry-Run | ⏳ | Awaiting valid admin credentials |
| Web UI Preview | ⏳ | Awaiting manual test |

---

## Troubleshooting Guide

### If Dry-Run Returns MISSING_REQUIRED_FIELD for title/brand

**Cause:** Server-side validator not using updated registry  

**Solution:**
1. Check registry cache is cleared: `clearRegistryCache()` called after LP-ATTR-1.3.0
2. Verify Cloud Function redeployed with LP-ATTR-1.3.0 changes
3. Check function logs: `gcloud functions logs read api --project ropi-bccee --limit 50`
4. Provide `reports/lp-attr-1.3.1-staging-dryrun.json` for analysis

### If Preview UI Still Shows Errors

**Cause:** Cached web bundle  

**Solution:**
1. Check hosting deployment timestamp matches latest deploy
2. Hard-refresh browser: `Ctrl+Shift+R`
3. Open Incognito mode
4. Verify deployed bundle includes SDK changes:
   ```bash
   # Check deployed bundle for 'name' mapping
   curl https://ropi-aoss-staging.web.app/assets/index-*.js | grep "targetField.*name"
   ```

### If CORS Still Blocks

**Cause:** Origin mismatch or duplicate CORS layers  

**Solution:**
1. Verify request origin exactly matches ALLOWED_ORIGINS
2. Check for duplicate CORS headers (hosting + function)
3. Provide `curl -i -X OPTIONS` output for analysis

---

## Next Steps

1. **Obtain Valid Admin Credentials**
   - Contact: Theo or admin with access
   - Required: Password for theo@shiekh.com

2. **Run Dry-Run Verification**
   - Execute command from section #2
   - Attach `reports/lp-attr-1.3.1-staging-dryrun.json`

3. **Manual UI Test**
   - Test in staging environment
   - Screenshot preview showing OK status for MPN-only rows

4. **Final Sign-Off**
   - Confirm no MISSING_REQUIRED_FIELD errors
   - Confirm UI preview accepts MPN-only imports
   - Mark LP-ATTR-1.3.1 as VERIFIED

---

## Deliverables Summary

**Code Changes:** 2 files, 7 insertions, 2 deletions  
**PR:** #342 - https://github.com/twgallo13/ROPI-V2.1/pull/342  
**Branch:** lp/ATTR-1.3.1-mapping-cors-dryrun  
**Commit:** 411cdf5b1fe1798d229d7f1bdc75fb74e80e1645

**Artifacts:**
- ✅ Build logs (SDK, API, Web)
- ✅ CORS verification logs (preflight, POST)
- ✅ Test CSV (sample_without_name_brand.csv)
- ✅ Implementation summary
- ✅ Deliverables JSON
- ⏳ Staging dry-run JSON (awaiting credentials)

**Implementation Status:** COMPLETE  
**Verification Status:** PENDING (awaiting valid admin token)
