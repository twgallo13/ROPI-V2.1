#!/usr/bin/env node
/**
 * Repair Failing User Profile Documents
 * 
 * Specifically targets UIDs that caused 500 errors in the Settings UI:
 * - dM2UF9iXGuX9BaGTYpVjQexGD793
 * - sPgXgUARnVnGzZOlS9hGCneX2G
 * 
 * Checks if profile docs exist and creates them with minimal merge-safe data.
 * 
 * Tag: aoss.v0.7.1
 * Context: Fix remaining 500s on user updates
 */

const admin = require('firebase-admin');
const path = require('path');

// ANSI colors
const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  cyan: '\x1b[36m',
  bright: '\x1b[1m',
};

function log(message, color = colors.reset) {
  console.log(color + message + colors.reset);
}

// Failing UIDs from John's error reports
const FAILING_UIDS = [
  'dM2UF9iXGuX9BaGTYpVjQexGD793',
  'sPgXgUARnVnGzZOlS9hGCneX2G'
];

async function main() {
  log('\n' + '='.repeat(60), colors.bright);
  log('Repair Failing User Profile Documents', colors.bright + colors.cyan);
  log('='.repeat(60) + '\n', colors.bright);
  
  // Initialize Firebase Admin SDK
  // Try service account file first, fall back to application default credentials
  let projectId = 'ropi-bccee'; // Default project ID
  
  try {
    const serviceAccountPath = path.join(__dirname, '..', 'service-account.json');
    const serviceAccount = require(serviceAccountPath);
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
    });
    projectId = serviceAccount.project_id;
    log(`✅ Connected using service account to project: ${projectId}\n`, colors.green);
  } catch (error) {
    // Service account not available, try application default credentials
    log(`⚠️  Service account file not found, trying application default credentials...`, colors.yellow);
    try {
      admin.initializeApp({
        credential: admin.credential.applicationDefault(),
        projectId: projectId,
      });
      log(`✅ Connected using application default credentials to project: ${projectId}\n`, colors.green);
    } catch (credError) {
      log(`❌ Failed to initialize Firebase Admin SDK`, colors.red);
      log(`   Error: ${credError.message}`, colors.red);
      log(`\n💡 To run this script, you need either:`, colors.yellow);
      log(`   1. A service-account.json file in the project root, OR`, colors.reset);
      log(`   2. GOOGLE_APPLICATION_CREDENTIALS environment variable set, OR`, colors.reset);
      log(`   3. gcloud auth application-default login configured`, colors.reset);
      process.exit(1);
    }
  }
  
  const db = admin.firestore();
  
  log(`📋 Checking ${FAILING_UIDS.length} UIDs from error reports...\n`, colors.cyan);
  
  const results = [];
  
  for (const uid of FAILING_UIDS) {
    log(`\n${'—'.repeat(60)}`, colors.reset);
    log(`UID: ${uid}`, colors.bright);
    log('—'.repeat(60), colors.reset);
    
    try {
      // 1. Get Auth user
      let authUser;
      try {
        authUser = await admin.auth().getUser(uid);
        log(`✅ Auth user exists: ${authUser.email || 'no-email'}`, colors.green);
        log(`   Display Name: ${authUser.displayName || 'none'}`, colors.reset);
        log(`   Email Verified: ${authUser.emailVerified}`, colors.reset);
        log(`   Disabled: ${authUser.disabled}`, colors.reset);
      } catch (authError) {
        log(`❌ Auth user not found: ${authError.message}`, colors.red);
        results.push({
          uid,
          status: 'auth-not-found',
          error: authError.message
        });
        continue;
      }
      
      // 2. Check Firestore profile doc
      const docPath = `users/profiles/${uid}/data`;
      const docRef = db.doc(docPath);
      const snap = await docRef.get();
      
      if (!snap.exists) {
        log(`❌ Firestore profile missing at: ${docPath}`, colors.red);
        
        // Create minimal profile doc
        const payload = {
          displayName: authUser.displayName || (authUser.email ? authUser.email.split('@')[0] : 'Restored User'),
          email: authUser.email || 'restored@example.com',
          role: 'viewer', // Safe default - admin can update via UI
          emailVerified: authUser.emailVerified || false,
          createdAt: admin.firestore.FieldValue.serverTimestamp(),
          updatedAt: admin.firestore.FieldValue.serverTimestamp(),
          source: 'repair-script-aoss.v0.7.1',
        };
        
        log(`🔧 Creating profile document with merge-safe data...`, colors.yellow);
        await docRef.set(payload, { merge: true });
        log(`✅ Profile created successfully`, colors.green);
        log(`   Path: ${docPath}`, colors.cyan);
        log(`   Display Name: ${payload.displayName}`, colors.reset);
        log(`   Email: ${payload.email}`, colors.reset);
        log(`   Role: ${payload.role}`, colors.reset);
        
        results.push({
          uid,
          email: authUser.email,
          status: 'created',
          path: docPath,
          payload
        });
      } else {
        log(`✅ Firestore profile exists`, colors.green);
        const data = snap.data() || {};
        log(`   Display Name: ${data.displayName || 'none'}`, colors.reset);
        log(`   Email: ${data.email || 'none'}`, colors.reset);
        log(`   Role: ${data.role || 'none'}`, colors.reset);
        
        // Check if role is missing
        if (!data.role) {
          log(`⚠️  Role is missing — adding default 'viewer'`, colors.yellow);
          await docRef.set({ 
            role: 'viewer',
            updatedAt: admin.firestore.FieldValue.serverTimestamp(),
            source: 'repair-script-aoss.v0.7.1-role-fix',
          }, { merge: true });
          log(`✅ Role added`, colors.green);
          
          results.push({
            uid,
            email: authUser.email,
            status: 'role-added',
            path: docPath
          });
        } else {
          results.push({
            uid,
            email: authUser.email,
            status: 'ok',
            path: docPath
          });
        }
      }
      
    } catch (error) {
      log(`❌ Error processing UID: ${error.message}`, colors.red);
      results.push({
        uid,
        status: 'error',
        error: error.message
      });
    }
  }
  
  // Summary
  log('\n' + '='.repeat(60), colors.bright);
  log('REPAIR SUMMARY', colors.bright + colors.cyan);
  log('='.repeat(60) + '\n', colors.bright);
  
  const created = results.filter(r => r.status === 'created').length;
  const roleAdded = results.filter(r => r.status === 'role-added').length;
  const ok = results.filter(r => r.status === 'ok').length;
  const errors = results.filter(r => r.status === 'error' || r.status === 'auth-not-found').length;
  
  log(`Total UIDs checked: ${FAILING_UIDS.length}`, colors.cyan);
  log(`Profiles created: ${created}`, created > 0 ? colors.green : colors.reset);
  log(`Roles added: ${roleAdded}`, roleAdded > 0 ? colors.yellow : colors.reset);
  log(`Already OK: ${ok}`, colors.reset);
  log(`Errors: ${errors}`, errors > 0 ? colors.red : colors.reset);
  
  if (results.length > 0) {
    log('\nDetailed Results:', colors.bright);
    console.log(JSON.stringify(results, null, 2));
  }
  
  log('\n✅ Repair complete\n', colors.green);
}

main().catch(error => {
  log('\n❌ Fatal error:', colors.red);
  console.error(error);
  process.exit(1);
});
