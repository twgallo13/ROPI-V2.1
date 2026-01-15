# LP-1.3.1 — T1 Follow-ups: Image-Handling Refactor + Accessibility Tweaks

## Summary

Follow-up LP for CodeRabbit nitpicks from LP-1.3.0 (PR #344).

## Scope

CodeRabbit suggestions from LP-1.3.0 review:

### 1. React State Refactor
- Replace direct DOM manipulation with React state for image error handling
- File: `packages/web/src/pages/ProductsPage.tsx`
- Current: `onError` handler uses `e.currentTarget.style.display` and `classList.remove()`
- Target: Use `useState` to track image load errors per product

### 2. aria-hidden on SVG
- Add `aria-hidden="true"` to decorative fallback SVG icons
- File: `packages/web/src/pages/ProductsPage.tsx`
- Current: SVG fallback icon lacks accessibility attribute
- Target: Add `aria-hidden="true"` since icon is decorative

### 3. Docs Clarification
- Minor wording improvements in audit documents
- File: `docs/lisa/products-audit/LP-1.3.0/00_inventory.md`
- Current: "Diagnostics…reveal" phrasing
- Target: Clearer attribution wording

## Status

🔲 **Planned** — No implementation changes committed yet.

## Related

- Parent LP: #344 (LP-1.3.0)
- CodeRabbit review: https://github.com/twgallo13/ROPI-V2.1/pull/344
