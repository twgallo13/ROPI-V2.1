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

**Async Auth State Propagation Timing Issue**

The `signInWithEmail()` helper in `helpers.ts` was waiting for `[data-testid="user-menu-trigger"]` immediately after form submission, but Firebase auth state propagation is asynchronous:

```
Timeline:
1. signInWithEmail() submits form
2. Firebase signInWithEmailAndPassword() resolves → Auth completes server-side
3. SignInModal shows success message, schedules modal close (500ms)
4. helpers.ts IMMEDIATELY waits for user-menu-trigger → PROBLEM
5. onAuthStateChanged() fires asynchronously → Sets currentUser
6. AuthProvider updates state → loading=false, currentUser set
7. TopBar re-renders → user-menu-trigger appears
```

**On PR preview URLs, step 5-7 take longer due to:**
- Cold start latency on ephemeral Firebase Hosting URLs
- Network latency to Firebase Auth servers
- No cached auth state

The 15s timeout in step 4 expired before steps 5-7 completed.

### Code Locations

| Component | Location | Issue |
|-----------|----------|-------|
| `signInWithEmail()` | [helpers.ts#L100](packages/web/e2e/helpers.ts#L100) | Waited for user-menu-trigger immediately after submit |
| `TopBar` | [TopBar.tsx#L68](packages/web/src/components/layout/TopBar.tsx#L68) | Shows user-menu only when `currentUser` is set AND `loading=false` |
| `AuthProvider` | [AuthProvider.tsx#L111](packages/web/src/contexts/AuthProvider.tsx#L111) | `onAuthStateChanged` callback is async |
| `SignInModal` | [SignInModal.tsx#L112](packages/web/src/components/Auth/SignInModal.tsx#L112) | Shows success message before modal closes |

---

## 3. Implemented Fix

### Fix: Proper Auth State Sequencing

Updated `packages/web/e2e/helpers.ts` `signInWithEmail()` function to properly sequence the async auth flow:

```typescript
// LP-1.4.6.6: Wait for success message first (confirms Firebase auth completed)
const successAlert = page.locator('.signin-alert-success');
await successAlert.waitFor({ state: 'visible', timeout: 15000 });

// Wait for modal to close (it auto-closes after 500ms delay on success)
await modal.waitFor({ state: 'hidden', timeout: 5000 });

// LP-1.4.6.6: Wait for TopBar loading state to clear
const loadingIndicator = page.locator('.topbar-loading');
await loadingIndicator.waitFor({ state: 'hidden', timeout: 10000 }).catch(() => {
  // Loading indicator may already be hidden - that's OK
});

// LP-1.4.6.6: Now wait for user menu with extended timeout
await page.locator('[data-testid="user-menu-trigger"]').waitFor({ 
  state: 'visible', 
  timeout: 20000 
});
```

**Key Changes:**
1. Wait for success message first (confirms Firebase auth completed server-side)
2. Wait for modal to close (confirms app acknowledged success)
3. Handle TopBar loading state gracefully
4. Extended timeout for user-menu-trigger from 15s to 20s

### Commit

```
fix(e2e): improve auth state sync for PR preview URLs
6d892ed
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
| #384 | LP-1.4.6.6 E2E Auth Fix | IN PROGRESS |

### Commits

- `6d892ed` — fix(e2e): improve auth state sync for PR preview URLs

### Workflow Runs

- Failing E2E run: https://github.com/twgallo13/ROPI-V2.1/actions/runs/20569480914
- Fix verification: (pending CI)

---

## 8. Contacts

- **Homer:** Execution Agent
- **Lisa:** Repository Governance AI & DVA
