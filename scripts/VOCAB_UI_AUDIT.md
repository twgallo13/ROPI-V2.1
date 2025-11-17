# Vocabulary UI Audit Report
**Date:** 2024-11-17  
**Branch:** feature/attribute-key-seed-20251117-222236

## Overview
The ROPI-V2.1 application has vocabulary management split across multiple UI components with varying degrees of functionality and UX consistency.

## Current Components

### 1. VocabDropdownsPage (`src/pages/settings/VocabDropdownsPage.tsx`)
**Purpose:** Editable vocabulary management for 24 attribute collections

**Features:**
- Add/Edit/Delete operations with inline editing
- Grouped into Core, Shoe-specific, and Other sections
- Hidden vocabs (descriptiveColors, statuses) not shown but functional
- Search/filter support (in VocabEditor component)
- Bulk import capability
- Admin hints for seeding

**Supported Vocabs:**
- Core: departments, classes, categories, ageGroups, genders, collections, materials, madeIn, primaryColors
- Shoe: heelTypes, heelHeights, platformHeights, shoeHeightMaps, soleMaterials, closureTypes, cutTypes
- Other: fits, websites, sportsTeams, leagues, taxClasses

### 2. VocabManagedPage (`src/pages/settings/VocabManagedPage.tsx`)
**Purpose:** Wrapper for VocabSettingsTab - manages banned words and synonyms

**Features:**
- Banned words/phrases management
- Synonym/replacement dictionary
- Save operation with toast notifications

### 3. VocabEditor Component (`src/pages/settings/components/VocabEditor.tsx`)
**Purpose:** Reusable vocab editor with full CRUD operations

**Features:**
- Add/edit/delete with keyboard shortcuts (Enter to save, Escape to cancel)
- Search/filter with real-time filtering
- Bulk import (paste newline-separated list)
- Focus preservation during edits
- Admin hints when empty
- Reload button support

### 4. VocabViewer Component (`src/pages/settings/components/VocabViewer.tsx`)
**Purpose:** Read-only display for seeded collections

**Features:**
- Shows items in scrollable list
- Loading state with spinner
- Empty state with admin hints
- Fixed height (h-48) with overflow scroll

## Observations

### ✅ Strengths
1. **Modular Design:** Clear separation between editor and viewer components
2. **UX Features:** Search, bulk import, keyboard shortcuts, focus preservation
3. **Admin Guidance:** Helpful hints about seeding workflows
4. **Consistent Styling:** Tailwind CSS classes maintain uniform appearance
5. **Error Handling:** Toast notifications for success/error states

### ⚠️ Inconsistencies & Gaps
1. **Duplicate VocabKey Types:** `heelTypes` and `shoeHeightMaps` appear twice each in the type definition (lines 19-20, 23-26 of VocabEditor.tsx)
2. **No AttributeKey UI:** Missing read-only viewer for canonical attribute metadata (as requested in Phase-1)
3. **Fragmented Groupings:** Core/Shoe/Other/Hidden groupings are hardcoded in VocabDropdownsPage without clear documentation
4. **No Normalization UI:** No visual indication of normalized values (e.g., "City TeamName" for teams, Title Case for colors)
5. **Semantic Gap:** VocabEditor manages Firestore `settings/vocab/<collection>` docs, but doesn't expose canonical paths, legacy paths, importer columns, or SmartDetect rules
6. **Missing Verification:** No UI to verify round-trip mappings (CSV → canonical → legacy → Firestore)

### 🔧 Recommended Improvements
1. **Fix Duplicate Keys:** Remove duplicate `heelTypes` and `shoeHeightMaps` from VocabEditor type definition
2. **Add AttributeKey Page:** Create read-only UI to browse canonical attribute metadata (as per Phase-1 task)
3. **Enhance VocabViewer:** Show normalization hints (e.g., "Teams shown as City TeamName format")
4. **Add Mapping Indicators:** Show which attributes have legacy/importer/rule mappings
5. **Verification Panel:** Add "Test Round-Trip" button to verify CSV → canonical → legacy conversions
6. **Documentation:** Add inline comments explaining Core/Shoe/Other groupings

## AttributeKey UI Requirements (Phase-1)

Based on Phase-1 specifications, the new AttributeKey page should:

### Features
- **Read-only:** No editing allowed (admin/specialist only in Firestore)
- **Browse by Category:** Filter by Core, Descriptive, Pricing, Technical, Launch, Source, AI
- **Metadata Display:** Show for each attribute:
  - Canonical Path (e.g., `descriptive.sportsTeam`)
  - Label (e.g., "Sports Team")
  - Category, Data Type, Required flag
  - Legacy Paths (mapped from schemaAdapter)
  - Importer Columns (mapped from CSV)
  - SmartDetect Rules (e.g., SD-001, SD-002)
  - Normalization Note (e.g., "Teams normalized to City TeamName format")
- **Search/Filter:** Real-time search across canonical paths and labels
- **Export:** CSV download button for full registry
- **Responsive:** Mobile-friendly layout with Tailwind CSS

### Data Source
- Firestore: `settings/attributes/keys/<canonicalPath>`
- Fallback: `scripts/attribute-registry-normalized.json` (local development)

### Access Control
- All users can view
- Only admins can seed/update (via scripts, not UI)

## Next Steps
1. ✅ Fix duplicate VocabKey types in VocabEditor.tsx
2. ✅ Create AttributeKey.tsx page with above requirements
3. ✅ Add route in App.tsx under Settings section
4. ✅ Create AttributeKey.test.tsx with Vitest tests
5. Run full test suite to ensure no regressions

---
**Audit Completed:** 2024-11-17  
**Auditor:** GitHub Copilot (Claude Sonnet 4.5)
