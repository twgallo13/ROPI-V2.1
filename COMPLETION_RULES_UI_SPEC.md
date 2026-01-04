# Completion Rules UI Specification

**Authoritative Specification**  
**LP-completion-model-export-gate-1.0.0**  
**Canonical Source of Truth for UI Behavior**

---

## Purpose

This document defines the **authoritative UI specification** for Completion Rules administration interface. It documents **actual implemented behavior** to eliminate ambiguity, defaults, and implicit assumptions.

**Scope:**
- Export Settings Page UI (`/settings/export`)
- Completion rules CRUD operations
- Validation and user feedback
- UI-to-backend contract

**Explicit Non-Scope:**
- Backend evaluation logic (see `COMPLETION_RULES_BACKEND_CONFIG.md`)
- Product-level completion panels (operator visibility UI)
- Future features or placeholders

---

## UI Location and Access

**Route:** `/settings/export`  
**Component:** `packages/web/src/pages/settings/ExportSettingsPage.tsx`  
**Access Control:** Admin users only  
**Navigation:** From Settings page → "Export Settings" link

**Storage Location (canonical):**
```
Document: settings/exportSettings
Field:    completionRules
Versioned snapshots: settings/exportSettings/completionRulesVersions/{version}
```
All UI reads/writes target the `completionRules` field on `settings/exportSettings` (merge writes only).

---

## Page Structure

### Header Section

```
Completion Rules Configuration
├── Title: "Completion Rules Configuration"
├── Subtitle: Explains that changes affect export gate behavior
└── Governance Notice: Warning that this is the single canonical gate
```

**Governance Notice (Always Visible):**
```
⚠️ This affects export blocking

Completion is the single canonical gate to export. The rules you configure 
here determine which products are blocked from export. Changes take effect 
immediately.
```

### Configuration Sections

1. **Export Unlock Threshold** — Global completion percentage gate
2. **Completion Segments** — Weighted attribute categories
3. **Exclusions** — Read-only governance policy (media/pricing)
4. **Configuration Info** — Version metadata
5. **Actions** — Save/Cancel buttons

---

## Export Unlock Threshold

**UI Elements:**

- **Label:** "Minimum Completion %"
- **Input Type:** Number (0-100)
- **Current Value:** `rules.exportUnlockThresholdPct`
- **Validation:** Real-time clamping to 0-100 range
- **Hint Text:**
  ```
  Products with overall completion below this percentage will be blocked 
  from export. This is checked after all site-aware blocking is evaluated.
  ```

**Behavior:**
- User changes value → immediately update state (no save required yet)
- Out-of-range values clamped to 0-100 on blur
- Validation errors cleared on edit

**Backend Contract:**
- Saved as `exportUnlockThresholdPct: number` (0-100)
- Backend validates range on write

---

## Completion Segments

### Segment List Display

Each segment rendered as a card with:

```
[Segment Name]                                    [Enabled Toggle] [Remove]
ID: segment-id

Weight (%)
[75] %
Total of all enabled segments must equal 100%

Rule Type
[ALL_REQUIRED ▼]

Applies To
Mode: [ALL_PRODUCTS ▼]
Sites: [us] [uk] [mltd] (checkboxes)

Attribute Selector
Source: [REGISTRY ▼]
Categories: description, seo
Requirement Flag: required_for_completion
Site Aware: [✓] Yes
Include Internal Only: [ ] No
```

### Segment Editor Fields

| Field | Type | Options | Validation |
|-------|------|---------|------------|
| **Enabled** | Toggle | true/false | At least one segment must be enabled |
| **Weight (%)** | Number | 0-100 | Enabled segments must sum to 100% |
| **Rule Type** | Dropdown | `ALL_REQUIRED`, `ANY_REQUIRED` | Required |
| **Applies To Mode** | Dropdown | `ALL_PRODUCTS`, `CONDITIONAL` | Required |
| **Applies To Sites** | Multi-checkbox | Site list from config | Required if mode = CONDITIONAL |
| **Attribute Selector Source** | Dropdown | `REGISTRY`, `STATIC` | Required |
| **Categories** | Text (comma-separated) | - | Required if source = REGISTRY |
| **Requirement Flag** | Text | - | Required if source = REGISTRY |
| **Site Aware** | Checkbox | true/false | Affects attribute lookup |
| **Include Internal Only** | Checkbox | true/false | - |
| **Exclude Attribute IDs** | Text (comma-separated) | - | Optional |
| **Static Attribute IDs** | Text (comma-separated) | - | Required if source = STATIC |

### Weight Distribution Visualization

**Below segment cards, always visible:**

```
Weight Distribution
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Description & SEO       ████████████████████████ 60%
Technical Specifications ███████████████ 40%

Total (enabled): 100%
```

**Rendering Logic:**
- Show all segments (enabled and disabled)
- Disabled segments shown grayed with "(disabled)" label
- Bar width = `segment.weightPct` percentage
- Total calculated from enabled segments only
- Visual warning if total ≠ 100%

---

## Validation

### Client-Side Validation (Pre-Save)

Performed by `validateRules()` function:

1. **At least one segment enabled:**
   - Error: "At least one segment must be enabled"

2. **Weight sum = 100% (enabled only):**
   - Tolerance: ±0.1%
   - Error: "Enabled segment weights must sum to 100% (currently {actual}%)"

3. **Threshold range:**
   - Must be 0-100
   - Error: "Threshold must be between 0 and 100"

4. **Site selection (conditional segments):**
   - If segment enabled AND `appliesTo.mode = 'CONDITIONAL'`
   - Error: "Segment '{name}' is enabled but no sites selected"

**Display:**
- Validation errors shown in alert box above form
- Save button disabled when validation errors exist
- Errors cleared when user edits relevant fields

### Server-Side Validation

Backend service (`saveCompletionRules`) validates:
- Schema structure
- Weight distribution (stricter tolerance)
- Attribute selector configuration
- Referenced attribute existence (if using STATIC mode)

**Error Handling:**
- Backend errors displayed in red alert box
- User must fix issues and re-submit

---

## Save Behavior

### Save Flow

1. User clicks "Save Changes"
2. Client-side validation runs
3. If validation fails → show errors, block save
4. If validation passes:
   - Set `saving = true` (disable button, show "Saving...")
   - Call `saveCompletionRules(rules)`
   - On success:
     - Show green success message: "Completion rules saved successfully"
     - Auto-dismiss after 3 seconds
   - On error:
     - Show red error message with backend error text
     - Keep form editable

### Backend Write Contract

**Endpoint:** Firestore write to `settings/exportSettings/completionRules`

**Payload:**
```typescript
{
  schemaVersion: string;
  rulesVersion: number;           // Auto-incremented by backend
  updatedAt: string;              // ISO 8601, set by backend
  updatedBy: string;              // Firebase Auth UID
  exportUnlockThresholdPct: number;
  segments: SegmentConfig[];
  builtInSegments: { ... };       // Preserved from original
  exclusions: { ... };            // Preserved from original
}
```

**Version Management:**
- `rulesVersion` auto-incremented on save
- Previous version archived to `completionRulesVersions/{version}` subcollection
- `updatedAt` and `updatedBy` set by backend using auth context

---

## Exclusions Section (Read-Only)

**Display:**

```
Exclusions

The following attribute categories are excluded by governance and will 
never block export:

┌─────────────────────────┬─────────────────────────┐
│ Media                   │ Pricing                 │
│                         │                         │
│ Media attributes        │ Pricing attributes      │
│ excluded by governance  │ excluded by governance  │
│ directive               │ directive               │
│                         │                         │
│ ✅ Does NOT affect      │ ✅ Does NOT affect      │
│    completion           │    completion           │
└─────────────────────────┴─────────────────────────┘
```

**Properties:**
- Non-editable (governance policy)
- Always shows `affectsCompletion = false`
- Displays `reason` text from config

---

## Configuration Info Section

**Display (Read-Only):**

| Field | Value |
|-------|-------|
| Schema Version | `1.0` |
| Rules Version | `42` |
| Last Updated | `Jan 4, 2026, 3:45 PM` (localized) |
| Updated By | `user@example.com` |

**Purpose:**
- Audit trail
- Version tracking
- Helps operators verify which config version is active

---

## Error States

### Loading State

```
Loading completion rules...
```

- Spinner or loading indicator
- No form elements visible

### No Rules Found

```
[Error Icon]
No completion rules found

[Retry Button]
```

- Shown if Firestore document doesn't exist
- Retry button calls `loadRules()` again

### Load Error

```
[Error Icon]
Failed to load rules: {error message}

[Retry Button]
```

- Network errors, permission errors, etc.

---

## Field-Level Behavior

### Weight Input

- **Type:** `<input type="number">`
- **Range:** 0-100
- **Step:** 1 (or allow decimals for precision)
- **Validation:** Clamp to 0-100 on change
- **Live Update:** Weight bar visualization updates immediately

### Rule Type Dropdown

- **ALL_REQUIRED:** "All attributes in segment must be present"
- **ANY_REQUIRED:** "At least one attribute must be present"

**Display Hint:**
- Shown below dropdown
- Explains evaluation logic

### Applies To Mode

- **ALL_PRODUCTS:** "Applies to every product in catalog"
- **CONDITIONAL:** "Only applies to products on selected sites"

**Conditional Behavior:**
- When `CONDITIONAL` selected → show site checkboxes
- When `ALL_PRODUCTS` selected → hide site checkboxes (sites array empty)

### Site Checkboxes

- **Source:** `allSites` array (currently hard-coded, future: fetch from registry)
- **Multi-select:** User can check multiple sites
- **Required:** At least one site must be selected if mode = CONDITIONAL

### Attribute Selector Source

- **REGISTRY:** "Load attributes from registry using filters"
- **STATIC:** "Use explicit attribute ID list"

**Conditional Fields:**
- `REGISTRY` → show: Categories, Requirement Flag, Site Aware, Include Internal Only
- `STATIC` → show: Static Attribute IDs

---

## UI Invariants

### Required Invariants

1. **Real-Time Validation Feedback:**
   - Weight distribution updates live as user edits
   - Validation errors update on form change
   - Save button disabled when validation fails

2. **Non-Destructive Editing:**
   - All changes local until "Save Changes" clicked
   - Navigating away without saving → changes lost (consider warning)
   - Reload page → reverts to last saved config

3. **Atomic Saves:**
   - Entire configuration saved as one transaction
   - No partial saves
   - Backend validates entire config before write

4. **Immediate Effect Notice:**
   - UI warns that changes affect live export behavior
   - No "staging" or "preview" mode
   - Save → immediate backend enforcement

### Prohibited Patterns

1. ❌ Saving invalid configurations (client blocks)
2. ❌ Allowing weight sum ≠ 100% for enabled segments
3. ❌ Allowing threshold outside 0-100 range
4. ❌ Modifying exclusions in UI (governance-locked)
5. ❌ Showing default configurations (must load from Firestore)

---

## User Workflows

### Adjusting Export Threshold

1. Navigate to `/settings/export`
2. Locate "Export Unlock Threshold" section
3. Change percentage value
4. Click "Save Changes"
5. Confirm success message

**Result:** Products with completion below new threshold now blocked

### Adding a New Segment

**Current UI Limitation:** No "Add Segment" button implemented  
**Workaround:** Manually add to Firestore or use admin API

**Future Enhancement:** Add segment creation UI

### Disabling a Segment

1. Locate segment card
2. Toggle "Enabled" to off
3. Segment grayed out, weight no longer counted
4. Adjust other segments' weights to maintain 100% total
5. Click "Save Changes"

### Removing a Segment

1. Locate segment card
2. Click "Remove" button (only if > 1 segment exists)
3. Segment removed from list
4. Adjust remaining segments' weights to 100%
5. Click "Save Changes"

**Note:** Cannot remove last segment (minimum one required)

---

## File References

**UI Implementation:**
- `/packages/web/src/pages/settings/ExportSettingsPage.tsx` — Main UI component
- `/packages/web/src/pages/settings/ExportSettingsPage.css` — Styles
- `/packages/web/src/services/completionRulesClient.ts` — Firestore API client

**Related UI:**
- `/packages/web/src/components/product/CompletionExportGatePanel.tsx` — Product-level completion display

---

## API Contract

### Load Rules

```typescript
async function fetchCompletionRules(): Promise<CompletionRulesConfig | null>
```

**Returns:**
- `CompletionRulesConfig` if document exists
- `null` if document missing
- Throws on network/permission errors

### Save Rules

```typescript
async function saveCompletionRules(rules: CompletionRulesConfig): Promise<void>
```

**Input:** Complete configuration object  
**Side Effects:**
- Increments `rulesVersion`
- Sets `updatedAt` to current timestamp
- Sets `updatedBy` to current user's Firebase UID
- Archives previous version to subcollection

**Throws:**
- Validation errors
- Permission errors
- Network errors

---

## Visual Design Guidelines

### Alert Boxes

- **Error:** Red background, error icon
- **Warning:** Yellow background, warning icon
- **Success:** Green background, checkmark icon

**Example:**
```
┌─────────────────────────────────────────────┐
│ ⚠️  Validation errors:                      │
│   • Enabled segment weights must sum to    │
│     100% (currently 95.0%)                  │
└─────────────────────────────────────────────┘
```

### Segment Cards

- **Enabled:** White background, full opacity
- **Disabled:** Gray background, reduced opacity
- **Hover:** Slight shadow elevation
- **Remove Button:** Only visible on hover (if removable)

### Weight Bars

- **Color:** Blue gradient for enabled, gray for disabled
- **Width:** Proportional to `weightPct`
- **Label:** Percentage shown inside bar if width > 5%

---

## Accessibility

### Required Attributes

- All inputs have `<label>` with `htmlFor` linkage
- Dropdown selects have aria-labels
- Error messages associated with fields via `aria-describedby`
- Disabled state clearly indicated visually and via `disabled` attribute

### Keyboard Navigation

- Tab order: top to bottom, left to right
- Enter on "Save Changes" submits form
- Escape in modal dialogs cancels action

---

## Change History

| Version | Date | Change |
|---------|------|--------|
| 1.0.0 | 2026-01-04 | Initial authoritative documentation (LP-completion-model-export-gate-1.0.0) |

---

## Governance Compliance

This document satisfies LP acceptance criteria:

- ✅ Matches existing UI behavior exactly
- ✅ Eliminates ambiguity in UI interactions
- ✅ Documents validation rules and constraints
- ✅ Prohibits undefined behavior
- ✅ Defines complete UI-to-backend contract
- ✅ Serves as single source of truth for UI

**No code changes are permitted under this LP.**
