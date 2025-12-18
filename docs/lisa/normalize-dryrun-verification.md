# PVS-0.1.5: Attribute Normalization Dry-Run Verification

**Lisa PVS Version:** 0.1.5  
**Date:** 2025-06-XX  
**Purpose:** Verify attribute update merge/validation behavior and document normalize script dry-run procedure

---

## Integration Test Status

### Test: `update-attribute-merge.emu.spec.ts`

**Status:** ✅ Created and Committed  
**Location:** `packages/api/test/integration/update-attribute-merge.emu.spec.ts`  
**Behavior:**
- Conditionally skips if `FIRESTORE_EMULATOR_HOST` not set
- Tests attribute update merge behavior:
  1. Creates minimal attribute with missing optional fields
  2. Updates with partial patch (only `label`)
  3. Asserts schema defaults applied: `status='active'`, `required_for_export=false`, `import_required=false`, `required_for_completion=false`

**Test Execution:**
```bash
# Without emulator (current dev container)
$ pnpm --filter packages/api test update-attribute-merge
✓ Test skipped (no emulator)

# With emulator (manual verification required)
$ firebase emulators:start --only firestore
$ FIRESTORE_EMULATOR_HOST=localhost:8080 pnpm --filter packages/api test update-attribute-merge
# Expected: ✓ All assertions pass
```

---

## Normalize Script Dry-Run Procedure

### Script: `scripts/normalize-attributes.js`

**Status:** ✅ Available  
**Location:** `scripts/normalize-attributes.js`  
**Purpose:** Validate and normalize all attribute documents in Firestore using `AttributeSchema` from `@ropi-aoss/sdk`

### Prerequisites

1. **Service Account Credentials** (for staging)
   - Set `GOOGLE_APPLICATION_CREDENTIALS=/path/to/service-account-key.json`
   - OR use Firebase emulator locally

2. **Dependencies**
   - `firebase-admin` installed
   - `@ropi-aoss/sdk` with `AttributeSchema` available
   - `yargs` for CLI args

### Dry-Run Execution (Staging)

**⚠️ Note:** Requires service account credentials not available in dev container. Must be run by user with access to:
- GitHub Secrets: `FIREBASE_SERVICE_ACCOUNT_ROPI_AOSS` 
- OR local service account key file

```bash
# Decode service account from GitHub Secrets (requires repo access)
echo "$FIREBASE_SERVICE_ACCOUNT_ROPI_AOSS" | base64 -d > /tmp/sa.json

# Set credentials
export GOOGLE_APPLICATION_CREDENTIALS=/tmp/sa.json

# Run dry-run (default mode)
node scripts/normalize-attributes.js --dry

# Expected output:
# Scanning settings/attributes/keys...
# Found N attribute docs.
# DRY: would update attr_XXX (changes: M)
# ...
# Summary: X docs with diffs, 0 errors
# Dry-run: no writes performed. Rerun without --dry to apply changes.
```

### Expected Dry-Run Results

Based on PVS-0.1.4 implementation (PR #271), the script should detect attributes missing schema defaults:

**Fields to be added/normalized:**
- `status: 'active'` (if missing or not 'active'/'inactive')
- `required_for_export: false` (if missing)
- `import_required: false` (if missing)
- `required_for_completion: false` (if missing)
- `external_header: ''` (if missing)
- `source: ''` (if missing)

**Sample Diff Output:**
```
DRY: would update attr_color (changes: 3)
  - status: undefined → 'active'
  - required_for_export: undefined → false
  - import_required: undefined → false

DRY: would update attr_size (changes: 4)
  - status: undefined → 'active'
  - required_for_export: undefined → false
  - import_required: undefined → false
  - required_for_completion: undefined → false
```

### Post-Dry-Run Actions

**If dry-run succeeds with 0 errors:**
1. Review diffs to confirm expected schema defaults
2. Plan production execution window
3. Create backup of `settings/attributes/keys` collection
4. Execute without `--dry` flag during maintenance window

**If dry-run reports errors:**
1. Review validation errors in output
2. Identify attributes with invalid schema
3. Manual remediation required before normalization
4. Report blockers to product owner

---

## Manual Verification Checklist

### Developer Tasks (requires staging access)

- [ ] Decode service account from GitHub Secrets
- [ ] Run `node scripts/normalize-attributes.js --dry` against staging
- [ ] Capture full output (docs changed, sample diffs, error count)
- [ ] Append output to this document under "Execution Results"
- [ ] Confirm 0 validation errors
- [ ] If errors found: create follow-up issue with error details

### Homer Agent Limitations

**Cannot Execute:**
- Service account credential access (GitHub Secrets)
- Direct Firestore read operations against staging
- Firebase emulator startup (no persistent process in dev container)

**Can Execute:**
- Test file creation and validation
- Documentation and procedure specification
- Git operations and PR creation

---

## Execution Results

**Status:** ⏳ Pending Manual Execution  
**Executor:** TBD (user with staging access)  
**Date:** TBD

### Dry-Run Output

```
[TO BE FILLED BY MANUAL EXECUTOR]

Example:
Scanning settings/attributes/keys...
Found 42 attribute docs.
DRY: would update attr_color (changes: 3)
DRY: would update attr_size (changes: 4)
...
Summary: 18 docs with diffs, 0 errors
Dry-run: no writes performed. Rerun without --dry to apply changes.
```

### Error Summary

```
[TO BE FILLED IF ERRORS OCCUR]

Example:
Validation failed for attr_invalid:
  - data_type: Expected 'string' | 'number' | ..., received 'bad_type'
```

---

## Related PRs

- **PVS-0.1.4 (PR #271):** Implemented attribute update merge/validation and normalization script
- **PVS-0.1.5 (this PR):** Verification testing and dry-run procedure documentation

---

## Next Steps

1. **Manual dry-run execution:** User with staging credentials runs normalize script
2. **Review results:** Confirm 0 errors and expected schema defaults applied
3. **Production planning:** If dry-run succeeds, schedule normalization execution
4. **Merge PVS-0.1.5:** Approve and merge this PR once dry-run results documented
