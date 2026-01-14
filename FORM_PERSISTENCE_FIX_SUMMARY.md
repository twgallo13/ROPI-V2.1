# AI Template Form Persistence Fix - Summary

## Issues Addressed

### 1. Form Field Accessibility (Fixed in commit e0669fa)
**Problem:** Form fields were missing `id` and `name` attributes, and labels weren't associated with inputs via `htmlFor`.
- Browser autocomplete couldn't identify form fields
- Screen readers couldn't associate labels with inputs
- 25+ accessibility violations reported

**Solution:**
- Added `id` attribute to all form inputs (template-key, template-title, template-status, template-priority, include_*, prompt-body, model, max_tokens, temperature)
- Added `name` attribute to all form inputs matching field names
- Added `htmlFor` attribute to all labels pointing to associated inputs
- File: [packages/web/src/pages/settings/ai-templates/AITemplateBuilder.tsx](packages/web/src/pages/settings/ai-templates/AITemplateBuilder.tsx)

### 2. Template Data Not Persisting After Save (Fixed in commit eddc078)
**Root Cause:** The backend GET handler was wrapping the template data in a response object `{ status: 'ok', template }`, but the frontend expected the template object directly as type `AITemplate`.

**Problem Flow:**
1. User loads template edit page → GET `/api/admin/ai-templates/{key}`
2. Backend responds with `{ status: 'ok', template: {...} }`
3. Frontend's `apiFetch<AITemplate>()` returns the entire object (not just the template)
4. Frontend tries to use `response.key`, `response.prompt_body` → undefined (these were nested in response.template)
5. Form fields appear empty because template state has wrong structure

**Solution:**
- Changed GET handler to return template data directly: `res.json(template)` instead of `res.json({ status: 'ok', template })`
- Fixed modelSettings property access to correctly retrieve model, max_tokens, temperature from Firestore document
- File: [packages/api/src/endpoints/admin/aiDescribeSettings.ts](packages/api/src/endpoints/admin/aiDescribeSettings.ts#L475)

### 3. Comprehensive Logging (Fixed in commit 1c6326e)
**Problem:** Difficult to diagnose save/load issues without seeing what data is being transmitted.

**Solution:**
- Added logging to `loadTemplate()` function to log fetched data and state being set
- Added logging to `handleSave()` function to log template data being sent, validation errors, and response
- Logs show:
  - Raw template data from API
  - Processed template state
  - Validation errors (if any)
  - Save request body
  - Save response
- File: [packages/web/src/pages/settings/ai-templates/AITemplateBuilder.tsx](packages/web/src/pages/settings/ai-templates/AITemplateBuilder.tsx)

## How the Form State Flow Works Now

### Loading a Template
1. User navigates to `/settings/ai-templates/test2`
2. Component calls `GET /api/admin/ai-templates/test2`
3. Backend queries Firestore, finds document with `prompt`, `modelSettings`, `includeName` fields
4. Backend converts to UI format: `{ prompt_body: data.prompt, model_settings: { model, max_tokens, temperature }, include_name: data.includeName, ... }`
5. Backend returns template directly (not wrapped)
6. Frontend receives AITemplate object and sets it to React state
7. Form fields render with values from state (controlled components)
8. **Console logs show:** "Loaded template data:", "Setting template state:", modelSettings structure

### Saving a Template
1. User edits form fields (onChange updates React state)
2. User clicks Save → `handleSave()`
3. Frontend validates template (key and prompt_body required)
4. Frontend POSTs/PUTs to backend with template data containing:
   - `key`, `title`, `status`, `priority`
   - `include_name`, `include_attributes`, `include_rules`, `include_custom_attributes`
   - `prompt_body`, `model_settings: { model, max_tokens, temperature }`
   - `conditions`
5. Backend's `normalizeTemplateFields()` converts UI field names to Firestore field names
6. Backend saves to Firestore and clears cache
7. Frontend navigates to templates list
8. **Console logs show:** "Saving template:", validation errors (if any), "Save response:"

## Field Name Mapping (UI ↔ Firestore)

| UI Field Name | Firestore Field Name | Purpose |
|---|---|---|
| prompt_body | prompt | The AI prompt template text |
| model_settings.model | modelSettings.model | Which AI model to use |
| model_settings.max_tokens | modelSettings.max_tokens | Max tokens in response |
| model_settings.temperature | modelSettings.temperature | Response creativity (0-2) |
| include_name | includeName | Include product name in context |
| include_attributes | includeAttributeNotes | Include product attributes |
| include_rules | (UI-only) | Not stored in Firestore |
| include_custom_attributes | (UI-only) | Not stored in Firestore |

## Testing the Fix

To verify the form persistence is working:

1. **Load Test:**
   - Open browser DevTools → Console
   - Navigate to edit template page
   - Check console for "Loaded template data:" log showing correct template structure
   - Verify form fields are populated with values (title, prompt, model, etc.)

2. **Save Test:**
   - Edit form fields (change title, prompt, model, priority)
   - Click Save
   - Check console for "Saving template:" showing updated data
   - Template should navigate back to list
   - Reload page and navigate to template again
   - Verify all edited fields are persisted

3. **Accessibility Test:**
   - Open browser DevTools → Inspect Element
   - Verify all input/select/textarea elements have `id` and `name` attributes
   - Verify all labels have `htmlFor` attribute matching input `id`
   - Run accessibility audit (DevTools → Lighthouse)

## Deployment

All changes are pushed to `aoss-main` branch:
- e0669fa: Form field accessibility
- 1c6326e: Comprehensive logging
- eddc078: GET response format fix

Staging deployment will include these fixes with the next build trigger.

## Related Issues

- 500 errors on template save: Fixed by `hasOwnProperty` checks and `stripUndefinedDeep` function (previous commits)
- Blank screen on template click: Resolved by defensive defaults in loadTemplate
- Deploy timeouts: Infrastructure issue (GCP Cloud Functions timeouts, retriggered with commit e28eaf2)
