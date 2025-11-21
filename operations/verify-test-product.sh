#!/bin/bash
# Verify the imported test product in staging Firestore

set -e

export GOOGLE_APPLICATION_CREDENTIALS="${GOOGLE_APPLICATION_CREDENTIALS:-/secrets/staging-service-account.json}"
export FIRESTORE_PROJECT_ID="${FIRESTORE_PROJECT_ID:-ropi-bccee}"

echo "================================================================"
echo "Verifying Test Product in Staging Firestore"
echo "Project: $FIRESTORE_PROJECT_ID"
echo "SKU: TEST-001"
echo "================================================================"

node -e '
const admin=require("firebase-admin");
const fs=require("fs");
const sa=require(process.env.GOOGLE_APPLICATION_CREDENTIALS);
admin.initializeApp({credential: admin.credential.cert(sa)});
const db = admin.firestore();

(async()=>{
  // Search for product by SKU
  const productsRef = db.collection("products");
  const query = productsRef.where("sku_core.sku", "==", "TEST-001").limit(1);
  const snapshot = await query.get();
  
  if (snapshot.empty) {
    console.log("❌ Product with SKU=TEST-001 not found");
    process.exit(1);
  }
  
  const doc = snapshot.docs[0];
  const data = doc.data();
  
  console.log("✅ Product found, Document ID:", doc.id);
  console.log("");
  console.log("Full product document:");
  console.log(JSON.stringify(data, null, 2));
  console.log("");
  console.log("================================================================");
  console.log("Field Verification:");
  console.log("================================================================");
  
  const checks = [
    { path: "sku_core.sku", expected: "TEST-001" },
    { path: "descriptive.primaryColor", expected: "Black" },
    { path: "technical.storeInv", expected: 20 },
    { path: "technical.warehouseInv", expected: 50 },
    { path: "technical.whsInv", expected: 10 },
    { path: "pricing.scomRegularPrice", expected: 120.00 },
    { path: "pricing.scomSalePrice", expected: 99.00 },
    { path: "launch.launchDate", expected: "2025-10-01" },
    { path: "launch.klPostDate", expected: "2025-10-01" },
    { path: "technical.mediaStatus", expected: "Images Ready" }
  ];
  
  let passed = 0;
  let failed = 0;
  
  for (const check of checks) {
    const parts = check.path.split(".");
    let value = data;
    for (const part of parts) {
      value = value?.[part];
    }
    
    const match = value == check.expected;
    const status = match ? "✅" : "❌";
    
    if (match) passed++;
    else failed++;
    
    console.log(`${status} ${check.path}: ${JSON.stringify(value)} ${match ? "" : "(expected: " + JSON.stringify(check.expected) + ")"}`);
  }
  
  console.log("");
  console.log("================================================================");
  console.log(`Verification Results: ${passed} passed, ${failed} failed`);
  console.log("================================================================");
  
  process.exit(failed > 0 ? 1 : 0);
})();
'
