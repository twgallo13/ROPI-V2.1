#!/bin/bash
set -e

# Color output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo "================================================================"
echo "ROPI Staging Attribute Registry Application"
echo "================================================================"

# Parse arguments
DRY_RUN=false
AUTO_FIX_RICS=false

for arg in "$@"; do
  case $arg in
    --dry-run)
      DRY_RUN=true
      shift
      ;;
    --auto-fix-rics)
      AUTO_FIX_RICS=true
      shift
      ;;
  esac
done

# 1) Set credentials & project ID
export GOOGLE_APPLICATION_CREDENTIALS="${GOOGLE_APPLICATION_CREDENTIALS:-/secrets/staging-service-account.json}"
export FIRESTORE_PROJECT_ID="${FIRESTORE_PROJECT_ID:-ropi-bccee}"

echo ""
echo "Using credentials: $GOOGLE_APPLICATION_CREDENTIALS"
echo "Target project: $FIRESTORE_PROJECT_ID"

if [ ! -f "$GOOGLE_APPLICATION_CREDENTIALS" ]; then
  echo -e "${RED}ERROR: Service account file not found at $GOOGLE_APPLICATION_CREDENTIALS${NC}"
  echo "Please set GOOGLE_APPLICATION_CREDENTIALS to the correct path"
  exit 1
fi

# 2) Ensure repo is up to date
if [ "$DRY_RUN" = false ]; then
  echo ""
  echo "Fetching latest from origin..."
  git fetch origin
  git checkout main
  git pull origin main
fi

# 3) Validate JSON
echo ""
echo "Validating attribute-registry-normalized.json..."
if ! jq empty scripts/attribute-registry-normalized.json 2>/dev/null; then
  echo -e "${RED}ERROR: Invalid JSON in scripts/attribute-registry-normalized.json${NC}"
  exit 1
fi
echo -e "${GREEN}✅ JSON is valid${NC}"

# 4) List keys that will be updated
echo ""
echo "Reviewing attribute keys to update..."
jq -r '.[].key' scripts/attribute-registry-normalized.json | sort > /tmp/attribute-keys-to-update.txt
TOTAL_KEYS=$(wc -l < /tmp/attribute-keys-to-update.txt)
echo "Keys to update: $TOTAL_KEYS"
echo "First 40 keys:"
head -n 40 /tmp/attribute-keys-to-update.txt

# 5) Check for duplicates BEFORE applying
echo ""
echo "================================================================"
echo "Checking for duplicate importerColumns..."
echo "================================================================"
jq -r '.[] | .canonicalPath as $cp | .importerColumns[]? | "\($cp)\t\(. )"' scripts/attribute-registry-normalized.json \
  | awk -F'\t' '{print $2 "\t" $1}' \
  | sort \
  | awk '{count[$1]++; paths[$1]=paths[$1]","$2} END{for(i in count) if(count[i]>1) print i, count[i], paths[i]}' \
  > /tmp/duplicate-importer-columns-precheck.txt

if [ -s /tmp/duplicate-importer-columns-precheck.txt ]; then
  echo -e "${YELLOW}⚠️  WARNING: Duplicate importerColumns found in JSON:${NC}"
  cat /tmp/duplicate-importer-columns-precheck.txt
  echo ""
  echo "This may cause import mapping conflicts. Please fix the JSON before applying."
  if [ "$DRY_RUN" = false ]; then
    read -p "Continue anyway? (y/N) " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
      exit 1
    fi
  fi
else
  echo -e "${GREEN}✅ No duplicate importerColumns in JSON${NC}"
fi

if [ "$DRY_RUN" = true ]; then
  echo ""
  echo "================================================================"
  echo "DRY RUN COMPLETE - No changes made"
  echo "================================================================"
  echo "To apply changes, run: ./apply-staging-registry.sh"
  exit 0
fi

# 6) BACKUP current attribute keys from staging
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
  try {
    const col = await db.collection("settings").doc("attributes").collection("keys").get();
    const data = {};
    col.forEach(d => data[d.id]=d.data());
    const dir = "operations/review-artifacts/attribute-registry";
    fs.mkdirSync(dir, {recursive:true});
    const fn = dir + "/attribute-keys-backup-" + Date.now() + ".json";
    fs.writeFileSync(fn, JSON.stringify({meta:Date.now(),data}, null, 2));
    console.log("WROTE_BACKUP:", fn);
    process.exit(0);
  } catch(err) {
    console.error("ERROR during backup:", err.message);
    process.exit(1);
  }
})();
'

if [ $? -ne 0 ]; then
  echo -e "${RED}ERROR: Backup failed${NC}"
  exit 1
fi

# 7) APPLY updated keys (safe merge of importerColumns, export & bulkEditable)
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
  try {
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
  } catch(err) {
    console.error("ERROR during apply:", err.message);
    process.exit(1);
  }
})();
'

if [ $? -ne 0 ]; then
  echo -e "${RED}ERROR: Apply failed${NC}"
  exit 1
fi

# 8) Validation: check for duplicates POST-apply in Firestore
echo ""
echo "================================================================"
echo "Validating no duplicate importerColumns in Firestore..."
echo "================================================================"
node -e '
const admin=require("firebase-admin");
const sa=require(process.env.GOOGLE_APPLICATION_CREDENTIALS);
admin.initializeApp({credential: admin.credential.cert(sa)});
const db = admin.firestore();
(async ()=>{
  try {
    const col = await db.collection("settings").doc("attributes").collection("keys").get();
    const columnMap = new Map();
    
    col.forEach(doc => {
      const data = doc.data();
      const canonicalPath = data.canonicalPath || doc.id;
      const importerColumns = data.importerColumns || [];
      
      for (const col of importerColumns) {
        if (!columnMap.has(col)) {
          columnMap.set(col, []);
        }
        columnMap.get(col).push(canonicalPath);
      }
    });
    
    const duplicates = [];
    for (const [column, paths] of columnMap.entries()) {
      if (paths.length > 1) {
        duplicates.push({ column, paths, count: paths.length });
      }
    }
    
    if (duplicates.length === 0) {
      console.log("✅ No duplicate importerColumns found in Firestore");
      process.exit(0);
    } else {
      console.log("⚠️  Found duplicate importerColumns in Firestore:");
      duplicates.forEach(dup => {
        console.log(`  ${dup.column} -> ${dup.count} paths: ${dup.paths.join(", ")}`);
      });
      process.exit(1);
    }
  } catch(err) {
    console.error("ERROR during validation:", err.message);
    process.exit(1);
  }
})();
' > /tmp/duplicate-importer-columns-postapply.txt 2>&1

cat /tmp/duplicate-importer-columns-postapply.txt

# 9) Auto-fix rics_color if requested
if [ "$AUTO_FIX_RICS" = true ]; then
  if grep -q "rics_color" /tmp/duplicate-importer-columns-postapply.txt; then
    echo ""
    echo "================================================================"
    echo "Auto-fixing rics_color duplicate..."
    echo "================================================================"
    node -e '
const admin=require("firebase-admin");
const sa=require(process.env.GOOGLE_APPLICATION_CREDENTIALS);
admin.initializeApp({credential: admin.credential.cert(sa)});
const db = admin.firestore();
(async()=>{
  try {
    const docRef = db.collection("settings").doc("attributes").collection("keys").doc("primaryColor");
    const doc = await docRef.get();
    if(!doc.exists){console.log("primaryColor not found");process.exit(1);}
    const data = doc.data();
    const cols = (data.importerColumns||[]).filter(c=>c!=="rics_color");
    await docRef.set({importerColumns:cols},{merge:true});
    console.log("✅ Removed rics_color from primaryColor, new importerColumns:",cols);
    process.exit(0);
  } catch(err) {
    console.error("ERROR during fix:", err.message);
    process.exit(1);
  }
})();
'
  fi
fi

echo ""
echo "================================================================"
echo -e "${GREEN}✅ STAGING REGISTRY APPLICATION COMPLETE${NC}"
echo "================================================================"
echo ""
echo "Next steps:"
echo "1. Create test-import.csv and upload to staging importer"
echo "2. Run import for single test row"
echo "3. Verify product doc in Firestore for SKU=TEST-001"
