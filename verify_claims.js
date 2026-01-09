// verify_claims.js
const admin = require('firebase-admin');

admin.initializeApp({
  credential: admin.credential.cert(require('./sa.json')),
});

(async () => {
  try {
    const uid = process.argv[2] || 'ropi_aoss_deployer';
    
    // Get the user record
    const userRecord = await admin.auth().getUser(uid);
    
    console.log('User Record:');
    console.log('UID:', userRecord.uid);
    console.log('Email:', userRecord.email);
    console.log('Custom Claims:', JSON.stringify(userRecord.customClaims, null, 2));
    
    process.exit(0);
  } catch (err) {
    console.error('ERROR:', err.message);
    process.exit(1);
  }
})();
