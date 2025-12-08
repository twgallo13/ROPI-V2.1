// scripts/seed_emulator_users.js
// Usage: node scripts/seed_emulator_users.js
// This script assumes the Firebase Auth emulator is running and the Admin SDK will connect
// automatically when FIREBASE_AUTH_EMULATOR_HOST is set.
//
// Prompt-Version: Lisa v0.2.0

const admin = require('firebase-admin');

async function main() {
  try {
    // Initialize admin with no credentials - emulator uses unauthenticated admin
    admin.initializeApp({
      projectId: process.env.FIREBASE_PROJECT_ID || 'demo-ropi-test'
    });

    const users = [
      {
        uid: 'test-admin-1',
        email: 'test-admin@example.com',
        emailVerified: true,
        password: 'test-password-123',
        displayName: 'Test Admin'
      },
      {
        uid: 'test-user-1',
        email: 'test-user@example.com',
        emailVerified: true,
        password: 'test-password-123',
        displayName: 'Test User'
      },
      {
        uid: 'test-unverified-1',
        email: 'test-unverified@example.com',
        emailVerified: false,
        password: 'test-password-123',
        displayName: 'Test Unverified User'
      }
    ];

    console.log('Starting Firebase Auth emulator user seeding...');
    console.log(`FIREBASE_AUTH_EMULATOR_HOST: ${process.env.FIREBASE_AUTH_EMULATOR_HOST || 'not set'}`);

    for (const u of users) {
      try {
        const existing = await admin.auth().getUserByEmail(u.email);
        console.log(`User exists: ${u.email} (uid: ${existing.uid})`);
      } catch (err) {
        if (err.code && err.code === 'auth/user-not-found') {
          const created = await admin.auth().createUser({
            uid: u.uid,
            email: u.email,
            emailVerified: u.emailVerified,
            password: u.password,
            displayName: u.displayName
          });
          console.log(`Created user: ${u.email} (uid: ${created.uid})`);
        } else {
          console.error(`Error checking/creating user ${u.email}:`, err);
          throw err;
        }
      }
    }

    // Set admin custom claim for the admin user
    try {
      await admin.auth().setCustomUserClaims('test-admin-1', { role: 'admin' });
      console.log('Set admin custom claim for test-admin@example.com');
    } catch (err) {
      console.error('Error setting admin custom claim:', err);
    }

    console.log('Seeding complete');
    process.exit(0);
  } catch (e) {
    console.error('Seeding failed:', e);
    process.exit(1);
  }
}

main();
