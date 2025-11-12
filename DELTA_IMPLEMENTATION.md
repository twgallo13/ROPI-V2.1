# Delta Implementation: Style ID, Launch Date, Hide Image Date, Shipping Overrides

**Date**: November 12, 2025  
**Branch**: `feat/prompt-12-delta-styleid-launch-hide-shipping`  
**Status**: ✅ Complete

## Summary

This delta implementation adds 4 missing fields to the ROPI V2.1 product management system, ensuring proper UI, save mapping, AI integration, and export functionality.

## Changes Implemented

### 1. Frontend - ProductEditorDrawer UI ✅

**File**: `src/components/ProductEditorDrawer.tsx`

Added 4 new fields to the "Additional Information" section:

#### Style ID (Optional)
- **Type**: Text input
- **Field**: `style.id`
- **Purpose**: Link related colorways/products
- **Helper text**: "Use same ID across colorways to link related products"
- **Validation**: None (optional)

#### Launch Date
- **Type**: Date picker (`type="date"`)
- **Field**: `launch.date`
- **Purpose**: Scheduled release date for products
- **AI Integration**: Enables "new arrival" cues within 14 days

#### Hide Image Date
- **Type**: DateTime picker (`type="datetime-local"`)
- **Field**: `media.hideImageDate`
- **Purpose**: Embargo date when images should be hidden from publication
- **Helper text**: "Embargo date when images should be hidden"

#### Shipping Overrides
- **Type**: Checkbox group
- **Fields**: 
  - `shipping.standardOverride` (Boolean)
  - `shipping.expeditedOverride` (Boolean)
- **Purpose**: Manual override for shipping options

### 2. Related Colors Feature ✅

**File**: `src/components/ProductEditorDrawer.tsx`

New functionality that displays related products when Style ID is present:

```typescript
// Query products with same style.id
const productsRef = collection(db, 'products');
const q = query(productsRef, where('style.id', '==', styleId));
```

**UI Display**:
- Only shown when `style.id` exists AND has ≥1 related product
- Grid layout (2 columns)
- Shows: product image, name, brand, color, status
- Clickable cards to navigate to related products

**State Management**:
- `relatedColors: Product[]` - List of related products
- `loadingRelatedColors: boolean` - Loading state
- Auto-refreshes when `editableProduct.style.id` changes

### 3. Save Mapping ✅

**File**: `src/components/ProductEditorDrawer.tsx`

The `saveFromForm` function already correctly saves all nested structures:

```typescript
const base: Partial<Product> & { updatedAt?: any } = {
  // ... other fields ...
  style: p.style,      // includes style.id
  launch: p.launch,    // includes launch.date
  media: p.media,      // includes media.hideImageDate
  shipping: p.shipping, // includes shipping.standardOverride, expeditedOverride
  // ...
};
```

**Note**: All nested objects are properly merged and persisted to Firestore.

### 4. AI Describe Payload Update ✅

**Files**: 
- `src/components/ProductEditorDrawer.tsx`
- `src/services/describe.ts`

Updated `describeProduct` call to pass new attributes:

```typescript
const result = await describeProduct({
  // ... existing fields ...
  attributes: {
    brand: editableProduct.brand,
    category: editableProduct.category,
    gender: editableProduct.gender,
    ageGroup: editableProduct.ageGroup,
    price: (editableProduct as any).price ?? null,
    styleId: editableProduct.style?.id || null,      // NEW
    launchDate: editableProduct.launch?.date || null // NEW
  },
  // ...
});
```

**Type Updates**:
- Added `styleId?: string | null` to `DescribeProductPayload.attributes`
- Added `launchDate?: string | Date | null` to `DescribeProductPayload.attributes`

### 5. Backend Prompt Enhancement ✅

**File**: `functions/src/routes/describe.ts`

Added launch date logic to enable subtle "new arrival" cues:

```typescript
// Check if launch date is within 14 days
let isNewLaunch = false;
if (launchDate) {
  const launch = new Date(launchDate);
  const now = new Date();
  const daysDiff = Math.floor((launch.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
  isNewLaunch = daysDiff >= -14 && daysDiff <= 14; // Within 14 days before or after
}
```

**Prompt Addition**:
```
${isNewLaunch ? '- FRESHNESS CUE: This is a new or upcoming release. You may subtly convey newness (e.g., "just in", "new arrival") without revealing exact dates.' : ''}
```

**Behavior**:
- ✅ Only triggers when launch date is ±14 days from current date
- ✅ AI can use phrases like "just in", "new arrival", "latest drop"
- ✅ Never reveals exact dates
- ✅ Ignored when launch date is absent or outside window

### 6. Export Integration ✅

**File**: `src/utils/exporter.ts`

Added documentation for new exportable fields:

```typescript
// New fields available for export via column mappings:
// - style.id (Style ID for linking colorways)
// - launch.date (Scheduled release date)
// - media.hideImageDate (Image embargo date)
// - shipping.standardOverride (Boolean)
// - shipping.expeditedOverride (Boolean)
```

**How to Export**:
Fields will automatically be included in CSV exports when added to column mappings in `settings/export` Firestore document.

Example mapping:
```json
{
  "exportName": "Style ID",
  "productField": "style.id",
  "required": false
}
```

### 7. Firestore Index ✅

**File**: `firestore.indexes.json`

Added single-field index for Related Colors query:

```json
{
  "collectionGroup": "products",
  "queryScope": "COLLECTION",
  "fields": [
    {
      "fieldPath": "style.id",
      "order": "ASCENDING"
    }
  ]
}
```

**Purpose**: Optimizes the `where('style.id', '==', styleId)` query used by Related Colors feature.

**Deployment**: Index will be created automatically with `firebase deploy`

## Files Modified

1. ✅ `src/components/ProductEditorDrawer.tsx` - UI fields, Related Colors, save mapping
2. ✅ `src/services/describe.ts` - Type updates for styleId/launchDate
3. ✅ `functions/src/routes/describe.ts` - Prompt enhancement with launch logic
4. ✅ `src/utils/exporter.ts` - Export documentation
5. ✅ `firestore.indexes.json` - Index for style.id query

## Testing Checklist

- [ ] Style ID field saves and loads correctly
- [ ] Launch Date field saves as Firestore timestamp
- [ ] Hide Image Date field saves as Firestore timestamp
- [ ] Shipping override checkboxes toggle and save
- [ ] Related Colors appear when Style ID is set and shared
- [ ] Related Colors hidden when Style ID is empty/unique
- [ ] AI generation includes "new arrival" cue for recent launch dates
- [ ] AI generation does NOT reveal exact dates
- [ ] Export includes new fields when mapped in settings
- [ ] Firestore index deploys without errors

## Data Structure

### Firestore Document Example
```json
{
  "id": "PROD123",
  "name": "Air Max 90",
  "brand": "Nike",
  // ... other fields ...
  "style": {
    "id": "AM90-2025",
    "soleMaterial": "Rubber"
  },
  "launch": {
    "date": "2025-11-20T00:00:00Z",
    "hype": true,
    "fastFashion": false
  },
  "media": {
    "hideImageDate": "2025-11-19T09:00:00Z"
  },
  "shipping": {
    "standardOverride": false,
    "expeditedOverride": true,
    "standard": true,
    "expedited": true
  }
}
```

## AI Generation Examples

### With Launch Date (within 14 days)
**Input**: Launch Date = Nov 20, 2025 (8 days from now)

**AI Output**: 
> "Just in: The Nike Air Max 90 delivers iconic style with premium leather construction and visible Air cushioning for all-day comfort."

### Without Launch Date or Outside Window
**Input**: No launch date or launch date > 14 days away

**AI Output**: 
> "The Nike Air Max 90 delivers iconic style with premium leather construction and visible Air cushioning for all-day comfort."

## Related Colors Example

When `style.id = "AM90-2025"`:

**Related Colors Grid Shows**:
- Air Max 90 (White/Red) - Status: validated
- Air Max 90 (Black/Blue) - Status: in-progress
- Air Max 90 (Grey/Orange) - Status: validated

**Click behavior**: Opens related product in drawer (via `onSaved` callback)

## Migration Notes

### Backward Compatibility
- ✅ All new fields are optional
- ✅ Existing products continue to work without these fields
- ✅ No breaking changes to existing functionality

### Field Defaults
- `style.id`: `undefined` (optional)
- `launch.date`: `null` (optional)
- `media.hideImageDate`: `null` (optional)
- `shipping.standardOverride`: `false`
- `shipping.expeditedOverride`: `false`

## Deployment Commands

```bash
# 1. Deploy Firestore indexes (run first)
firebase deploy --only firestore:indexes

# 2. Build functions
cd functions && npm run build && cd ..

# 3. Deploy functions and hosting
firebase deploy --only hosting,functions
```

## Next Steps

1. ✅ **Complete** - All delta features implemented
2. 🧪 **Testing** - Manual testing in development environment
3. 📊 **Data Seeding** - Optionally seed test products with style IDs
4. 🚀 **Deploy** - Push to production
5. 📚 **Documentation** - Update user guide with new fields

---

**Implementation Status**: ✅ All 7 tasks complete  
**Code Quality**: ✅ No TypeScript errors  
**Ready for**: 🧪 Testing & Deployment

