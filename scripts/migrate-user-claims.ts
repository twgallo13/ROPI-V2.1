#!/usr/bin/env ts-node
/**
 * User Claims Migration Script
 * 
 * Migrates legacy canonical roles to new Ropi roles.
 * 
 * Migration Mapping:
 * - platform_admin → admin
 * - district_manager → admin
 * - automation_service → admin
 * - catalog_editor → merch
 * - store_manager → merch
 * - viewer → viewer
 * - (unknown/invalid) → viewer
 * 
 * Features:
 * - Idempotent (can run multiple times safely)
 * - Audit trail in Firestore
 * - CSV report generation
 * - Dry-run mode
 * 
 * Usage:
 *   pnpm ts-node scripts/migrate-user-claims.ts [--dry-run]
 */

import * as admin from 'firebase-admin';
import * as fs from 'fs';
import * as path from 'path';

// Initialize Firebase Admin
const serviceAccount = process.env.GOOGLE_APPLICATION_CREDENTIALS;
if (!serviceAccount) {
  console.error('❌ GOOGLE_APPLICATION_CREDENTIALS not set');
  process.exit(1);
}

admin.initializeApp({
  credential: admin.credential.applicationDefault(),
});

const auth = admin.auth();
const db = admin.firestore();

// Migration mapping
const ROLE_MAPPING: Record<string, string> = {
  platform_admin: 'admin',
  district_manager: 'admin',
  automation_service: 'admin',
  catalog_editor: 'merch',
  store_manager: 'merch',
  viewer: 'viewer',
};

const DEFAULT_ROLE = 'viewer';

interface MigrationResult {
  uid: string;
  email: string;
  oldRole: string | null;
  newRole: string;
  status: 'success' | 'error' | 'skipped';
  error?: string;
  timestamp: string;
}

/**
 * Map legacy role to new Ropi role
 */
function mapRole(oldRole: string | undefined): string {
  if (!oldRole) {
    return DEFAULT_ROLE;
  }
  return ROLE_MAPPING[oldRole] || DEFAULT_ROLE;
}

/**
 * Migrate a single user's claims
 */
async function migrateUser(
  user: admin.auth.UserRecord,
  dryRun: boolean
): Promise<MigrationResult> {
  const customClaims = user.customClaims || {};
  const oldRole = customClaims.role as string | undefined;
  const newRole = mapRole(oldRole);

  const result: MigrationResult = {
    uid: user.uid,
    email: user.email || 'no-email',
    oldRole: oldRole || null,
    newRole,
    status: 'success',
    timestamp: new Date().toISOString(),
  };

  // Skip if already migrated to new role
  if (oldRole === newRole) {
    result.status = 'skipped';
    console.log(`⏭️  Skipping ${user.email}: already has role '${newRole}'`);
    return result;
  }

  try {
    if (!dryRun) {
      // Update custom claims
      await auth.setCustomUserClaims(user.uid, { role: newRole });

      // Create audit record in Firestore
      await db.collection('audit').doc(`user_migration_${user.uid}_${Date.now()}`).set({
        type: 'user_role_migration',
        uid: user.uid,
        email: user.email,
        oldRole: oldRole || null,
        newRole,
        migratedAt: admin.firestore.FieldValue.serverTimestamp(),
        migratedBy: 'migration-script',
      });

      console.log(`✅ Migrated ${user.email}: '${oldRole || 'none'}' → '${newRole}'`);
    } else {
      console.log(`🔍 [DRY RUN] Would migrate ${user.email}: '${oldRole || 'none'}' → '${newRole}'`);
    }

    result.status = 'success';
  } catch (error: any) {
    result.status = 'error';
    result.error = error.message;
    console.error(`❌ Failed to migrate ${user.email}:`, error.message);
  }

  return result;
}

/**
 * Generate CSV report
 */
function generateReport(results: MigrationResult[], reportPath: string): void {
  const csvLines = [
    'uid,email,old_role,new_role,status,error,timestamp',
    ...results.map((r) =>
      [
        r.uid,
        r.email,
        r.oldRole || 'none',
        r.newRole,
        r.status,
        r.error || '',
        r.timestamp,
      ].join(',')
    ),
  ];

  fs.writeFileSync(reportPath, csvLines.join('\n'), 'utf-8');
  console.log(`\n📄 Report saved to: ${reportPath}`);
}

/**
 * Main migration function
 */
async function main() {
  const dryRun = process.argv.includes('--dry-run');
  const results: MigrationResult[] = [];

  console.log('🚀 Starting user claims migration...');
  console.log(`Mode: ${dryRun ? 'DRY RUN' : 'LIVE'}`);
  console.log('');

  try {
    // List all users
    let nextPageToken: string | undefined;
    let totalUsers = 0;

    do {
      const listResult = await auth.listUsers(1000, nextPageToken);
      
      for (const user of listResult.users) {
        totalUsers++;
        const result = await migrateUser(user, dryRun);
        results.push(result);
      }

      nextPageToken = listResult.pageToken;
    } while (nextPageToken);

    // Summary
    console.log('\n📊 Migration Summary:');
    console.log(`Total users: ${totalUsers}`);
    console.log(`Migrated: ${results.filter((r) => r.status === 'success').length}`);
    console.log(`Skipped: ${results.filter((r) => r.status === 'skipped').length}`);
    console.log(`Errors: ${results.filter((r) => r.status === 'error').length}`);

    // Generate report
    const reportsDir = path.join(process.cwd(), 'reports');
    if (!fs.existsSync(reportsDir)) {
      fs.mkdirSync(reportsDir, { recursive: true });
    }

    const timestamp = new Date().toISOString().replace(/:/g, '-').split('.')[0];
    const reportPath = path.join(reportsDir, `user_claims_migration_${timestamp}.csv`);
    generateReport(results, reportPath);

    console.log('\n✅ Migration complete!');
    
    if (dryRun) {
      console.log('\n⚠️  This was a DRY RUN. No changes were made.');
      console.log('Run without --dry-run to apply changes.');
    }
  } catch (error: any) {
    console.error('\n❌ Migration failed:', error.message);
    process.exit(1);
  }
}

// Run migration
main().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
