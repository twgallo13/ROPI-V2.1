# LP-1.3.0 — Products Page Inventory

**Audit Date**: 2025-12-25  
**Auditor**: Homer (Copilot)  
**Scope**: `/app/products` (ProductsPage), `useProducts` hook, `/api/products` backend, tests, CI/CD, styling

---

## 1. Core Source Files

### Frontend (packages/web)

| File | Lines | Purpose | Last Modified |
|------|-------|---------|---------------|
| [ProductsPage.tsx](../../../../packages/web/src/pages/ProductsPage.tsx) | 507 | Main products list page UI with search, filters, pagination, product cards | PR #246 |
| [ProductsPage.css](../../../../packages/web/src/pages/ProductsPage.css) | 571 | Mobile-first responsive styles, product card styling, status badges | PR #241 |
| [useProducts.ts](../../../../packages/web/src/hooks/useProducts.ts) | 304 | React hook for fetching products with pagination, search, filters, sorting | PR #246 |
| [authHeaders.ts](../../../../packages/web/src/lib/authHeaders.ts) | ~70 | Firebase ID token helper for authenticated API calls | - |

### Backend (packages/api)

| File | Lines | Purpose | Last Modified |
|------|-------|---------|---------------|
| [products.ts](../../../../packages/api/src/endpoints/products.ts) | 458 | Products API endpoints: GET /products, GET /products/:id, PATCH attributes, search-mpn | PR #296 |
| [apiApp.ts](../../../../packages/api/src/apiApp.ts) | ~200 | Unified Express app mounting all API routes | PR #235 |

---

## 2. Test Files

### Unit Tests

| File | Test Count | Status | Notes |
|------|------------|--------|-------|
| [useProducts.spec.ts](../../../../packages/web/src/hooks/__tests__/useProducts.spec.ts) | 13 tests | ⚠️ Flaky | Firebase Auth mock issues (TECH_DEBT) |

### Integration Tests

| File | Test Count | Status | Notes |
|------|------------|--------|-------|
| [products.integration.test.ts](../../../../packages/api/src/endpoints/__tests__/products.integration.test.ts) | 14 tests | ⚠️ Requires emulator | Needs `FIRESTORE_EMULATOR_HOST` |

### E2E Tests

| File | Test Count | Status | Notes |
|------|------------|--------|-------|
| [products-list.spec.ts](../../../../packages/web/e2e/products-list.spec.ts) | 12 tests | ⚠️ Env vars | Needs `VITE_E2E_ADMIN_EMAIL`, `VITE_E2E_ADMIN_PASSWORD` |

---

## 3. CI/CD Configuration

### Workflow: deploy-staging.yml

| Property | Value |
|----------|-------|
| Trigger Branch | `aoss-main` |
| Target URL | https://ropi-aoss-staging.web.app |
| Build Order | SDK → Web → API → Functions → Hosting |
| Runner | ubuntu-latest |
| Node Version | 20 |
| pnpm Version | 8 |

### Build Commands (from workflow)

```bash
pnpm install
pnpm --filter @ropi-aoss/sdk build
pnpm --filter @ropi-aoss/web build
pnpm --filter @ropi-aoss/api build
```

---

## 4. Related Pull Requests

### Primary Products List PRs (merged)

| PR | Title | Date | Status |
|----|-------|------|--------|
| [#241](https://github.com/twgallo13/ROPI-V2.1/pull/241) | feat(products): Implement Products List Page (AOSS) + useProducts Hook | 2025-12-09 | ✅ Merged |
| [#244](https://github.com/twgallo13/ROPI-V2.1/pull/244) | fix(products): Update route paths from /app/products to /products | 2025-12-10 | ✅ Merged |
| [#246](https://github.com/twgallo13/ROPI-V2.1/pull/246) | feat(products): Production-scale list enhancements | 2025-12-10 | ✅ Merged |

### Related Recent PRs

| PR | Title | Date | Status | Relevance |
|----|-------|------|--------|-----------|
| [#235](https://github.com/twgallo13/ROPI-V2.1/pull/235) | fix(api): mount api router + hosting rewrites | 2025-12-09 | ✅ Merged | Fixed API routing |
| [#296](https://github.com/twgallo13/ROPI-V2.1/pull/296) | LP-1.1.10: MPN scan + product search autocomplete | 2025-12-20 | ✅ Merged | Added search-mpn endpoint |
| [#308](https://github.com/twgallo13/ROPI-V2.1/pull/308) | [LP-1.2.3] Fix MPN lookup 401 error | 2025-12-20 | ✅ Merged | Auth header fix |
| [#327](https://github.com/twgallo13/ROPI-V2.1/pull/327) | LP-3.0.2: defensive guards for attributes.overall | 2025-12-21 | ✅ Merged | Product display guards |

### Open PRs (may affect products)

| PR | Title | Status |
|----|-------|--------|
| [#240](https://github.com/twgallo13/ROPI-V2.1/pull/240) | fix(api): use req.params.listId in lists handlers | 🟡 Open |
| [#310](https://github.com/twgallo13/ROPI-V2.1/pull/310) | LP-2.0.1: Firestore — restrict product writes to admin/server | 🟡 Open |
| [#311](https://github.com/twgallo13/ROPI-V2.1/pull/311) | LP-2.0.2: Sync — normalize data_type tokens | 🟡 Open |
| [#312](https://github.com/twgallo13/ROPI-V2.1/pull/312) | LP-2.0.3: Tasks — per-key updates and attribute provenance | 🟡 Open |

---

## 5. Configuration Files

| File | Purpose |
|------|---------|
| [firebase.json](../../../../firebase.json) | Firebase hosting/functions config with rewrites |
| [firestore.indexes.json](../../../../firestore.indexes.json) | Composite indexes for products queries |
| [firestore.rules](../../../../firestore.rules) | Security rules for products collection |

---

## 6. Known Tech Debt

### Documented in TECH_DEBT_TEST_INFRASTRUCTURE.md

| Issue | Impact | Priority |
|-------|--------|----------|
| Firebase Auth mocks incomplete | Web tests flaky (12/77 failures) | Medium |
| Firestore emulator not configured | API integration tests fail | Medium |
| Missing `FIRESTORE_EMULATOR_HOST` | Tests connect to real project | Medium |

---

## 7. API Response Structure

### GET /api/products

```typescript
interface ProductsListResponse {
  items: ProductSummary[];
  hasMore: boolean;
  pageToken?: string;
  total?: number;  // Only on first page
}

interface ProductSummary {
  id: string;
  sku: string;
  name?: string;
  brand?: string;
  category?: string;
  department?: string;
  status: 'active' | 'draft' | 'inactive';
  websites?: string[];
  thumbnail?: string;
  updatedAt?: Timestamp;
}
```

### Query Parameters

| Param | Type | Description |
|-------|------|-------------|
| `q` | string | Search query (SKU, MPN, name, brand, category, department) |
| `limit` | number | Results per page (default: 50) |
| `pageToken` | string | Cursor for pagination |
| `brand` | string | Filter by brand |
| `status` | string | Filter by status |
| `category` | string | Filter by category |
| `department` | string | Filter by department |
| `sortBy` | string | Sort field (name, sku, updatedAt, createdAt) |
| `sortOrder` | string | Sort direction (asc, desc) |

---

## 8. Feature Summary (from PR #241)

### Frontend Features
- ✅ Search by SKU, MPN, name, brand, category, department
- ✅ Server-side pagination with Load More button
- ✅ Filter by brand, status, category, department
- ✅ Sort by name, SKU, updatedAt, createdAt
- ✅ 300ms debounced search
- ✅ Mobile-first responsive grid (1→2→3→4 columns)
- ✅ 44px minimum tap targets (AOSS compliance)
- ✅ ARIA labels and keyboard accessibility
- ✅ Loading, error, empty states
- ✅ Product cards with image, SKU, name, status badge, website badges
- ✅ Click card → navigate to Product Editor

### Backend Features
- ✅ Firestore query with pagination (cursor-based)
- ✅ Server-side filtering
- ✅ Server-side sorting with secondary sort for stability
- ✅ Total count estimation on first page
- ✅ Admin authentication required

---

## 9. Dependency Chain

```
ProductsPage.tsx
  └── useProducts.ts
        └── authHeaders.ts (getAuthHeaders)
              └── Firebase Auth
        └── fetch('/api/products')
              └── products.ts (listProductsHandler)
                    └── Firestore (products collection)
```

---

## 10. Environment Variables

### Required for E2E Tests
- `VITE_E2E_ADMIN_EMAIL` - Admin email for authentication
- `VITE_E2E_ADMIN_PASSWORD` - Admin password for authentication

### Required for API Integration Tests
- `FIRESTORE_EMULATOR_HOST` - localhost:8080 (for emulator)

### Required for Staging Build
- `VITE_FIREBASE_API_KEY`
- `VITE_FIREBASE_AUTH_DOMAIN`
- `VITE_FIREBASE_PROJECT_ID`
- `VITE_FIREBASE_STORAGE_BUCKET`
- `VITE_FIREBASE_MESSAGING_SENDER_ID`
- `VITE_FIREBASE_APP_ID`

---

**Next Step**: [01_diagnostics.md](./01_diagnostics.md) — Run builds and tests, collect logs
