# Staging Verification — Token Generation Guide

## Overview
This guide provides multiple ways to obtain an admin ID token for staging endpoint verification.

## Option 1: Browser Console (Quickest ✨)

If you have access to the staging app in your browser:

1. Go to: https://ropi-aoss-staging.web.app
2. Sign in as: `theo@shiekh.com` (password from CI secrets or your records)
3. Open **DevTools** → **Console** tab
4. Copy-paste this command:

```javascript
await firebase.auth().currentUser.getIdToken(true).then(t => {
  console.log('TOKEN=' + t);
  copy(t);  // Copies to clipboard
})
```

5. Your token is now in the clipboard and printed in console
6. Paste it into the verification script below

## Option 2: Automated REST API (If you have password)

If you have the `E2E_ADMIN_PASSWORD` available:

```bash
# Step 1: Generate token
VITE_E2E_ADMIN_PASSWORD="<password>" node scripts/generate-admin-token-rest.js

# Step 2: Copy the full token output from the last line
# It should be a long JWT string like:
#   eyJhbGciOiJSUzI1NiIsImtpZCI6IjEyMyIsInR...
```

## Option 3: Via Helper Script (Recommended)

Combines both approaches:

```bash
# If you have password in environment
VITE_E2E_ADMIN_PASSWORD="<password>" bash scripts/run-verification-with-token.sh

# Or if you have a token already
TOKEN="<paste_token_here>" bash scripts/run-verification-with-token.sh
```

## Running Verification Tests

Once you have the token:

### Quick test (no log file):
```bash
TOKEN="<paste_token_here>" bash scripts/verify-staging-endpoints.sh
```

### With detailed output:
```bash
TOKEN="<paste_token_here>" bash scripts/verify-staging-endpoints.sh | tee verification-results.txt
```

## What Gets Tested

The verification script tests 4 endpoints:

| # | Endpoint | Auth | Expected Status | Purpose |
|---|----------|------|-----------------|---------|
| 1 | `GET /api/healthz` | None | `200` | Health check; confirms routing works |
| 2 | `GET /api/users/me` | Bearer token | `200` | User profile; tests auth |
| 3 | `GET /api/admin/settings/users` | Bearer token | `200` | Admin users list; requires admin role |
| 4 | `GET /api/admin/settings/roles` | Bearer token | `200` | Roles list; requires admin role |

## Expected Output

Each endpoint should return:
- **HTTP Status:** 200 OK
- **Content-Type:** application/json
- **Body:** Valid JSON (not HTML)

Example successful output:
```
HTTP/2 200
content-type: application/json; charset=utf-8
x-powered-by: Express

{"uid":"...", "email":"theo@shiekh.com", ...}
```

## Troubleshooting

### "401 Unauthorized"
- Token is expired or invalid
- Re-run `getIdToken(true)` to refresh
- Check `exp` claim in token: `console.log(new Date(decoded.exp * 1000))`

### "403 Forbidden"
- User lacks `admin` role
- Check custom claims: `firebase.auth().currentUser.getIdTokenResult()`
- Verify `customClaims.role === 'admin'`

### "404 / Cannot GET /api/..."
- Routing not working
- Check `/api/healthz` works first
- Verify firebase.json rewrites include `/api/**`

## Token Decoder (Safe for Local Use)

To inspect token claims locally in console:

```javascript
function decodeJwtPayload(token) {
  try {
    const b64 = token.split('.')[1];
    const pad = b64.length % 4 ? '='.repeat(4 - (b64.length % 4)) : '';
    const base64 = b64.replace(/-/g, '+').replace(/_/g, '/') + pad;
    const json = JSON.parse(atob(base64));
    return json;
  } catch (e) {
    console.error('Invalid JWT', e);
    return null;
  }
}

const token = 'eyJhbGc...';  // paste your token
const claims = decodeJwtPayload(token);
console.log('User ID:', claims.sub);
console.log('Email:', claims.email);
console.log('Role:', claims.custom_claims?.role);
console.log('Expires:', new Date(claims.exp * 1000));
```

## Files Generated

Scripts created for this verification:
- `scripts/verify-staging-endpoints.sh` — Main verification script
- `scripts/generate-admin-token-rest.js` — Token generator via REST API
- `scripts/run-verification-with-token.sh` — Helper wrapper
- `HOMER_STAGING_VERIFICATION_v2.0_REPORT.md` — Detailed report template

## CI Integration

For automated CI runs (GitHub Actions):
```yaml
- name: Get E2E Admin Password
  uses: gitleaks/gitleaks-action@v2
  env:
    E2E_ADMIN_PASSWORD: ${{ secrets.E2E_ADMIN_PASSWORD }}

- name: Generate Token and Run Verification
  run: |
    VITE_E2E_ADMIN_PASSWORD="$E2E_ADMIN_PASSWORD" \
    bash scripts/run-verification-with-token.sh
```

---

**Need help?** Check the staging verification report for more context:
- `HOMER_STAGING_VERIFICATION_v2.0_REPORT.md`
