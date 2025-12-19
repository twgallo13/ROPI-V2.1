# PVS-0.2.6 Diagnostic Analysis

## Date: 2025-12-19
## Branch: lisa/PVS-0.2.6/diagnose-fix-tabs-delete

## 1. API Data Analysis

### Attribute Formats Found

Two distinct formats exist in the API response:

#### Format A: Normalized (new format)
```json
{
  "attribute_id": "age_group",
  "label": "Age Group",
  "data_type": "enum",
  "allowed_values": ["Adult", "Kids", ...],
  "status": "active",
  "required_for_completion": true,
  "required_for_export": true,
  "import_required": false,
  "ai_usage_notes": "...",
  "synonyms": [...]
}
```

#### Format B: Legacy (Firestore original)
```json
{
  "attribute_id": "rics_source.brand",
  "dataType": "string",         // camelCase
  "label": "Brand",
  "required": false,
  "description": "...",
  // missing: allowed_values, status, required_for_completion, etc.
}
```

### Key Findings:

1. **`primary_color`** - Has `data_type: "enum"` and `allowed_values` with 17 values ✓
2. **`age_group`** - Has `data_type: "enum"` and `allowed_values` with 5 values ✓
3. **`descriptive.gender`** - Has `dataType: "string"` (camelCase legacy), NO `allowed_values`
4. **`rics_source.brand`** - Has `dataType: "string"` (camelCase legacy), NO `allowed_values`

## 2. Current UI Code Analysis

### AttributeDetailPanel.tsx - Values Tab

The Values tab currently:
1. ✓ Checks `formData.data_type === 'enum' || 'multiSelect'`
2. ✓ Reads `formData.allowed_values || []`
3. ✓ Shows values list if present
4. ✓ Shows placeholder if no values

**Issue**: The tab is functional but static - cannot add/edit values

### AttributeDetailPanel.tsx - Behavior Tab

Currently shows a **placeholder** only:
```tsx
<PlaceholderTab
  tabId="behavior"
  title="Behavior Settings"
  description="Configure import/export requirements..."
/>
```

**Issue**: No actual controls rendered

### AttributeDetailPanel.tsx - AI/SEO Tab

Currently shows a **placeholder** only:
```tsx
<PlaceholderTab
  tabId="ai-seo"
  title="AI & SEO Configuration"
  description="AI usage notes, SEO metadata..."
/>
```

**Issue**: No actual controls rendered

### AttributeHeader.tsx - Kebab Menu

**Currently MISSING** - No kebab/dropdown menu exists for delete/deprecate actions.

## 3. Identified Issues to Fix

### 3A: Behavior Tab - Not Rendering Controls
- **Root Cause**: PlaceholderTab used instead of actual BehaviorPanel
- **Fix**: Wire up BehaviorPanel component with actual form controls

### 3B: AI/SEO Tab - Not Rendering Controls  
- **Root Cause**: PlaceholderTab used instead of actual AiSeoPanel
- **Fix**: Wire up AiSeoPanel component with actual form controls

### 3C: Values Tab - Read-Only
- **Root Cause**: ValuesTab is display-only, no editing capability
- **Fix**: Make values editable with add/remove functionality

### 3D: Missing Kebab Menu for Delete/Deprecate
- **Root Cause**: No kebab menu in AttributeHeader
- **Fix**: Add kebab menu with Deprecate and Delete options

## 4. Implementation Plan

### Priority Order:
1. **Fix Behavior Tab** - Wire BehaviorPanel with actual controls
2. **Fix AI/SEO Tab** - Wire AiSeoPanel with actual controls  
3. **Add Kebab Menu** - Delete/Deprecate with confirmation modal
4. **Values Tab Enhancement** - If time permits, add edit capability

### Components Needed:
- [x] BehaviorPanel exists (from PVS-0.2.4 local work, needs deployment)
- [x] AiSeoPanel exists (from PVS-0.2.4 local work, needs deployment)
- [ ] KebabMenu component (NEW)
- [ ] ConfirmationModal component (NEW or reuse existing)

## 5. Notes

The PVS-0.2.4 work (ValuesManager, BehaviorPanel, AiSeoPanel) was committed locally but **not yet merged to aoss-main**. That's why staging shows placeholders.

**Resolution**: Need to either:
1. Cherry-pick PVS-0.2.4 changes into this branch, OR
2. Re-implement the panels here

Going with option 2 (re-implement) since PVS-0.2.4 branch may have diverged.
