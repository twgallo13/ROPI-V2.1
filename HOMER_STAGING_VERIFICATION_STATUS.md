# HOMER — Staging Verification Status Report
**Date:** December 9, 2025  
**Session:** API Routing Fix + Verification Setup  
**Status:** ✅ Deployed | ⏳ Verification Tests Pending Auth Token

---

## Summary

The API routing fix has been successfully deployed to staging. All infrastructure is in place and the health check passes. The remaining step is running the authenticated endpoint tests, which requires an admin ID token.

---

## What's Been Completed ✅

### 1. Code Changes & Deployment

**Issue:** API endpoints were returning HTML/404 instead of JSON

**Root Cause:** Express routes were registered directly on `app` instead of under the `/api` prefix that Firebase Hosting rewrites specify.

**Fix Applied:**

**File:** `packages/api/src/apiApp.ts`

```typescript
// Before: Routes hit app directly (bypassed /api rewrite)
app.get('/admin/settings/users', listUsersHandler);
app.get('/users/me', getMeHandler);

// After: Routes on api router, mounted at /api
const api: Router = Router();
api.get('/admin/settings/users', listUsersHandler);
api.get('/users/me', getMeHandler);
app.use('/api', api);  // Mount router at /api prefix
```

**Commit:** `14af01f` — "fix: Consolidate API fetches to use apiFetch with auth headers"

### 2. Deployment Status

| Component | Status | Details |
|-----------|--------|---------|
| **API Build** | ✅ Success | `pnpm --filter @ropi-aoss/api build` completed |
| **API Function Deploy** | ✅ Success | `firebase deploy --only functions:api` completed |
| **Hosting Deploy** | ✅ Success | `firebase deploy --only hosting:aoss-staging` completed |
| **Deploy Time** | 2025-12-09 15:17 UTC | Full deploy ~2 minutes |

### 3. Health Check Verification ✅

**Test:** `curl -i https://ropi-aoss-staging.web.app/api/healthz`

**Result:**
```
HTTP/2 200
content-type: application/json; charset=utf-8
x-powered-by: Express

{"status":"ok"}
```

**Validation:**
- ✅ HTTP 200 — Status correct
- ✅ JSON response — Content-Type correct
- ✅ Hosting rewrite working — `/api/**` → Cloud Function `api`
- ✅ Express router mounted — Health endpoint accessible via `/api` prefix

---

## What Remains ⏳

### Authenticated Endpoint Tests (Pending Admin Token)

The following 3 endpoints need to be tested with an authenticated admin token:

```bash
TOKEN="<admin_id_token>"

# Test 1: User Profile
curl -i -H "Authorization: Bearer ${TOKEN}" \
  "https://ropi-aoss-staging.web.app/api/users/me"

# Test 2: Admin Users List
curl -i -H "Authorization: Bearer ${TOKEN}" \
  "https://ropi-aoss-staging.web.app/api/admin/settings/users"

# Test 3: Admin Roles List
curl -i -H "Authorization: Bearer ${TOKEN}" \
  "https://ropi-aoss-staging.web.app/api/admin/settings/roles"
```

**Expected Results:** HTTP 200 with JSON bodies

### Browser E2E Verification (Pending)

Sign in as `theo@shiekh.com` and verify:
- [ ] `/settings/profile` loads and fetches from `/api/users/me`
- [ ] `/settings/users` loads and fetches from `/api/admin/settings/users`
- [ ] `/settings/permissions` loads and fetches from `/api/admin/permissions`
- [ ] All requests include `Authorization: Bearer <token>` header
- [ ] All responses are JSON (200), not HTML (404)

---

## How to Obtain Admin ID Token

### Option 1: Browser Console (Fastest)
1. Go to: https://ropi-aoss-staging.web.app
2. Sign in as `theo@shiekh.com`
3. Open DevTools → Console
4. Run:
   ```javascript
   await firebase.auth().currentUser.getIdToken(true).then(t => {
     console.log('TOKEN=' + t);
     copy(t);
   })
   ```
5. Token is in clipboard

### Option 2: Programmatic (Requires password)
```bash
VITE_E2E_ADMIN_PASSWORD="<password>" node scripts/generate-admin-token-rest.js
```

### Option 3: Helper Script (Recommended)
```bash
TOKEN="<paste_token>" bash scripts/run-verification-with-token.sh
```

**📍 See `TOKEN_GENERATION_GUIDE.md` for detailed instructions**

---

## Verification Scripts Created

1. **`scripts/verify-staging-endpoints.sh`**
   - Tests 4 endpoints: healthz + 3 auth endpoints
   - Saves full curl output with headers
   - Timestamps log file: `staging-verification-logs/verify_YYYYMMDD_HHMMSS.txt`
   - Redacts tokens for safety

2. **`scripts/generate-admin-token-rest.js`**
   - Generates ID token from password via Firebase REST API
   - Works without gcloud auth
   - Outputs full token for use in curl tests

3. **`scripts/run-verification-with-token.sh`**
   - Wrapper for easy token + test execution
   - Supports both password and token inputs
   - Calls verify script with token

---

## Artifacts & References

### Documentation
- ✅ `HOMER_STAGING_VERIFICATION_v2.0_REPORT.md` — Comprehensive verification guide
- ✅ `TOKEN_GENERATION_GUIDE.md` — Token generation options
- ✅ This report

### Scripts
- ✅ `scripts/verify-staging-endpoints.sh` — Main verification script
- ✅ `scripts/generate-admin-token-rest.js` — Token generator
- ✅ `scripts/run-verification-with-token.sh` — Helper wrapper

### Deployment Info
- **Project:** `ropi-bccee`
- **Hosting:** https://ropi-aoss-staging.web.app
- **Function:** `api` (us-central1)
- **Latest Commit:** `14af01f`
- **Branch:** `aoss-main` (merged from `fix/users-roles-profile`)

---

## Next Steps

### Immediate (To Complete Verification)
1. Obtain admin ID token (see token generation options above)
2. Run verification tests:
   ```bash
   TOKEN="<token>" bash scripts/verify-staging-endpoints.sh
   ```
3. Capture output and verify all 3 endpoints return HTTP 200 with JSON
4. Update this report with results

### Browser Testing
1. Sign in to staging as `theo@shiekh.com`
2. Navigate to `/settings/profile`, `/settings/users`, `/settings/permissions`
3. Verify pages load and network requests return JSON (not HTML/404)
4. Capture screenshots for documentation

### Final Documentation
1. Merge results into final Homer summary
2. Document any issues or workarounds
3. Commit verification artifacts to repo

---

## Troubleshooting Reference

### If Endpoints Still Return HTML/404

Check:
```bash
# 1. Verify function is deployed
firebase functions:list --project ropi-bccee | grep api

# 2. Check firebase.json rewrites
cat firebase.json | grep -A5 '"source".*api'

# 3. Inspect apiApp.ts mount point
grep "app.use.*api" packages/api/src/apiApp.ts

# 4. Check Cloud Functions logs
gcloud functions logs read api --project ropi-bccee --limit 50 --follow
```

### If Auth Tests Return 401/403

```javascript
// In browser console, check token claims:
const token = '<paste_token>';
function decode(t) {
  const [header, payload, sig] = t.split('.');
  const pad = '='.repeat((4 - payload.length % 4) % 4);
  return JSON.parse(atob((payload + pad).replace(/-/g, '+').replace(/_/g, '/')));
}
console.log(decode(token));
// Look for: role: 'admin' in custom claims
```

---

## Timeline

| Time | Event |
|------|-------|
| 15:10 | Initial health check failed (404) — routing issue identified |
| 15:17 | Fixed apiApp.ts routing; redeployed |
| 15:17 | Health check passed ✅ |
| ~16:00 | Verification scripts and documentation created |
| ⏳ | Awaiting authenticated endpoint tests |

---

## Files Changed Summary

```
packages/api/src/apiApp.ts
  - Added Router import
  - Created api Router instance
  - Moved all route handlers from app → api Router
  - Mounted api Router at /api path
  - Moved health check to api Router

scripts/verify-staging-endpoints.sh
  - Created automated test script
  - Tests 4 endpoints with -i flag (headers + body)
  - Logs to timestamped file
  - Redacts tokens

scripts/generate-admin-token-rest.js
  - Created token generator
  - Uses Firebase REST API
  - No gcloud auth required

scripts/run-verification-with-token.sh
  - Created helper wrapper
  - Supports password or token input
  - Calls verify script

TOKEN_GENERATION_GUIDE.md
  - Created token generation guide
  - Documents 3 ways to get token
  - Troubleshooting reference

HOMER_STAGING_VERIFICATION_v2.0_REPORT.md
  - Created comprehensive report template
  - Instructions for manual and automated verification
  - Cloud Functions log inspection commands
```

---

## Status Dashboard

| Component | Status | Evidence |
|-----------|--------|----------|
| Code Changes | ✅ Complete | Commit 14af01f |
| API Build | ✅ Passing | Build output shown |
| Functions Deploy | ✅ Passing | Firebase deploy log |
| Hosting Deploy | ✅ Passing | Firebase deploy log |
| Health Check | ✅ Passing | HTTP 200, JSON response |
| Auth Endpoints | ⏳ Pending | Awaiting token |
| Browser E2E | ⏳ Pending | Manual verification needed |

**Overall Status:** 🟢 **READY FOR AUTH VERIFICATION**

---

## Success Criteria

- [x] API routes registered under `/api` prefix
- [x] Health endpoint accessible and returning JSON
- [x] Firebase Hosting rewrite `/api/**` → function working
- [x] Cloud Functions deployed successfully
- [ ] `/api/users/me` returns 200 JSON with auth
- [ ] `/api/admin/settings/users` returns 200 JSON with auth
- [ ] `/api/admin/settings/roles` returns 200 JSON with auth
- [ ] Browser pages load and fetch correctly
- [ ] All requests include Authorization header
- [ ] No HTML responses for API endpoints

---

## How to Complete This Report

Once you have the admin token:

```bash
# Run automated tests
TOKEN="<paste_token>" bash scripts/verify-staging-endpoints.sh > /tmp/verification.txt

# Append results to this report
cat /tmp/verification.txt >> HOMER_STAGING_VERIFICATION_v2.0_REPORT.md
```

**Then share the updated report for final sign-off.**

---

*Generated: 2025-12-09 16:00 UTC*  
*Branch: aoss-main*  
*Commit: 14af01f*
