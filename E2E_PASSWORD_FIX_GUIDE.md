# E2E Admin Password Fix Guide

## Problem
The E2E admin user (`theo@shiekh.com`) credentials are not working. The password stored in `E2E_ADMIN_PASSWORD` secret is invalid.

## Solution Options

### Option 1: Reset Password via Firebase Console (Easiest)

1. **Open Firebase Console:**
   ```bash
   # Open in browser
   $BROWSER https://console.firebase.google.com/project/ropi-bccee/authentication/users
   ```

2. **Find and reset user:**
   - Search for `theo@shiekh.com`
   - Click the overflow menu (⋮) next to the user
   - Select "Reset password"
   - Copy the temporary password or set a new permanent one
   - **Recommended password:** `RopiE2E-Admin!2025`

3. **Update GitHub secret:**
   ```bash
   gh secret set E2E_ADMIN_PASSWORD --body "RopiE2E-Admin!2025" --repo twgallo13/ROPI-V2.1
   ```

4. **Test the new password:**
   ```bash
   VITE_E2E_ADMIN_PASSWORD="RopiE2E-Admin!2025" node scripts/generate-admin-token-rest.js
   ```

---

### Option 2: Reset via gcloud CLI (If you have access)

1. **Authenticate with gcloud:**
   ```bash
   gcloud auth application-default login
   gcloud config set project ropi-bccee
   ```

2. **Run the fix script:**
   ```bash
   # Uses default password: RopiE2E-Admin!2024
   node scripts/fix-admin-user.js
   
   # Or specify custom password:
   NEW_ADMIN_PASSWORD="YourPassword123!" node scripts/fix-admin-user.js
   ```

3. **Update GitHub secret with the password from script output**

---

### Option 3: Create New Admin User (Alternative)

If `theo@shiekh.com` can't be accessed, create a new admin user:

1. **Via Firebase Console:**
   - Go to: https://console.firebase.google.com/project/ropi-bccee/authentication/users
   - Click "Add user"
   - Email: `e2e-admin@test.com`
   - Password: `RopiE2E-Admin!2025`
   - Save user

2. **Set admin claims** (requires Cloud Function or Admin SDK):
   ```javascript
   // Run via Firebase Functions shell or custom script
   admin.auth().setCustomUserClaims(uid, { admin: true, role: 'admin' });
   ```

3. **Update scripts to use new email:**
   ```bash
   # Update environment variable
   export VITE_E2E_ADMIN_EMAIL="e2e-admin@test.com"
   export VITE_E2E_ADMIN_PASSWORD="RopiE2E-Admin!2025"
   ```

4. **Update GitHub secrets:**
   ```bash
   gh secret set E2E_ADMIN_EMAIL --body "e2e-admin@test.com" --repo twgallo13/ROPI-V2.1
   gh secret set E2E_ADMIN_PASSWORD --body "RopiE2E-Admin!2025" --repo twgallo13/ROPI-V2.1
   ```

---

## Quick Test After Fix

```bash
# Test authentication works
VITE_E2E_ADMIN_PASSWORD="<new-password>" node scripts/test-admin-credentials.js

# Generate token for API tests
VITE_E2E_ADMIN_PASSWORD="<new-password>" node scripts/generate-admin-token-rest.js

# Run smoke tests
TOKEN=$(VITE_E2E_ADMIN_PASSWORD="<new-password>" node scripts/generate-admin-token-rest.js 2>&1 | tail -1)
curl -i "https://ropi-aoss-staging.web.app/api/admin/settings/attributes" \
  -H "Authorization: Bearer $TOKEN"
```

---

## Files Created

- `scripts/test-admin-credentials.js` - Tests if passwords work
- `scripts/fix-admin-user.js` - Resets password via Admin SDK
- `E2E_PASSWORD_FIX_GUIDE.md` - This guide

## Next Steps After Password Reset

1. Update the GitHub secret
2. Re-run the smoke tests from LP-ATTR-1.3.3-MERGEPR341
3. Document the working password in team password manager
