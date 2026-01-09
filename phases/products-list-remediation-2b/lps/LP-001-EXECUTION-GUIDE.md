# LP-001 Execution Guide for Homer

**LP**: LP-products-list-remediation-001  
**Phase**: products-list-remediation-2b  
**Executor**: Homer  
**Status**: Ready for Execution

---

## Quick Start Checklist

### 1. Create Feature Branch

```bash
git fetch origin
git checkout -b lp-products-list-remediation-001
```

### 2. Implement Changes

Edit the scope files listed in the LP block:

- `packages/api/src/endpoints/products.ts`
- `packages/web/src/hooks/useProducts.ts`
- `packages/web/src/pages/ProductsPage.tsx`
- `packages/web/src/components/common/Pagination.tsx`
- `packages/web/e2e/products-list.spec.ts`
- Add/update unit tests: `packages/web/src/hooks/__tests__/useProducts.test.ts`
- Add/update integration tests: `packages/api/src/endpoints/__tests__/products.test.ts`

**Tasks to implement** (see LP spec for details):

1. ✅ Backend: `listProductsHandler` respects `limit` param, returns `nextPageToken`
2. ✅ Backend: `limit` default and max validation (25/50/100)
3. ✅ Frontend: `useProducts` reacts to `limit` changes, tracks pageTokens
4. ✅ Frontend: Wire `ProductsPage` pagination with rows-per-page selector
5. ✅ Frontend: `Pagination` component uses `hasMore`/`total` correctly
6. ✅ Tests: Unit, integration, E2E coverage

### 3. Local Test Run

```bash
pnpm install
pnpm --filter @ropi-aoss/web test        # unit
pnpm --filter @ropi-aoss/api test        # api integration (use Firestore emulator)
pnpm --filter @ropi-aoss/web test:e2e    # e2e (Playwright)
```

**Fix all failures until tests pass locally.**

### 4. Commit & Push

```bash
git add -A
git commit -m "LP-products-list-remediation-001: Pagination — ensure robust server/client pagination and rows-per-page"
git push -u origin lp-products-list-remediation-001
```

### 5. Open the PR

**PR Title** (exact):
```
LP-products-list-remediation-001: Pagination — ensure robust server/client pagination and rows-per-page
```

**PR Body**: Use the complete LP Block from the phase documentation (Section B).

**Apply PR Labels**:
- `state:in-progress`
- `lp:LP-products-list-remediation-001`
- `type:feature`
- `cleanup:required`

### 6. Wait for CI Green

- Ensure CI runs unit, integration (Firestore emulator), and e2e
- Resolve any CI failures
- Attach CI run URL(s) or badge in PR

### 7. Staging Deployment & VVP

**Deploy to staging** (follow repo deploy flow):
- Merge to staging trigger branch OR
- Manual staging deploy per repo process

**Visual Verification Plan**:

1. Go to: `https://ropi-aoss-staging.web.app/products`
2. Sign in as admin (use `VITE_E2E_ADMIN_*` credentials)
3. Confirm initial page shows >25 total items
4. Set rows-per-page to **50** → capture screenshot showing `1–50 of N`
5. Click **Next** to advance to page 2 → capture screenshot
6. Click **Next** again to page 3 if possible
7. Click **Prev** to return → capture short screencast (20-30 sec) showing Next/Prev working
8. Verify page indicators update correctly

**Collect Artifacts**:
- `screenshot_rows-per-page-50.png`
- `screenshot_page-2.png`
- `screencast_next-prev-navigation.mp4`
- CI logs/links
- Staging URL proof with timestamp

### 8. Post HES JSON (Required Before Merge)

Post this as a **PR comment** with populated values:

```json
{
  "from": "2026-01-09T00:00:00Z",
  "to": "YYYY-MM-DDTHH:MM:SSZ",
  "lp": "LP-products-list-remediation-001",
  "phaseSlug": "products-list-remediation-2b",
  "executor": "Homer",
  "actionsExecuted": [
    "Updated packages/api/src/endpoints/products.ts — ensure limit respected, nextPageToken returned",
    "Updated packages/web/src/hooks/useProducts.ts — limit dependency, pageTokens tracking, loadPage API",
    "Updated packages/web/src/pages/ProductsPage.tsx — wired pagination and rows-per-page",
    "Updated packages/web/src/components/common/Pagination.tsx — UI corrections",
    "Added/updated unit tests for useProducts pagination",
    "Added/updated integration tests for /api/products with limit params",
    "Added/updated E2E tests for pagination beyond 25 items"
  ],
  "filesChanged": [
    "packages/api/src/endpoints/products.ts",
    "packages/web/src/hooks/useProducts.ts",
    "packages/web/src/pages/ProductsPage.tsx",
    "packages/web/src/components/common/Pagination.tsx",
    "packages/web/e2e/products-list.spec.ts",
    "packages/web/src/hooks/__tests__/useProducts.test.ts",
    "packages/api/src/endpoints/__tests__/products.test.ts"
  ],
  "artifacts": {
    "ci": "REPLACE_WITH_CI_RUN_URL",
    "stagingProof": "https://ropi-aoss-staging.web.app/products",
    "vvpEvidence": [
      "screenshot_rows-per-page-50.png",
      "screenshot_page-2.png",
      "screencast_next-prev-navigation.mp4"
    ],
    "ciLogs": "REPLACE_WITH_LINK_TO_CI_LOGS",
    "coverageReport": "REPLACE_WITH_LINK_TO_COVERAGE_REPORT"
  },
  "testsAdded": {
    "unit": "LIST_KEY_TEST_NAMES",
    "integration": "LIST_KEY_TEST_NAMES",
    "e2e": "LIST_KEY_TEST_NAMES"
  },
  "outcome": "CODE_COMPLETE",
  "notes": "Any important notes, blockers resolved, or deviations from spec"
}
```

### 9. Update Ledger on Merge

After PR is approved and merged, update `phases/products-list-remediation-2b/ledger.json`:

```json
{
  "linearPlans": [
    {
      "lpId": "LP-products-list-remediation-001",
      "lpName": "Pagination Implementation",
      "status": "completed",
      "assignedTo": "Homer",
      "startDate": "2026-01-09",
      "completionDate": "YYYY-MM-DD",
      "evidenceLinks": [
        "PR_URL",
        "HES_JSON_URL",
        "VVP_EVIDENCE_URLS"
      ]
    }
  ]
}
```

**Update Definition of Done** in ledger:
```json
"definitionOfDone": {
  "pagination": {
    "completed": true,
    "verifiedBy": "Homer",
    "verificationDate": "YYYY-MM-DD",
    "evidenceUrl": "VVP_EVIDENCE_URL",
    "notes": "Verified: pagination beyond 25 items, 50 rows display, Next/Prev navigation"
  }
}
```

### 10. Merge Requirements Checklist

**DO NOT MERGE until all checked**:

- [ ] HES JSON posted and schema validated
- [ ] CI is green (unit + integration + e2e)
- [ ] VVP artifacts attached to PR (screenshots/video)
- [ ] Staging deployed and verified
- [ ] All acceptance criteria met
- [ ] Code review approved
- [ ] Ledger update plan documented

---

## Evidence Checklist

Attach to PR before requesting merge approval:

- [ ] CI run URL(s) / logs
- [ ] HES JSON comment (required)
- [ ] Screenshot: rows-per-page set to 50
- [ ] Screenshot: page 2 showing items 26-50 (or 51-100)
- [ ] Screencast: Next/Prev navigation working
- [ ] Staging proof URL with timestamp
- [ ] Coverage report link

---

## Acceptance Criteria Verification

After implementation, verify each criterion is met:

### AC-1: Basic Pagination
- [ ] Can navigate to page 2 using Next button
- [ ] Can return to page 1 using Previous button
- [ ] Previous button disabled on page 1
- [ ] Next button disabled on last page

### AC-2: Rows Per Page
- [ ] Can select 25 rows per page
- [ ] Can select 50 rows per page
- [ ] Can select 100 rows per page
- [ ] Selection persists during session
- [ ] Changing rows-per-page resets to page 1

### AC-3: Navigation Beyond 25
- [ ] Can successfully navigate to page 3 (beyond 50 items)
- [ ] Can navigate back from page 3 to page 1
- [ ] All pages display correct products
- [ ] No duplicate products across pages

### AC-4: Display 50 Rows
- [ ] Selecting 50 rows displays exactly 50 products (if available)
- [ ] Layout remains usable with 50 rows
- [ ] Performance acceptable with 50 rows

### AC-5: Position Indicators
- [ ] Shows "1-25 of X" on page 1 with 25 rows/page
- [ ] Shows "26-50 of X" on page 2 with 25 rows/page
- [ ] Shows "1-50 of X" on page 1 with 50 rows/page
- [ ] Shows accurate total count

### AC-6: Loading States
- [ ] Loading indicator appears during fetch
- [ ] Navigation buttons disabled while loading
- [ ] No layout shift during transitions

---

## Reference Documents

- **LP Spec**: `phases/products-list-remediation-2b/lps/LP-products-list-remediation-001.md`
- **Phase PRD**: `phases/products-list-remediation-2b/PRD.md`
- **Ledger**: `phases/products-list-remediation-2b/ledger.json`
- **Start Phase Rules**: V5.1 (governance and evidence requirements)

---

## Support & Questions

For questions or blockers:
1. Review the detailed LP spec in `LP-products-list-remediation-001.md`
2. Check phase PRD for context
3. Consult Start Phase Workflow V5.1 documentation
4. Escalate blockers to phase owner (Lisa)

---

**Status**: Ready for execution  
**Created**: 2026-01-09  
**Next LP**: LP-products-list-remediation-002 (Column Configuration)
