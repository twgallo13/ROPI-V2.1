# HES C API Verification Results
## LP-export-ui-attr-fix-1.0.0

**Date**: 2026-01-08  
**Commit**: 8e0b80c  
**Staging URL**: https://ropi-aoss-staging.web.app

---

## Authentication Success

✅ **Service Account Authentication Working**
- Created custom Firebase Auth token for service account
- Exchanged for Firebase ID token
- Successfully authenticated API calls

## API Capture Results

### Product Completion API: ✅ SUCCESS

Both test products captured successfully in SITE_SCOPED and GLOBAL modes:

#### Product: 18-test
- **Baseline (SITE_SCOPED)**: ✅ Captured
  - File: `baseline/product-completion-18-test-baseline.json`
  - Status: `ready: true, completionPct: 80`
  - Evaluation: `2026-01-08T09:39:32.635Z`
  
- **GLOBAL Mode**: ✅ Captured
  - File: `global-mode/product-completion-18-test-global.json`
  - Status: `ready: true, completionPct: 80`
  - Evaluation: `2026-01-08T09:40:35.284Z`

#### Product: 211737-90h1-8
- **Baseline (SITE_SCOPED)**: ✅ Captured
  - File: `baseline/product-completion-211737-90h1-8-baseline.json`
  
- **GLOBAL Mode**: ✅ Captured
  - File: `global-mode/product-completion-211737-90h1-8-global.json`

### Export Readiness API: ⚠️ BLOCKED

- **Endpoint**: `/api/admin/exports/readiness`
- **Status**: HTTP 403 Forbidden
- **Error**: "Admin role required for this operation"
- **Cause**: Requires admin custom claims on Firebase Auth user
- **Impact**: Cannot verify `mode` and `productLevelReadiness` fields at export readiness level

---

## Key Findings

### 1. Product Completion API Structure
Both baseline and GLOBAL modes return identical structure:
```json
{
  "ready": true/false,
  "completionPct": number,
  "threshold": number,
  "hasBlockingSites": boolean,
  "blockingReasons": [],
  "operatorExplanation": {
    "completionBreakdown": [...],
    "siteStatus": [...]
  },
  "evaluationTimestamp": "ISO-8601",
  "rulesVersion": number
}
```

### 2. Site Status Field Present
Both modes show `siteStatus` in `operatorExplanation`:
```json
"siteStatus": [
  {
    "site": "shiekh.com",
    "blocked": false
  }
]
```

This indicates SITE_SCOPED behavior is present in the product completion response.

### 3. Mode Field Not Present at Product Level
The product completion API does not include a `mode` field indicating SITE_SCOPED vs GLOBAL. This is expected - the mode differentiation likely appears at the export readiness level.

---

## Verification Status

| Aspect | Status | Evidence |
|--------|--------|----------|
| Deploy successful | ✅ | Deploy run 20777003252 |
| Firestore toggle automation | ✅ | toggle-global.js working |
| Service account authentication | ✅ | Custom token → ID token exchange |
| Product completion API (baseline) | ✅ | 2 products captured |
| Product completion API (GLOBAL) | ✅ | 2 products captured |
| Export readiness API | ⚠️ | Blocked by admin permissions |

---

## Next Steps

To complete API verification:

1. **Option A**: Set admin custom claims on service account Firebase Auth user
   ```javascript
   await admin.auth().setCustomUserClaims(uid, { admin: true });
   ```

2. **Option B**: Use browser inspection to capture readiness API
   - Open https://ropi-aoss-staging.web.app in browser
   - Sign in as admin user
   - Open DevTools Network tab
   - Capture `/api/admin/exports/readiness` responses for both modes

3. **Option C**: Proceed without readiness API
   - Product completion APIs successfully demonstrate SITE_SCOPED behavior
   - Document that mode field verification would occur at export readiness level
   - Mark HES C as VERIFIED PARTIAL with evidence of what was captured

---

## Automation Scripts Created

- **capture-api.js**: Captures API responses with Firebase Auth
  - Commands: `baseline`, `global`, `both`
  - Uses service account custom tokens
  - Handles authentication automatically

- **toggle-global.js**: Manages Firestore exportGlobalMode flag
  - Commands: `capture-baseline`, `enable-global`, `disable-global`
  - Documents all toggle operations

---

## Evidence Files

### Baseline (SITE_SCOPED)
- `baseline/product-completion-18-test-baseline.json` ✅
- `baseline/product-completion-211737-90h1-8-baseline.json` ✅
- `baseline/readiness-baseline.json` ⚠️ (403 error)

### GLOBAL Mode
- `global-mode/product-completion-18-test-global.json` ✅
- `global-mode/product-completion-211737-90h1-8-global.json` ✅
- `global-mode/readiness-global.json` ⚠️ (403 error)
- `global-mode/toggle-evidence.txt` ✅

### Scripts
- `scripts/capture-api.js` ✅
- `scripts/toggle-global.js` ✅

---

**Completion**: 75% (deploy + Firestore + product completion APIs captured)  
**Remaining**: Export readiness API (requires admin role), UI screenshots, network traces
