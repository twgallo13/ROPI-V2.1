# LP-0.1.4 Restore Instructions

## Overview

This document provides emergency rollback instructions for the LP-0.1.4 cleanup operation.
Use these instructions if the cleanup produces unexpected results or if Lisa requests a rollback.

## Backup File Location

```
File: /workspaces/ROPI-V2.1/HOMER_CLEANUP_LP-0.1.4/backups/backup_products_2025-12-27T0504Z.json
SHA256: cf9854770431e5a4845f83a22f14139e07b6025a8498ea18549f6b37165f3183
Size: 83373 bytes (81.42 KB)
Documents: 39
Timestamp: 2025-12-27T05:04:39.688Z
```

## Target Documents (Affected by Cleanup)

| Doc ID | Original Websites | Post-Cleanup Websites |
|--------|------------------|----------------------|
| `123` | `[shiekhshoes.com, shiekh.com, Karmaloop.com]` | `[shiekh.com, Karmaloop.com]` |
| `test-product-001` | `[shiekh.com, shiekhshoes.com]` | `[shiekh.com]` |
| `test-product-003` | `[shiekh.com, shiekhshoes.com]` | `[shiekh.com]` |

## Required Credentials

The restore script requires Firebase Admin credentials. Ensure one of the following is set:

```bash
# Option 1: Path to service account JSON
export GOOGLE_APPLICATION_CREDENTIALS=/path/to/service-account.json

# Option 2: Base64-encoded service account JSON (used in CI)
export GCP_SA_KEY_BASE64=<base64-encoded-json>
```

## Restore Commands

### 1. Preview Restore (Dry-Run) - ALWAYS RUN FIRST

```bash
cd /workspaces/ROPI-V2.1

# Preview restore for all affected documents
node scripts/restore-from-backup.js \
  --file=HOMER_CLEANUP_LP-0.1.4/backups/backup_products_2025-12-27T0504Z.json \
  --dry-run

# Preview restore for a specific document
node scripts/restore-from-backup.js \
  --file=HOMER_CLEANUP_LP-0.1.4/backups/backup_products_2025-12-27T0504Z.json \
  --dry-run \
  --doc=test-product-001
```

### 2. Execute Restore (Write Mode) - ONLY AFTER DRY-RUN

```bash
cd /workspaces/ROPI-V2.1

# Restore all documents (with confirmation prompt)
node scripts/restore-from-backup.js \
  --file=HOMER_CLEANUP_LP-0.1.4/backups/backup_products_2025-12-27T0504Z.json \
  --write

# Restore all documents (skip confirmation - USE WITH CAUTION)
node scripts/restore-from-backup.js \
  --file=HOMER_CLEANUP_LP-0.1.4/backups/backup_products_2025-12-27T0504Z.json \
  --write \
  --yes

# Restore only a specific document
node scripts/restore-from-backup.js \
  --file=HOMER_CLEANUP_LP-0.1.4/backups/backup_products_2025-12-27T0504Z.json \
  --write \
  --doc=123
```

### 3. Verify Restore Success

After restore, verify the documents have been reverted:

```bash
# Run the ghost check - should find matches again if restore worked
node scripts/firestore-ghost-check.js
```

Expected output after restore: `3 matches found`

## Emergency Rollback Procedure

If something goes wrong during cleanup:

1. **STOP** - Do not proceed with any further operations
2. **Notify Lisa** - Report the issue immediately
3. **Run dry-run restore** - Verify the restore would work:
   ```bash
   node scripts/restore-from-backup.js \
     --file=HOMER_CLEANUP_LP-0.1.4/backups/backup_products_2025-12-27T0504Z.json \
     --dry-run
   ```
4. **Execute restore** - Only after Lisa authorization:
   ```bash
   node scripts/restore-from-backup.js \
     --file=HOMER_CLEANUP_LP-0.1.4/backups/backup_products_2025-12-27T0504Z.json \
     --write \
     --yes
   ```
5. **Verify** - Run ghost check to confirm restore:
   ```bash
   node scripts/firestore-ghost-check.js
   ```
6. **Report** - Attach restore logs to LP-0.1.4 PR

## Backup Verification

To verify the backup file integrity before restore:

```bash
# Calculate SHA256 of backup file
sha256sum HOMER_CLEANUP_LP-0.1.4/backups/backup_products_2025-12-27T0504Z.json

# Expected output:
# cf9854770431e5a4845f83a22f14139e07b6025a8498ea18549f6b37165f3183  HOMER_CLEANUP_LP-0.1.4/backups/backup_products_2025-12-27T0504Z.json
```

## Contact

- **Lisa Authorization Required**: Do not execute restore without Lisa's explicit approval
- **LP Version**: 0.1.4
- **Created**: 2025-12-27T05:04:39.688Z
