// tmp/getAttributeSamples.js
const admin = require('firebase-admin');
const fs = require('fs');
const path = require('path');

if (!admin.apps.length) {
  const keyBase64 = process.env.GCP_SA_KEY_BASE64;
  if (keyBase64) {
    admin.initializeApp({ credential: admin.credential.cert(JSON.parse(Buffer.from(keyBase64,'base64').toString('utf8'))) });
  } else admin.initializeApp();
}

const db = admin.firestore();

(async () => {
  const ids = ['primary_color', 'age_group', 'rics_source.brand', 'descriptive.gender'];
  const out = {};
  for (const id of ids) {
    const doc = await db.collection('settings/attributes/keys').doc(id).get();
    out[id] = doc.exists ? doc.data() : null;
  }
  const dir = path.resolve(__dirname, '../docs/lisa/attributes-console-audit/LP-0.8.0');
  fs.mkdirSync(dir, { recursive: true });
  const outPath = path.join(dir, 'get-samples.json');
  fs.writeFileSync(outPath, JSON.stringify(out, null, 2));
  console.log('WROTE', outPath);
  
  // Print summary for each attribute
  for (const id of ids) {
    const attr = out[id];
    if (attr) {
      console.log(`\n${id}:`);
      console.log(`  data_type: ${attr.data_type}`);
      console.log(`  allowed_values type: ${Array.isArray(attr.allowed_values) ? 'array' : typeof attr.allowed_values}`);
      console.log(`  allowed_values count: ${attr.allowed_values?.length || 0}`);
      if (attr.allowed_values?.length > 0) {
        console.log(`  first value type: ${typeof attr.allowed_values[0]}`);
        console.log(`  sample values:`, JSON.stringify(attr.allowed_values.slice(0, 3)));
      }
      console.log(`  allowed_values_meta: ${attr.allowed_values_meta ? 'exists' : 'missing'}`);
    } else {
      console.log(`\n${id}: NOT FOUND`);
    }
  }
})();
