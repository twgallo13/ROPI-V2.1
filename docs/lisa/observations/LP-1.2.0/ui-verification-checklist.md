# LP-1.2.0 UI Verification Checklist

**Staging URL:** https://ropi-aoss-staging.web.app
**Date:** 2025-12-20
**Verifying PRs:** #301 (Error Handling) + #300 (FieldPicker UX)

---

## A. FieldPicker UX Groups (PR #300 / LP-1.1.14)

### A1. Group Visual Separation
- [ ] **Product Fields Group**: Blue header (#1e3a5f) with 📋 icon
- [ ] **Attributes Group**: Purple header (#3d2e52) with 🏷️ icon
- [ ] Groups have distinct visual separation (border, background)

### A2. Option Badges
- [ ] Product field options show **P** badge (blue background)
- [ ] Attribute options show **A** badge (purple background)
- [ ] Badges appear next to option labels

### A3. Attribute Sub-Groups
- [ ] Attributes grouped by category (e.g., "Dimensions", "General")
- [ ] Category headers show count in parentheses
- [ ] Only ACTIVE attributes displayed
- [ ] Categories sorted alphabetically

### A4. Filtering
- [ ] Typing filters options within groups
- [ ] Group headers remain visible when children match
- [ ] Empty groups hidden when no matches
- [ ] Clear filter restores all groups

### A5. Compact Mode
- [ ] FieldPicker in ObservationFormModal uses compact styling
- [ ] Reduced padding/margins in compact mode
- [ ] Still maintains visual group distinction

### A6. Keyboard Navigation
- [ ] Arrow keys navigate through grouped options
- [ ] Enter selects highlighted option
- [ ] Escape closes dropdown
- [ ] Tab moves to next field

---

## B. Error Handling & Toast UX (PR #301 / LP-1.1.15)

### B1. ErrorBoundary
- [ ] Application wrapped in ErrorBoundary
- [ ] Error state shows friendly message (not white screen)
- [ ] Error details available for debugging
- [ ] "Try Again" button resets error state

### B2. Toast Notifications
- [ ] Success toast: Green background with checkmark
- [ ] Error toast: Red background with X icon
- [ ] Info toast: Blue background with info icon
- [ ] Warning toast: Orange/yellow background
- [ ] Toasts auto-dismiss after appropriate duration
- [ ] Toasts can be manually dismissed with X button

### B3. Toast Stacking
- [ ] Multiple toasts stack vertically
- [ ] Most recent toast appears at top
- [ ] Toasts animate in/out smoothly

### B4. Observation Operations
- [ ] Save observation shows success toast
- [ ] Delete observation shows success toast
- [ ] Failed operations show error toast with message
- [ ] Bulk operations show appropriate feedback

### B5. Console Logging
- [ ] No excessive "observations" debug logs in console
- [ ] Error boundaries log caught errors to console
- [ ] Critical operations logged appropriately

---

## C. Integration Tests

### C1. FieldPicker in ObservationFormModal
- [ ] Opens from Observations tab
- [ ] Product fields section populated from product schema
- [ ] Attributes section populated from retailer config
- [ ] Selection updates observation source field
- [ ] Modal close preserves selection

### C2. Error Recovery
- [ ] Network error during save shows toast, allows retry
- [ ] Validation errors display inline messages
- [ ] Form remains functional after error dismissal

---

## Verification Sign-off

| Tester | Date | Sections Verified | Issues Found |
|--------|------|-------------------|--------------|
| _____  | ___  | _________________| _____________|

---

## Screenshot Checklist

Screenshots to capture:
1. `fieldpicker-groups-full.png` - Full dropdown showing both groups
2. `fieldpicker-compact.png` - Compact mode in modal
3. `fieldpicker-filtering.png` - Filtered state
4. `toast-success.png` - Success notification
5. `toast-error.png` - Error notification
6. `errorboundary-error.png` - ErrorBoundary error state (if testable)
