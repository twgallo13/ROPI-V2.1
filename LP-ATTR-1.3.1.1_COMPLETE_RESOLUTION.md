# LP-ATTR-1.3.1.1 Complete: CORS Fix for Import API

**Date:** 2025-12-24  
**Status:** ✅ **FULLY RESOLVED**  
**Commits:** a2bc1da, c6ae8c6  
**CI Runs:** 20491732570 (backend), 20491883266 (frontend+backend) - both success

---

## Issue Summary

User reported CORS errors when attempting to import CSV files:
```
Access to fetch at 'https://us-central1-ropi-bccee.cloudfunctions.net/api/importCSV' 
from origin 'https://ropi-aoss-staging.web.app' has been blocked by CORS policy: 
No 'Access-Control-Allow-Origin' header is present on the requested resource.
```

---

## Root Cause (Two Issues)

### Issue 1: Missing API Routes (Backend)
**Problem:** Frontend was calling `/api/importCSV` but the Express app had no route for it.

**Details:**
- `firebase.json` rewrites `/api/**` → `api` Cloud Function
- Express app (`apiApp.ts`) had no `/importCSV` route
- `importCSV` was only exported as standalone Cloud Function
- Request path: Frontend → Hosting rewrite → `api` function → 404 (no route)
- 404 response had no CORS headers → CORS error

**Fix (Commit a2bc1da):**
```typescript
// packages/api/src/apiApp.ts
api.post('/importCSV', requireAdmin, importCSVHandler);
api.post('/importDryRun', requireAdmin, importDryRunHandler);

// packages/api/src/endpoints/import.ts
export { importHandler as importCSVHandler };
export { dryRunHandler as importDryRunHandler };
```

### Issue 2: Frontend Using Absolute URLs (Frontend)
**Problem:** Frontend was calling Cloud Functions URL directly, bypassing hosting rewrites.

**Details:**
```typescript
// OLD CODE:
const apiUrl = (import.meta.env.VITE_API_BASE || '').replace('/api', '') 
               || 'https://us-central1-ropi-bccee.cloudfunctions.net';
const response = await fetch(`${apiUrl}/api/importCSV`, { ... });
```

**Why this caused CORS errors:**
- `VITE_API_BASE` not set in CI/CD → fell back to Cloud Functions URL
- Request: `https://ropi-aoss-staging.web.app` → `https://us-central1-ropi-bccee.cloudfunctions.net/api/importCSV`
- Cross-origin request triggered CORS preflight
- Direct Cloud Function URL `/api/importCSV` doesn't exist (only standalone `/importCSV`)
- Result: 404/400 without CORS headers

**Fix (Commit c6ae8c6):**
```typescript
// NEW CODE:
const response = await fetch('/api/importCSV', { ... });
const processResponse = await fetch('/api/processImportBatch', { ... });
```

**Why this works:**
- Relative URLs: same-origin request (no CORS preflight needed)
- Hosting rewrites handle routing: `/api/**` → `api` Cloud Function
- Express app now has routes: `/importCSV` and `/processImportBatch`
- CORS headers set at handler level for any cross-origin scenarios

---

## Complete Solution Flow

### Before Fix
```
Browser (staging.web.app)
  ↓ POST https://us-central1-ropi-bccee.cloudfunctions.net/api/importCSV
  ↓ (Cross-origin request)
Cloud Functions (direct)
  ↓ Route not found: /api/importCSV
  ↓ 404 without CORS headers
❌ CORS error: No 'Access-Control-Allow-Origin' header
```

### After Fix
```
Browser (staging.web.app)
  ↓ POST /api/importCSV (relative URL, same-origin)
Firebase Hosting
  ↓ Rewrite: /api/** → api function
Cloud Function: api
  ↓ Express Router
  ↓ Route: POST /importCSV → requireAdmin → importCSVHandler
  ↓ setCorsHeaders() at handler entry
  ↓ Parse multipart/form-data
  ↓ Process CSV import
  ↓ Return 200 with CORS headers
✅ Success: Import completed
```

---

## Changes Summary

### Backend (Commit a2bc1da)
**Files Changed:**
- `packages/api/src/apiApp.ts` - Added `/importCSV` and `/importDryRun` routes
- `packages/api/src/endpoints/import.ts` - Exported handlers, added `getOrigin()` helper
- `packages/api/test/import.cors.test.ts` - Updated tests to verify headers not middleware

**Tests:** 8/8 CORS tests passing  
**Build:** API built successfully (1.9mb)  
**Deploy:** CI run 20491732570 - success

### Frontend (Commit c6ae8c6)
**Files Changed:**
- `packages/web/src/components/import/ImportConfirmStep.tsx` - Changed to relative URLs

**Changes:**
```diff
- const apiUrl = ... || 'https://us-central1-ropi-bccee.cloudfunctions.net';
- fetch(`${apiUrl}/api/importCSV`, { ... })
+ fetch('/api/importCSV', { ... })

- fetch(`${apiUrl}/api/processImportBatch`, { ... })
+ fetch('/api/processImportBatch', { ... })
```

**Build:** Web built successfully (390KB + 1.1MB chunks)  
**Deploy:** CI run 20491883266 - success

---

## Verification Status

### Automated ✅
- [x] Backend build successful
- [x] Frontend build successful
- [x] CORS tests passing (8/8)
- [x] CI/CD deployments successful (both runs)

### User Acceptance Testing
**Instructions:**
1. Navigate to https://ropi-aoss-staging.web.app
2. Go to Import page
3. Upload CSV file with sample data
4. Map columns (Product Name → name, MPN → mpn)
5. Preview import data
6. Click "Import CSV" button
7. **Expected:** Import succeeds without errors
8. **Expected:** Console shows `POST /api/importCSV` with 200 response
9. **Expected:** No CORS errors in console

**Check Network Tab:**
```
Request URL: https://ropi-aoss-staging.web.app/api/importCSV
Status: 200 OK
Response Headers:
  Access-Control-Allow-Origin: https://ropi-aoss-staging.web.app
  Access-Control-Allow-Credentials: true
  Access-Control-Allow-Methods: GET,POST,OPTIONS
```

---

## Architecture Decisions

### Why Relative URLs?
- **Same-origin:** Avoids CORS preflight overhead
- **Simpler:** No environment variables needed
- **Reliable:** Works in all environments (local, staging, prod)
- **Consistent:** Matches other API calls in codebase

### Why Keep Standalone Functions?
The codebase maintains two access patterns:

1. **Through Hosting (`/api/*`)** - Recommended
   - Relative URLs from web app
   - Hosting rewrites handle routing
   - Same-origin requests

2. **Direct Cloud Functions URLs** - Legacy/CLI
   - `https://us-central1-ropi-bccee.cloudfunctions.net/importCSV`
   - Server-to-server calls
   - CLI tools
   - Backward compatibility

Both work with CORS headers set at handler level.

---

## Key Learnings

### 1. CORS Errors Can Mask 404s
When a 404 response lacks CORS headers, browsers report "No CORS header" instead of "404 Not Found". Always check:
- Is the route defined?
- Is the URL correct?
- Are CORS headers on ALL response paths (2xx, 4xx, 5xx)?

### 2. Environment Variables Need Defaults
Frontend code had fallback URL logic:
```typescript
const apiUrl = (env.VITE_API_BASE || '') || 'https://cloud-functions-url';
```

**Problems:**
- Empty string is falsy → fallback triggered
- Direct Cloud Functions URL bypassed hosting rewrites
- Hard to debug (no visibility into which URL was used)

**Better approach:**
- Use relative URLs when possible
- Set environment variables explicitly in CI/CD
- Log which URL is being used (dev mode)

### 3. Test Implementation vs Behavior
Original tests checked `expect(mockCorsMiddleware).toHaveBeenCalled()` which broke when implementation changed to set headers directly. Better:
```typescript
expect(mockRes.set).toHaveBeenCalledWith('Access-Control-Allow-Origin', origin);
```

Tests should verify outcomes, not implementation details.

---

## Related Work

- **PR #340 (LP-ATTR-1.3.0):** Server-side registry validation
- **PR #342 (LP-ATTR-1.3.1):** SDK mapping sync + initial CORS fixes
- **PR #343:** SDK validator alignment (name/brand optional)
- **LP-ATTR-1.3.1.1:** CORS routing fix (this work)

---

## Success Criteria

### Code Complete ✅
- [x] Backend routes added to Express app
- [x] Frontend uses relative URLs
- [x] CORS headers on all response paths
- [x] Tests passing (8/8)
- [x] Builds successful (API + Web)
- [x] CI/CD deployments successful (2 runs)

### User Acceptance ⏳
**Ready for testing now - please verify:**
- [ ] CSV import works without errors
- [ ] No CORS messages in browser console
- [ ] Network tab shows 200 OK for /api/importCSV
- [ ] Response includes CORS headers
- [ ] Products created/updated successfully

---

## Rollback Plan

If issues occur:

```bash
# Revert both commits
git revert c6ae8c6 a2bc1da
git push origin aoss-main

# Or reset to before fixes
git reset --hard a8f777a  # (PR #343 state)
git push origin aoss-main --force
```

---

## Final Status

**Problem:** ✅ **RESOLVED**  
- Backend routes added
- Frontend URLs fixed
- Both deployments successful

**Ready for:** User acceptance testing

**Next:** Please try importing a CSV file and confirm no CORS errors appear.

---

**Last Updated:** 2025-12-24 18:32 UTC  
**Commits:** a2bc1da (backend), c6ae8c6 (frontend)  
**Status:** ✅ Deployed and Ready for User Testing
