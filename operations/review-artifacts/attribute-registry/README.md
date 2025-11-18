# Attribute Registry Dry-Run Artifacts

**Date:** 2025-11-18  
**Branch:** integration/review-attributekey-20251118  
**PR:** #98  
**Status:** ✅ Dry-run complete, awaiting Theo's approval

## Files in This Directory

- **`attribute-registry-dryrun.csv`** (6.2 KB)
  - Spreadsheet export with all 77 attributes
  - Columns: Canonical Path, Label, Category, Data Type, Required, Export, Legacy Paths, Importer Columns, Rules, Normalization Note
  - Easy to review in GitHub's CSV viewer or Excel

- **`attribute-registry-dryrun.json`** (33 KB)
  - Full normalized registry ready for Firestore seeding
  - Contains all metadata: paths, types, validation rules, examples
  - Will be seeded to `settings/attributes/keys/*` collection

- **`normalize-dryrun.log`** (882 bytes, gitignored)
  - Execution log from dry-run
  - Available locally for debugging

## Summary Statistics

- **Total Attributes:** 77
- **Categories:**
  - Technical: 22 attributes (shipping, status, flags)
  - Descriptive: 22 attributes (brand, color, material, team)
  - Core: 10 attributes (department, category, class, SKU)
  - AI: 8 attributes (generated content, scores)
  - Source: 6 attributes (vendor, origin data)
  - Launch: 5 attributes (hype, fast fashion flags)
  - Pricing: 4 attributes (retail, cost, MSRP)

## Normalization Rules Applied

### Pro Teams (140+ teams)
- Format: "City TeamName" (e.g., "Los Angeles Lakers")
- Covers: NFL, NBA, MLB, NHL, MLS, college teams
- Example: "lakers" → "Los Angeles Lakers"

### Colors
- Title Case normalization
- Example: "navy blue" → "Navy Blue"

### Materials
- Deduplicated and standardized
- Example: "man-made" → "Man-Made"

## Key Attributes for Review

### Core Product Fields
- `sku_core.department` - Product department
- `sku_core.category` - Product category
- `sku_core.class` - Product class
- `sku_core.mpn` - Manufacturer part number

### Descriptive Fields
- `descriptive.brand` - Brand name
- `descriptive.primaryColor` - Main color
- `descriptive.material` - Primary material
- `descriptive.sportsTeam` - Team affiliation (with normalization)
- `descriptive.fit` - Fit description

### AI-Generated Fields
- `ai.description_generated` - AI description flag
- `ai.description_score` - Quality score
- `ai.smartdetect_applied` - SmartDetect metadata
- `ai.validation_issues` - Validation results

## Next Steps

**Waiting on Theo's approval.**

### To Approve
Reply to PR #98 comment with one of:
- "Approve — seed to STAGING"
- "Approve — seed to PRODUCTION"

### Phase B (Post-Approval)
1. Backup existing `settings/attributes/keys/*` collection
2. Seed 77 attribute keys with `merge: true`
3. Validate seeded documents
4. Post backup + logs to PR #98

## Safety Notes

- ✅ No writes performed yet (dry-run only)
- ✅ Phase B will create timestamped backups before seeding
- ✅ Merge mode preserves existing custom data
- ✅ Service account required for Phase B (staging or production)
