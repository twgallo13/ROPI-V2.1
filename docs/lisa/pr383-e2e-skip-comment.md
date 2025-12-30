## E2E Smoke Test Failure — Skip Rationale for Docs-Only PR #383

### Failing Tests

E2E smoke tests failed on PR preview (auth.spec.ts @smoke). Failures:

| Test | Location | Result |
|------|----------|--------|
| `should allow email/password sign-in for regular user @smoke` | `auth.spec.ts:30` | ❌ FAILED |
| `should allow email/password sign-in for admin user @smoke` | `auth.spec.ts:43` | ❌ FAILED |

### Error Details

```
TimeoutError: locator.waitFor: Timeout 15000ms exceeded.
Call log:
  - waiting for locator('[data-testid="user-menu-trigger"]') to be visible

at helpers.ts:100
```

Both tests failed because after sign-in the `[data-testid="user-menu-trigger"]` element never becomes visible on the PR preview URL (`https://ropi-aoss-staging--pr-383-zdfnexep.web.app`).

### Root Cause Diagnosis

The E2E auth tests are failing against the PR preview for reasons **unrelated** to these docs-only changes (HES skeleton and PR body checklist only). Candidate causes:

1. **Preview auth redirect not completing** — Firebase Auth may not redirect/refresh properly on ephemeral PR preview URLs.
2. **Selector mismatch** — The `[data-testid="user-menu-trigger"]` selector may not exist or may be different in the deployed build.
3. **CI credential sync issue** — GitHub Actions secrets may have different passwords than the test accounts.

### Options Considered

| Option | Description | Selected |
|--------|-------------|----------|
| A | Diagnose user-menu-trigger testid | ❌ |
| B | Re-run E2E to rule out flakiness | ❌ |
| **C** | **Skip E2E for docs-only PR with owner override** | ✅ |
| D | Fix E2E in separate LP first | ❌ |

### Decision

PR #383 is documented to contain **only** HES skeleton and PR body files (docs-only). We will mark this PR as docs-only and **skip E2E** for this PR with an owner override so the production rollout checklist PR can proceed.

**Rationale:** Merging this documentation PR does not affect runtime code paths. The failing E2E tests point to a preview auth problem that must be handled in a separate LP (LP-1.4.6.6) to fix the auth E2E flakiness.

### Attached Evidence

- **E2E workflow run ID:** `20569480914`
- **E2E workflow run URL:** https://github.com/twgallo13/ROPI-V2.1/actions/runs/20569480914
- **Changed files (docs-only proof):** `/tmp/pr383-files.txt`
  - `docs/lisa/HOMER_LP-1.4.6.5_HES.md`
  - `docs/lisa/LP-1.4.6.5_PR_BODY.md`

### Action Requested

- **Ops/QA:** Acknowledge the skip and accept risk for this docs-only PR. QA must still monitor the next production steps once run.
- **Follow-up:** LP-1.4.6.6 will be opened immediately after merge to fix the E2E auth test infrastructure issue.

---

**LP:** LP-importer-mapping-recon-1.4.6.5  
**Decision Authority:** Lisa (Repository Governance AI & DVA)  
**Execution Agent:** Homer  
**Date:** 2025-12-29
