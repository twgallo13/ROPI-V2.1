# Manual Steps to Fix E2E_ADMIN_PASSWORD

## Current Status
- ❌ Admin credentials for `theo@shiekh.com` are not working
- ❌ Password `RopiE2E-Admin!...` returns `INVALID_LOGIN_CREDENTIALS`
- ✅ Created helper scripts: `test-admin-credentials.js` and `fix-admin-user.js`
- ⚠️  gcloud CLI not available in dev container

## Immediate Action Required (Choose One)

### 🎯 RECOMMENDED: Reset via Firebase Console

**Steps:**
1. Open: https://console.firebase.google.com/project/ropi-bccee/authentication/users
2. Find user: `theo@shiekh.com`
3. Click ⋮ (menu) → "Reset password"
4. Set password to: `RopiE2E-Admin!2025`
5. Update GitHub secret:
   ```bash
   gh secret set E2E_ADMIN_PASSWORD --body "RopiE2E-Admin!2025" --repo twgallo13/ROPI-V2.1
   ```
6. Test locally:
   ```bash
   VITE_E2E_ADMIN_PASSWORD="RopiE2E-Admin!2025" node scripts/generate-admin-token-rest.js
   ```

### Alternative: Use gcloud (Requires local machine with gcloud)

If you have gcloud on your local machine:

```bash
# Authenticate
gcloud auth application-default login
gcloud config set project ropi-bccee

# Clone repo and run fix script
cd /path/to/ROPI-V2.1
NEW_ADMIN_PASSWORD="RopiE2E-Admin!2025" node scripts/fix-admin-user.js

# Update GitHub secret (from script output)
gh secret set E2E_ADMIN_PASSWORD --body "RopiE2E-Admin!2025" --repo twgallo13/ROPI-V2.1
```

## Verification Steps

After resetting password:

1. **Test authentication:**
   ```bash
   VITE_E2E_ADMIN_PASSWORD="RopiE2E-Admin!2025" node scripts/test-admin-credentials.js
   ```
   Should output: `✅ SUCCESS! This password works!`

2. **Generate token:**
   ```bash
   TOKEN=$(VITE_E2E_ADMIN_PASSWORD="RopiE2E-Admin!2025" \
     node scripts/generate-admin-token-rest.js 2>&1 | tail -1)
   echo "Token: ${TOKEN:0:50}..."
   ```

3. **Run API smoke test:**
   ```bash
   # Test A: Create attribute with manual ID
   curl -i -X POST "https://ropi-aoss-staging.web.app/api/admin/settings/attributes" \
     -H "Authorization: Bearer $TOKEN" \
     -H "Content-Type: application/json" \
     -d '{"attribute_id":"test_manual_id_'$(date +%s)'","label":"Test Manual","data_type":"string"}'
   ```

## Resume LP-ATTR-1.3.3-MERGEPR341 Smoke Tests

Once password is fixed, complete the blocked smoke tests:

```bash
cd /workspaces/ROPI-V2.1

# Generate token
TOKEN=$(VITE_E2E_ADMIN_PASSWORD="RopiE2E-Admin!2025" \
  node scripts/generate-admin-token-rest.js 2>&1 | tail -1)
echo "$TOKEN" > logs/lp-attr-1.3.3-admin-token.txt

# Smoke Test A: Create with manual ID
LABEL="lp341_manual_$(date -u +%s)"
curl -i -s -X POST "https://ropi-aoss-staging.web.app/api/admin/settings/attributes" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d "{\"attribute_id\":\"manual_test_id_$(date -u +%s)\",\"label\":\"${LABEL}\",\"data_type\":\"string\"}" \
  > logs/lp-attr-1.3.3-post-create-manual.txt

# Smoke Test B: Create with auto-gen ID
LABEL2="1Digit_$(date -u +%s)"
curl -i -s -X POST "https://ropi-aoss-staging.web.app/api/admin/settings/attributes" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d "{\"label\":\"${LABEL2}\",\"data_type\":\"string\"}" \
  > logs/lp-attr-1.3.3-post-create-auto.txt

# Smoke Test D: Delete operations
ATTR_ID=$(jq -r '.attribute.attribute_id // .attribute.id // .id' logs/lp-attr-1.3.3-post-create-manual.txt)
curl -i -s -X DELETE "https://ropi-aoss-staging.web.app/api/admin/settings/attributes/${ATTR_ID}" \
  -H "Authorization: Bearer $TOKEN" > logs/lp-attr-1.3.3-post-delete-1.txt
curl -i -s -X DELETE "https://ropi-aoss-staging.web.app/api/admin/settings/attributes/${ATTR_ID}" \
  -H "Authorization: Bearer $TOKEN" > logs/lp-attr-1.3.3-post-delete-2.txt

# Review results
echo "=== Smoke Test Results ==="
echo "Manual create:" && head -n 1 logs/lp-attr-1.3.3-post-create-manual.txt
echo "Auto-gen create:" && head -n 1 logs/lp-attr-1.3.3-post-create-auto.txt
echo "First delete:" && head -n 1 logs/lp-attr-1.3.3-post-delete-1.txt
echo "Second delete:" && head -n 1 logs/lp-attr-1.3.3-post-delete-2.txt
```

## Files Created

- ✅ `scripts/test-admin-credentials.js` - Test if passwords work
- ✅ `scripts/fix-admin-user.js` - Reset password via Firebase Admin SDK
- ✅ `E2E_PASSWORD_FIX_GUIDE.md` - Detailed troubleshooting guide
- ✅ `MANUAL_STEPS_E2E_PASSWORD.md` - This file (quick reference)

## Status

- [x] Identified the issue (invalid password)
- [x] Created helper scripts
- [x] Created documentation
- [ ] **ACTION REQUIRED:** Reset password via Firebase Console or gcloud
- [ ] **ACTION REQUIRED:** Update GitHub secret
- [ ] **ACTION REQUIRED:** Complete smoke tests

---

**Priority:** HIGH - Blocks completion of LP-ATTR-1.3.3-MERGEPR341
**Estimated Time:** 5-10 minutes to reset and verify
