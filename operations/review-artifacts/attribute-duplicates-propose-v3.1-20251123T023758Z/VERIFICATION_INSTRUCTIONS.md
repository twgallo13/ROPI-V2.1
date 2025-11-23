# Verification Steps & Safe Apply Instructions

**Version:** v3.1.propose  
**Status:** NO DUPLICATES FOUND - NO PATCH TO APPLY  
**Generated:** 2025-11-23T02:37:58Z

---

## Status: Clean Registry ✅

**No duplicate merge operations are needed.** The attribute registry is clean with 0 duplicate canonicalPaths.

However, the vocabulary configuration issue can be addressed with the following optional steps.

---

## Optional: Fix Vocabulary Configuration

If you want to enable vocabulary dropdowns in ACC for attributes like `sku_core.department`:

### Step 1: Verify Firestore Lists Exist

Check if vocabulary lists exist in staging Firestore:

```bash
# Using gcloud (if you have access)
export PROJECT_ID="ropi-bccee"
gcloud firestore documents describe settings/lists/departments --project=$PROJECT_ID
gcloud firestore documents describe settings/lists/classes --project=$PROJECT_ID
gcloud firestore documents describe settings/lists/colors --project=$PROJECT_ID
```

Expected structure for each list:
```json
{
  "values": ["Value 1", "Value 2", "Value 3", ...],
  "lastUpdated": "2025-11-23T00:00:00Z"
}
```

**If lists don't exist**, create them:
```bash
# Example: Create departments list
cat > /tmp/departments.json << 'EOF'
{
  "values": ["Men's", "Women's", "Kids", "Home", "Beauty", "Electronics", "Sports", "Outdoors"],
  "lastUpdated": "2025-11-23T00:00:00Z"
}
EOF

# Import to Firestore (adjust for your auth method)
curl -X PATCH \
  "https://firestore.googleapis.com/v1/projects/$PROJECT_ID/databases/(default)/documents/settings/lists/departments" \
  -H "Authorization: Bearer $(gcloud auth print-access-token)" \
  -H "Content-Type: application/json" \
  -d @/tmp/departments.json
```

### Step 2: Create Vocabulary Configuration Patch (Optional)

If you want to configure allowedValuesRef for key attributes:

```bash
cd /workspaces/ROPI-V2.1

# Create branch
git checkout -b fix/attribute-vocab-config-v3.1

# Create patch file
cat > operations/review-artifacts/attribute-duplicates-propose-v3.1-20251123T023758Z/vocab-config-patch.json << 'EOF'
{
  "version": "v3.1.vocab-config",
  "timestamp": "2025-11-23T02:37:58Z",
  "description": "Configure allowedValuesRef for vocabulary-based attributes",
  "updates": [
    {
      "canonicalPath": "sku_core.department",
      "field": "validation.allowedValuesRef",
      "value": "settings/lists/departments"
    },
    {
      "canonicalPath": "sku_core.class",
      "field": "validation.allowedValuesRef",
      "value": "settings/lists/classes"
    },
    {
      "canonicalPath": "descriptive.primaryColor",
      "field": "validation.allowedValuesRef",
      "value": "settings/lists/colors"
    }
  ]
}
EOF
```

### Step 3: Apply Vocabulary Patch (Manual)

Since no automation exists for this, manually edit `scripts/attribute-registry-normalized.json`:

```bash
# Backup first
cp scripts/attribute-registry-normalized.json scripts/attribute-registry-normalized.json.backup-$(date +%Y%m%d)

# Edit the file - find each attribute and add validation.allowedValuesRef
```

Or use jq to apply programmatically:

```bash
jq '
  map(
    if .canonicalPath == "sku_core.department" then
      .validation.allowedValuesRef = "settings/lists/departments"
    elif .canonicalPath == "sku_core.class" then
      .validation.allowedValuesRef = "settings/lists/classes"
    elif .canonicalPath == "descriptive.primaryColor" then
      .validation.allowedValuesRef = "settings/lists/colors"
    else . end
  )
' scripts/attribute-registry-normalized.json > scripts/attribute-registry-normalized.json.tmp

mv scripts/attribute-registry-normalized.json.tmp scripts/attribute-registry-normalized.json
```

### Step 4: Dry-Run Seed to Staging

```bash
cd /workspaces/ROPI-V2.1

# Set staging credentials
export GOOGLE_APPLICATION_CREDENTIALS="/workspaces/ROPI-V2.1/service-account.json"
export FIRESTORE_EMULATOR_HOST=""  # Ensure not using emulator

# Dry-run normalize and seed
npx tsx scripts/normalizeAndSeedAttributes.ts --dry-run > /tmp/normalize-vocab-dryrun-v3.1.log 2>&1

# Review output
cat /tmp/normalize-vocab-dryrun-v3.1.log | grep -i "allowedValuesRef\|department\|class\|color"
```

Expected output should show attributes with allowedValuesRef set.

### Step 5: Actual Seed (After Approval)

```bash
# Only run after dry-run reviewed and approved
npx tsx scripts/normalizeAndSeedAttributes.ts --seed > /tmp/normalize-vocab-seed-v3.1.log 2>&1

# Verify
cat /tmp/normalize-vocab-seed-v3.1.log | tail -50
```

### Step 6: Verify in ACC

After seeding:

1. Open ACC staging: `https://ropi-staging.web.app/settings/attributes` (or local)
2. Search for attribute: `department`
3. Click to open AttributeDetailDrawer
4. Scroll to "Validation Rules" section
5. Verify "Allowed Values Reference" field shows: `settings/lists/departments`
6. **Note**: Values won't display yet because ACC needs the VocabularyValuesList component (see repo-code-scan-results.txt)

---

## Optional: Add Vocabulary Display to ACC UI

If you want ACC to actually DISPLAY vocabulary values (not just show the reference path):

### Implementation (see repo-code-scan-results.txt for full code)

1. Create `src/pages/settings/components/VocabularyValuesList.tsx`
2. Import and use in `AttributeDetailDrawer.tsx` after line 626:

```tsx
{formData.validation?.allowedValuesRef && (
  <VocabularyValuesList 
    listPath={formData.validation.allowedValuesRef} 
  />
)}
```

3. Test locally:
```bash
npm run dev
# Open http://localhost:5173/settings/attributes
# Open an attribute with allowedValuesRef set
# Should see vocabulary values displayed
```

---

## Rollback Instructions

### If Vocabulary Patch Was Applied

```bash
cd /workspaces/ROPI-V2.1

# Restore from backup
cp scripts/attribute-registry-normalized.json.backup-YYYYMMDD scripts/attribute-registry-normalized.json

# Re-seed staging
export GOOGLE_APPLICATION_CREDENTIALS="/workspaces/ROPI-V2.1/service-account.json"
npx tsx scripts/normalizeAndSeedAttributes.ts --seed > /tmp/normalize-rollback-v3.1.log 2>&1
```

### If Firestore Lists Were Created

Delete documents manually or via gcloud:

```bash
gcloud firestore documents delete settings/lists/departments --project=ropi-bccee
gcloud firestore documents delete settings/lists/classes --project=ropi-bccee
gcloud firestore documents delete settings/lists/colors --project=ropi-bccee
```

---

## Quick Verification Checklist (Post-Config)

After applying vocabulary configuration (if you choose to):

- [ ] `settings/lists/departments` exists in staging Firestore
- [ ] `settings/lists/classes` exists in staging Firestore
- [ ] `settings/lists/colors` exists in staging Firestore
- [ ] `sku_core.department` has `validation.allowedValuesRef` set
- [ ] `sku_core.class` has `validation.allowedValuesRef` set
- [ ] `descriptive.primaryColor` has `validation.allowedValuesRef` set
- [ ] Staging Firestore `settings/attributes/keys/{id}` documents updated
- [ ] ACC shows "Allowed Values Reference" field populated (input field only)
- [ ] (Optional) ACC displays vocabulary values if VocabularyValuesList component added

---

## Summary

**No duplicate merge operations required.** This verification document provides optional steps to configure vocabulary references if desired.

For questions or issues, refer to:
- `COMPREHENSIVE_REPORT.md` - Full analysis
- `repo-code-scan-results.txt` - ACC code recommendations
- `attribute-allowed-values-check.json` - Current allowedValuesRef audit
