# LP-1.2.2 — MPN 401 Fix Diagnostics

Artifacts and steps to reproduce, verify, and collect evidence for `/api/products/by-mpn/:mpn`.

## Reproduce via curl

Export the required env vars and run the helper script:

```
export FIREBASE_API_KEY="<your-web-api-key>"
export ADMIN_EMAIL="<admin-email>"
export ADMIN_PASSWORD="<admin-password>"
export MPN="ABC-12345"

# Optional overrides
# export STAGING_BASE="https://ropi-aoss-staging.web.app"
# export OUT_DIR="$(pwd)/docs/lisa/observations/LP-1.2.2"

./docs/lisa/observations/LP-1.2.2/repro-mpn-lookup.sh
```

Outputs:
- `docs/lisa/observations/LP-1.2.2/curl/signin.json` — Firebase sign-in response
- `docs/lisa/observations/LP-1.2.2/curl/by-mpn.<MPN>.headers.txt` — Response headers
- `docs/lisa/observations/LP-1.2.2/curl/by-mpn.<MPN>.body.json` — Response body

## Browser HAR capture

1. Open staging: `https://ropi-aoss-staging.web.app`
2. Sign in as admin via the Sign-In modal.
3. Navigate to the MPN scanner UI and perform a lookup.
4. In DevTools Network tab, enable “Preserve log” and “Record” and export HAR.
5. Save to: `docs/lisa/observations/LP-1.2.2/har/mpn-lookup.har`

Also capture:
- Screenshots: `docs/lisa/observations/LP-1.2.2/screenshots/`
- Console logs: `docs/lisa/observations/LP-1.2.2/console.txt`

## Notes

- Server handler: `packages/api/src/endpoints/products.ts#getProductByMpnHandler` is guarded by `requireAdmin`.
- Middleware logs 401/403 causes and token verification errors.
- Client fix implemented: `MobileMPNScanner.tsx` now includes `Authorization: Bearer <idToken>`.

## Next

- Inspect Cloud Functions logs for any 401/403 traces.
- If needed, add defensive logging around `verifyIdToken` and claim checks.
- Deploy and perform end-to-end verification.
