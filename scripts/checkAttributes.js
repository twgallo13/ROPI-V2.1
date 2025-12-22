const admin = require('firebase-admin');
admin.initializeApp();
const db = admin.firestore();

(async function(){
  try {
    const snap = await db.collection('settings').doc('attributes').collection('keys').limit(50).get();
    console.log('Found attributes count:', snap.size);
    snap.forEach(doc => {
      const data = doc.data();
      console.log('-', doc.id, '→', data.label || data.attribute_id || '(no label)', 'data_type:', data.data_type, 'import_required:', data.import_required);
    });

    // Also show metadata/admins doc
    const meta = await db.collection('metadata').doc('admins').get();
    if (meta.exists) {
      console.log('\nmetadata/admins:', JSON.stringify(meta.data(), null, 2));
    } else {
      console.log('\nmetadata/admins: <missing>');
    }
  } catch(e) {
    console.error('ERROR', e);
    process.exit(1);
  }
})();
