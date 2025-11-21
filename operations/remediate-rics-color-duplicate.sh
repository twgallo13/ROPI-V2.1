#!/bin/bash
# Remediation script: Remove rics_color from descriptive.primaryColor
# Run this ONLY if duplicate validation shows rics_color mapped to multiple paths

set -e

export GOOGLE_APPLICATION_CREDENTIALS="${GOOGLE_APPLICATION_CREDENTIALS:-/secrets/staging-service-account.json}"

echo "================================================================"
echo "Remediation: Remove rics_color from descriptive.primaryColor"
echo "================================================================"

node -e '
const admin=require("firebase-admin");
const fs=require("fs");
const sa=require(process.env.GOOGLE_APPLICATION_CREDENTIALS);
admin.initializeApp({credential: admin.credential.cert(sa)});
const db = admin.firestore();
(async()=>{
  const docRef = db.collection("settings").doc("attributes").collection("keys").doc("primaryColor");
  const doc = await docRef.get();
  if(!doc.exists){console.log("primaryColor not found");process.exit(1);}
  const data = doc.data();
  const cols = (data.importerColumns||[]).filter(c=>c!=="rics_color");
  await docRef.set({importerColumns:cols},{merge:true});
  console.log("✅ Removed rics_color, new importerColumns:",cols);
  process.exit(0);
})();
'

echo ""
echo "Re-running duplicate check..."
jq -r '.[] | .canonicalPath as $cp | .importerColumns[]? | "\($cp)\t\(. )"' scripts/attribute-registry-normalized.json \
  | awk -F'\t' '{print $2 "\t" $1}' \
  | sort \
  | awk '{count[$1]++; paths[$1]=paths[$1]","$2} END{for(i in count) if(count[i]>1) print i, count[i], paths[i]}' \
  > /tmp/duplicate-importer-columns-after.txt

if [ -s /tmp/duplicate-importer-columns-after.txt ]; then
  echo "⚠️  Still have duplicates:"
  cat /tmp/duplicate-importer-columns-after.txt
else
  echo "✅ No duplicates remaining"
fi
