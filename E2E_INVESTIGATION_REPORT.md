# E2E Test Failure Investigation Report

**Run ID:** 19986365614  
**Branch:** fix/e2e-auth-modal-tests (PR #190)  
**Date:** 2025-12-06  
**Investigator:** GitHub Copilot (per aoss.e2e-debug.v2)

---

## Summary

| Test | Status | Root Cause |
|------|--------|------------|
| Launch Calendar Signup | ❌ FAIL | Firestore rules permission denied |
| Admin Create Observation | ❌ FAIL | "Add Observation" button missing from UI |
| Non-Admin Create Observation | ❌ FAIL | "Add Observation" button missing from UI |

---

## Test 1: Launch Calendar Signup

### Error Details
- **Test:** `launch-calendar.spec.ts:40 - should allow signup for a launch`
- **Timeout:** 5000ms exceeded waiting for success message
- **User:** `user@shiekh.com` (regular user, email verified)

### Console Errors (First 10)

```
1. ✅ Firebase initialized successfully
2. ⚠️ Sentry DSN not configured - error monitoring disabled
3. 🔐 Auth state changed: No user
4. 🔐 Auth state changed: User: user@shiekh.com
5. ✅ Email sign-in successful: user@shiekh.com
6. 🔐 Admin check for user@shiekh.com: ❌ Not admin
7. 📧 Email verified for user@shiekh.com: ✅ Yes
8. ❌ Launch signup failed: FirebaseError: Missing or insufficient permissions.
9. [Firestore Error] Missing or insufficient permissions. {operation: launch_signup, launchId: launch_2025_q1_ropi_runner, productId: prod_ropi_runner_2025, mode: account}
10. TimeoutError: Timeout 5000ms exceeded.
```

### Network Request/Response

**Request:**
```
POST https://firestore.googleapis.com/google.firestore.v1.Firestore/Write/channel
Collection: launchSignups/launch_2025_q1_ropi_runner_37d692a11c7a4d592cd66310cc02304825d9813ba4ee5924f6ff57e10058274d
```

**Payload:**
```json
{
  "launchId": "launch_2025_q1_ropi_runner",
  "productId": "prod_ropi_runner_2025",
  "userUid": "Fte9zU1sccNJ8ndAHvvs8QD3rLq2",
  "email": "user@shiekh.com",
  "createdAt": "2025-12-06T09:13:29.341000000Z",
  "source": "aoss-web",
  "status": "active"
}
```

**Response:** HTTP 200 (channel transport), but Firestore rules returned PERMISSION_DENIED

### Client Code Location

**File:** `packages/web/src/pages/LaunchCalendarPage.tsx`  
**Lines:** 68-85

```typescript
const handleNotifyMe = async (launchId: string, productId: string) => {
  if (!currentUser) {
    setPendingLaunch({ launchId, productId });
    setShowSignInModal(true);
    return;
  }

  try {
    await signupForLaunch({ launchId, productId, mode: 'account' });  // <-- FAILS HERE
    setSignedUpLaunches(prev => new Set(prev).add(launchId));
    setConfirmationMessage("You're in. We'll notify you about this launch.");
    setTimeout(() => setConfirmationMessage(null), 3000);
  } catch (error: any) {
    alert(error.message || 'Failed to sign up for launch. Please try again.');
  }
};
```

### Firestore Rules Analysis

**File:** `firestore.rules` lines 125-140

```javascript
match /launchSignups/{signupId} {
  allow create: if (
    // Account-based signup (requires auth)
    (request.auth != null
     && request.resource.data.userUid == request.auth.uid
     && request.resource.data.source == 'aoss-web'
     && request.resource.data.keys().hasAll(['launchId', 'productId', 'userUid', 'createdAt', 'source', 'status'])
     && request.resource.data.status == 'active')
    // OR public email signup...
  );
```

**Problem:** The rules require all 6 fields but the client is sending 7 fields (includes `email`). The Firestore rules should either:
1. Allow additional fields, OR
2. The client should not send `email` for account-based signups

### Root Cause — CRITICAL FINDING! 🚨

**The Firestore rules for `launchSignups` collection have NEVER been deployed!**

Timeline analysis:
1. **Rules deployment:** `2025-12-02T14:16:00Z` (commit `2a17466`)
2. **launchSignups rules added:** `2025-12-02T17:48:09` (commit `785fe8f`)

The deployment happened BEFORE the launchSignups rules were added to the codebase. The deployed rules version (`2a17466`) contains NO `launchSignups` match block at all!

**Firestore default behavior:** Without explicit allow rules, ALL operations are DENIED.

### Evidence

```bash
$ git show 2a17466:firestore.rules | grep "launchSignups"
# Returns: NOTHING - launchSignups NOT in deployed version!
```

### Proposed Fix — REQUIRED ACTION

**Deploy the current Firestore rules to ropi-bccee:**

```bash
firebase deploy --only firestore:rules --project ropi-bccee
```

This will deploy the `launchSignups` rules that are already in the repo but never made it to production.

---

## Test 2 & 3: Create Observation (Admin & Non-Admin)

### Error Details
- **Tests:** 
  - `observations.spec.ts:35 - should allow admin to create observation`
  - `observations.spec.ts:157 - should allow non-admin to create observation`
- **Timeout:** 32000ms exceeded waiting for "Add Observation" button

### Console Errors

```
1. ✅ Firebase initialized successfully
2. ⚠️ Sentry DSN not configured - error monitoring disabled
3. 🔐 Auth state changed: User: theo@shiekh.com (admin)
4. 🔐 Admin check for theo@shiekh.com: ✅ Admin
5. TimeoutError: Timeout 32000ms exceeded waiting for selector 'button:has-text("Add Observation")'
```

### Page Snapshot Analysis

The page snapshot shows the Observations page with:
- ✅ Heading "Observations"
- ✅ Status filter (All/Open/Resolved)
- ✅ Severity filter (All/High/Medium/Low)
- ✅ 2 existing observations displayed
- ✅ "Resolve" button on open observations
- ❌ **NO "Add Observation" button**

### Client Code Location

**File:** `packages/web/src/pages/ObservationsPage.tsx`

The page has 2 buttons total:
1. Line 161: "Retry Sync" button (for offline mode)
2. Line 352: "Resolve" button (on observation cards)

**There is NO "Add Observation" or "New Observation" button implemented.**

### Test Expectation

**File:** `packages/web/e2e/observations.spec.ts` lines 37-39

```typescript
// Click "Add Observation" button
const addButton = page.locator('button:has-text("Add Observation"), button:has-text("New Observation")');
await addButton.click();  // <-- TIMES OUT - button doesn't exist
```

### Root Cause

**The "Add Observation" UI feature was never implemented.** The ObservationsPage component only supports:
- Viewing existing observations
- Filtering by status/severity
- Resolving observations
- Syncing from localStorage

The test was written assuming this feature exists, but it doesn't.

### Proposed Fix

**Option A: Implement the Add Observation feature**

Add an "Add Observation" button and form to `ObservationsPage.tsx`:

```tsx
// Add button in the header section (after severity filter)
<button
  data-testid="add-observation"
  onClick={() => setShowAddForm(true)}
  style={{
    padding: '8px 16px',
    backgroundColor: '#3b82f6',
    color: 'white',
    border: 'none',
    borderRadius: '6px',
    cursor: 'pointer',
    fontSize: '14px',
    fontWeight: '500',
  }}
>
  Add Observation
</button>

// Add a form modal for creating observations
{showAddForm && (
  <AddObservationForm 
    onSubmit={handleAddObservation}
    onClose={() => setShowAddForm(false)}
  />
)}
```

**Option B: Skip these tests until feature is implemented**

```typescript
test.skip('should allow admin to create observation', async ({ page }) => {
  // TODO: Implement Add Observation feature in ObservationsPage.tsx
});
```

---

## Recommendations

### IMMEDIATE ACTION REQUIRED

1. **Deploy Firestore Rules** — The launchSignups rules have NEVER been deployed!
   ```bash
   firebase deploy --only firestore:rules --project ropi-bccee
   ```
   This is a **blocking issue** for the launch signup tests.

2. **Observations Create Tests** — Either:
   - Implement the "Add Observation" button/form in ObservationsPage.tsx, OR
   - Skip/remove these tests until the feature is built

### Follow-up Actions

1. **Update CI/CD** to include Firestore rules deployment in staging/production workflows
2. **Create issue** for implementing Add Observation feature
3. **Review test coverage** to ensure tests match actual UI capabilities

---

## Artifacts Location

```
/workspaces/ROPI-V2.1/artifacts/
├── test-results/
│   ├── launch-signup-trace/
│   │   ├── 0-trace.network    # Network requests
│   │   ├── 0-trace.trace      # Console logs, actions
│   │   └── resources/         # Screenshots, payloads
│   ├── observations-Observations--39b51-admin-to-create-observation-chromium/
│   │   └── error-context.md   # Page snapshot at failure
│   └── observations-Observations--9afbb-observation-on-own-products-chromium/
│       └── error-context.md   # Page snapshot at failure
```

---

**Next Steps:** Lisa to decide which fix approach to take for each failing test.
# E2E Verification - 2025-12-06T10:26:24Z
