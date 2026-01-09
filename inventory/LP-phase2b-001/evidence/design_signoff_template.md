# Precondition: Design Sign-off on UI/UX

**Status:** ⏳ PENDING APPROVAL

## Requirement

Obtain UI/UX design approval for all Phase 2B components before implementation begins.

## Components Requiring Approval

### 1. CompletionCard

**Purpose:** Display per-product completion percentage, status, and segment breakdown

**Visual Elements:**
- Completion percentage (large, prominent display)
- Status badge (color-coded: green=ready, yellow=partial, red=blocked)
- Segment breakdown (attributes, content items)
- "View details" expansion panel (optional)

**States:**
- Loading (skeleton/spinner)
- Success (data displayed)
- Error (API failure message)

**Accessibility:**
- ARIA label for completion percentage
- Screen reader text for status
- Keyboard navigation support

**i18n:**
- All labels externalized to locale files
- Number formatting (percentage)

### 2. ExportGatePanel

**Purpose:** Export button with blocking reasons (if applicable)

**Visual Elements:**
- Export button (enabled for ready, disabled for partial/blocked)
- Blocking reasons list (when status is not ready)
- Tooltip on disabled button explaining why export is blocked

**States:**
- Ready: Green button, no blocking reasons
- Partial: Disabled button, blocking reasons shown
- Blocked: Disabled button, blocking reasons with segment details
- Loading: Button disabled with spinner
- Error: Error message

**Accessibility:**
- ARIA disabled state
- Screen reader text for blocking reasons
- Focus management

**i18n:**
- Button labels
- Blocking reason messages
- Error messages

### 3. GlobalModeCard

**Purpose:** "Advanced / site details" toggle for site-specific completion data

**Visual Elements:**
- Toggle/accordion control
- Site-specific completion breakdown (when expanded)
- Collapse/expand animation

**States:**
- Collapsed (default)
- Expanded (site details visible)
- Loading (data fetch in progress)
- Error (API failure)

**Accessibility:**
- ARIA expanded/collapsed state
- Keyboard toggle support
- Focus management on expand/collapse

**i18n:**
- Toggle label ("Advanced", "Site details")
- Site names
- Completion labels

### 4. Admin: Completion Rules Versions Page

**Purpose:** Read-only view of completion rules history

**Visual Elements:**
- Versions list (table or cards)
- Each version shows: timestamp, author, rule count
- Version details view (read-only, no edit buttons)

**States:**
- Loading (skeleton)
- Success (versions list)
- Empty (no versions)
- Error (API failure)

**Accessibility:**
- Table semantics (if table layout)
- Screen reader text for timestamps
- Keyboard navigation

**i18n:**
- Column headers
- Timestamps (locale-aware formatting)
- "No versions" message

## Design Checklist

- [ ] **Responsive Design:** Mobile, tablet, desktop layouts approved
- [ ] **Color Contrast:** WCAG AA compliance verified
- [ ] **Typography:** Font sizes, weights, hierarchy approved
- [ ] **Spacing:** Padding, margins, gaps consistent with design system
- [ ] **Animations:** Transitions and loading states approved
- [ ] **Error States:** All error messages and fallbacks designed
- [ ] **Loading States:** Skeletons/spinners approved
- [ ] **Empty States:** "No data" messages designed
- [ ] **Accessibility:** ARIA labels, focus indicators, keyboard nav approved
- [ ] **i18n:** All text externalized, number/date formatting considered

## Approval Process

1. **Design Review Meeting:** Present mockups to Lisa (Phase Owner)
2. **Feedback Iteration:** Address any design changes
3. **Final Sign-off:** Lisa approves designs for implementation
4. **Document Approval:** Record approval in this file with timestamp and approver

## Approval Record

**Approver:** ________________  
**Date:** ________________  
**Notes:** ________________

---

**Once approved, update precondition status to SATISFIED in HES.**
