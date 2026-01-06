const admin = require('firebase-admin');
admin.initializeApp();
const db = admin.firestore();

async function checkFirestore() {
  console.log('\n🔥 Firestore Attribute Collection Check:\n');
  
  const snapshot = await db.collection('attributes').get();
  console.log(`Total documents: ${snapshot.size}\n`);
  
  snapshot.forEach(doc => {
    const data = doc.data();
    console.log(`• ${doc.id}`);
    console.log(`  Label: ${data.label || 'N/A'}`);
    console.log(`  Status: ${data.status || 'N/A'}`);
    console.log(`  Export: ${JSON.stringify(data.export)}`);
    console.log('');
  });
}

checkFirestore().then(() => process.exit(0)).catch(console.error);
