# LP-obs-studio-cleanup-1.7.0: GCS CORS Setup Instructions

## Overview

This document provides the steps to configure CORS (Cross-Origin Resource Sharing) for the Firebase/GCS storage bucket to allow image uploads from the staging web application.

## Prerequisites

1. **gcloud CLI** installed and authenticated with appropriate permissions
2. **gsutil** command available (comes with gcloud SDK)
3. Access to the Firebase project `ropi-bccee`

## Step 1: Create CORS Configuration File

Create a file named `cors.json` with the following content:

```json
[
  {
    "origin": [
      "https://ropi-aoss-staging.web.app",
      "https://ropi-aoss-staging--aoss-main-staging-66cwdo2b.web.app",
      "http://localhost:5173",
      "http://localhost:3000"
    ],
    "method": ["GET", "HEAD", "POST", "PUT", "DELETE", "OPTIONS"],
    "responseHeader": [
      "Content-Type",
      "Authorization",
      "X-Goog-Upload-Protocol",
      "X-Goog-Upload-Command",
      "X-Goog-Upload-Offset",
      "X-Goog-Upload-Header-Content-Length",
      "X-Goog-Upload-Content-Type",
      "X-Goog-Resumable",
      "Access-Control-Allow-Origin",
      "Access-Control-Allow-Methods",
      "Access-Control-Allow-Headers"
    ],
    "maxAgeSeconds": 3600
  }
]
```

## Step 2: Apply CORS Configuration

Run the following command to apply the CORS configuration to the storage bucket:

```bash
gsutil cors set cors.json gs://ropi-bccee.appspot.com
```

## Step 3: Verify CORS Configuration

Verify that the CORS rules were applied correctly:

```bash
gsutil cors get gs://ropi-bccee.appspot.com
```

Expected output should show the CORS configuration you just applied.

## Step 4: Test CORS Preflight

Test that CORS preflight requests work correctly:

```bash
curl -v -X OPTIONS \
  -H "Origin: https://ropi-aoss-staging.web.app" \
  -H "Access-Control-Request-Method: PUT" \
  -H "Access-Control-Request-Headers: Content-Type,Authorization" \
  "https://firebasestorage.googleapis.com/v0/b/ropi-bccee.appspot.com/o"
```

Expected response should include:
- `HTTP/1.1 200 OK`
- `Access-Control-Allow-Origin: https://ropi-aoss-staging.web.app`
- `Access-Control-Allow-Methods: ...PUT...`

## Troubleshooting

### CORS Errors Still Appearing

1. **Cache**: Browser may cache CORS responses. Clear browser cache or use incognito mode.
2. **Bucket Name**: Verify the bucket name is correct (`ropi-bccee.appspot.com`).
3. **Origin Mismatch**: Ensure the exact origin (including protocol and port) is in the CORS config.

### Permission Denied

Ensure you have the `storage.buckets.update` permission on the bucket. This typically requires:
- `roles/storage.admin` role, or
- `roles/storage.objectAdmin` with additional bucket permissions

### Verify Firebase Storage Rules

Ensure Firebase Storage rules allow authenticated uploads:

```javascript
rules_version = '2';
service firebase.storage {
  match /b/{bucket}/o {
    match /observations/{allPaths=**} {
      allow read: if request.auth != null;
      allow write: if request.auth != null;
    }
  }
}
```

## Adding New Origins

When deploying to new preview URLs or domains, add them to the `origin` array in `cors.json` and re-apply:

```bash
gsutil cors set cors.json gs://ropi-bccee.appspot.com
```

## References

- [Firebase Storage CORS Documentation](https://firebase.google.com/docs/storage/web/download-files#cors_configuration)
- [GCS CORS Configuration](https://cloud.google.com/storage/docs/configuring-cors)
- LP-obs-studio-cleanup-1.7.0 Implementation Plan
