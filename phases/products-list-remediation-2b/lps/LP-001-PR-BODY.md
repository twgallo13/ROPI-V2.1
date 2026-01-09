# LP Block

**LP**: LP-products-list-remediation-001  
**PhaseSlug**: products-list-remediation-2b  
**Title**: Pagination — ensure robust server/client pagination and rows-per-page  
**Executor**: Homer  
**Intent**: Make pagination robust: rows-per-page selector (25/50/100) works; Next/Prev navigation uses page tokens; can page beyond 25; total/hasMore behavior correct.

## Scope Files
- `packages/api/src/endpoints/products.ts`
- `packages/web/src/hooks/useProducts.ts`
- `packages/web/src/pages/ProductsPage.tsx`
- `packages/web/src/components/common/Pagination.tsx`
- `packages/web/e2e/products-list.spec.ts`

## Tasks (Homer)

1. **Backend**: Ensure `listProductsHandler` consistently respects client `limit` param and returns `pageToken`/`nextPageToken` when `hasMore=true`. Add docs/comments clarifying behavior and edge-cases.

2. **Backend**: Ensure `limit` default and max behavior are clear; support `limit=50` and `limit=100` path.

3. **Frontend**: Update `useProducts` to:
   - React to `limit` changes (trigger reset fetch).
   - Track pageTokens array (map pageNo → pageToken) for Next/Prev and arbitrary page navigation.
   - Expose `loadPage(pageNumber)` and `loadMore()` semantics.

4. **Frontend**: Wire `ProductsPage` pagination to use pageTokens; ensure itemsPerPage selector (25/50/100) updates UI and triggers refresh.

5. **Frontend**: Ensure `Pagination` component uses `hasMore` and `total` correctly and enables/disables Next/Prev accordingly.

6. **Tests**: Add unit tests for useProducts pagination behavior, integration tests for `/api/products` limit=50/100, and E2E verifying rows-per-page=50 and Next/Prev navigation.

## Acceptance Criteria (non-dev evidence required)

**Pagination sample checks (provide screenshots/video)**:
1. Page advances past 25 items (show page 2) — **evidence**: screenshot/video
2. Rows per page set to **50** and UI shows 1–50 of N — **evidence**: screenshot
3. Next advances multiple pages and Prev returns correctly — **evidence**: short screencast

**CI**: Unit + API integration + E2E tests pass (attach CI logs or badge)

**Staging**: Provide staging URL(s) and verification artifacts

## Verification Checklist

- [ ] Backend: `listProductsHandler` returns consistent `nextPageToken` when `hasMore=true`
- [ ] Backend: `limit` default and max validation implemented
- [ ] Frontend: `useProducts` reacts to `limit` changes
- [ ] Frontend: `ProductsPage` uses pageTokens array for navigation
- [ ] Frontend: Rows-per-page selector (25/50/100) functional
- [ ] E2E: rows-per-page 50 + Next/Prev checks passing
- [ ] CI: All tests green (unit, integration, E2E)
- [ ] VVP artifacts attached (screenshots/video)
- [ ] HES JSON produced and attached as PR comment

## VVP (Visual Verification Plan)

1. Go to: `https://ropi-aoss-staging.web.app/products`
2. Sign in as an admin (use `VITE_E2E_ADMIN_*` creds in CI or staging test account)
3. Confirm initial page shows >25 total items (otherwise use seeded data)
4. Set Rows per page → **50**. Expect the page to display 50 rows and the range `1–50 of N`
5. Click **Next** until you reach page >1; expect distinct rows and Page indicator increment
6. Click **Prev** to return; expect prior rows and correct page indicator
7. Capture screenshots or short screencast showing steps 4–6

## CI Commands (for reviewers)

```bash
pnpm install
pnpm --filter @ropi-aoss/web test          # unit
pnpm --filter @ropi-aoss/api test          # integration (Firestore emulator)
pnpm --filter @ropi-aoss/web test:e2e      # Playwright / E2E
```

## Labels (apply to PR)

- `state:in-progress`
- `lp:LP-products-list-remediation-001`
- `type:feature`
- `cleanup:required`

## HES Requirement

**Homer must produce HES JSON and attach as PR comment prior to merge.** See `LP-001-HES-TEMPLATE.json` for the exact template. Do not merge unless HES JSON is present and CI is green.

## Post-Merge Actions

Update `phases/products-list-remediation-2b/ledger.json` on merge:
- Update LP-products-list-remediation-001 status to `completed`
- Add completion date and evidence links
- Update definition of done for pagination
- This update is machine-validated by CI

## Notes

- Do not merge unless HES JSON is present and CI is green
- Update ledger.json on merge (machine-validated)
- All VVP artifacts must be attached before merge approval

---

## Reference Documents

- **LP Spec**: `phases/products-list-remediation-2b/lps/LP-products-list-remediation-001.md`
- **Phase PRD**: `phases/products-list-remediation-2b/PRD.md`
- **Execution Guide**: `phases/products-list-remediation-2b/lps/LP-001-EXECUTION-GUIDE.md`
- **Start Phase Rules**: V5.1 (governance and evidence requirements)
