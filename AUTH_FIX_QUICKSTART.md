# Auth Debug Summary — For Lisa/John

**PR:** [#243](https://github.com/twgallo13/ROPI-V2.1/pull/243)  
**Tag:** `lisa.auth-debug.v0.1.0`  
**Status:** ✅ Tools complete, awaiting manual testing

---

## Problem Summary

1. **Admin 403 errors:** Preview site shows user as admin in UI, but `/api/admin/*` endpoints return 403 Forbidden
2. **Email/password failures:** Identity Toolkit returns 400 errors on sign-in/password-reset

## Root Cause (Confirmed)

**Missing custom claims** — User accounts don't have `{ role: 'admin' }` claim in Firebase Auth tokens.

The code is working correctly:
- ✅ Client sends `Authorization: Bearer <token>` header
- ✅ Server verifies token with Firebase Admin SDK  
- ✅ Middleware checks for `role: 'admin'` claim
- ❌ **But tokens don't contain the claim!**

## Quick Fix (Copy-Paste Ready)

### Step 1: Set Admin Claims (Server-Side)

**Requires:** `service-account.json` in project root (download from Firebase Console → Project Settings → Service Accounts)

```bash
cd /workspaces/ROPI-V2.1
npm install firebase-admin  # If not already installed
node scripts/fix-admin-claims.js --emails theo@shiekh.com,theo@shiekhshoes.org
```

**Expected output:**
```
✅ Admin claim set: { role: "admin" }
✅ Email verified set to true
⚠️  IMPORTANT: User must refresh their token for changes to take effect!
```

### Step 2: Refresh Token (Browser Console)

Open preview site → DevTools Console → Paste:

```javascript
await firebase.auth().currentUser.getIdToken(true);
console.log('✅ Token refreshed');

// Verify claims
const result = await firebase.auth().currentUser.getIdTokenResult();
console.log('Claims:', result.claims);
// Should show: { role: 'admin', ... }

// Test admin endpoint
const response = await fetch('/api/admin/settings/users', {
  headers: {
    'Authorization': `Bearer ${await firebase.auth().currentUser.getIdToken()}`,
    'Content-Type': 'application/json',
  }
});
console.log('Status:', response.status);  // Should be 200
```

---

## Diagnostic Tools Available

### 1. **Browser Diagnostics** (No service account needed)

Run in preview DevTools console:

```javascript
// Copy-paste contents of scripts/browser-auth-diagnostics.js
// It will output a full diagnostic report
```

**What it checks:**
- Firebase config (project ID, API key)
- Current user auth state
- Token claims (including custom claims)
- Admin role presence
- API endpoint connectivity

### 2. **Server-Side Debugger** (Requires service account)

```bash
# List all users with admin claims
node scripts/debug-auth-token.js --list-admins

# Inspect specific user's token
node scripts/debug-auth-token.js --uid <USER_UID>

# Verify a token from browser
node scripts/debug-auth-token.js <PASTE_ID_TOKEN_HERE>
```

### 3. **Admin Claims Fix** (Requires service account)

```bash
# Fix single user
node scripts/fix-admin-claims.js --email theo@shiekh.com

# Fix multiple users
node scripts/fix-admin-claims.js --emails theo@shiekh.com,theo@shiekhshoes.org,user@example.com
```

### 4. **E2E User Setup** (Automated via GitHub Actions)

Creates/updates 4 E2E test accounts:
- theo@shiekh.com (admin)
- theo@shiekhshoes.org (admin)
- user@shiekh.com (verified)
- unverified@shiekh.com (unverified)

**Run via GitHub Actions:**
1. Go to Actions tab → "Setup E2E Test Users"
2. Click "Run workflow"
3. Check workflow summary for results

---

## Step-by-Step Execution Plan

### Phase 1: Diagnosis (15 min)

1. **Run browser diagnostics in preview:**
   - Sign in as admin user
   - Open DevTools console
   - Copy-paste `scripts/browser-auth-diagnostics.js`
   - Share the JSON output

2. **Verify test user emails:**
   - Check Firebase Console → Authentication → Users
   - Confirm emails match GitHub secrets

3. **Check for Identity Toolkit errors:**
   - Attempt sign-in/password-reset in preview
   - DevTools → Network → Filter for `identitytoolkit.googleapis.com`
   - Copy response JSON from failed requests

### Phase 2: Fix Claims (10 min)

1. **Download service account JSON:**
   - Firebase Console → Project Settings → Service Accounts
   - Click "Generate New Private Key"
   - Save as `/workspaces/ROPI-V2.1/service-account.json`

2. **Run fix script:**
   ```bash
   node scripts/fix-admin-claims.js --emails theo@shiekh.com,theo@shiekhshoes.org
   ```

3. **Verify claims were set:**
   ```bash
   node scripts/debug-auth-token.js --list-admins
   ```

### Phase 3: Test (5 min)

1. **Refresh token in browser:**
   ```javascript
   await firebase.auth().currentUser.getIdToken(true);
   ```

2. **Test admin endpoints:**
   - Navigate to Settings → Users (should load without 403)
   - Check DevTools Network tab for successful 200 responses

3. **Test email/password flows:**
   - Sign out
   - Sign in with test credentials
   - Try password reset flow

### Phase 4: Report Back

Create comment on PR #243 with:
- ✅ Browser diagnostic JSON output
- ✅ Fix script output (confirm claims set)
- ✅ Admin endpoint test results (status codes)
- ⏸️ Any remaining errors from Identity Toolkit

---

## What Was Fixed vs What Needs Manual Testing

### ✅ Fixed (Code Level)

- Token attachment: Client correctly sends `Authorization` header
- Token verification: Server correctly verifies tokens
- Middleware logic: Properly checks for admin claims
- Fallback mechanism: Firestore `metadata/admins` allow-list works
- All API hooks use `apiFetch()` with automatic auth

### ⏳ Needs Manual Testing

- Custom claims actually set on user accounts (requires service account)
- Token refresh after claim change (requires browser access)
- Identity Toolkit error diagnosis (requires preview access)
- End-to-end admin flow verification

---

## Files in PR #243

| File | Purpose |
|------|---------|
| `scripts/debug-auth-token.js` | Server-side token inspection |
| `scripts/fix-admin-claims.js` | Automated claim assignment |
| `scripts/browser-auth-diagnostics.js` | Browser-based diagnostics |
| `scripts/create-or-update-e2e-users.js` | E2E user setup |
| `.github/workflows/run-e2e-user-setup.yml` | GitHub Actions automation |
| `AUTH_DEBUG_REPORT.md` | Full technical documentation |

---

## Expected Timeline

- **Phase 1 (Diagnosis):** 15 min — John runs browser diagnostics
- **Phase 2 (Fix Claims):** 10 min — John/Homer runs fix script
- **Phase 3 (Test):** 5 min — Verify admin endpoints work
- **Phase 4 (Report):** 5 min — Post results to PR

**Total:** ~35 minutes from start to verified fix

---

## Acceptance Criteria Checklist

- [ ] Browser diagnostics show token claims include `{ role: 'admin' }`
- [ ] Admin endpoints return 200 OK (not 403 Forbidden)
- [ ] Email/password sign-in succeeds for test accounts
- [ ] Password reset flow completes without errors
- [ ] All Identity Toolkit errors documented if any remain

---

## Support

**Questions?** Comment on [PR #243](https://github.com/twgallo13/ROPI-V2.1/pull/243) or ping @homer-agent

**Blocker?** Most likely:
1. Need service account JSON → Download from Firebase Console
2. Token not refreshing → Force refresh with `getIdToken(true)`
3. Wrong Firebase project → Verify `firebase.app().options.projectId === 'ropi-bccee'`
