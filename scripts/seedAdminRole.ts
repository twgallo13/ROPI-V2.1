#!/usr/bin/env ts-node

/**
 * Admin Role Seed Script
 * Seeds admin role for specified users by email
 * Run with: npm run seed:admin
 * 
 * Usage:
 *   ADMIN_EMAILS="theo@shiekhshoes.org,other@example.com" npm run seed:admin
 */

import { initializeApp, cert, type ServiceAccount } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { getAuth } from 'firebase-admin/auth';
import * as dotenv from 'dotenv';
import { readFileSync, existsSync } from 'fs';
import { resolve } from 'path';

// Load environment variables
dotenv.config({ path: resolve(__dirname, '../.env.local') });

// Get admin emails from environment
const adminEmailsEnv = process.env.ADMIN_EMAILS;
if (!adminEmailsEnv) {
  console.error('❌ Error: ADMIN_EMAILS environment variable is required');
  console.log('\nUsage:');
  console.log('  ADMIN_EMAILS="email1@example.com,email2@example.com" npm run seed:admin');
  process.exit(1);
}

const adminEmails = adminEmailsEnv.split(',').map(e => e.trim()).filter(Boolean);
if (adminEmails.length === 0) {
  console.error('❌ Error: No valid emails found in ADMIN_EMAILS');
  process.exit(1);
}

// Initialize Firebase Admin
let app;
try {
  // Try to use service account if available
  const serviceAccountPath = process.env.GOOGLE_APPLICATION_CREDENTIALS || 
                              resolve(__dirname, '../service-account.json');
  
  if (existsSync(serviceAccountPath)) {
    const serviceAccount = JSON.parse(
      readFileSync(serviceAccountPath, 'utf8')
    ) as ServiceAccount;
    
    app = initializeApp({
      credential: cert(serviceAccount),
    });
  } else {
    // Fallback to environment variables
    const projectId = process.env.VITE_FIREBASE_PROJECT_ID || 'ropi-bccee';
    console.log(`Using project ID: ${projectId}`);
    app = initializeApp({
      projectId,
    });
  }
} catch (error) {
  console.error('Failed to initialize Firebase Admin:', error);
  process.exit(1);
}

const db = getFirestore(app);
const auth = getAuth(app);

async function seedAdminRoles() {
  try {
    console.log('🌱 Starting admin role seed...\n');
    console.log(`📧 Admin emails to process: ${adminEmails.join(', ')}\n`);

    const results = {
      success: [] as string[],
      notFound: [] as string[],
      errors: [] as { email: string; error: string }[],
    };

    for (const email of adminEmails) {
      try {
        console.log(`🔍 Looking up user: ${email}`);
        
        // Find user by email
        const userRecord = await auth.getUserByEmail(email);
        const uid = userRecord.uid;
        
        console.log(`   Found UID: ${uid}`);
        
        // Write admin role to Firestore
        await db.collection('users').doc(uid).set(
          { role: 'admin', email, updatedAt: new Date().toISOString() },
          { merge: true }
        );
        
        console.log(`✅ Admin role set for ${email} (${uid})`);
        results.success.push(email);
        
      } catch (error: any) {
        if (error.code === 'auth/user-not-found') {
          console.log(`⚠️  User not found: ${email}`);
          results.notFound.push(email);
        } else {
          console.error(`❌ Error processing ${email}:`, error.message);
          results.errors.push({ email, error: error.message });
        }
      }
      
      console.log(''); // Empty line for readability
    }

    // Summary
    console.log('\n📊 Summary:');
    console.log(`   ✅ Success: ${results.success.length}`);
    console.log(`   ⚠️  Not found: ${results.notFound.length}`);
    console.log(`   ❌ Errors: ${results.errors.length}`);
    
    if (results.success.length > 0) {
      console.log('\n✅ Successfully seeded admin roles:');
      results.success.forEach(email => console.log(`   - ${email}`));
    }
    
    if (results.notFound.length > 0) {
      console.log('\n⚠️  Users not found (need to sign in first):');
      results.notFound.forEach(email => console.log(`   - ${email}`));
    }
    
    if (results.errors.length > 0) {
      console.log('\n❌ Errors:');
      results.errors.forEach(({ email, error }) => 
        console.log(`   - ${email}: ${error}`)
      );
    }

    console.log('\n🎉 Admin role seeding completed!');
    process.exit(results.errors.length > 0 ? 1 : 0);
    
  } catch (error) {
    console.error('❌ Fatal error seeding admin roles:', error);
    process.exit(1);
  }
}

// Run the seed function
seedAdminRoles();
