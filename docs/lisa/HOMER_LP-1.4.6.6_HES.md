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

### Candidate Causes

1. **Preview auth redirect not completing** — Firebase Auth may not redirect/refresh properly on ephemeral PR preview URLs (`https://ropi-aoss-staging--pr-XXX-*.web.app`).

2. **Selector mismatch** — The `[data-testid="user-menu-trigger"]` selector may not exist or may have a different name in the deployed build.

3. **CI credential sync issue** — GitHub Actions secrets may have different passwords than the test accounts configured in Firebase Auth.

### Investigation Tasks

- [ ] Check if `data-testid="user-menu-trigger"` exists in `UserMenu.tsx` or equivalent component
- [ ] Verify Firebase Auth authorized domains include PR preview URL pattern
- [ ] Compare CI secrets with Firebase Auth user passwords
- [ ] Test sign-in flow manually on a PR preview URL
- [ ] Check if auth state persistence works on preview domains

---

## 3. Proposed Fixes

### Fix 1: Verify and Update User Menu Test ID

Check the actual test ID in the codebase and update `helpers.ts` if needed.

```typescript
// helpers.ts line 100 - current
await page.locator('[data-testid="user-menu-trigger"]').waitFor({ state: 'visible', timeout: 15000 });

// If selector changed, update to match actual component
```

### Fix 2: Add Preview URL to Firebase Auth Authorized Domains

Ensure Firebase Auth accepts the PR preview URL pattern:
- `ropi-aoss-staging--pr-*.web.app`
- Or use wildcard if supported

### Fix 3: Sync CI Credentials

Reset Firebase Auth passwords for test users and update GitHub Actions secrets:
- `VITE_E2E_ADMIN_PASSWORD`
- `VITE_E2E_USER_PASSWORD`
- `VITE_E2E_UNVERIFIED_PASSWORD`

### Fix 4: Add Auth State Check Before Selector Wait

Add explicit wait for auth state to settle before checking for user menu:

```typescript
// Wait for Firebase auth to complete
await page.waitForFunction(() => {
  return window.__firebaseAuth?.currentUser !== undefined;
}, { timeout: 10000 });
```

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

- [ ] Both E2E auth smoke tests pass on PR preview
- [ ] No timeout errors on `user-menu-trigger` selector
- [ ] CI workflow completes with success status
- [ ] CodeRabbit approves changes

---

## 7. Evidence & Artifacts

### Related PRs

| PR | Description | Status |
|----|-------------|--------|
| #383 | LP-1.4.6.5 Production Rollout (docs-only, E2E skipped) | MERGED |
| TBD | LP-1.4.6.6 E2E Auth Fix | IN PROGRESS |

### Workflow Runs

- Failing E2E run: https://github.com/twgallo13/ROPI-V2.1/actions/runs/20569480914

---

## 8. Contacts

- **Homer:** Execution Agent
- **Lisa:** Repository Governance AI & DVA
