# LP-phase2b-001: Staging Infrastructure Discovery Report

**Date:** 2026-01-09  
**Status:** ✅ STAGING_HOST DISCOVERED — ⏸️ AWAITING STAGING_API_TOKEN

---

## ✅ DISCOVERED: Staging Infrastructure

### 1. STAGING_HOST (Found)
```bash
export STAGING_HOST="ropi-aoss-staging.web.app"
```

**Source:** `.github/workflows/deploy-staging.yml` line 2
- Stable staging site: https://ropi-aoss-staging.web.app
- Deploys from `aoss-main` branch
- Firebase Hosting target

**Confirmation:**
- ✅ Workflow deploys to this URL
- ✅ E2E tests reference this URL (`.github/workflows/e2e-smoke.yml`, `.github/workflows/e2e-tests.yml`)
- ✅ Browser testing instructions confirm: `https://ropi-aoss-staging.web.app`

### 2. PREVIEW_URL (Same as STAGING_HOST)
```bash
export PREVIEW_URL="https://ropi-aoss-staging.web.app"
```

**Note:** UI is served on same host as API.

### 3. Test Credentials (Provided by Lisa)
```bash
export VITE_E2E_ADMIN_EMAIL="theo@shiekh.com"
export VITE_E2E_ADMIN_PASSWORD="Admin@1234"
```

**Status:** ✅ SET in environment

---

## 🚫 BLOCKED: STAGING_API_TOKEN Required

**Attempted Product Discovery:**
```bash
curl -sS "https://ropi-aoss-staging.web.app/api/products?limit=50" \
  -H "Accept: application/json"
```

**Response:**
```json
{
  "error": "INVALID_AUTH_TOKEN",
  "reason": "missing_or_invalid_token",
  "message": "Valid authentication token required. Include Authorization: Bearer <token> header or __session cookie."
}
```

**Conclusion:** API requires bearer token authentication. Cannot discover product IDs without valid token.

---

## 🔑 STAGING_API_TOKEN: Where to Get It

### Option 1: GitHub Actions Secrets (Recommended)
Check if token already exists in CI:
```bash
gh secret list --repo twgallo13/ROPI-V2.1 | grep STAGING
```

If `STAGING_API_TOKEN` exists, retrieve it:
```bash
# In CI workflow, it's available as ${{ secrets.STAGING_API_TOKEN }}
# For local use, you need to retrieve it from the secret store
```

### Option 2: Firebase Auth Token (Generate from Staging)
If staging uses Firebase Auth:
```bash
# Sign in to staging with admin credentials
# Extract ID token from browser DevTools:
# 1. Open https://ropi-aoss-staging.web.app
# 2. Sign in as theo@shiekh.com / Admin@1234
# 3. Open DevTools → Application → Local Storage
# 4. Find Firebase auth token
# 5. Copy ID token value

export STAGING_API_TOKEN="<id-token-from-browser>"
```

### Option 3: Service Account Token (Firebase)
```bash
# If you have GCP_SA_KEY_BASE64 secret, decode and use it
# to generate a service account token
```

### Option 4: Use Playwright to Extract Token
I can create a script that:
1. Uses Playwright to sign in to staging
2. Extracts the Firebase ID token from localStorage
3. Uses it for API calls

Would you like me to create this script?

---

## 📋 Next Steps Once Token Provided

### Step 1: Discover Real Product IDs
```bash
# Set token
export STAGING_API_TOKEN="<your-token>"

# List products
curl -sS "https://ropi-aoss-staging.web.app/api/products?limit=200" \
  -H "Authorization: Bearer $STAGING_API_TOKEN" \
  -H "Accept: application/json" \
  -o inventory/LP-phase2b-001/evidence/staging_products_list.json

# Extract first 20 IDs
jq -r '.[0:20] | .[] | .id' inventory/LP-phase2b-001/evidence/staging_products_list.json > /tmp/sample_ids.txt

# Check completion for each
while read id; do
  curl -sS "https://ropi-aoss-staging.web.app/api/products/$id/completion" \
    -H "Authorization: Bearer $STAGING_API_TOKEN" \
    -H "Accept: application/json" \
    -o "inventory/LP-phase2b-001/evidence/api_product_${id}.json"
  
  # Display summary
  jq -r '{id:.product_id, mpn:.productIdentifiers.mpn, pct:.completion_result.completionPct, status:.completion_result.status}' \
    inventory/LP-phase2b-001/evidence/api_product_${id}.json
done < /tmp/sample_ids.txt
```

### Step 2: Pick 3 Products with Different States
From the output, select:
- **READY:** completionPct >= 80
- **PARTIAL:** 40 <= completionPct < 80
- **BLOCKED:** completionPct < 40

### Step 3: Update Scripts with Real IDs
If discovered IDs differ from product-0001/0004/0007, I will update:
- `scripts/verify-api-mpn.sh`
- `scripts/run_export_gate_three_times.sh`
- `scripts/run_stability_check.js`
- `packages/web/e2e/completion-mpn-display.spec.ts`

### Step 4: Execute Full Verification Sequence
Run all 7 steps as specified by Lisa.

---

## 🛠️ Alternative: Create Token Extraction Script

If you cannot provide a token directly, I can create a Playwright script that:

1. Navigates to https://ropi-aoss-staging.web.app
2. Signs in as theo@shiekh.com / Admin@1234
3. Extracts Firebase ID token from localStorage
4. Saves to environment variable
5. Uses it for all subsequent API calls

**Script location:** `scripts/extract-staging-token.js`

Would you like me to create this? It's a common pattern for E2E testing against Firebase-authenticated APIs.

---

## 📊 Current Readiness Status

| Component | Status | Details |
|-----------|--------|---------|
| STAGING_HOST | ✅ FOUND | `ropi-aoss-staging.web.app` |
| PREVIEW_URL | ✅ FOUND | Same as STAGING_HOST |
| Test Credentials | ✅ SET | theo@shiekh.com credentials in env |
| STAGING_API_TOKEN | 🚫 MISSING | Cannot discover products without it |
| Product IDs | ⏸️ PENDING | Will discover after token provided |

---

## 🚀 Ready to Proceed When...

**Lisa/Operator provides ONE of:**

1. **STAGING_API_TOKEN directly** (preferred if available in CI secrets)
   ```bash
   export STAGING_API_TOKEN="<token>"
   ```

2. **Approval to create token extraction script** (if token not available)
   - I'll create `scripts/extract-staging-token.js`
   - It will use Playwright to sign in and extract Firebase token
   - Then use that token for all API calls

3. **Product IDs directly** (if you already know 3 suitable products)
   - Provide 3 product IDs with their completion percentages
   - I'll update all scripts and proceed

**Once any of the above is provided, I can execute the full verification sequence immediately.**

---

**Current Commit:** 0d7805e  
**Branch:** feature/lp-phase2b-001-ui-export-gate
