const admin = require('firebase-admin');
const fs = require('fs');

// Initialize Firebase Admin
const serviceAccountPath = process.env.GOOGLE_APPLICATION_CREDENTIALS || '/workspaces/ROPI-V2.1/service-account.json';
const serviceAccount = JSON.parse(fs.readFileSync(serviceAccountPath, 'utf8'));
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  projectId: 'ropi-bccee'
});

const db = admin.firestore();

async function main() {
  // Fetch settings/exportSettings
  const exportSettingsDoc = await db.collection('settings').doc('exportSettings').get();
  
  if (!exportSettingsDoc.exists) {
    console.log('ERROR: settings/exportSettings does not exist');
    process.exit(1);
  }
  
  const data = exportSettingsDoc.data();
  console.log('=== settings/exportSettings ===');
  console.log(JSON.stringify(data, null, 2));
}

main().then(() => process.exit(0)).catch(err => {
  console.error('Error:', err.message);
  process.exit(1);
});
