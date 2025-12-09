# HOMER — Final Staging Verification Setup Report
**Prompt:** Automated Staging Verification Script Execution  
**Date:** December 9, 2025  
**Status:** ✅ **Infrastructure Ready** | ⏳ **Auth Token Required**

---

## Executive Summary

The API routing fix has been **successfully deployed** to staging (`ropi-bccee`). All automated verification infrastructure is now in place. The health check passes, confirming routing works. Authenticated endpoint tests are ready but require an admin ID token.

**Current State:**
- ✅ API code fixed and deployed
- ✅ Health check passing (HTTP 200 JSON)
- ✅ Verification scripts created and committed
- ✅ Token generation helpers ready
- ⏳ **Blocked:** Awaiting admin ID token to complete tests

---

## Deployment Summary

### What Was Fixed

**Problem:** API endpoints returning HTML/404 instead of JSON

**Cause:** Express routes registered directly on `app` instead of under `/api` prefix

**Solution:** Mount all routes on a Router, then mount Router at `/api`:

```typescript
// packages/api/src/apiApp.ts
const api: Router = Router();
api.get('/admin/settings/users', listUsersHandler);
api.get('/users/me', getMeHandler);
// ... all routes on api Router ...
app.use('/api', api);  // Mount at /api to match Firebase Hosting rewrite
```

### Deployment Details

```
Deployment: firebase deploy --only functions:api,hosting:aoss-staging --project ropi-bccee
Timestamp: 2025-12-09 15:17 UTC
Status: ✅ SUCCESS
Duration: ~2 minutes

Commit: e97acdc (verification infrastructure)
Previous: 14af01f (API routing fix)
Branch: aoss-main
```

### Health Check Result ✅

```bash
$ curl -i https://ropi-aoss-staging.web.app/api/healthz

HTTP/2 200
content-type: application/json; charset=utf-8
x-powered-by: Express
content-length: 15

{"status":"ok"}
```

**Validation:**
- ✅ HTTP 200 status
- ✅ JSON response (not HTML)
- ✅ Confirms `/api/**` rewrite working
- ✅ Confirms Express router mounted correctly

---

## Verification Infrastructure Created

### 1. Main Verification Script
**File:** `scripts/verify-staging-endpoints.sh`

Tests all 4 endpoints:
```bash
TOKEN="<admin_id_token>" bash scripts/verify-staging-endpoints.sh
```

Outputs:
- Full curl `-i` output (headers + body) for each endpoint
- Timestamped log file: `staging-verification-logs/verify_YYYYMMDD_HHMMSS.txt`
- Redacted tokens for safety

Tests:
1. `GET /api/healthz` — Health check (no auth)
2. `GET /api/users/me` — User profile (auth required)
3. `GET /api/admin/settings/users` — Users list (admin only)
4. `GET /api/admin/settings/roles` — Roles list (admin only)

### 2. Token Generation Helper
**File:** `scripts/generate-admin-token-rest.js`

Generates ID token from password via Firebase REST API:
```bash
VITE_E2E_ADMIN_PASSWORD="<password>" node scripts/generate-admin-token-rest.js
```

No gcloud auth required; uses public Firebase API.

### 3. Wrapper Script
**File:** `scripts/run-verification-with-token.sh`

Combines token generation + verification:
```bash
VITE_E2E_ADMIN_PASSWORD="<password>" bash scripts/run-verification-with-token.sh
# OR
TOKEN="<token>" bash scripts/run-verification-with-token.sh
```

### 4. Documentation
- **`TOKEN_GENERATION_GUIDE.md`** — 3 ways to get admin token
- **`HOMER_STAGING_VERIFICATION_v2.0_REPORT.md`** — Detailed procedures & expected responses
- **`HOMER_STAGING_VERIFICATION_STATUS.md`** — Status dashboard & next steps

---

## How to Complete Verification

You need an admin ID token. Three ways to get it:

### **Option 1: Browser Console (Fastest)**
```
1. Go to: https://ropi-aoss-staging.web.app
2. Sign in as: theo@shiekh.com
3. DevTools → Console
4. Paste: await firebase.auth().currentUser.getIdToken(true).then(t => console.log(t))
5. Copy token from output
```

### **Option 2: Automated (if you have password)**
```bash
VITE_E2E_ADMIN_PASSWORD="<password>" node scripts/generate-admin-token-rest.js
```

### **Option 3: Helper Script (Recommended)**
```bash
TOKEN="<paste_token>" bash scripts/run-verification-with-token.sh
```

**For detailed instructions, see:** `TOKEN_GENERATION_GUIDE.md`

---

## Current Blockers

The verification tests cannot run without:
- ❌ Admin ID token (not available in terminal environment)
- ❌ Password from GitHub Secrets (not accessible without elevated permissions)

**Workaround:** Manual token generation from browser or CI environment where secrets are available.

---

## Endpoints Ready for Testing

Once you run with a token, these should all return HTTP 200 JSON:

```bash
# 1. Health (no auth)
curl -i https://ropi-aoss-staging.web.app/api/healthz
→ Expected: {"status":"ok"}

# 2. User Profile (auth required)
curl -i -H "Authorization: Bearer ${TOKEN}" \
  https://ropi-aoss-staging.web.app/api/users/me
→ Expected: {"uid":"...", "email":"...", ...}

# 3. Admin Users (auth + admin role required)
curl -i -H "Authorization: Bearer ${TOKEN}" \
  https://ropi-aoss-staging.web.app/api/admin/settings/users
→ Expected: {"users": [...], "pageToken": "...", ...}

# 4. Admin Roles (auth + admin role required)
curl -i -H "Authorization: Bearer ${TOKEN}" \
  https://ropi-aoss-staging.web.app/api/admin/settings/roles
→ Expected: ["admin", "merchandiser", "user", ...]
```

---

## What to Do Now

### Next Step: Run Verification Tests

**Option A: Quick verification (if you have token)**
```bash
TOKEN="<your_token>" bash scripts/verify-staging-endpoints.sh
```

**Option B: Full automated (if you have password)**
```bash
VITE_E2E_ADMIN_PASSWORD="<password>" bash scripts/run-verification-with-token.sh
```

**Option C: Manual browser verification**
1. Sign in to https://ropi-aoss-staging.web.app
2. Open DevTools → Network tab
3. Navigate to `/settings/profile` and `/settings/users`
4. Verify network requests to `/api/**` return JSON (not HTML)
5. Verify Authorization header is present
6. Take screenshots

---

## Files Committed

```
Commit: e97acdc
Message: "docs: Add staging verification scripts and guides for API endpoint testing"

Files Added:
  scripts/verify-staging-endpoints.sh — Main verification script
  scripts/generate-admin-token-rest.js — Token generator
  scripts/generate-admin-token.js — Admin SDK token generator (for reference)
  scripts/run-verification-with-token.sh — Helper wrapper
  TOKEN_GENERATION_GUIDE.md — Token generation guide
  HOMER_STAGING_VERIFICATION_v2.0_REPORT.md — Detailed procedures
  HOMER_STAGING_VERIFICATION_STATUS.md — Status dashboard

Branch: aoss-main
Push: ✅ Complete
```

---

## Staging Deployment Details

| Property | Value |
|----------|-------|
| **Project ID** | `ropi-bccee` |
| **Hosting URL** | https://ropi-aoss-staging.web.app |
| **Firebase Function** | `api` (us-central1) |
| **Region** | us-central1 |
| **Runtime** | Node.js 20 |
| **Status** | ✅ Online |

---

## Cloud Functions Logs

To monitor the deployed function:

```bash
# Live logs
gcloud functions logs read api --project=ropi-bccee --limit=200 --follow

# Or in Firebase Console:
# https://console.firebase.google.com/project/ropi-bccee/functions
```

Expected log entries:
- ✅ Successful requests to `/api/**` routes
- ❌ No 404 or "route-not-found" errors
- ✅ Auth token validation logs

---

## Test Results Placeholder

**Status:** ⏳ Pending token

Once you run the verification script, results will appear below:

### Test 1: Health Check
```
Status: [PENDING]
Response: [PENDING]
```

### Test 2: User Profile
```
Status: [PENDING]
Response: [PENDING]
```

### Test 3: Admin Users
```
Status: [PENDING]
Response: [PENDING]
```

### Test 4: Admin Roles
```
Status: [PENDING]
Response: [PENDING]
```

---

## Next Steps (In Order)

1. **Get Admin Token** — Use one of the 3 methods above
2. **Run Verification Script** — `TOKEN="..." bash scripts/verify-staging-endpoints.sh`
3. **Verify All Endpoints** — Confirm HTTP 200 JSON for all 4 tests
4. **Browser Testing** — Sign in and verify `/settings/*` pages load
5. **Capture Results** — Screenshots + curl outputs
6. **Update Report** — Append results to this report
7. **Merge** — Confirmation to merge fix/users-roles-profile to production

---

## Summary Status

| Task | Status | Details |
|------|--------|---------|
| API Routing Fix | ✅ Complete | Commit 14af01f |
| Functions Deploy | ✅ Complete | firebase deploy successful |
| Health Check | ✅ Complete | HTTP 200 JSON verified |
| Verification Scripts | ✅ Complete | 3 scripts created & committed |
| Token Generation | ✅ Complete | 2 helper scripts ready |
| Documentation | ✅ Complete | 3 guides created |
| Auth Endpoint Tests | ⏳ Blocked | Requires admin token |
| Browser E2E Tests | ⏳ Blocked | Requires sign-in access |

**Overall:** 🟡 **Ready for Auth Testing** (blocked by token availability)

---

## References

- **Staging App:** https://ropi-aoss-staging.web.app
- **Firebase Console:** https://console.firebase.google.com/project/ropi-bccee
- **Verification Guide:** `TOKEN_GENERATION_GUIDE.md`
- **Detailed Report:** `HOMER_STAGING_VERIFICATION_v2.0_REPORT.md`
- **Main Report:** `HOMER_STAGING_VERIFICATION_STATUS.md`

---

*Report Generated: 2025-12-09 16:15 UTC*  
*Branch: aoss-main (e97acdc)*  
*Ready for: Manual token generation + verification execution*
