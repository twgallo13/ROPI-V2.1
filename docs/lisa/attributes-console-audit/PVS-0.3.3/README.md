# PVS-0.3.3: Audit UI - Timeline, Diffs, Revert, Usage & Export

**Branch:** `lisa/PVS-0.3.3/audit-ui`  
**PR:** [#292](https://github.com/twgallo13/ROPI-V2.1/pull/292)  
**Staging:** https://ropi-aoss-staging.web.app  
**Date:** 2025-01-24

## Overview

This milestone implements the Audit UI for the Attributes Console, providing a comprehensive interface for viewing attribute change history, comparing versions, reverting to previous states, and exporting audit logs.

## Components Created

### 1. AuditTab (`AuditTab.tsx`)
**Purpose:** Main container component for the Audit tab in AttributeDetailPanel  
**Lines:** ~180

Features:
- Integrates all audit subcomponents
- Manages revert confirmation flow
- Handles error states and loading

### 2. AuditTimeline (`AuditTimeline.tsx`)
**Purpose:** Chronological list of audit events  
**Lines:** ~300

Features:
- Expand/collapse for each event
- Color-coded by action type:
  - 🟢 `create` - Green
  - 🔵 `update` - Blue
  - 🔴 `delete` - Red
  - 🟡 `revert` - Yellow
- Relative timestamps (e.g., "2 hours ago")
- Changed fields summary
- "View Diff" and "Revert" buttons per event
- "Load More" pagination

### 3. DiffViewer (`DiffViewer.tsx`)
**Purpose:** Side-by-side JSON diff visualization  
**Lines:** ~400

Features:
- Before/After panels
- Syntax highlighting for:
  - 🟢 Added keys (green background)
  - 🔴 Removed keys (red background)
  - 🟡 Modified values (yellow background)
- Copy to clipboard functionality
- Collapsible nested objects
- Keyboard-accessible

### 4. RevertModal (`RevertModal.tsx`)
**Purpose:** Confirmation modal for revert operations  
**Lines:** ~300

Safety Features:
- Requires reason (minimum 10 characters)
- Requires explicit checkbox confirmation
- Shows diff preview
- Displays product impact count
- Disabled state during processing
- Prevents accidental closure during revert

### 5. UsageSamplePanel (`UsageSamplePanel.tsx`)
**Purpose:** Display attribute usage statistics  
**Lines:** ~200

Features:
- Total product count using attribute
- Sample products with links to product editor
- Loading state with skeleton
- Empty state messaging

### 6. ExportAuditButton (`ExportAuditButton.tsx`)
**Purpose:** Export audit log to CSV or JSON  
**Lines:** ~280

Features:
- Dropdown menu for format selection
- CSV export with headers
- JSON export with pretty-printing
- Optional date range filter
- Actor filter option

## Hook Created

### useAudit (`useAudit.ts`)
**Purpose:** React hook for audit API operations  
**Lines:** ~300

State:
- `events` - Array of audit events
- `total` - Total event count
- `hasMore` - Pagination flag
- `pageToken` - Next page cursor
- `loading` - Loading state
- `reverting` - Revert in progress
- `error` - Error message
- `usage` - Usage statistics
- `selectedEvent` - Currently selected event for diff view

Functions:
- `fetchEvents()` - Load audit events with pagination
- `fetchUsage()` - Get usage statistics
- `revertToEvent(eventId, reason)` - Revert to previous state
- `selectEvent(event)` - Select event for detailed view
- `clearSelectedEvent()` - Clear selection
- `loadMore()` - Load next page

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/admin/settings/attributes/{id}/audit` | List audit events |
| GET | `/api/admin/settings/attributes/{id}/audit/{eventId}` | Get event detail |
| POST | `/api/admin/settings/attributes/{id}/revert` | Revert to previous state |
| GET | `/api/admin/settings/attributes/{id}/usage` | Get usage statistics |

**Note:** These endpoints are wired in the UI but require backend implementation (PVS-0.3.0 M1).

## Styles

### AuditTab.module.css (~600 lines)
- Timeline styles with color-coded event indicators
- Diff viewer with syntax highlighting
- Modal with overlay and animations
- Export dropdown menu
- Responsive layout
- Dark/light theme support via CSS variables

## Test Coverage

| File | Tests | Status |
|------|-------|--------|
| useAudit.spec.ts | 8 | ✅ Passing |
| DiffViewer.spec.tsx | 13 | ✅ Passing |
| AuditTimeline.spec.tsx | 15 | ✅ Passing |
| RevertModal.spec.tsx | 18 | ✅ Passing |
| **Total** | **54** | ✅ **All Passing** |

## Build Verification

```bash
npm run build  # ✅ ~1,018 KB bundle
npm run test   # ✅ 54 tests passing
```

## Files Changed

### New Files (11)
1. `packages/web/src/hooks/useAudit.ts`
2. `packages/web/src/components/AuditTab.tsx`
3. `packages/web/src/components/AuditTimeline.tsx`
4. `packages/web/src/components/DiffViewer.tsx`
5. `packages/web/src/components/RevertModal.tsx`
6. `packages/web/src/components/UsageSamplePanel.tsx`
7. `packages/web/src/components/ExportAuditButton.tsx`
8. `packages/web/src/components/AuditTab.module.css`
9. `packages/web/src/hooks/__tests__/useAudit.spec.ts`
10. `packages/web/src/components/__tests__/DiffViewer.spec.tsx`
11. `packages/web/src/components/__tests__/AuditTimeline.spec.tsx`
12. `packages/web/src/components/__tests__/RevertModal.spec.tsx`

### Modified Files (1)
- `packages/web/src/components/AttributeDetailPanel.tsx` - Wired AuditTab

## Usage

Navigate to Settings → Attributes → [Any Attribute] → Audit Tab

The Audit tab displays:
1. **Timeline** - All changes with expand/collapse
2. **Usage Panel** - Product count and samples
3. **Export Button** - Download audit log

To revert:
1. Find the event in the timeline
2. Click "Revert to This Version"
3. Review the diff preview
4. Enter a reason (min 10 chars)
5. Check the confirmation checkbox
6. Click "Confirm Revert"

## Dependencies

- React 18+
- Vite
- TypeScript
- CSS Modules
- Vitest + React Testing Library

## Related Work

| Milestone | Description | Status |
|-----------|-------------|--------|
| PVS-0.3.0 M1 | Audit backend plumbing | Completed |
| PVS-0.3.1 | Mapping API | PR #289 |
| PVS-0.3.2 | Mapping UI | PR #291 |
| **PVS-0.3.3** | **Audit UI** | **PR #292** ✅ |
