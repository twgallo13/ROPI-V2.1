# LP-1.4.6.6 — Fix E2E Auth Tests on Preview

## Homer Execution Summary (HES) — LP-importer-mapping-recon-1.4.6.6

**LP:** LP-importer-mapping-recon-1.4.6.6  
**Type:** Fix  
**Priority:** P1-High  
**Status:** In Progress  
**Created:** 2025-12-29  
**Owner:** Homer (Execution Agent)  
**Approver:** Lisa (Repository Governance AI & DVA)

---

## 1. Background & Problem Statement

E2E smoke tests on PR previews are failing due to authentication issues. After sign-in, the `[data-testid="user-menu-trigger"]` element never becomes visible, causing `TimeoutError` after 15 seconds.

### Failing Tests

| Test | Location | Error |
|------|----------|-------|
| `should allow email/password sign-in for regular user @smoke` | `auth.spec.ts:30` | TimeoutError waiting for user-menu-trigger |
| `should allow email/password sign-in for admin user @smoke` | `auth.spec.ts:43` | TimeoutError waiting for user-menu-trigger |

### Error Details

```
TimeoutError: locator.waitFor: Timeout 15000ms exceeded.
Call log:
  - waiting for locator('[data-testid="user-menu-trigger"]') to be visible

at helpers.ts:100
```

---

## 2. Root Cause Analysis

### ✅ Root Cause Identified

**Invalid Firebase Auth Credentials in GitHub Secrets**

After improving error diagnostics, the actual error is now visible:

```
Error: Sign-in failed with error: Firebase: Error (auth/invalid-credential).
```

This means the passwords stored in GitHub Actions secrets do not match the passwords in Firebase Auth for the test users:
- `E2E_ADMIN_PASSWORD` → `theo@shiekh.com`
- `E2E_USER_PASSWORD` → `user@shiekh.com`

The original "timeout" errors were a symptom of the sign-in failing (no success message ever appeared because auth failed).

### Timeline Analysis

```
1. signInWithEmail() submits form with credentials from GitHub secrets
2. Firebase Auth rejects: auth/invalid-credential
3. SignInModal shows ERROR message (not success)
4. Original code waited only for success message → Timeout
5. User-menu-trigger never appears because user is not authenticated
```

### Configuration Mismatch

| Component | Value | Status |
|-----------|-------|--------|
| `VITE_E2E_ADMIN_EMAIL` | `theo@shiekh.com` | ✅ Hardcoded in workflow |
| `VITE_E2E_USER_EMAIL` | `user@shiekh.com` | ✅ Hardcoded in workflow |
| `E2E_ADMIN_PASSWORD` | `secrets.E2E_ADMIN_PASSWORD` | ❌ Invalid |
| `E2E_USER_PASSWORD` | `secrets.E2E_USER_PASSWORD` | ❌ Invalid |

---

## 3. Implemented Fixes

### Fix 1: Improved Error Diagnostics (Complete)

Updated `packages/web/e2e/helpers.ts` to capture and report the actual auth error:

```typescript
// Wait for either outcome with extended timeout
const outcome = await Promise.race([
  successAlert.waitFor({ state: 'visible', timeout: 20000 }).then(() => 'success'),
  errorAlert.waitFor({ state: 'visible', timeout: 20000 }).then(() => 'error'),
]).catch(() => 'timeout');

if (outcome === 'error') {
  const errorMessage = await errorAlert.textContent();
  throw new Error(`Sign-in failed with error: ${errorMessage}`);
}
```

### Fix 2: Credential Sync Required (Manual)

**Action Required by Repository Owner:**

1. Reset passwords for E2E test users in Firebase Auth Console:
   - `theo@shiekh.com` (admin)
   - `user@shiekh.com` (regular user)
   - `unverified@shiekh.com` (unverified user)

2. Update GitHub Actions secrets with new passwords:
   - `E2E_ADMIN_PASSWORD`
   - `E2E_USER_PASSWORD`
   - `E2E_UNVERIFIED_PASSWORD`

### Commits

- `6d892ed` — fix(e2e): improve auth state sync for PR preview URLs
- `1fe0fda` — docs: update HES with root cause analysis
- `1521dc4` — fix(e2e): improve auth error diagnostics

---

## 4. Test Plan

1. Run E2E auth tests locally against staging
2. Create a test PR and run E2E workflow
3. Verify both smoke tests pass:
   - `should allow email/password sign-in for regular user @smoke`
   - `should allow email/password sign-in for admin user @smoke`
4. Confirm no regression in other E2E tests

---

## 5. Rollback Plan

If fixes cause new issues:
1. Revert the commits in this LP
2. Re-apply `skip-e2e:docs` label to affected PRs
3. Document new findings

---

## 6. Acceptance Criteria

- [x] Improved error diagnostics show actual auth failure reason
- [x] Error message clearly shows `auth/invalid-credential`
- [ ] Firebase Auth passwords reset for test users (manual step)
- [ ] GitHub secrets updated with new passwords (manual step)
- [ ] Both E2E auth smoke tests pass on PR preview
- [ ] CI workflow completes with success status
- [ ] CodeRabbit approves changes

---

## 7. Evidence & Artifacts

### Related PRs

| PR | Description | Status |
|----|-------------|--------|
| #383 | LP-1.4.6.5 Production Rollout (docs-only, E2E skipped) | MERGED |
| #384 | LP-1.4.6.6 E2E Auth Fix | IN PROGRESS — Awaiting credential sync |

### Commits

- `6d892ed` — fix(e2e): improve auth state sync for PR preview URLs
- `1fe0fda` — docs: update HES with root cause analysis
- `1521dc4` — fix(e2e): improve auth error diagnostics

### Workflow Runs

- Original failing run: https://github.com/twgallo13/ROPI-V2.1/actions/runs/20569480914
- Diagnostic run: https://github.com/twgallo13/ROPI-V2.1/actions/runs/20570363549
  - Revealed: `Firebase: Error (auth/invalid-credential)`

---

## 8. Next Steps (Manual)

**Repository Owner Action Required:**

1. **Firebase Console** → Authentication → Users
   - Find `theo@shiekh.com` and reset password
   - Find `user@shiekh.com` and reset password
   - Find `unverified@shiekh.com` and reset password

2. **GitHub Repository Settings** → Secrets and variables → Actions
   - Update `E2E_ADMIN_PASSWORD` with new password for `theo@shiekh.com`
   - Update `E2E_USER_PASSWORD` with new password for `user@shiekh.com`
   - Update `E2E_UNVERIFIED_PASSWORD` with new password for `unverified@shiekh.com`

3. **Re-run E2E tests** on PR #384 to verify fix

---

## 9. Contacts

- **Homer:** Execution Agent
- **Lisa:** Repository Governance AI & DVA
