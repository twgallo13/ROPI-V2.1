// set_admin_claim.js
const admin = require('firebase-admin');
const fs = require('fs');

const saPath = './sa.json';
if (!fs.existsSync(saPath)) {
  console.error('sa.json not found. Make sure GCP_SA_KEY_BASE64 was decoded to sa.json.');
  process.exit(1);
}
const uid = process.argv[2];
if (!uid) {
  console.error('Usage: node set_admin_claim.js <FIREBASE_UID>');
  process.exit(1);
}

admin.initializeApp({
  credential: admin.credential.cert(require(saPath)),
});

(async () => {
  try {
    // Persist admin custom claim on the user
    // The API middleware expects 'role' or 'roles' custom claim
    await admin.auth().setCustomUserClaims(uid, { 
      role: 'admin',
      admin: true  // Keep this for backward compatibility
    });
    console.log('setCustomUserClaims ok for uid:', uid);
    console.log('Claims set: { role: "admin", admin: true }');

    // Optional: create a new custom token for the uid (you can also continue using your token flow)
    const customToken = await admin.auth().createCustomToken(uid);
    console.log('customToken:', customToken);
    process.exit(0);
  } catch (err) {
    console.error('ERROR setting custom claims:', err);
    process.exit(2);
  }
})();
