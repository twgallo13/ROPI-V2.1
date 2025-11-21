// get-test-product.js
const admin = require('firebase-admin');
const fs = require('fs');
const saPath = process.env.GOOGLE_APPLICATION_CREDENTIALS || '/secrets/staging-service-account.json';
if(!fs.existsSync(saPath)){ console.error('Missing service account JSON:', saPath); process.exit(1); }
const sa = require(saPath);
admin.initializeApp({ credential: admin.credential.cert(sa) });
const db = admin.firestore();
const sku = 'TEST-001';

(async ()=>{
  const candidates = ['products','catalog','items','products_v2'];
  for(const coll of candidates){
    try{
      const q = await db.collection(coll).where('sku_core.sku','==',sku).limit(1).get();
      if(!q.empty){
        q.forEach(doc => {
          console.log('FOUND_IN_COLLECTION:', coll);
          console.log(JSON.stringify({id: doc.id, data: doc.data()}, null, 2));
        });
        process.exit(0);
      } else {
        console.log('No doc in', coll);
      }
    }catch(err){
      console.log('Error querying', coll, err.message);
    }
  }
  console.log('Not found in default collections. If the app uses a different collection path, please search in the Firestore console.');
  process.exit(1);
})();
