# LP-3.0.0 Import CORS Fix Audit

**Date**: 2025-12-21  
**Branch**: `lp/3.0.0-fix-import-cors`  
**PR**: #325  
**Commit**: ce83433  

## Objective

Fix CORS/preflight and duplicated headers for `importCSV` Cloud Function so that the Import UI can call it successfully from staging.

## Changes Made

### 1. packages/api/src/endpoints/import.ts

**Added ALLOWED_ORIGINS whitelist:**
```typescript
const ALLOWED_ORIGINS = [
  'https://ropi-aoss-staging.web.app',
  'https://ropi-aoss.web.app',
  'https://ropi-aoss-prod.web.app',
];
```

**Updated CORS handler with dynamic origin callback:**
```typescript
const corsHandler = cors({
  origin: (origin, callback) => {
    if (!origin) return callback(null, true);  // Allow curl/servers
    if (ALLOWED_ORIGINS.includes(origin)) return callback(null, true);
    return callback(new Error('Not allowed by CORS'));
  },
  credentials: true,
  methods: ['GET', 'POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
});
```

**Added preflight handler:**
```typescript
function handlePreflight(req: functions.https.Request, res: functions.Response): boolean {
  if (req.method === 'OPTIONS') {
    res.status(204).send('');
    return true;
  }
  return false;
}
```

**Updated Cloud Function exports:**
- Both `importCSV` and `importDryRun` now call `handlePreflight()` before auth check

### 2. packages/api/src/index.ts

**Export importDryRun:**
```typescript
export { importCSV, importDryRun } from './endpoints/import';
```

### 3. packages/api/test/import.cors.test.ts (new)

**8 test cases:**
- OPTIONS returns 204 for staging origin
- OPTIONS returns 204 for production origin  
- Sets Access-Control-Allow-Origin header
- Sets Access-Control-Allow-Credentials header
- Sets Access-Control-Allow-Methods header
- POST includes CORS headers
- importDryRun handles OPTIONS
- Requests without origin are allowed

## Deployment

### Functions Deployed
- `importCSV` - https://importcsv-ofrc5r2g3q-uc.a.run.app
- `importDryRun` - https://importdryrun-ofrc5r2g3q-uc.a.run.app

### IAM Configuration
- Added `allUsers` invoker policy to both functions (required for 2nd gen Cloud Functions)

## Smoke Test Results

| Test | URL | Origin | Result |
|------|-----|--------|--------|
| Preflight staging | importCSV | ropi-aoss-staging.web.app | ✅ 204 |
| Preflight prod | importCSV | ropi-aoss-prod.web.app | ✅ 204 |
| Preflight webapp | importCSV | ropi-aoss.web.app | ✅ 204 |
| Preflight dry-run | importDryRun | ropi-aoss-staging.web.app | ✅ 204 |

### Full Response Headers (staging origin)
```
HTTP/2 204 
access-control-allow-origin: https://ropi-aoss-staging.web.app
vary: Origin
access-control-allow-credentials: true
access-control-allow-methods: GET,POST,OPTIONS
access-control-allow-headers: Content-Type,Authorization,X-Requested-With
```

## Unit Test Results

```
✓ test/import.cors.test.ts (8)
  ✓ Preflight OPTIONS requests (5)
    ✓ should return 204 for OPTIONS request from allowed staging origin
    ✓ should return 204 for OPTIONS request from allowed production origin
    ✓ should set Access-Control-Allow-Origin header for staging origin
    ✓ should set Access-Control-Allow-Credentials header
    ✓ should set Access-Control-Allow-Methods header
  ✓ POST requests with CORS headers (1)
    ✓ should include CORS headers in POST response from staging origin
  ✓ importDryRun CORS (1)
    ✓ should return 204 for OPTIONS request to dry-run endpoint
  ✓ Requests without origin (1)
    ✓ should allow requests with no origin header
```

## Files Changed

| File | Lines Added | Lines Removed |
|------|-------------|---------------|
| packages/api/src/endpoints/import.ts | +40 | -6 |
| packages/api/src/index.ts | +2 | -2 |
| packages/api/test/import.cors.test.ts | +180 | 0 (new) |

## Next Steps

- [ ] Lisa approval for PR #325
- [ ] LP-3.0.1: Attribute update handler + AttributeManager client UX fixes
- [ ] LP-3.0.2: Product Editor defensive guards + optional migration

---
**LP-3.0.0 COMPLETE** ✅
