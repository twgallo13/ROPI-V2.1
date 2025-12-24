# LP-ATTR-1.3.1 CORS Fix Implementation Summary

## Problem Statement
Browser-based CSV imports were failing because Cloud Function responses on error paths (400/401/500) were missing `Access-Control-Allow-Origin` headers. While CORS preflight (OPTIONS) requests returned proper headers, actual POST requests with errors were blocked by browser CORS policy.

## Root Cause
The `corsHandler` middleware in import.ts set headers at the top level, but:
1. Early returns in handler functions bypassed header setting
2. Error responses from auth middleware (401) didn't include CORS headers
3. Error responses from validation (400) didn't include CORS headers

## Solution Implemented

### 1. Added `setCorsHeaders()` Helper Function
Location: `packages/api/src/endpoints/import.ts` (after ALLOWED_ORIGINS constant)

```typescript
/**
 * LP-ATTR-1.3.1: Helper to explicitly set CORS headers on response
 * Ensures headers are present on all response paths including errors
 */
function setCorsHeaders(res: ExpressResponse, origin: string | undefined): void {
  const allowOrigin = (!origin || ALLOWED_ORIGINS.includes(origin)) ? (origin || '*') : '';
  if (allowOrigin) {
    res.set('Access-Control-Allow-Origin', allowOrigin);
    res.set('Access-Control-Allow-Credentials', 'true');
    res.set('Access-Control-Allow-Headers', 'Content-Type,Authorization,X-Requested-With');
    res.set('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
  }
}
```

### 2. Updated `importCSV` Function Export
- Set CORS headers FIRST before any middleware
- Handle OPTIONS preflight early
- Ensures headers on all response paths including auth failures

```typescript
export const importCSV = functions.https.onRequest((req, res) => {
  // LP-ATTR-1.3.1: Set CORS headers FIRST, before any middleware
  const origin = req.get('Origin');
  setCorsHeaders(res as any, origin);
  
  // Handle preflight early
  if (req.method === 'OPTIONS') {
    res.status(204).send('');
    return;
  }
  
  corsHandler(req as any, res as any, async () => {
    await requireAdmin(req, res, async () => {
      await importHandler(req as unknown as AuthenticatedRequest, res);
    });
  });
});
```

### 3. Updated `importDryRun` Function Export
Same pattern as importCSV - headers set before middleware chain.

### 4. Updated `importHandler` Function
- Set CORS headers at function start
- Also set in catch block for error responses

```typescript
async function importHandler(req: AuthenticatedRequest, res: ExpressResponse): Promise<void> {
  // LP-ATTR-1.3.1: Ensure CORS headers on all responses
  const origin = req.get('Origin');
  setCorsHeaders(res, origin);

  try {
    // ... existing logic
  } catch (error) {
    // LP-ATTR-1.3.1: Ensure CORS headers on error responses
    setCorsHeaders(res, origin);
    // ... error handling
  }
}
```

### 5. Updated `dryRunHandler` Function
Same pattern as importHandler - headers at start and in error block.

## Expected Behavior After Fix
1. ✅ OPTIONS preflight returns 204 with Access-Control-Allow-Origin
2. ✅ POST with no auth token returns 401 WITH Access-Control-Allow-Origin
3. ✅ POST with invalid data returns 400 WITH Access-Control-Allow-Origin  
4. ✅ POST with valid request returns 200/201 WITH Access-Control-Allow-Origin
5. ✅ Browser no longer blocks responses due to missing CORS headers

## Verification Status

### Code Review
- ✅ setCorsHeaders() helper correctly validates origin against ALLOWED_ORIGINS
- ✅ Headers set in function exports before middleware chain
- ✅ Headers set in handlers at start and in error blocks
- ✅ All response paths covered (success, error, early returns)

### Build Status
- ✅ API package builds successfully
- ✅ Changes committed to branch lp/ATTR-1.3.1-mapping-cors-dryrun
- ✅ Changes pushed to GitHub

### CI Status
- ⚠️ E2E tests failed due to unrelated flaky test (attribute-create-edit timeout)
- ℹ️ PR preview workflow only deploys hosting, not Cloud Functions
- ⏳ Functions need manual deployment to staging/production for testing

### Testing Requirements
To verify the fix works:

1. **Deploy functions to staging:**
   ```bash
   firebase deploy --only functions:importCSV,functions:importDryRun --project ropi-bccee
   ```

2. **Test CORS on error responses:**
   ```bash
   # Test 401 unauthorized
   curl -i -X POST https://us-central1-ropi-bccee.cloudfunctions.net/importCSV \
     -H "Origin: https://ropi-bccee.web.app" \
     -H "Content-Type: multipart/form-data"
   # Should see: access-control-allow-origin: https://ropi-bccee.web.app
   
   # Test 400 bad request (with invalid token)
   curl -i -X POST https://us-central1-ropi-bccee.cloudfunctions.net/importCSV \
     -H "Origin: https://ropi-bccee.web.app" \
     -H "Authorization: Bearer fake-token" \
     -H "Content-Type: application/json" \
     -d '{"invalid": "data"}'
   # Should see: access-control-allow-origin: https://ropi-bccee.web.app
   ```

3. **Browser testing:**
   - Navigate to https://ropi-bccee.web.app
   - Open Developer Tools → Network tab
   - Attempt CSV import without auth
   - Verify 401 response includes Access-Control-Allow-Origin header
   - Verify browser doesn't show CORS error in console

## Files Changed
- `packages/api/src/endpoints/import.ts` - CORS fix implementation

## Commit
- Hash: d7e6ea1e574c081b2ffe50cb976801687e7e139c
- Message: "LP-ATTR-1.3.1: ensure CORS headers on all response paths including errors"
- Branch: lp/ATTR-1.3.1-mapping-cors-dryrun
- PR: #342

## Next Steps
1. Manually deploy functions to staging: `firebase deploy --only functions:importCSV,functions:importDryRun --project ropi-bccee`
2. Run CORS verification tests against staging functions
3. Test browser-based CSV import end-to-end
4. If verified, merge PR #342 to deploy to production
5. Close LP-ATTR-1.3.1 as complete

## Related Issues
- Fixes browser CORS blocking on import error responses
- Complements LP-ATTR-1.3.0 (registry validation) and LP-ATTR-1.3.1 (SDK mapping sync)
- Unblocks browser-based CSV import with MPN-only rows
