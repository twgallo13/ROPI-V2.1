# Deployment and Testing Guide for apiSmartDetect and apiValidate

This guide provides instructions for deploying and testing the Firebase Functions for smart detection and validation.

## Overview

The following functions are now configured with debug logging and proper Firebase Hosting rewrites:

- **apiSmartDetect**: Smart detection API endpoint
- **apiValidate**: Product validation API endpoint

## Firebase Hosting Rewrites

The `firebase.json` now includes the following rewrites:

```json
{ "source": "/apiSmartDetect", "function": "apiSmartDetect" }
{ "source": "/api/smart-detect", "function": "apiSmartDetect" }
{ "source": "/apiValidate", "function": "apiValidate" }
{ "source": "/api/validate", "function": "apiValidate" }
```

This allows both legacy (`/apiSmartDetect`) and new (`/api/smart-detect`) path patterns.

## Function Exports

Verify in `functions/src/index.ts`:

```typescript
export const apiSmartDetect = functions.https.onRequest(apiSmartDetectHandler);
export const apiValidate = functions.https.onRequest(apiValidateHandler);
```

The export names match the function names in `firebase.json` rewrites.

## Debug Logging

Both functions now include debug logging middleware at the top of their Express apps:

```typescript
app.use((req, res, next) => {
  console.log('HOSTING DEBUG - PATHS:', {
    originalUrl: req.originalUrl,
    url: req.url,
    path: req.path,
    method: req.method,
    headers: {
      host: req.headers.host,
      'x-forwarded-host': req.headers['x-forwarded-host'],
      'x-original-url': req.headers['x-original-url'] || null
    }
  });
  next();
});
```

This logs the exact path Firebase Hosting forwards to the function.

## Build and Deploy

### 1. Clean old builds (if needed)

```bash
cd functions
rm -rf lib
npm run build
```

### 2. Build functions

```bash
cd functions
npm run build
```

Verify the build succeeded and check that `functions/lib/apiSmartDetect.js` and `functions/lib/apiValidate.js` contain the debug logging middleware.

### 3. Deploy functions only

```bash
# Deploy specific functions
firebase deploy --only functions:apiSmartDetect,functions:apiValidate

# Or deploy all functions
firebase deploy --only functions
```

### 4. Deploy hosting

```bash
firebase deploy --only hosting
```

Or deploy both together:

```bash
firebase deploy --only functions,hosting
```

## Testing

### Test via Hosting URL (recommended)

Test using the public hosting URL to verify the rewrites work correctly:

```bash
# Test apiSmartDetect with legacy path
curl -i 'https://ropi-bccee.web.app/apiSmartDetect' \
  -X POST \
  -H 'Content-Type: application/json' \
  -d '{"productId":"TEST"}'

# Test apiSmartDetect with new path
curl -i 'https://ropi-bccee.web.app/api/smart-detect' \
  -X POST \
  -H 'Content-Type: application/json' \
  -d '{"productId":"TEST"}'

# Test apiValidate with legacy path
curl -i 'https://ropi-bccee.web.app/apiValidate' \
  -X POST \
  -H 'Content-Type: application/json' \
  -d '{"productId":"TEST"}'

# Test apiValidate with new path
curl -i 'https://ropi-bccee.web.app/api/validate' \
  -X POST \
  -H 'Content-Type: application/json' \
  -d '{"productId":"TEST"}'
```

### Check Function Logs

After making a request, check the function logs to see the debug output:

```bash
# View apiSmartDetect logs
firebase functions:log --only apiSmartDetect --limit 50

# View apiValidate logs
firebase functions:log --only apiValidate --limit 50

# Or use grep to find the debug messages
firebase functions:log --only apiSmartDetect --limit 50 | grep "HOSTING DEBUG"
```

### Expected Log Output

You should see log entries like:

```
HOSTING DEBUG - PATHS: {
  originalUrl: '/',
  url: '/',
  path: '/',
  method: 'POST',
  headers: {
    host: 'us-central1-ropi-bccee.cloudfunctions.net',
    'x-forwarded-host': 'ropi-bccee.web.app',
    'x-original-url': null
  }
}
```

The `originalUrl` field shows the exact path the function receives. If it's `/`, that means Firebase Hosting correctly strips the path prefix before forwarding.

### Test Direct Function URL (alternative)

You can also test the functions directly without going through hosting:

```bash
# Get the function URL
firebase functions:list

# Test directly (replace with actual URL)
curl -i 'https://us-central1-ropi-bccee.cloudfunctions.net/apiSmartDetect' \
  -X POST \
  -H 'Content-Type: application/json' \
  -d '{"productId":"TEST"}'
```

## Troubleshooting

### 404 Errors

If you get 404 errors:

1. Verify the function is deployed:
   ```bash
   firebase functions:list
   ```

2. Check that the rewrite exists in `firebase.json`

3. Verify the export name in `functions/src/index.ts` matches the function name in the rewrite

4. Ensure hosting is deployed after updating `firebase.json`:
   ```bash
   firebase deploy --only hosting
   ```

### Function Logs Show Wrong Path

If the debug logs show an unexpected path:

1. The `originalUrl` field shows what the function receives
2. If it contains `/apiSmartDetect` or `/api/smart-detect`, the rewrite isn't stripping the prefix correctly
3. The Express route is `app.post('/', ...)` which expects the path to be `/`
4. Firebase Hosting should strip the matched prefix before forwarding

### Stale Build Issues

If changes don't appear:

1. Clean and rebuild:
   ```bash
   cd functions
   rm -rf lib
   npm run build
   ```

2. Redeploy:
   ```bash
   firebase deploy --only functions
   ```

3. Check the compiled JS matches the source:
   ```bash
   head -80 functions/lib/apiSmartDetect.js | grep "HOSTING DEBUG"
   ```

## Route Registration Summary

Both `apiSmartDetect` and `apiValidate` use Express with a single POST route:

```typescript
app.post('/', async (req, res) => {
  // Handler code
});
```

This means:
- The function expects to receive requests at the root path `/`
- Firebase Hosting rewrites strip the matched prefix before forwarding
- `/apiSmartDetect` → forwards to function at `/`
- `/api/smart-detect` → forwards to function at `/`

## Next Steps

1. Deploy the functions and hosting
2. Test both path patterns via the hosting URL
3. Check the function logs for the debug output
4. Verify the `originalUrl` shows `/` (indicating proper rewrite stripping)
5. If issues persist, paste the debug log output for further diagnosis
