# LP-1.3.0 — Staging Verification Checklist

**Audit Date**: 2025-12-25  
**Staging URL**: https://ropi-aoss-staging.web.app  
**Test Account Required**: Admin credentials with `role: admin` custom claim

---

## Pre-Verification Setup

### 1. Ensure Admin Access
- [ ] Sign in with admin account at `/login`
- [ ] Verify admin role in Firebase Auth custom claims
- [ ] Check browser console for auth errors

### 2. Open DevTools
- Network tab: Filter by XHR/Fetch
- Console tab: Filter errors
- Performance tab: Ready for audit

---

## Functional Verification

### A. Products List Page Load

**URL**: `/products`

| Check | Expected | Status | Notes |
|-------|----------|--------|-------|
| Page renders without errors | Clean console | ⬜ | |
| Products grid displays | Product cards visible | ⬜ | |
| Loading state shown | Spinner during fetch | ⬜ | |
| Products API call | GET /api/products 200 | ⬜ | |
| Response has `items` array | JSON structure valid | ⬜ | |
| Results count displayed | "Showing X products" | ⬜ | |

### B. Search Functionality

| Check | Expected | Status | Notes |
|-------|----------|--------|-------|
| Search input visible | Text field with placeholder | ⬜ | |
| Type query (e.g., "nike") | 300ms debounce, then fetch | ⬜ | |
| Results filter correctly | Only matching products | ⬜ | |
| Clear search button | "×" button clears input | ⬜ | |
| Empty results message | "No products found" | ⬜ | |
| API query param | `?q=<search>` in request | ⬜ | |

### C. Filter Controls

| Check | Expected | Status | Notes |
|-------|----------|--------|-------|
| Brand filter dropdown | Populated with brands | ⬜ | |
| Status filter dropdown | active/draft/inactive | ⬜ | |
| Category filter dropdown | Populated with categories | ⬜ | |
| Department filter dropdown | Populated with departments | ⬜ | |
| Filter applied | Results update | ⬜ | |
| Clear filters button | All filters reset | ⬜ | |
| Multiple filters | Combine correctly | ⬜ | |

### D. Sort Controls

| Check | Expected | Status | Notes |
|-------|----------|--------|-------|
| Sort dropdown visible | Select element | ⬜ | |
| Sort by Name (A-Z) | Alphabetical order | ⬜ | |
| Sort by Name (Z-A) | Reverse alphabetical | ⬜ | |
| Sort by SKU | SKU order | ⬜ | |
| Sort by Updated | Most recent first | ⬜ | |
| API params | `sortBy=` and `sortOrder=` | ⬜ | |

### E. Pagination

| Check | Expected | Status | Notes |
|-------|----------|--------|-------|
| Load More button | Visible when hasMore=true | ⬜ | |
| Click Load More | Appends more products | ⬜ | |
| pageToken in request | Cursor-based pagination | ⬜ | |
| Button disabled during load | Prevents double-click | ⬜ | |
| Hidden when no more | Button disappears | ⬜ | |

### F. Product Card Display

| Check | Expected | Status | Notes |
|-------|----------|--------|-------|
| Image placeholder | Shows when no image | ⬜ | |
| Product image | Lazy loads when present | ⬜ | |
| SKU displayed | Monospace font | ⬜ | |
| Product name | 2-line max, ellipsis | ⬜ | |
| Brand and category | Secondary text | ⬜ | |
| Status badge | Color-coded (green/yellow/red) | ⬜ | |
| Website badges | Show assigned websites | ⬜ | |

### G. Navigation to Editor

| Check | Expected | Status | Notes |
|-------|----------|--------|-------|
| Click product card | Navigates to editor | ⬜ | |
| URL format | `/products/:id` | ⬜ | |
| Editor loads product | Correct product data | ⬜ | |
| Back navigation | Returns to list | ⬜ | |

---

## Error Handling

### H. Error States

| Check | Expected | Status | Notes |
|-------|----------|--------|-------|
| Network offline | Error message, retry button | ⬜ | |
| 401 Unauthorized | "Sign in again" message | ⬜ | |
| 403 Forbidden | Permission message | ⬜ | |
| 500 Server error | Generic error, retry | ⬜ | |

### I. Empty States

| Check | Expected | Status | Notes |
|-------|----------|--------|-------|
| No products in DB | "No products yet" message | ⬜ | |
| Search no results | "No products match" | ⬜ | |
| Filter no results | Clear filters hint | ⬜ | |

---

## Responsive Design

### J. Mobile (< 640px)

| Check | Expected | Status | Notes |
|-------|----------|--------|-------|
| Single column grid | 1 product per row | ⬜ | |
| Touch targets | ≥ 44px height | ⬜ | |
| Filters stack | Single column layout | ⬜ | |
| Search full width | Spans container | ⬜ | |

### K. Tablet (640px - 1024px)

| Check | Expected | Status | Notes |
|-------|----------|--------|-------|
| Two column grid | 2 products per row | ⬜ | |
| Filters 2 columns | 2x2 grid | ⬜ | |

### L. Desktop (> 1024px)

| Check | Expected | Status | Notes |
|-------|----------|--------|-------|
| Three column grid | 3 products per row | ⬜ | |
| Four column (> 1400px) | 4 products per row | ⬜ | |
| Filters 4 columns | Single row | ⬜ | |

---

## Accessibility

### M. Keyboard Navigation

| Check | Expected | Status | Notes |
|-------|----------|--------|-------|
| Tab to search | Focus visible | ⬜ | |
| Tab to filters | Sequential focus | ⬜ | |
| Tab to cards | Card receives focus | ⬜ | |
| Enter on card | Navigates to editor | ⬜ | |
| Focus ring visible | 2px outline | ⬜ | |

### N. Screen Reader

| Check | Expected | Status | Notes |
|-------|----------|--------|-------|
| Page heading | "Products" h1 | ⬜ | |
| Search label | Accessible name | ⬜ | |
| Filter labels | Field labels | ⬜ | |
| Card link text | Product name | ⬜ | |
| Loading announcement | Live region | ⬜ | |

---

## Performance

### O. Network Performance

| Check | Expected | Status | Notes |
|-------|----------|--------|-------|
| Initial load time | < 3s | ⬜ | |
| API response time | < 500ms | ⬜ | |
| Image lazy loading | Images load on scroll | ⬜ | |
| Debounce working | Single request per input | ⬜ | |

### P. JavaScript Errors

| Check | Expected | Status | Notes |
|-------|----------|--------|-------|
| Console errors | None | ⬜ | |
| Console warnings | React act() only | ⬜ | |
| Unhandled promises | None | ⬜ | |

---

## Browser Compatibility

### Q. Modern Browsers

| Browser | Version | Status | Notes |
|---------|---------|--------|-------|
| Chrome | 120+ | ⬜ | |
| Firefox | 120+ | ⬜ | |
| Safari | 17+ | ⬜ | |
| Edge | 120+ | ⬜ | |

---

## Verification Summary

| Category | Pass | Fail | Skip |
|----------|------|------|------|
| Page Load | /6 | | |
| Search | /6 | | |
| Filters | /7 | | |
| Sort | /6 | | |
| Pagination | /5 | | |
| Card Display | /7 | | |
| Navigation | /4 | | |
| Error States | /4 | | |
| Empty States | /3 | | |
| Mobile | /4 | | |
| Tablet | /2 | | |
| Desktop | /3 | | |
| Keyboard | /5 | | |
| Screen Reader | /5 | | |
| Performance | /4 | | |
| JS Errors | /3 | | |
| Browsers | /4 | | |

**Total**: ___/78 checks

---

## Issues Found

| ID | Severity | Description | Screenshot | Remediation |
|----|----------|-------------|------------|-------------|
| | | | | |

---

## Sign-off

| Role | Name | Date | Approved |
|------|------|------|----------|
| QA | | | ⬜ |
| Product | Lisa | | ⬜ |

---

**Next Step**: [03_remediation-plan.md](./03_remediation-plan.md) — Prioritized fix list
