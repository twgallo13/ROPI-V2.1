# Staging Setup for Sign-In & API Testing
**Task: lisa.add-auth-domains.v0.7.3**

---

## Status Summary

**✅ Completed (Homer):**
- PR #245 merged into `aoss-main` (commit `7be5a59`)
- Staging deployment successful (GitHub Actions workflow 20085864245)
- CORS configured in backend (`cors({ origin: true })` in `packages/api/src/apiApp.ts`)
- Firebase client config points to `ropi-bccee` project (default fallback in code)

**⚠️ Manual Action Required (Lisa/Admin):**
1. Firebase Console: Add authorized domains
2. GitHub Secrets: Set E2E admin passwords
3. Verify signing domain matches Firebase config

---

## 1️⃣ Firebase Console — Authorized Domains

**Project:** `ropi-bccee` (Staging)

**Step-by-step:**
1. Go to [Firebase Console](https://console.firebase.google.com) → Select `ropi-bccee`
2. Click **Authentication** in left menu
3. Click **Settings** (gear icon) at top
4. Scroll to **Authorized domains**
5. Click **Add domain** and add these three:
   - `ropi-aoss-staging.web.app` (primary staging domain)
   - `ropi-aoss-staging.firebaseapp.com` (fallback)
   - `ropi-aoss-staging--pr-188-fourjk06.web.app` (preview — optional but helpful for John)

**Why:** Firebase Auth rejects sign-in requests from unregistered domains with `CORS error` or `identitytoolkit error`.

---

## 2️⃣ GitHub Secrets — E2E Admin Passwords

**Your options:**

### Option A: Set Secrets in GitHub (If you have admin access)
1. Go to https://github.com/twgallo13/ROPI-V2.1/settings/secrets/actions
2. Click **New repository secret** and add:
   ```
   E2E_ADMIN_PASSWORD = <password for theo@shiekh.com>
   E2E_USER_PASSWORD = <password for user@shiekh.com>
   E2E_UNVERIFIED_PASSWORD = <password for unverified@shiekh.com>
   ```
3. These will be injected into the staging build at deploy time (GitHub Actions references: `secrets.E2E_ADMIN_PASSWORD`, etc.).

### Option B: Send Privately to John
- Generate or retrieve the passwords from your password manager
- Send them **privately** to John (not in PR comments, not in Slack channel)
- John can set them locally in `.env` for testing

**Current State:** Passwords are **NOT** set in repo secrets (403 error when checking).
- Staging build falls back to placeholder values from `.env.e2e.example`
- Sign-in will fail unless secrets `E2E_ADMIN_PASSWORD`, `E2E_USER_PASSWORD`, `E2E_UNVERIFIED_PASSWORD` are set OR John uses actual staging passwords

---

## 3️⃣ Backend & Frontend Verification

### Backend CORS ✅
```typescript
// packages/api/src/apiApp.ts, line 71
app.use(cors({ origin: true }));
```
**Result:** API allows requests from any origin (staging origin is permitted).

### Frontend Firebase Config ✅
```typescript
// packages/web/src/firebaseConfig.ts
const firebaseConfig = {
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || 'ropi-bccee',
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || 'ropi-bccee.firebaseapp.com',
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || 'AIzaSyDummy_ReplaceInProduction',
  // ...
};
```
**Default:** Points to `ropi-bccee` (staging project) ✅
**Deployed:** Staging build injects `VITE_FIREBASE_*` secrets from GitHub Actions (see `.github/workflows/deploy-staging.yml` lines 54-59)

### Hosting & Rewrite Rules ✅
```json
{
  "target": "aoss-staging",
  "public": "packages/web/dist",
  "rewrites": [
    { "source": "/api/**", "function": "api" },
    { "source": "**", "destination": "/index.html" }
  ]
}
```
**Result:** `/api/*` routes to Cloud Function, frontend routes to SPA. ✅

---

## 4️⃣ Signing Domain Verification

**Issue John reported:** "App cannot obtain an ID token (no token found in storage)"

**Root cause:** Sign-in may be failing due to unauthorized domain OR invalid Firebase config.

**Checklist:**
- [ ] User visiting `https://ropi-aoss-staging.web.app` (NOT a preview PR domain)
- [ ] Domain `ropi-aoss-staging.web.app` is in Firebase Console Authorized Domains
- [ ] No CORS error in browser console (should see sign-in modal)
- [ ] Check browser DevTools → Network tab for sign-in POST requests
- [ ] Check Firebase Console → Authentication → Sign-in method → Email/Password enabled

**Browser Console Diagnostic:**
```javascript
// Open DevTools console on https://ropi-aoss-staging.web.app and run:
firebase.auth().getRedirectResult().then(r => {
  console.log('Auth state:', r);
  console.log('Current user:', firebase.auth().currentUser);
  console.log('Errors:', r.user ? 'None' : r);
});
```

---

## 5️⃣ Testing After Setup (John's Steps)

Once secrets are set and domains are added:

### Step 1: Sign In to Staging
1. Visit **https://ropi-aoss-staging.web.app**
2. Sign in as `theo@shiekh.com` with the admin password
3. You should see the app load (no CORS/auth errors)

### Step 2: Verify Admin Claims
**In browser console:**
```javascript
firebase.auth().currentUser.getIdTokenResult().then(r => {
  console.log('Claims:', r.claims);
  console.log('Has role:admin?', r.claims.role === 'admin');
});
```
**Expected:** `{ role: 'admin', ... }`

### Step 3: Test Admin Endpoints

**A) List Users:**
```bash
curl -H "Authorization: Bearer <YOUR_ID_TOKEN>" \
  https://ropi-aoss-staging.web.app/api/admin/settings/users
```
**Expected:** `HTTP 200` with JSON user list

**B) Create User (Canonical Role):**
```bash
curl -X POST https://ropi-aoss-staging.web.app/api/admin/settings/users \
  -H "Authorization: Bearer <YOUR_ID_TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test-canonical@shiekh.com",
    "password": "TempPass123",
    "role": "viewer"
  }'
```
**Expected:** `HTTP 201` with JSON user object

**C) Create User (Human Label):**
```bash
curl -X POST https://ropi-aoss-staging.web.app/api/admin/settings/users \
  -H "Authorization: Bearer <YOUR_ID_TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test-label@shiekh.com",
    "password": "TempPass123",
    "role": "Merchandise Manager"
  }'
```
**Expected:** `HTTP 201` with `role: "merch"` (normalized)

**D) Delete User:**
```bash
curl -X DELETE https://ropi-aoss-staging.web.app/api/admin/settings/users/<uid> \
  -H "Authorization: Bearer <YOUR_ID_TOKEN>"
```
**Expected:** `HTTP 204` (no body, no "API not configured" error)

---

## 6️⃣ Troubleshooting

### "Sign-in fails with CORS error"
**Cause:** Domain not in Firebase Authorized Domains  
**Fix:** Add `ropi-aoss-staging.web.app` to Firebase Console → Authentication → Authorized domains

### "No token in storage"
**Cause:** Sign-in never succeeded (firebase.auth().currentUser is null)  
**Fix:** Check browser console for sign-in errors. Verify email/password in Firebase Auth.

### "401 Unauthorized on /api/admin/settings/users"
**Cause:** Missing or invalid ID token  
**Fix:** Get token from `firebase.auth().currentUser.getIdToken()` and include in `Authorization: Bearer <TOKEN>` header

### "API returns HTML instead of JSON"
**Cause:** Rewrite rule not configured or API function not deployed  
**Fix:** Check `firebase.json` rewrite rule and verify deployment succeeded (GitHub Actions)

---

## 7️⃣ Summary Back to Lisa

**Manual tasks:**

1. **Firebase Authorized Domains:** Add 3 domains to `ropi-bccee` Console
   - ropi-aoss-staging.web.app
   - ropi-aoss-staging.firebaseapp.com  
   - ropi-aoss-staging--pr-188-fourjk06.web.app (optional)

2. **GitHub Secrets:** Set or send privately to John
   - E2E_ADMIN_PASSWORD
   - E2E_USER_PASSWORD
   - E2E_UNVERIFIED_PASSWORD

3. **Backend Status:**
   - ✅ Deployed (commit 7be5a59, workflow succeeded)
   - ✅ CORS configured
   - ✅ Firebase client SDK points to ropi-bccee
   - ✅ API routing configured

4. **Pending:** John's verification once domains & secrets are set

---

## Next Steps

**⏸️ Pausing here.**

1. Lisa: Complete steps 1-2 above in Firebase Console & GitHub
2. John: Follow section 5 to test sign-in and endpoints
3. Report results back (include claims object, HTTP statuses, any errors)

**Do not commit** service-account.json or passwords. Files already in .gitignore.

---

**Version:** aoss.v0.7.3  
**Last Updated:** 2025-12-10  
**Status:** Awaiting manual Firebase & GitHub setup
