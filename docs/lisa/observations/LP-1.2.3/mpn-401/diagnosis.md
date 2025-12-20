# LP-1.2.3: MPN 401 Diagnosis

## Issue Summary

The `/api/products/by-mpn/:mpn` endpoint returns HTTP 401 because the client (`MobileMPNScanner.tsx`) does not send an `Authorization: Bearer <token>` header.

## Evidence

### curl test (no auth):
```
$ curl -i "https://ropi-aoss-staging.web.app/api/products/by-mpn/123"
HTTP/2 401
{"error":"Unauthorized","message":"Valid authentication token required"}
```

### Client Code (MobileMPNScanner.tsx lines 67-79):
```tsx
const lookupProduct = useCallback(async (mpn: string): Promise<ScannedProduct | null> => {
  // ...
  const response = await fetch(`${apiBaseUrl}/products/by-mpn/${encodeURIComponent(cleanMpn)}`, {
    credentials: 'include',  // ← Only sends cookies, NOT Authorization header
  });
  // ...
}, [apiBaseUrl]);
```

### Server Code (products.ts line 326):
```ts
export async function getProductByMpnHandler(req: Request, res: Response) {
  await requireAdmin(req, res, async () => {  // ← Requires admin auth
    // ...
  });
}
```

### Auth Middleware (auth.ts lines 150-183):
```ts
export async function requireAdmin(req, res, next) {
  const auth = await verifyAuthToken(req);  // ← Requires Bearer token
  
  if (!auth) {
    res.status(401).json({
      error: 'Unauthorized',
      message: 'Valid authentication token required',
    });
    return;
  }
  // ...
}
```

## Root Cause

The `MobileMPNScanner.tsx` component uses `credentials: 'include'` which only sends cookies. Firebase Auth uses Bearer tokens, not cookies, so the auth middleware returns 401.

## Fix Required

Update `MobileMPNScanner.tsx` to use `getAuthHeaders()` from `@/lib/authHeaders` to include the Authorization header in fetch requests.

## Fix Pattern

```tsx
import { getAuthHeaders } from '@/lib/authHeaders';

const lookupProduct = useCallback(async (mpn: string): Promise<ScannedProduct | null> => {
  // ...
  const headers = await getAuthHeaders();  // ← Get Bearer token
  const response = await fetch(url, { headers });  // ← Include in request
  // ...
}, []);
```
