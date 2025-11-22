# Multipart Upload Issue in Cloud Functions

## Issue
Firebase Cloud Functions pre-consumes the request body stream (`req.readable: false`), causing multer/busboy to fail with "Unexpected end of form".

## Workaround
The JSON format works perfectly:
```bash
curl -X POST https://us-central1-ropi-bccee.cloudfunctions.net/api/api/attributes/propose-mapping \
  -H "Content-Type: application/json" \
  -d '{"csvData": "header1,header2,..."}' 
```

**Result:** ✅ `mappingsCount: 46` (as required)

## Frontend Compatibility
Frontend currently sends FormData. Options:
1. **Convert frontend to send JSON** (csvData as string) - immediate fix
2. **Use Cloud Storage** - upload file, pass path
3. **Research Firebase body-parser** bypass

## Decision
For v3.0.3 release: Use JSON format. Multipart can be revisited in future if needed.
