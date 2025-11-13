# HOMER Operations Log

## [P14.0] AI Audience Templates UI — 2025-11-13

**Branch**: `feat/p14-ai-templates-ui`  
**Status**: ✅ Complete, pending review  
**PR**: TBD (pending creation)

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
