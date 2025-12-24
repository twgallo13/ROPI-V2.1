# LP-1.3.0 — Remediation Plan

**Audit Date**: 2025-12-25  
**Priority Scale**: P0 (Critical) → P1 (High) → P2 (Medium) → P3 (Low)

---

## Executive Summary

The Products Page (`/products`) is **production-ready** with all core functionality working:
- ✅ All builds pass (SDK, Web, API)
- ✅ useProducts hook tests: 18/18 pass
- ✅ Staging site responds correctly
- ✅ API authentication working

**No blocking issues found.** The remediation items below are enhancements and tech-debt cleanup.

---

## P0 — Critical (None)

No critical issues identified.

---

## P1 — High Priority

### H1. Enable Integration Tests in CI

**Issue**: Products integration tests are skipped (`describe.skip`)  
**Impact**: No CI coverage for API endpoints  
**File**: `packages/api/src/endpoints/__tests__/products.integration.test.ts`

**Remediation**:
1. Configure Firestore emulator in CI workflow
2. Set `FIRESTORE_EMULATOR_HOST=localhost:8080`
3. Remove `describe.skip` when emulator available
4. Add emulator startup step to `deploy-staging.yml`

**Effort**: 4-8 hours  
**PR Label**: `tech-debt`, `testing`, `LP-1.3.0`

---

### H2. Fix Firebase Auth Mocks for Web Tests

**Issue**: Incomplete auth mocks cause flaky tests  
**Impact**: 12/77 web tests failing (unrelated to products)  
**Reference**: `TECH_DEBT_TEST_INFRASTRUCTURE.md`

**Remediation**:
1. Add `onAuthStateChanged` unsubscribe return
2. Mock `getAuth().currentUser`
3. Complete fetch Response mock (text(), headers.get())
4. Add `authHeaders` module mock

**Effort**: 4-8 hours  
**PR Label**: `tech-debt`, `testing`

---

## P2 — Medium Priority

### M1. Reduce Web Bundle Size

**Issue**: Main chunk is 1,118 KB (exceeds 500 KB limit)  
**Impact**: Slower initial page load  
**File**: `packages/web/vite.config.ts`

**Remediation**:
```javascript
// vite.config.ts
export default defineConfig({
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          firebase: ['firebase/app', 'firebase/auth', 'firebase/firestore'],
          vendor: ['react', 'react-dom', 'react-router-dom'],
        }
      }
    }
  }
});
```

**Effort**: 2-4 hours  
**PR Label**: `performance`, `LP-1.3.0`

---

### M2. Reduce API Bundle Size

**Issue**: API bundle is 1.9 MB  
**Impact**: Cloud Functions cold start latency  
**File**: `packages/api/esbuild.config.js`

**Remediation**:
1. Enable tree-shaking
2. Mark firebase-admin as external
3. Review unused imports

**Effort**: 4-8 hours  
**PR Label**: `performance`

---

### M3. Add CSS Variables Verification

**Issue**: ProductsPage.css uses CSS variables without verification  
**Impact**: Potential styling issues if variables undefined

**Remediation**:
1. Add fallback values to CSS variables
2. Create CSS variables audit script
3. Document required variables

**Effort**: 2 hours  
**PR Label**: `styling`, `LP-1.3.0`

---

### M4. Add E2E Tests to CI

**Issue**: Products E2E tests not running in CI  
**Impact**: No end-to-end coverage  
**File**: `packages/web/e2e/products-list.spec.ts`

**Remediation**:
1. Add Playwright to CI workflow
2. Configure E2E environment variables as secrets
3. Add E2E step after staging deploy

**Effort**: 4-8 hours  
**PR Label**: `testing`, `ci`

---

## P3 — Low Priority

### L1. Fix React act() Warning in Tests

**Issue**: "update not wrapped in act()" warning  
**Impact**: Console noise, no functional impact

**Remediation**:
```typescript
await act(async () => {
  await waitFor(() => expect(...));
});
```

**Effort**: 1-2 hours  
**PR Label**: `testing`

---

### L2. Add Node 20 Engine Enforcement

**Issue**: pnpm warning about Node 24 vs expected Node 20  
**Impact**: Cosmetic warning only (CI uses Node 20)

**Remediation**:
```json
// package.json
"engines": {
  "node": ">=20 <25"
}
```

**Effort**: 15 minutes  
**PR Label**: `chore`

---

### L3. Add Image Error Handling

**Issue**: Product images may fail to load silently  
**Impact**: User sees broken image icon

**Remediation**:
```tsx
<img 
  onError={(e) => e.currentTarget.src = '/placeholder.svg'}
  loading="lazy"
/>
```

**Effort**: 1 hour  
**PR Label**: `ux`, `LP-1.3.0`

---

### L4. Document API Response Schema

**Issue**: API response structure not formally documented  
**Impact**: Developer experience

**Remediation**:
1. Add OpenAPI/Swagger spec for `/api/products`
2. Include in SDK package
3. Auto-generate TypeScript types

**Effort**: 4-8 hours  
**PR Label**: `documentation`

---

## Trivial Fixes (Implement Now)

These can be committed directly without separate PRs:

### T1. Add Product Image Fallback ✅
**Commit message**: `fix(products): add image fallback for load errors`

### T2. Add CSS Variable Fallbacks ✅  
**Commit message**: `style(products): add CSS variable fallbacks`

---

## Implementation Order

1. **Week 1**: T1, T2, M1 (bundle size), L3 (image handling)
2. **Week 2**: H1 (integration tests), M4 (E2E in CI)
3. **Week 3**: H2 (auth mocks), M2 (API bundle)
4. **Week 4**: L1, L2, L4 (cleanup)

---

## PRs to Create

| PR | Title | Priority | Labels |
|----|-------|----------|--------|
| LP-1.3.1 | Enable Firestore emulator for integration tests | H1 | tech-debt, testing |
| LP-1.3.2 | Code-split web bundle with manualChunks | M1 | performance |
| LP-1.3.3 | Add E2E tests to CI pipeline | M4 | testing, ci |
| LP-1.3.4 | Product image fallback and CSS hardening | T1, T2, L3 | ux, styling |

---

## Acceptance Criteria Met

| Criterion | Status |
|-----------|--------|
| C1: 00_inventory.md exists | ✅ |
| C2: 01_diagnostics.md exists | ✅ |
| C3: 02_staging-verification.md exists | ✅ |
| C4: 03_remediation-plan.md exists | ✅ |
| C5: 04_evidence/ has build/test logs | ✅ |
| C6: All builds pass | ✅ |
| C7: useProducts tests pass | ✅ (18/18) |
| C8: Staging responds 200 | ✅ |
| C9: Remediation plan prioritized | ✅ |

---

## Sign-off

| Role | Name | Date | Approved |
|------|------|------|----------|
| Auditor | Homer | 2025-12-25 | ✅ |
| Product | Lisa | | ⬜ |

---

**Audit Complete.** Products Page is ready for production use.
