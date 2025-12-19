# PVS-0.3.2: Mapping UI Implementation

**Status:** ✅ Complete  
**Branch:** `lisa/PVS-0.3.2/mapping-ui`  
**PR:** [#291](https://github.com/twgallo13/ROPI-V2.1/pull/291)  
**Staging:** https://ropi-aoss-staging.web.app  

## Summary

Implements comprehensive Mapping UI for the AOSS Attributes Console. This is Step 2 of the PVS-0.3 series, consuming the Mapping API from PVS-0.3.1.

## Dependencies

- **PVS-0.3.1** (Mapping API) - PR #289 ✅ Merged
- **PVS-0.3.0 M1** (Backend Plumbing) - ✅ Complete

## Components Created

### 1. MappingTab.tsx (~380 lines)
Main container component for mapping configuration.

**Features:**
- View mode selector: Attribute-Level | Global | Merged
- Integrates all sub-components
- Toast notifications for success/error feedback
- Loading states and error handling

**Props:**
```typescript
interface MappingTabProps {
  attribute: AttributeDefinition;
  attributes: AttributeDefinition[];
  onSave: () => void;
}
```

### 2. AliasTable.tsx (~450 lines)
Displays and manages header aliases with CRUD operations.

**Features:**
- Table columns: Alias, Canonical ID, Source, Confidence, Actions
- Inline editing with validation
- Delete confirmation
- Bulk add from BulkAliasImportModal
- Confidence badges (high/medium/low color-coded)

**Props:**
```typescript
interface AliasTableProps {
  aliases: AliasEntry[];
  attributes: AttributeDefinition[];
  onChange: (aliases: AliasEntry[]) => void;
  disabled?: boolean;
}
```

### 3. SynonymsEditor.tsx (~350 lines)
Per-value synonym management for enum/multiSelect types.

**Features:**
- Shows allowed values with their synonyms
- Add/remove synonyms per value
- Test transformation feature (input → output)
- Bulk import support
- Only visible for enum/multiSelect data types

**Props:**
```typescript
interface SynonymsEditorProps {
  dataType: string;
  allowedValues: string[];
  synonyms: Record<string, string[]>;
  onChange: (synonyms: Record<string, string[]>) => void;
  disabled?: boolean;
}
```

### 4. PerSourceOverrides.tsx (~330 lines)
Source-specific mapping override management.

**Features:**
- List of source overrides with edit/delete
- Clone from Global or Attribute level
- Add new source override
- Source dropdown with existing sources

**Props:**
```typescript
interface PerSourceOverridesProps {
  attributeId: string;
  sourceOverrides: Record<string, MappingEntry>;
  globalMapping: MappingEntry | null;
  attributeMapping: MappingEntry | null;
  onUpsert: (sourceId: string, mapping: Partial<MappingEntry>) => Promise<void>;
  onDelete: (sourceId: string) => Promise<void>;
  disabled?: boolean;
}
```

### 5. ImportPreviewEditor.tsx (~370 lines)
CSV upload/paste with transformation preview.

**Features:**
- File upload or paste CSV data
- Column mapping preview (header → canonical)
- Transformed sample rows preview
- Unknown headers/values summary
- Reset functionality

**Props:**
```typescript
interface ImportPreviewEditorProps {
  attributeMapping: MappingEntry | null;
  globalMapping: MappingEntry | null;
  disabled?: boolean;
}
```

### 6. BulkAliasImportModal.tsx (~350 lines)
Modal for bulk alias import from CSV or paste.

**Features:**
- Multiple format support:
  - Comma: `alias,canonical`
  - Arrow: `alias -> canonical`
  - Colon: `alias:canonical`
  - Tab: `alias\tcanonical`
- Duplicate detection
- Validation against attribute registry
- Preview before import

**Props:**
```typescript
interface BulkAliasImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onImport: (aliases: AliasEntry[]) => void;
  existingAliases: AliasEntry[];
  attributes: AttributeDefinition[];
}
```

## Hook Created

### useMappings.ts (~300 lines)
React hook for all mapping API operations.

**State:**
```typescript
{
  globalMapping: MappingEntry | null;
  attributeMapping: MappingEntry | null;
  mergedAliases: AliasEntry[];
  loading: boolean;
  saving: boolean;
  error: string | null;
}
```

**Functions:**
- `fetchGlobalMapping()` - GET /api/admin/settings/mappings
- `fetchAttributeMapping(id)` - GET /api/admin/settings/attributes/{id}/mapping
- `updateGlobalMapping(mapping)` - PUT /api/admin/settings/mappings
- `updateAttributeMapping(id, mapping)` - PUT /api/admin/settings/attributes/{id}/mapping
- `upsertSourceOverride(attrId, sourceId, mapping)` - PUT source override
- `deleteSourceOverride(attrId, sourceId)` - DELETE source override
- `previewImport(csv)` - POST /api/admin/imports/preview

## Styles

### MappingTab.module.css (~500 lines)
Complete CSS module with:
- Modal styles (centered, overlay, responsive)
- Form controls (inputs, selects, textareas)
- Table styles (striped, hover, borders)
- Badge styles (confidence levels, source badges)
- Tag/chip styles for synonyms
- Responsive breakpoints

## Integration Points

### AttributeDetailPanel.tsx
Added import and rendering of MappingTab:
```typescript
case 'mapping':
  return (
    <MappingTab
      attribute={attribute}
      attributes={attributes}
      onSave={onSave}
    />
  );
```

### AttributesConsole.tsx
Added attributes prop passing to AttributeDetailPanel.

## API Endpoints Used

| Method | Endpoint | Purpose |
|--------|----------|---------|
| GET | `/api/admin/settings/mappings` | Fetch global mapping |
| PUT | `/api/admin/settings/mappings` | Update global mapping |
| GET | `/api/admin/settings/attributes/{id}/mapping` | Fetch attribute mapping |
| PUT | `/api/admin/settings/attributes/{id}/mapping` | Update attribute mapping |
| DELETE | `/api/admin/settings/attributes/{id}/mapping` | Delete attribute mapping |
| PUT | `/api/admin/settings/attributes/{id}/mapping/sources/{sourceId}` | Upsert source override |
| DELETE | `/api/admin/settings/attributes/{id}/mapping/sources/{sourceId}` | Delete source override |
| POST | `/api/admin/imports/preview` | Preview CSV import |

## Testing

### Unit Tests (31 tests, all passing)

**useMappings.spec.ts** (7 tests):
- fetchGlobalMapping success/error
- fetchAttributeMapping success/error
- updateGlobalMapping
- updateAttributeMapping
- Error handling

**BulkAliasImportModal.spec.tsx** (11 tests):
- Renders modal when open
- Format detection (comma, arrow, colon, tab)
- Duplicate detection
- Unknown canonical validation
- Import callback

**SynonymsEditor.spec.tsx** (13 tests):
- Renders allowed values
- Add/remove synonyms
- Test transformation (exact match, synonym match, no match)
- Disabled state

## Build

- ✅ TypeScript compiles
- ✅ Bundle: 1,028kb (warning about chunk size)
- ✅ All new tests pass

## Verification Checklist

### UI Verification (Staging)
- [ ] Navigate to Attributes Console → select attribute → Mapping tab
- [ ] Verify MappingTab renders with view mode selector
- [ ] Test AliasTable CRUD operations
- [ ] Test SynonymsEditor (select enum attribute)
- [ ] Test PerSourceOverrides clone/edit/delete
- [ ] Test ImportPreviewEditor with CSV
- [ ] Test BulkAliasImportModal

### API Integration
- [ ] Fetch global mapping loads
- [ ] Fetch attribute mapping loads
- [ ] Save global mapping persists
- [ ] Save attribute mapping persists
- [ ] Source overrides CRUD works
- [ ] Import preview returns transformed data

## Files Changed

| File | Change |
|------|--------|
| `packages/web/src/hooks/useMappings.ts` | Created |
| `packages/web/src/components/MappingTab.tsx` | Created |
| `packages/web/src/components/MappingTab.module.css` | Created |
| `packages/web/src/components/AliasTable.tsx` | Created |
| `packages/web/src/components/SynonymsEditor.tsx` | Created |
| `packages/web/src/components/PerSourceOverrides.tsx` | Created |
| `packages/web/src/components/ImportPreviewEditor.tsx` | Created |
| `packages/web/src/components/BulkAliasImportModal.tsx` | Created |
| `packages/web/src/hooks/__tests__/useMappings.spec.ts` | Created |
| `packages/web/src/components/__tests__/BulkAliasImportModal.spec.tsx` | Created |
| `packages/web/src/components/__tests__/SynonymsEditor.spec.tsx` | Created |
| `packages/web/src/components/AttributeDetailPanel.tsx` | Modified |
| `packages/web/src/pages/Settings/AttributesConsole.tsx` | Modified |

## Next Steps

- **PVS-0.3.3**: Advanced mapping features (if planned)
- **PVS-0.4.x**: Import pipeline integration
