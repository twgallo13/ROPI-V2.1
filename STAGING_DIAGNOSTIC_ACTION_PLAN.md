# STAGING DIAGNOSTIC & ACTION PLAN

**Date:** January 3, 2026  
**Context:** Export Gate UI deployment verification

---

## 🔍 PROMPT A: Backend 423 Status

### What We Know

✅ **Code is merged to aoss-main:**
- PR #430 merged on 2026-01-03 14:57:07Z
- SHA: `1993b74`
- File: [packages/api/src/endpoints/export.ts](packages/api/src/endpoints/export.ts)

✅ **423 Implementation Confirmed:**
```typescript
// Lines 62-77 in export.ts
const readinessResult = await calculateCompletionDrivenExportReadiness(undefined, false, evaluatedAt);

if (!readinessResult.ready) {
  res.status(423).json({
    success: false,
    error: 'EXPORT_BLOCKED_COMPLETION_GATE',
    message: 'Export blocked by completion requirements',
    readiness: readinessResult
  });
  return;
}
```

### ⚠️ Cannot Test Without Auth

**Staging endpoint:** `https://ropi-aoss-staging.web.app/api/admin/exports/dry-run`

**To test manually:**

```bash
# Get auth token from staging
# (Login to https://ropi-aoss-staging.web.app, open DevTools > Application > Local Storage > firebase_token)

curl -X POST https://ropi-aoss-staging.web.app/api/admin/exports/dry-run \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN_HERE" \
  -d '{
    "site": "shiekh",
    "limit": 5,
    "format": "ro_csv"
  }' | jq .
```

**Expected responses:**

**If completion blocks (423):**
```json
{
  "success": false,
  "error": "EXPORT_BLOCKED_COMPLETION_GATE",
  "message": "Export blocked by completion requirements",
  "readiness": {
    "ready": false,
    "completionPct": 75,
    "threshold": 80,
    "hasBlockingSites": false,
    "blockingReasons": [
      {
        "type": "COMPLETION_BELOW_THRESHOLD",
        "severity": "BLOCKING",
        "message": "Product prod-xyz: 75% < 80%",
        "details": {
          "productId": "prod-xyz",
          "currentCompletion": 75,
          "requiredCompletion": 80,
          "segmentId": "description-seo",
          "site": "shiekh"
        }
      }
    ],
    "operatorExplanation": {
      "summary": "Export blocked: 3 products below 80% threshold",
      "blockingIssues": [
        "prod-xyz: Missing description for shiekh",
        "prod-abc: Missing SEO keywords for karmaloop"
      ],
      "siteStatus": [
        {
          "site": "shiekh",
          "blocked": true,
          "reason": "3 products incomplete"
        }
      ],
      "completionBreakdown": [
        {
          "segmentId": "description-seo",
          "segmentName": "Description & SEO",
          "score": 75,
          "weightPct": 60,
          "missingAttributes": ["description", "seo_keywords"]
        }
      ],
      "actionRequired": [
        "Add description for 3 products",
        "Add SEO keywords for 2 products"
      ]
    },
    "catalogStats": {
      "totalProducts": 100,
      "readyCount": 92,
      "blockedByCompletionCount": 3,
      "blockedBySiteCount": 5
    },
    "evaluationTimestamp": "2026-01-03T21:30:00.000Z"
  }
}
```

**If completion passes (200):**
```json
{
  "success": true,
  "exportedProducts": 5,
  "data": [...],
  "metadata": {...}
}
```

### ✅ Verification Checklist

- [ ] **Functions deployed:** Check `firebase functions:list --project ropi-aoss-staging`
- [ ] **API function exists:** Should see `api(us-central1)` in list
- [ ] **Test endpoint:** Use curl command above with valid token
- [ ] **Verify 423 response:** Should match expected structure
- [ ] **Verify 200 response:** Should export successfully if no blocks

---

## 🔍 PROMPT B: Firestore Configuration

### What We Need to Check

**Document path:** `settings/exportSettings/completionRules`

### ⚠️ Cannot Access Without Credentials

**To check manually:**

#### Option 1: Firebase Console
1. Go to: https://console.firebase.google.com/project/ropi-aoss-staging/firestore
2. Navigate to: `settings` → `exportSettings` → `completionRules`
3. Verify document exists

#### Option 2: CLI Script
```bash
# Set credentials
export GOOGLE_APPLICATION_CREDENTIALS=/path/to/ropi-aoss-staging-service-account.json

# Run checker
node check-firestore-rules.mjs
```

### Expected Document Structure

**If EXISTS, should have these keys:**
```json
{
  "schemaVersion": "1.0.0",
  "rulesVersion": 1,
  "exportUnlockThresholdPct": 80,
  "segments": [
    {
      "id": "description-seo",
      "name": "Description & SEO",
      "enabled": true,
      "weightPct": 60,
      "ruleType": "ALL_REQUIRED",
      "appliesTo": {
        "mode": "SELECTED_SITES",
        "sites": ["shiekh", "karmaloop", "mltd"]
      },
      "attributeSelector": {
        "source": "REGISTRY",
        "categories": [],
        "requirementFlag": "required",
        "siteAware": true
      }
    },
    {
      "id": "media",
      "name": "Media Assets",
      "enabled": true,
      "weightPct": 40,
      "ruleType": "ALL_REQUIRED",
      "appliesTo": {
        "mode": "SELECTED_SITES",
        "sites": ["shiekh", "karmaloop", "mltd"]
      },
      "attributeSelector": {
        "source": "REGISTRY",
        "categories": [],
        "requirementFlag": "required",
        "siteAware": true
      }
    }
  ],
  "builtInSegments": {
    "media": {
      "segmentId": "media",
      "lockedSemantics": {
        "affectsCompletion": false,
        "reason": "Governance policy: Media never blocks export"
      }
    },
    "pricing": {
      "segmentId": "pricing",
      "lockedSemantics": {
        "affectsCompletion": false,
        "reason": "Governance policy: Pricing never blocks export"
      }
    }
  },
  "exclusions": {
    "media": {
      "affectsCompletion": false,
      "reason": "Governance policy: Media never blocks export"
    },
    "pricing": {
      "affectsCompletion": false,
      "reason": "Governance policy: Pricing never blocks export"
    }
  },
  "updatedAt": "2026-01-03T21:30:00.000Z",
  "updatedBy": "admin@example.com"
}
```

### If Document is MISSING

**Option A: Create via Firestore Console** (Recommended)
1. Navigate to Firestore → `settings/exportSettings`
2. Create document with ID: `completionRules`
3. Paste the JSON structure above (adjust dates/email)

**Option B: Create via Export Settings UI** (After PR #432 merged)
1. Merge PR #432
2. Deploy to staging
3. Navigate to: `https://ropi-aoss-staging.web.app/settings/export-settings`
4. UI will show "No completion rules configured"
5. Configure and save → Creates document automatically

### ✅ Verification Checklist

- [ ] **Document exists:** Verify in Firestore console
- [ ] **Has all required keys:** schemaVersion, rulesVersion, threshold, segments, etc.
- [ ] **Segments configured:** At least 1 enabled segment
- [ ] **Weights sum to 100%:** For enabled segments only
- [ ] **Exclusions present:** Media and pricing marked as non-blocking

---

## 🔍 PROMPT C: UI Deployment Status

### Current Status

❌ **UI NOT merged to aoss-main**

### What Happened

1. **PR #430** (Backend) merged on 2026-01-03 14:57:07Z
   - Included: API endpoints, 423 logic, completion service
   - Did NOT include: UI artifacts

2. **UI artifacts** created later on branch `feat/export-gate-enforcement`
   - ExportSettingsPage.tsx + CSS
   - ExportBlockedModal.tsx + CSS
   - CompletionExportGatePanel.tsx + CSS
   - Modified routing files

3. **PR #432** created from new branch `feat/export-gate-ui-artifacts`
   - Link: https://github.com/twgallo13/ROPI-V2.1/pull/432
   - Status: Open, awaiting review
   - Files: 10 changed, +2831 insertions, -15 deletions

### Why Placeholder Still Shows

**Current aoss-main** has this placeholder:

```typescript
// File: packages/web/src/pages/settings/SettingsSubPage.tsx
// Lines ~50-60 (aoss-main)

if (section === 'export-settings') {
  return (
    <div style={{ padding: '20px' }}>
      <h2>Export Settings</h2>
      <p>Export settings configuration coming soon...</p>
    </div>
  );
}
```

**PR #432** replaces it with:

```typescript
import ExportSettingsPage from './ExportSettingsPage';

// ...

if (section === 'export-settings') {
  return <ExportSettingsPage />;
}
```

### Action Required

#### Step 1: Review & Merge PR #432
```bash
# Review at: https://github.com/twgallo13/ROPI-V2.1/pull/432

# Or via CLI:
gh pr view 432
gh pr checks 432  # Wait for CI to pass
gh pr merge 432 --squash  # Or --merge or --rebase
```

#### Step 2: Deploy to Staging

**Backend (if not already deployed):**
```bash
firebase deploy --only functions --project ropi-aoss-staging
```

**Frontend:**
```bash
# Build web package
cd packages/web
pnpm build

# Deploy hosting
cd ../..
firebase deploy --only hosting:aoss-staging --project ropi-aoss-staging
```

**Or deploy both:**
```bash
firebase deploy --project ropi-aoss-staging
```

#### Step 3: Verify Deployment

**Check functions:**
```bash
firebase functions:list --project ropi-aoss-staging
```

Should see:
- `api(us-central1)` — Main API handler
- `importCSV(us-central1)` — CSV import
- `importDryRun(us-central1)` — Dry run import

**Check hosting:**
```bash
firebase hosting:channel:list --project ropi-aoss-staging
```

Should show live channel with recent deployment.

#### Step 4: Test UI on Staging

**Test 1: Export Settings Page**
```
URL: https://ropi-aoss-staging.web.app/settings/export-settings

Expected:
✅ Full Export Settings UI (not placeholder)
✅ Shows current Firestore rules (or "No rules configured")
✅ Can edit threshold, weights, segments
✅ Save button persists changes to Firestore
```

**Test 2: Export 423 Modal**
```
URL: https://ropi-aoss-staging.web.app/exports

Steps:
1. Click "Start Export"
2. If products incomplete → Should see 423 modal
3. Modal shows:
   - Red header "Export Blocked"
   - Summary of why blocked
   - Site status
   - Segment breakdown
   - Action items
4. Click "Go to Completion Settings" → Navigates to /settings/export-settings
```

**Test 3: Product Editor Completion Panel**
```
URL: https://ropi-aoss-staging.web.app/products/{any-product-id}

Expected:
✅ Sidebar shows "Completion / Export" panel (first panel)
⚠️ Will show "Failed to load" error until backend endpoint implemented
✅ Panel structure visible (completion bar, status badge, sections)
```

### ✅ Verification Checklist

- [ ] **PR #432 merged** to aoss-main
- [ ] **Functions deployed** to staging
- [ ] **Hosting deployed** to staging (from updated aoss-main)
- [ ] **Settings page** shows real UI (not placeholder)
- [ ] **Export 423 modal** appears when export blocked
- [ ] **Product panel** visible in editor (error is expected)

---

## 📋 Complete Deployment Workflow

### Prerequisites
- [ ] Firebase CLI installed: `npm i -g firebase-tools`
- [ ] Logged in: `firebase login`
- [ ] Access to `ropi-aoss-staging` project

### Full Deployment Script

```bash
#!/bin/bash
set -e

echo "🚀 Deploying Export Gate UI to Staging"
echo ""

# 1. Ensure on aoss-main with latest
echo "📥 Fetching latest aoss-main..."
git fetch origin aoss-main
git checkout aoss-main
git pull origin aoss-main

# 2. Verify PR #432 is merged
if ! git log --oneline -1 | grep -q "Operator-Facing UI"; then
  echo "⚠️  PR #432 not yet merged. Please merge first:"
  echo "   https://github.com/twgallo13/ROPI-V2.1/pull/432"
  exit 1
fi

# 3. Install dependencies
echo "📦 Installing dependencies..."
pnpm install

# 4. Build packages
echo "🔨 Building packages..."
pnpm --filter @ropi-aoss/api build
pnpm --filter @ropi-aoss/web build

# 5. Deploy to staging
echo "🚀 Deploying to staging..."
firebase deploy --project ropi-aoss-staging

echo ""
echo "✅ Deployment complete!"
echo ""
echo "🧪 Test at:"
echo "   Settings: https://ropi-aoss-staging.web.app/settings/export-settings"
echo "   Exports:  https://ropi-aoss-staging.web.app/exports"
echo "   Product:  https://ropi-aoss-staging.web.app/products/{id}"
```

Save as `deploy-staging.sh`, then:
```bash
chmod +x deploy-staging.sh
./deploy-staging.sh
```

---

## 🎯 Summary: What You Need to Do

### PROMPT A (Backend 423)
1. Run: `firebase functions:list --project ropi-aoss-staging`
2. Verify `api` function exists
3. Test endpoint with curl + valid token
4. Confirm 423 response structure matches expected

### PROMPT B (Firestore Config)
1. Open Firebase Console: https://console.firebase.google.com/project/ropi-aoss-staging/firestore
2. Navigate to: `settings/exportSettings/completionRules`
3. Verify document exists with required keys
4. If missing: Create using template above

### PROMPT C (UI Deployment)
1. Merge PR #432: https://github.com/twgallo13/ROPI-V2.1/pull/432
2. Deploy to staging: `firebase deploy --project ropi-aoss-staging`
3. Test `/settings/export-settings` → Should show real UI
4. Test export blocking → Should show 423 modal

---

**All documentation:**
- [STAGING_VERIFICATION_REPORT.md](STAGING_VERIFICATION_REPORT.md)
- [UI_ARTIFACTS_IMPLEMENTATION_SUMMARY.md](UI_ARTIFACTS_IMPLEMENTATION_SUMMARY.md)
- [check-firestore-rules.mjs](check-firestore-rules.mjs) — Firestore checker script

**PR to merge:** https://github.com/twgallo13/ROPI-V2.1/pull/432
