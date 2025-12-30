const admin = require('firebase-admin');
const fs = require('fs');

const saKeyBase64 = process.env.GCP_SA_KEY_BASE64;
const saKey = JSON.parse(Buffer.from(saKeyBase64, 'base64').toString('utf8'));

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(saKey),
    projectId: saKey.project_id
  });
}
const db = admin.firestore();

const PRODUCTS = ['211737-90h1-8', '451-9204-blk18a', '211737-90h1-8a', '451-9201-blk18a', '451-9103-blk18a'];

async function dumpProducts() {
  for (const productId of PRODUCTS) {
    const doc = await db.collection('products').doc(productId).get();
    if (!doc.exists) {
      console.log(productId + ': NOT FOUND');
      continue;
    }
    
    const data = doc.data();
    const fullPath = '/tmp/normalize-' + productId + '-firestore-full.json';
    fs.writeFileSync(fullPath, JSON.stringify(data, null, 2));
    console.log('Saved: ' + fullPath);
    
    // Extract date fields and _meta
    console.log('\n=== ' + productId + ' ===');
    console.log('Date fields:');
    const dateKeys = ['launch_date', 'kl_post_date', 'hide_image_date', 'first_received', 'last_received'];
    const meta = data._meta || {};
    
    for (const key of dateKeys) {
      const attrValue = data.attributes && data.attributes[key];
      const coreValue = data.core && data.core[key];
      const topValue = data[key];
      const metaEntry = meta[key];
      
      if (attrValue || coreValue || topValue) {
        console.log('  ' + key + ':');
        if (attrValue) console.log('    attributes.' + key + ': ' + attrValue);
        if (coreValue) console.log('    core.' + key + ': ' + coreValue);
        if (topValue) console.log('    top-level: ' + topValue);
        if (metaEntry) console.log('    _meta.' + key + ': ' + JSON.stringify(metaEntry));
      }
    }
    
    // Check lastReceived specifically for header verification
    const lastReceivedCore = data.core && data.core.lastReceived;
    const lastReceivedAttr = data.attributes && data.attributes.last_received;
    const lastReceivedTop = data.lastReceived || data.last_received;
    
    console.log('\nHeader date fields (lastReceived):');
    console.log('  core.lastReceived: ' + (lastReceivedCore || '(not set)'));
    console.log('  attributes.last_received: ' + (lastReceivedAttr || '(not set)'));
    console.log('  top-level lastReceived: ' + (lastReceivedTop || '(not set)'));
    
    // Check launchDate for header
    const launchDateCore = data.core && data.core.launchDate;
    const launchDateAttr = data.attributes && data.attributes.launch_date;
    const launchDateTop = data.launchDate || data.launch_date;
    
    console.log('\nHeader date fields (launchDate):');
    console.log('  core.launchDate: ' + (launchDateCore || '(not set)'));
    console.log('  attributes.launch_date: ' + (launchDateAttr || '(not set)'));
    console.log('  top-level launchDate: ' + (launchDateTop || '(not set)'));
  }
}

dumpProducts().then(function() { process.exit(0); }).catch(function(e) { console.error(e); process.exit(1); });
