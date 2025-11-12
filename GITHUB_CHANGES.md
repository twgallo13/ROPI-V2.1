# ROPI V2.1 - Changelog

## [Prompt 12] StyleID + Launch/Embargo + Shipping Overrides + Related Colors
**Release Date**: November 12, 2025  
**PR**: [#72](https://github.com/twgallo13/ROPI-V2.1/pull/72)  
**Merge Commit**: `f142869` → `81bd738`

### Summary
Implemented 4 new delta attributes to enhance product data richness and e-commerce functionality. Added Related Colors feature for colorway linking and AI-powered launch date freshness cues.

### New Features

#### 1. Style ID (style.id)
- **Purpose**: Link related products/colorways under common style identifier
- **UI**: Text input in Product Editor "Additional Information" section
- **Integration**: Firestore query to display Related Colors grid
- **Use Case**: Group "Air Max 90" in different colorways (White/Red, Black/Blue, etc.)

#### 2. Related Colors Feature
- **Trigger**: Displays when Style ID is set and shared by 2+ products
- **UI**: 2-column grid showing related products with images, status badges
- **Functionality**: Click to navigate between colorway variants
- **Performance**: Uses Firestore auto-indexed field (single-field indexes handled automatically)

#### 3. Launch Date (launch.date)
- **Purpose**: Scheduled release date for product drops
- **UI**: Date picker in Product Editor
- **AI Integration**: Enables subtle "new arrival" language when launch is ±14 days from current date
- **Example Output**: *"Just in: The Nike Air Max 90 delivers..."* vs standard description
- **Privacy**: AI never reveals exact dates, only uses phrases like "new arrival", "just in", "latest drop"

#### 4. Hide Image Date (media.hideImageDate)
- **Purpose**: Image embargo management for pre-launch products
- **UI**: DateTime picker in Product Editor
- **Use Case**: Hide product images until marketing go-live date
- **Helper Text**: "Embargo date when images should be hidden"

#### 5. Shipping Overrides (shipping.standardOverride, shipping.expeditedOverride)
- **Purpose**: Manual toggles for shipping method availability
- **UI**: Checkbox group in Product Editor "Additional Information" section
- **Use Case**: Override default shipping logic for oversized/special items

### Type System Enhancements

Expanded `Product` interface with new nested structures:

```typescript
// New nested structures
style?: {
  id?: string;            // Style ID for colorway linking
  shoeHeightMap?: string;
  heelHeight?: number;
  soleMaterial?: string;
}

launch?: {
  date?: Date | string;      // NEW: Scheduled release date
  hype?: boolean;
  fastFashion?: boolean;
  newCollection?: boolean;
  klPostDate?: Date | string;
}

media?: {
  hideImageDate?: Date | string;  // NEW: Image embargo date
}

shipping?: {
  standardOverride?: boolean;   // NEW
  expeditedOverride?: boolean;  // NEW
  standard?: boolean;
  expedited?: boolean;
  // ... dimension fields
}
```

### AI Describe Enhancement

**Backend Logic** (`functions/src/routes/describe.ts`):
```typescript
// Check if launch date is within 14 days
let isNewLaunch = false;
if (launchDate) {
  const launch = new Date(launchDate);
  const now = new Date();
  const daysDiff = Math.floor((launch.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
  isNewLaunch = daysDiff >= -14 && daysDiff <= 14;
}
```

**Prompt Injection**:
```
${isNewLaunch ? '- FRESHNESS CUE: This is a new or upcoming release. You may subtly convey newness (e.g., "just in", "new arrival") without revealing exact dates.' : ''}
```

**Test Results**:
- ✅ Input: `launchDate: "2025-11-20"` (8 days away)
- ✅ Output: *"Experience the legacy of the Air Max 90, **a new arrival** designed for everyday versatility..."*
- ✅ Scores: overall=9, factual=10, tone=9, seo=8, clarity=10
- ✅ Template: `used_template: womens`

### Vocabulary Additions

Added 4 new vocabulary collections (loaded via `useVocab` hook):

1. **heelTypes** - Heel design types (Stiletto, Block, Wedge, Kitten, etc.)
2. **soleMaterials** - Outsole materials (Rubber, EVA, Leather, etc.)
3. **shoeHeightMaps** - Silhouette labels (Low, Mid, High)
4. **taxClasses** - Tax categories (Standard, Apparel, Exempt)

**Total Vocabularies**: 21 (up from 17)

### Export Integration

New fields available for CSV export via column mappings:

- `style.id` - Style ID
- `launch.date` - Launch Date
- `media.hideImageDate` - Hide Image Date
- `shipping.standardOverride` - Standard Shipping Override
- `shipping.expeditedOverride` - Expedited Shipping Override

**Configuration**: Add to `settings/export` Firestore document:
```json
{
  "exportName": "Style ID",
  "productField": "style.id",
  "required": false
}
```

### Files Modified

| File | Changes |
|------|---------|
| `src/components/ProductEditorDrawer.tsx` | +531 lines: UI fields, Related Colors feature, save mapping |
| `src/types.ts` | +74 lines: Product type expansion with nested structures |
| `src/hooks/useVocab.ts` | +17 lines: 4 new vocabulary collections |
| `src/services/describe.ts` | +2 lines: Type updates for styleId/launchDate |
| `functions/src/routes/describe.ts` | +19 lines: Launch date freshness logic |
| `src/utils/exporter.ts` | +7 lines: Export documentation |
| `firestore.indexes.json` | No composite indexes needed (auto-indexed) |

### Documentation

Created comprehensive implementation guides:

1. **DELTA_IMPLEMENTATION.md** - Technical specification with test results
2. **ATTRIBUTE_SCHEMA_IMPLEMENTATION.md** - Complete 45-attribute schema coverage

### Deployment

**Functions Deployed**: ✅ `apiDescribe` with launch date logic  
**Hosting Deployed**: ✅ Updated Product Editor UI  
**Indexes**: ✅ Single-field indexes auto-created by Firestore  

**URLs**:
- Function: `https://us-central1-ropi-bccee.cloudfunctions.net/apiDescribe`
- Hosting: `https://ropi-bccee.web.app`

### Testing Summary

✅ **Functions Build**: No errors  
✅ **Frontend Build**: No errors (995KB bundle)  
✅ **apiDescribe Deployment**: Successful  
✅ **Launch Date Logic**: Verified with curl test  
✅ **AI Freshness Cue**: Working ("new arrival" appears)  
✅ **Template Selection**: Continues to work (`womens` template)  
✅ **Scores**: Realistic 0-10 values returned  

### Migration Notes

**Backward Compatibility**: ✅ Maintained
- All new fields are optional
- Existing products continue to work without changes
- No breaking changes to API contracts

**Field Defaults**:
- `style.id`: `undefined` (optional)
- `launch.date`: `null` (optional)
- `media.hideImageDate`: `null` (optional)
- `shipping.standardOverride`: `false`
- `shipping.expeditedOverride`: `false`

### Known Limitations

1. **Single-field Index**: Firestore auto-indexes `style.id` - no manual index needed
2. **Related Colors Performance**: Efficient for <100 products per style ID
3. **Launch Date Window**: Hardcoded to ±14 days (configurable in future)

### Next Steps

1. ✅ **Complete** - All delta features implemented
2. ✅ **Deployed** - Functions and hosting live
3. 📊 **Data Seeding** - Optionally seed test products with style IDs
4. 📚 **User Training** - Update team on new fields and Related Colors feature
5. 🔍 **Analytics** - Monitor usage of launch date and style ID fields

---

**Implementation Status**: ✅ Complete and Deployed  
**Production URL**: https://ropi-bccee.web.app  
**Function Endpoint**: https://us-central1-ropi-bccee.cloudfunctions.net/apiDescribe

---

## Previous Releases

### [Prompt 10] Template Wiring + 10-Point Scoring + Debug Logging
**Release Date**: November 11, 2025  
**PR**: [#71](https://github.com/twgallo13/ROPI-V2.1/pull/71)  
**Commit**: `357a7b5`

### [Prompt 6] Firestore Timestamp Fix + SOP Automation
**Release Date**: November 11, 2025  
**PR**: [#68](https://github.com/twgallo13/ROPI-V2.1/pull/68), [#70](https://github.com/twgallo13/ROPI-V2.1/pull/70)  
**Commit**: `1db286d`

### [Prompt 9] AI Template + Scoring Merge
**Release Date**: November 11, 2025  
**Commit**: `1810933`

### [Prompt 7] Materials + Descriptive Color + AI Wiring
**Release Date**: November 11, 2025  
**PR**: [#69](https://github.com/twgallo13/ROPI-V2.1/pull/69)  
**Commit**: `8c6cd21`

### [Prompt 5] AI Verify Coach + SEO Meta
**Release Date**: November 11, 2025  
**PR**: [#67](https://github.com/twgallo13/ROPI-V2.1/pull/67)  
**Commit**: `14043d5`
