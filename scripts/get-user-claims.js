#!/usr/bin/env node
/**
 * Get custom claims for admin users
 * LP-3.0.6: Diagnose Firestore permission issues
 */
const admin = require('firebase-admin');
const serviceAccount = require('../service-account.json');

admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });

async function getUserClaims() {
  const targetEmail = 'theo@shiekh.com';
  
  try {
    // Get user by email
    const user = await admin.auth().getUserByEmail(targetEmail);
    
    const result = {
      uid: user.uid,
      email: user.email,
      emailVerified: user.emailVerified,
      displayName: user.displayName,
      customClaims: user.customClaims || {},
      disabled: user.disabled,
      metadata: {
        creationTime: user.metadata.creationTime,
        lastSignInTime: user.metadata.lastSignInTime,
      }
    };
    
    console.log(JSON.stringify(result, null, 2));
    
  } catch (error) {
    console.error(JSON.stringify({ error: error.message }));
  } finally {
    await admin.app().delete();
  }
}

getUserClaims();
