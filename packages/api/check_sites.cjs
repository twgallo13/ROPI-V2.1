const admin = require('firebase-admin');
const fs = require('fs');

if (!admin.apps.length) {
  const serviceAccountPath = process.env.GOOGLE_APPLICATION_CREDENTIALS || '/workspaces/ROPI-V2.1/service-account.json';
  const serviceAccount = JSON.parse(fs.readFileSync(serviceAccountPath, 'utf8'));
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    projectId: 'ropi-bccee'
  });
}

const db = admin.firestore();

async function main() {
  const productsSnapshot = await db.collection('products').get();
  
  console.log('=== Site field analysis ===\n');
  
  const analysis = {
    totalProducts: productsSnapshot.size,
    hasWebsitesArray: 0,
    hasSitesArray: 0,
    hasWebsiteString: 0,
    hasAttributesWebsite: 0,
    noSiteField: 0,
    examples: []
  };
  
  for (const doc of productsSnapshot.docs) {
    const data = doc.data();
    const id = doc.id;
    
    let hasSite = false;
    
    if (Array.isArray(data.websites) && data.websites.length > 0) {
      analysis.hasWebsitesArray++;
      hasSite = true;
    }
    if (Array.isArray(data.sites) && data.sites.length > 0) {
      analysis.hasSitesArray++;
      hasSite = true;
    }
    if (data.website && typeof data.website === 'string') {
      analysis.hasWebsiteString++;
      hasSite = true;
    }
    if (data.attributes?.website && Array.isArray(data.attributes.website)) {
      analysis.hasAttributesWebsite++;
      // This is NOT picked up by extractSelectedSites!
    }
    
    if (!hasSite) {
      analysis.noSiteField++;
      if (analysis.examples.length < 20) {
        analysis.examples.push({
          id,
          websites: data.websites,
          sites: data.sites,
          website: data.website,
          attributesWebsite: data.attributes?.website
        });
      }
    }
  }
  
  console.log(`Total products: ${analysis.totalProducts}`);
  console.log(`Has websites[] (top-level): ${analysis.hasWebsitesArray}`);
  console.log(`Has sites[] (top-level): ${analysis.hasSitesArray}`);
  console.log(`Has website (string): ${analysis.hasWebsiteString}`);
  console.log(`Has attributes.website[]: ${analysis.hasAttributesWebsite}`);
  console.log(`NO site field at top-level: ${analysis.noSiteField}`);
  
  console.log('\n=== Products missing top-level site fields (up to 20) ===\n');
  for (const ex of analysis.examples) {
    console.log(`Product ID: ${ex.id}`);
    console.log(`  websites: ${JSON.stringify(ex.websites)}`);
    console.log(`  sites: ${JSON.stringify(ex.sites)}`);
    console.log(`  website: ${ex.website}`);
    console.log(`  attributes.website: ${JSON.stringify(ex.attributesWebsite)}`);
    console.log('');
  }
  
  console.log('\n=== SUMMARY JSON ===');
  console.log(JSON.stringify(analysis, null, 2));
}

main().then(() => process.exit(0)).catch(err => {
  console.error('Error:', err);
  process.exit(1);
});
