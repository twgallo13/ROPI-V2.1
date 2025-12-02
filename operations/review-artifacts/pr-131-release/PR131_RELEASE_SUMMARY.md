# PR #131 Release Summary

## Overview
- **PR Title**: fix(v3.3) UX improvements — search, value preview, save validation & permissions
- **Merge Commit**: c29bff38c577e0a8ae95f275cb1bd3c61a7b6ed1
- **Merge Date**: 2025-11-24
- **Target Environment**: Staging (ropi-bccee)

## Changes Implemented

### 1. Enhanced Search Functionality
- Updated `getAttributes()` to search across `importerColumns` and `ai.use` fields
- Enables finding attributes by their alias names in the search bar

### 2. Normalized Value Preview
- Complete rewrite of `getValuePreview()` function
- Normalizes values using canonical vocabulary terms
- Returns structured counts with top 5 values
- Includes percentages and sample SKUs
- Maps values via `allowedValuesRef` when present

### 3. Client-Side Validation
- Added required field validation (canonicalPath, label, category, dataType)
- Enhanced error handling to display AJV validation details with field paths
- Improved UX with specific error messages

### 4. Role-Based Permissions
- Added permission checks for Save & Seed operation
- Restricted to admin/editor/coordinator roles
- Updated UI with disabled state and tooltip for non-privileged users

### 5. Enhanced Logging
- Added console.error logging for validation failures in create/update operations

## Deployment Details

### Build Status
- **Lint**: ✅ 335 warnings (non-blocking, existing issues)
- **Tests**: ✅ 225 passed (9 skipped)
- **UI Build**: ✅ 1,174.04 KB bundle (gzip: 305.57 kB)
- **Functions Build**: ✅ Clean TypeScript compilation

### Seeder Execution
- ✅ Loaded 78 attributes from registry
- ✅ Applied normalization rules
- ✅ Seeded to Firestore settings/attributes/keys

### Firebase Deployment
- **Project**: ropi-bccee (staging)
- **Hosting**: ✅ Deployed (https://ropi-bccee.web.app)
- **Functions**: ✅ All 13 functions updated successfully
  - seedSettingsVocab
  - seedMaterials
  - describeWorker
  - apiImport
  - apiDescribe
  - apiDescribeStart
  - apiDescribeStatus
  - apiExporter
  - apiSmartDetect
  - apiValidate
  - api
  - setUserRole
  - exportRulesPreview

### Smoke Tests
- **propose-mapping**: ✅ 3 mappings returned
- **suggest**: ✅ 5 suggestions returned

## Verification

### Manual Testing Required
1. Navigate to https://ropi-bccee.web.app/settings/attributes
2. Test search bar with alias names (e.g., "sku", "product_name")
3. Test value preview for populated attributes
4. Test Save & Seed with non-privileged user (should see disabled button)
5. Test validation error messages for required fields

### Programmatic Verification
- ✅ API endpoints responding correctly
- ✅ Seeder completed successfully
- ✅ All functions deployed and accessible

## Artifacts Location
All deployment artifacts stored in:
`operations/review-artifacts/pr-131-release/`

## Next Steps
1. ✅ Notify @theo of deployment
2. ⏳ Monitor for any issues in staging
3. ⏳ Await user feedback on UX improvements

## Notes
- No breaking changes introduced
- All changes are backward compatible
- No schema migrations required
- Staging environment fully operational
