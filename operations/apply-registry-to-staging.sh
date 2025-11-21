#!/bin/bash
set -e

echo "================================================================"
echo "STEP 1: Apply Attribute Registry to Staging"
echo "================================================================"

# 1) Set credentials & project ID
export GOOGLE_APPLICATION_CREDENTIALS="${GOOGLE_APPLICATION_CREDENTIALS:-/secrets/staging-service-account.json}"
export FIRESTORE_PROJECT_ID="ropi-staging"

echo "Using credentials: $GOOGLE_APPLICATION_CREDENTIALS"
echo "Target project: $FIRESTORE_PROJECT_ID"

if [ ! -f "$GOOGLE_APPLICATION_CREDENTIALS" ]; then
  echo "ERROR: Service account file not found at $GOOGLE_APPLICATION_CREDENTIALS"
  echo "Please set GOOGLE_APPLICATION_CREDENTIALS to the correct path"
  exit 1
fi

# 2) Ensure repo is up to date
echo ""
echo "Fetching latest from origin..."
git fetch origin
git checkout main
git pull origin main

# 3) Optional quick review: list keys that will be updated
echo ""
echo "Reviewing attribute keys to update..."
jq -r '.[].key' scripts/attribute-registry-normalized.json | sort > /tmp/attribute-keys-to-update.txt
echo "Keys to update: $(wc -l < /tmp/attribute-keys-to-update.txt)"
echo "First 40 keys:"
head -n 40 /tmp/attribute-keys-to-update.txt

# 4) BACKUP current attribute keys from staging
echo ""
echo "================================================================"
echo "Creating backup of current staging attribute keys..."
echo "================================================================"
node -e '
const admin=require("firebase-admin");
const fs=require("fs");
const sa=require(process.env.GOOGLE_APPLICATION_CREDENTIALS);
admin.initializeApp({credential: admin.credential.cert(sa)});
const db = admin.firestore();
(async ()=>{
  const col = await db.collection("settings").doc("attributes").collection("keys").get();
  const data = {};
  col.forEach(d => data[d.id]=d.data());
  const dir = "operations/review-artifacts/attribute-registry";
  fs.mkdirSync(dir, {recursive:true});
  const fn = dir + "/attribute-keys-backup-" + Date.now() + ".json";
  fs.writeFileSync(fn, JSON.stringify({meta:Date.now(),data}, null, 2));
  console.log("WROTE_BACKUP:", fn);
  process.exit(0);
})();
'

# 5) APPLY updated keys (safe merge of importerColumns, export & bulkEditable)
echo ""
echo "================================================================"
echo "Applying updated attribute keys to staging..."
echo "================================================================"
node -e '
const admin=require("firebase-admin");
const fs=require("fs");
const sa=require(process.env.GOOGLE_APPLICATION_CREDENTIALS);
admin.initializeApp({credential: admin.credential.cert(sa)});
const db = admin.firestore();
const reg = JSON.parse(fs.readFileSync("scripts/attribute-registry-normalized.json","utf8"));
(async ()=>{
  let count = 0;
  for(const a of reg){
    const docId = a.key;
    const payload = {
      importerColumns: a.importerColumns||[],
      export: !!a.export,
      bulkEditable: !!a.bulkEditable,
      description: a.description||"",
      canonicalPath: a.canonicalPath
    };
    await db.collection("settings").doc("attributes").collection("keys").doc(docId).set(payload,{merge:true});
    console.log("UPDATED:", docId);
    count++;
  }
  console.log("DONE - Updated", count, "attribute keys");
  process.exit(0);
})();
'

# 6) Validation: check no accidental duplicate importerColumns across keys
echo ""
echo "================================================================"
echo "Validating no duplicate importerColumns..."
echo "================================================================"
jq -r '.[] | .canonicalPath as $cp | .importerColumns[]? | "\($cp)\t\(. )"' scripts/attribute-registry-normalized.json \
  | awk -F'\t' '{print $2 "\t" $1}' \
  | sort \
  | awk '{count[$1]++; paths[$1]=paths[$1]","$2} END{for(i in count) if(count[i]>1) print i, count[i], paths[i]}' \
  > /tmp/duplicate-importer-columns.txt

if [ -s /tmp/duplicate-importer-columns.txt ]; then
  echo "⚠️  WARNING: Duplicate importerColumns found:"
  cat /tmp/duplicate-importer-columns.txt
else
  echo "✅ No duplicate importerColumns found"
fi

echo ""
echo "================================================================"
echo "STEP 1 COMPLETE"
echo "================================================================"
