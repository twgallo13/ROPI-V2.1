# HOMER Operations Log

## [P14.1] AI Template Builder Enhancements — 2025-11-13

**Branch**: `feat/p14.1-template-builder-enhancements`  
**Status**: ✅ Complete, pending review  
**PR**: TBD (pending creation)

### Objective
Transform AI Templates page from simple text editor into a no-code template builder with structured configuration, allowing non-developers to configure audience-specific product copy without touching JSON.

### Key Enhancements

#### 1. Extended Template Schema (Backwards Compatible)
Added structured configuration fields while maintaining P14.0 compatibility:

**New Fields**:
- `status`: 'active' | 'draft' | 'disabled' (only active templates are used)
- `description`: Template description for documentation
- `conditions[]`: Rule-based matching (field, operator, value)
  - Fields: gender, department, ageGroup, materials, launchDate
  - Operators: ==, is-any-of, includes, within-last-n-days
- `matchMode`: 'ALL' | 'ANY' (how conditions are evaluated)
- `format`: Structured formatting config
  - layout: headline+paragraph+bullets | paragraph-only | short-blurb
  - headlineEnabled: boolean + pattern
  - paragraph: {min, max, allowTwoParagraphs}
  - bullets: {min, max, topics[]}
- `voice`: Voice/tone configuration
  - preset: clean-retail | hype-drop | parent-friendly | tech-performance | luxury
  - description: custom voice guidance
  - avoid[]: words to avoid
  - brandRules: brand-specific tone rules
- `seo`: SEO configuration
  - metaTitlePattern: template with variables
  - includeFit/includeUseCase/includeMaterial: boolean flags

**Legacy Fields Preserved**: prompt_body, seo_rules, tone_rules, length_rules, examples[], banned_terms

#### 2. Template Builder UI (`AITemplateBuilder.tsx`)
Replaced free-text editor with multi-section form:

**Section 1 - Basic Info**:
- Template name, status (active/draft/disabled), description
- Version (readonly), last updated

**Section 2 - Audience & Conditions**:
- Rule builder UI: [field] [operator] [value]
- Match mode toggle: ALL vs ANY conditions
- Add/remove condition rows

**Section 3 - Formatting Style**:
- Layout dropdown (headline+paragraph+bullets, paragraph-only, short-blurb)
- Headline toggle + pattern input
- Paragraph length sliders (min/max words, allow 2 paragraphs)
- Bullet structure: min/max count, topic chips (fit, comfort, durability, use_case, care, traction)

**Section 4 - Tone & Voice**:
- Voice preset dropdown (5 presets)
- Custom voice description textarea
- Words to avoid (tag input with Enter to add)
- Brand rules textarea

**Section 5 - SEO Configuration**:
- Meta title pattern with variable substitution
- Checkboxes: include fit, include use case, include material

**Section 6 - Advanced JSON**:
- Collapsible raw JSON view (readonly with warning)

#### 3. Audience Expansion (5 → 8 Templates)
**P14.0 Templates**:
- default, mens, womens, gradeSchool, toddler

**P14.1 New Templates**:
- `mens_footwear`: Men's footwear (gender=Mens + department=Footwear)
- `womens_footwear`: Women's footwear (gender=Womens + department=Footwear)
- `kids_gs`: Grade school kids (ageGroup=Grade School)
- `toddler`: Toddler/infant (ageGroup=Toddler/Infant)
- `apparel_mens`: Men's apparel (gender=Mens + department=Apparel)
- `apparel_womens`: Women's apparel (gender=Womens + department=Apparel)
- `accessories`: Accessories (department=Accessories)

#### 4. Condition-Based Template Selection
**New Logic** (`functions/src/utils/template-selection.ts`):
- Loads all active templates from Firestore
- Evaluates conditions against product data:
  - `==`: Exact match (case-insensitive)
  - `is-any-of`: Value in array
  - `includes`: Substring match (supports materials array)
  - `within-last-n-days`: Launch date recency check
- Respects `matchMode`: ALL (all conditions must match) vs ANY (at least one)
- Priority: First matching template with conditions → default template → first template
- Returns `conditionsMatched[]` for debugging

**Integration** (`functions/src/routes/describe.ts`):
- POST handler now uses `selectTemplate(productData)` instead of simple gender/ageGroup logic
- Logs matched conditions: `"Conditions matched: gender==Mens, department==Footwear"`
- Returns `used_template.conditionsMatched` in API response

#### 5. Structured Prompt Generation
**Prompt Building** (`functions/src/routes/describe.ts`):
- **Priority 1**: If `format` + `voice` exist → use structured config to build prompt
  - Maps voice presets to guidance text
  - Builds format instructions from structured config
  - Generates voice/tone guidance dynamically
- **Priority 2**: If `prompt_body` exists → use legacy Handlebars substitution (P14.0 behavior)
- **Priority 3**: Hard-coded fallback (should not reach if Firestore populated)

**Structured Config Example**:
```
VOICE & TONE:
- Use clear, professional retail language emphasizing product benefits
- Focus on performance, durability, and practical benefits for adult male customers
- Avoid these words: cute, adorable, pretty, feminine, delicate
- Emphasize technical features and real-world performance

FORMAT:
- Write as a single paragraph
- Paragraph length: 50-90 words
```

### Files Modified

| File | Type | Lines | Description |
|------|------|-------|-------------|
| `src/types/ai-template.ts` | New | 105 | TypeScript types for extended template schema |
| `scripts/ai-templates-seed-v2.json` | New | 300+ | Seed data for 8 templates with structured config |
| `scripts/seed-ai-templates-v2.ts` | New | 65 | Seed script for v2 templates |
| `src/pages/settings/AITemplateBuilder.tsx` | New | 750+ | Form-based template builder UI |
| `functions/src/utils/template-selection.ts` | New | 200+ | Condition-based template selection logic |
| `src/App.tsx` | Modified | +1 | Import AITemplateBuilder instead of AITemplatesPage |
| `functions/src/routes/describe.ts` | Modified | +150 | Integrated template selection + structured prompts |
| `src/services/describe.ts` | Modified | +1 | Added conditionsMatched to response type |

### Testing Checklist

- [x] TypeScript builds pass (functions + frontend)
- [ ] AI Template Builder page loads at `/settings/ai-templates`
- [ ] Can select template and see form sections
- [ ] Can edit basic info (title, status, description)
- [ ] Can add/remove/edit conditions
- [ ] Match mode toggle (ALL vs ANY) works
- [ ] Can configure formatting (layout, paragraph, bullets)
- [ ] Can configure voice (preset, avoid words, brand rules)
- [ ] Can configure SEO (meta title pattern, checkboxes)
- [ ] Save Template writes to Firestore correctly
- [ ] Reset to Default loads from seed JSON
- [ ] Advanced JSON panel shows raw data
- [ ] Template selection uses conditions matching
- [ ] API response includes `used_template.conditionsMatched`
- [ ] Structured config builds prompt correctly
- [ ] Legacy prompt_body still works (backwards compat)

### Backwards Compatibility

✅ **P14.0 templates still work**:
- Templates without `format`/`voice` fall back to `prompt_body` (Handlebars substitution)
- Templates without `status` are treated as 'active'
- Templates without `conditions` are treated as fallback/default
- API response supports both object and string format for `used_template`

### Migration Path

1. Deploy functions + frontend (P14.1)
2. Run seed script: `npx ts-node scripts/seed-ai-templates-v2.ts`
3. Verify templates in Firestore console
4. Test template builder UI in Settings → AI Templates
5. Test condition matching with real products
6. Gradually migrate from `prompt_body` to structured config (optional)

### How John Should Test This

**Step 1: Seed Templates**
```bash
cd functions
npx ts-node ../scripts/seed-ai-templates-v2.ts
```

**Step 2: Template Builder UI**
1. Navigate to Settings → AI Templates
2. Click "Men's Footwear" template
3. Verify condition: `gender is-any-of Mens, Men, Male` + `department == Footwear`
4. Change voice preset from "Tech Performance" to "Hype Drop"
5. Add "sick" to "Words to Avoid"
6. Click "Save Template"
7. Verify Firestore: `settings/ai/prompts/mens_footwear`

**Step 3: Test Condition Matching**
1. Go to Intake Queue
2. Select a men's footwear product (e.g., Nike Air Max, Men's, Footwear)
3. Click "AI Describe"
4. In browser console, check API response:
   ```json
   {
     "used_template": {
       "key": "mens_footwear",
       "version": "v2",
       "conditionsMatched": ["genderis-any-ofMens|Men|Male", "department==Footwear"]
     }
   }
   ```
5. Verify description matches "Hype Drop" voice (energetic, no "sick")

**Step 4: Test Fallback**
1. Select a product with no matching conditions (e.g., unisex socks, department: Accessories)
2. Generate description
3. Verify `used_template.key` === "accessories" or "default"

**Step 5: Verify Backwards Compat**
1. In Firestore, manually remove `format` and `voice` from `default` template
2. Ensure `prompt_body` still exists
3. Generate description
4. Verify it still works (uses Handlebars substitution fallback)

### Known Limitations

1. **No Template Preview**: No live preview of generated output (future enhancement)
2. **No Template Versioning UI**: Version field is editable but not auto-incremented
3. **No Audit Trail**: Changes are saved but no history tracking (future: Firestore audit log)
4. **Department Inference**: Department is inferred from `category` field (Footwear/Apparel/Accessories)
5. **Single Scope**: Only supports "audience" scope (future: channel-specific templates)

### Future Enhancements

- [ ] Template preview with live product example
- [ ] Template cloning/duplication
- [ ] Template import/export as JSON
- [ ] Version history and rollback
- [ ] A/B testing support (split traffic between templates)
- [ ] Template performance analytics (scores by template)
- [ ] Channel-specific templates (RetailOps, Shopify, PDP)
- [ ] Bulk template operations

### PR Information

**Branch**: `feat/p14.1-template-builder-enhancements`  
**PR Title**: `feat(P14.1): AI template builder enhancements`  
**PR Number**: TBD (pending creation)  
**Status**: Ready for review  
**Reviewer**: @twgallo13 (John)

---

## [P14.0] AI Audience Templates UI — 2025-11-13

**Branch**: `feat/p14-ai-templates-ui`  
**Status**: ✅ Complete, pending review  
**PR**: #74

### Objective
Create a Settings UI for managing AI audience templates (default, mens, womens, gradeSchool, toddler) without requiring direct Firestore edits.

### Implementation Summary

#### Firestore Data Model
- **Collection**: `settings/ai/prompts/{templateKey}`
- **Schema**: key, scope, title, prompt_body, seo_rules, tone_rules, length_rules, examples[], banned_terms[], version, updatedBy, updatedAt
- **Templates**: default, mens, womens, gradeSchool, toddler

#### Settings UI
- **Route**: `/settings/ai-templates`
- **Features**: Left sidebar template list, right panel full editor, Save/Reset actions
- **Component**: `src/pages/settings/AITemplatesPage.tsx` (400+ lines)

#### Backend Integration
- **File**: `functions/src/routes/describe.ts`
- **Changes**: Added `loadAudienceTemplate()` to fetch from Firestore, simple Handlebars {{var}} replacement, returns `used_template` object
- **Fallback**: Hard-coded prompt if Firestore template missing

#### Frontend Updates
- **ProductEditorV2**: Template display shows "Audience: womens (v1)", added override dropdown
- **Types**: Updated `used_template` to support object format (backward compatible)

### Files Modified
- **New**: `src/pages/settings/AITemplatesPage.tsx` (template editor UI)
- **New**: `scripts/ai-templates-seed.json` (default template data)
- **New**: `scripts/seed-ai-templates.ts` (Firestore seeding script)
- **Modified**: `src/App.tsx` (route), `src/pages/settings/SettingsLayout.tsx` (tab), `functions/src/routes/describe.ts` (loading), `src/components/ProductEditorV2.tsx` (display), `src/services/describe.ts` (types)

### Testing Status
- [x] TypeScript builds pass (functions + frontend)
- [ ] Manual testing pending (Settings UI, template editing, override, Firestore integration)

### Acceptance Criteria
- ✅ Settings → AI Templates page exists
- ✅ Template editing UI complete
- ✅ Backend loads from Firestore with fallback
- ✅ Verify panel shows template used
- ✅ Optional override dropdown
- ✅ No TypeScript errors

### Next Steps
1. Create PR
2. Manual testing
3. Run seed script to populate Firestore
4. Review and merge (do NOT auto-merge per requirement)

---

## [P13.1] materials hook fix — 2025-11-13

- Files: src/hooks/useAttributesSettings.ts
- Summary: added 'materials' to AttributeKey, INITIAL_ATTRIBUTES, and subscribe keys
- PR: #73
- Changes:
  - Added 'materials' to AttributeKey type definition
  - Added 'materials' to INITIAL_ATTRIBUTES initialization
  - Added 'materials' to subscription keys array for real-time updates
- Impact: Settings → Materials CUD operations now work correctly
