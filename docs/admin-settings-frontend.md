# Admin Settings Frontend

**Prompt-Version:** Lisa v0.2.0

## Overview

Frontend UI components and E2E tests for Admin Settings management.

## Components

### Settings Hub (`/settings`)
- Navigation page linking to Attributes, SmartRules, and AITemplate managers
- Located: `packages/web/src/pages/Settings/index.tsx`

### Attribute Manager (`/settings/attributes`)
- Full CRUD interface for product attributes
- Features:
  - List view with status indicators
  - Create/Edit form with validation
  - Delete with confirmation
  - TODO: Search and filtering
  - TODO: API integration
- Located: `packages/web/src/pages/Settings/AttributeManager.tsx`

## API Integration (TODO)

The AttributeManager uses placeholder hooks that need to be wired to the backend:

```typescript
// Current: Mock hooks
function useAttributes() {
  // TODO: Implement with fetch/axios
  // GET /admin/settings/attributes
  // POST /admin/settings/attributes
  // PUT /admin/settings/attributes/:id
  // DELETE /admin/settings/attributes/:id
}
```

## E2E Tests

Located: `packages/web/e2e/admin-attribute-crud.spec.ts`

Test scenarios:
- Admin login and navigation
- Create attribute with validation
- Edit existing attribute
- Delete attribute with confirmation
- Form validation (required fields, format)
- Error handling
- Pagination (TODO)
- Search/filtering (TODO)

## Routes (TODO)

Update app routing to include:
```typescript
<Route path="/settings" element={<SettingsHub />} />
<Route path="/settings/attributes" element={<AttributeManager />} />
<Route path="/settings/smartrules" element={<SmartRulesManager />} /> // TODO
<Route path="/settings/aitemplates" element={<AITemplatesManager />} /> // TODO
```

## Styling

Uses `Settings.css` for layout and theming. Component follows existing ROPI design patterns.

## Next Steps

1. Wire useAttributes hook to real API endpoints
2. Add authentication/authorization checks
3. Implement SmartRules and AITemplate managers
4. Add search, filtering, and pagination
5. Complete E2E tests with helper functions
6. Add loading states and error boundaries

## Related PRs

- PR #218: Attributes backend API (Lisa v0.2.0)
- PR #219: CHANGES.md update (Lisa v0.2.0)
- PR #XXX: Frontend scaffold (this PR)
