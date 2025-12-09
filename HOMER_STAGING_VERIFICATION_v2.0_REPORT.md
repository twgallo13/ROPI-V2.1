# HOMER — ROPI AOSS Staging Endpoint Verification Summary
**Date:** December 9, 2025  
**Prompt:** Fix API routing for /api/* endpoints  
**Status:** ✅ Deployed & Partially Verified

---

## Deployment Artifacts

### Build & Deploy Info
| Item | Value |
|------|-------|
| **Latest Commit** | `14af01f` – "fix: Consolidate API fetches to use apiFetch with auth headers" |
| **Branch Deployed** | `aoss-main` |
| **Deploy Time** | ~2025-12-09 15:17 UTC |
| **Hosting URL** | https://ropi-aoss-staging.web.app |
| **Firebase Project** | `ropi-bccee` |
| **Functions Deployed** | `functions:api` (Cloud Function) + `hosting:aoss-staging` (Firebase Hosting) |

### Code Changes
**File:** `packages/api/src/apiApp.ts`

```typescript
// Before: All routes registered directly on app
app.get('/admin/settings/users', listUsersHandler);
app.get('/users/me', getMeHandler);
// ...

// After: Routes registered on api Router, then mounted at /api
api.get('/admin/settings/users', listUsersHandler);
api.get('/users/me', getMeHandler);
// ...
app.use('/api', api);  // Mount under /api
```

**Why:** Firebase Hosting rewrites map `/api/**` to the `api` Cloud Function. The function was returning HTML/404 because routes weren't under `/api` prefix. Now all endpoints live at:
- `/api/admin/settings/users`
- `/api/admin/settings/roles`
- `/api/users/me`
- `/api/healthz` (new health check)

---

## Health Check Verification ✅

**Endpoint:** `GET https://ropi-aoss-staging.web.app/api/healthz`  
**No Auth Required**

### Result
```
HTTP/2 200 
content-type: application/json; charset=utf-8
x-powered-by: Express

{"status":"ok"}
```

**Status:** ✅ **PASS** — Confirms:
1. Hosting rewrite `/api/**` → Cloud Function `api` is working
2. Express router mounts `/api` prefix correctly
3. Health endpoint accessible and returns JSON

---

## Authenticated Endpoints Verification

### Test Procedure

To complete the full verification, sign in to the staging app and run the curl tests:

**Step 1: Get Admin ID Token**

1. Navigate to: https://ropi-aoss-staging.web.app
2. Sign in as: `theo@shiekhshoes.org` (admin test account)
3. Open DevTools → Console
4. Run:
   ```javascript
   await firebase.auth().currentUser.getIdToken(true).then(t => {
     console.log('TOKEN=' + t);
     copy(t);
   })
   ```
5. Copy the token from console output

**Step 2: Run Curl Tests**

```bash
# Export the token (paste from step 1)
TOKEN="<paste_full_id_token_here>"

# Test 1: User Profile (should return 200 with JSON)
curl -i -H "Authorization: Bearer ${TOKEN}" \
  "https://ropi-aoss-staging.web.app/api/users/me"

# Test 2: Admin Users List (should return 200 with JSON)
curl -i -H "Authorization: Bearer ${TOKEN}" \
  "https://ropi-aoss-staging.web.app/api/admin/settings/users"

# Test 3: Admin Roles List (should return 200 with JSON)
curl -i -H "Authorization: Bearer ${TOKEN}" \
  "https://ropi-aoss-staging.web.app/api/admin/settings/roles"
```

**Expected Responses:**
| Endpoint | Status | Body | Notes |
|----------|--------|------|-------|
| `/api/users/me` | `200` | User profile JSON | Auth required; returns current user |
| `/api/admin/settings/users` | `200` | Users list JSON | Admin-only; requires `admin` role |
| `/api/admin/settings/roles` | `200` | Roles array JSON | Admin-only; requires `admin` role |

---

## Automated Verification Script

A helper script has been created to automate the curl tests:

**Usage:**
```bash
# After getting the token, run:
TOKEN="<paste_token_here>" bash scripts/verify-staging-endpoints.sh
```

This will:
- Run all 4 endpoint tests (health + 3 auth)
- Save full curl output with headers & bodies
- Log to: `staging-verification-logs/verify_YYYYMMDD_HHMMSS.txt`
- Redact token for safety

---

## Browser Verification Checklist

Once authenticated, verify in the app:

### /settings/profile
- [ ] Page loads without errors
- [ ] Network tab shows `GET /api/users/me` returning `200` with JSON
- [ ] Request headers include `Authorization: Bearer <token>`
- [ ] User info displays (email, role, etc.)

### /settings/users (admin-only)
- [ ] Page loads without errors
- [ ] Network tab shows `GET /api/admin/settings/users` returning `200` with JSON
- [ ] Users list displays in table
- [ ] Request requires admin custom claim; non-admin redirected to /forbidden

### /settings/permissions (admin-only)
- [ ] Page loads without errors
- [ ] Network tab shows successful API calls
- [ ] Permissions table loads and is editable

---

## Cloud Functions Logs

To monitor the deployed `api` function in real-time:

```bash
# Watch live logs (requires gcloud CLI auth)
gcloud functions logs read api --project=ropi-bccee --limit=200 --follow

# Or check logs in Firebase Console:
# Console → Functions → api(us-central1) → Logs
```

**Look for:**
- ✅ Request entries for `/api/**` routes
- ❌ No 404 or "route-not-found" errors
- ✅ Successful auth/permission checks

---

## Troubleshooting Reference

### Scenario: Endpoint returns 404 or HTML
**Cause:** Routing issue or rewrite mismatch
**Check:**
```bash
# Verify function is deployed
firebase functions:list --project ropi-bccee

# Check firebase.json hosting rewrites
cat firebase.json | grep -A5 "rewrites"

# Inspect apiApp.ts mounts
grep "app.use.*api" packages/api/src/apiApp.ts
```

### Scenario: Endpoint returns 401 Unauthorized
**Cause:** Token missing, expired, or invalid
**Action:**
1. Refresh token: `getIdToken(true)` in console
2. Check token expiry in decoded claims
3. Verify admin has `admin` custom claim set

### Scenario: Endpoint returns 403 Forbidden
**Cause:** User lacks required role/permission
**Check:**
```javascript
// In browser console, inspect token claims:
function decodeJwtPayload(token) {
  try {
    const b64 = token.split('.')[1];
    const pad = b64.length % 4 ? '='.repeat(4 - (b64.length % 4)) : '';
    const base64 = b64.replace(/-/g, '+').replace(/_/g, '/') + pad;
    return JSON.parse(atob(base64));
  } catch (e) {
    console.error('Invalid JWT', e);
    return null;
  }
}
const token = '<paste-token>';
console.log(decodeJwtPayload(token));
// Look for: "role": "admin" in claims
```

---

## Summary Status

| Component | Status | Notes |
|-----------|--------|-------|
| **API Routing** | ✅ Deployed | Router mounted at `/api`; health check passing |
| **Hosting Rewrite** | ✅ Verified | `/api/**` → Cloud Function working |
| **Auth Endpoints** | ⏳ Pending | Awaiting curl tests with admin token |
| **Browser E2E** | ⏳ Pending | Awaiting manual testing in staging app |
| **Cloud Logs** | ✅ Available | Logs accessible via gcloud or Firebase Console |

---

## Next Steps

1. **Run curl tests** with admin ID token (see "Authenticated Endpoints Verification" above)
2. **Verify in browser** by signing in as theo@shiekhshoes.org and navigating to /settings/*
3. **Capture logs** from Cloud Functions if any failures occur
4. **Update this report** with curl outputs and browser screenshots
5. **Merge to main** once all tests pass

---

## Artifacts

- ✅ Deploy logs: `firebase deploy --only functions:api,hosting:aoss-staging --project ropi-bccee`
- ✅ Health check curl output
- ⏳ Authenticated curl outputs (pending)
- ⏳ Browser screenshots (pending)
- ⏳ Cloud Functions logs (pending)

**Deployment Link:** https://ropi-aoss-staging.web.app  
**Firebase Console:** https://console.firebase.google.com/project/ropi-bccee/overview
