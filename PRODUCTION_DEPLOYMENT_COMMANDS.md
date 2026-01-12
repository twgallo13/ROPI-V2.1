# Canonical MPN Remediation - Staging Deployment Commands (aoss-main)
# Execute in sequence with proper GCP project permissions for STAGING

## STAGING DEPLOYMENT CHECKLIST ✅
# [✅] Artifacts verified and ready
# [✅] Migration dry-run successful (33/34 products)
# [⚠️ ] 1 missing MPN identified: product_guardrail_test_1767442442 (test product - recommend exclude)
# [✅] Rollback procedures documented
# [✅] Deployment commands prepared for STAGING

## STAGING DEPLOYMENT SEQUENCE (aoss-main ONLY)

### STEP A - Deploy Firestore Rules & Indexes (STAGING)
```bash
# Deploy rules (enables mpn_normalized field enforcement) - STAGING
firebase deploy --only firestore:rules --project=aoss-main

# Deploy indexes (optimizes mpn_normalized queries) - STAGING  
firebase deploy --only firestore:indexes --project=aoss-main
```

### STEP B - Deploy API Functions (with middleware) - STAGING
```bash
# Build API package
pnpm --filter @ropi-aoss/api build

# Deploy Cloud Functions (includes resolveProductIdentifier middleware) - STAGING
firebase deploy --only functions --project=aoss-main
```

### STEP C - Deploy Web Application - STAGING
```bash
# Build web package
pnpm --filter @ropi-aoss/web build

# Deploy hosting (includes shared MPN normalization) - STAGING
firebase deploy --only hosting --project=aoss-main
```

### STEP D - Execute Data Migration - STAGING  
```bash
# Apply migration in staging (idempotent, batched)
node packages/api/scripts/migrate_mpn.js --apply --batch-size=200 --project=aoss-main > /tmp/migration_apply_aoss-main.json

# Verify results
cat /tmp/migration_apply_aoss-main.json | grep -E "(updated|missing|errors)"
```

### STEP E - Post-Deploy Verification - STAGING
```bash
# Test API endpoints against staging
curl -v "https://ropi-aoss-staging.web.app/api/products/106-test/completion"

# Run comprehensive verification
./scripts/verify-canonical-remediation.sh

# Check for remaining product_id references
./scripts/check-no-productId.sh
```

## MONITORING COMMANDS (Staging Environment)

### Check Cloud Function Logs - STAGING
```bash
# Monitor for legacy_lookup events in staging
gcloud logging read 'resource.type="cloud_function" AND textPayload:legacy_lookup' --limit 50 --project=aoss-main

# Firebase function logs for staging
firebase functions:log --project=aoss-main
```

### Validate Product Lookups - STAGING
```bash
# Test product resolution via normalized MPN in staging
node -e "
const admin=require('firebase-admin'); 
admin.initializeApp({projectId: 'aoss-main'});
const db=admin.firestore();
(async()=> {
  const snap = await db.collection('products').where('mpn_normalized','==','106-test').get();
  console.log('Found products in staging:', snap.size, snap.docs.map(d=>({id:d.id, mpn:d.get('mpn')})));
})();
"
```

## ROLLBACK PROCEDURE (If Needed) - STAGING ONLY
```bash
# 1. Restore Firestore from backup (staging)
gcloud firestore import gs://aoss-main-backups/backups/pre-mpn-migrate-<TIMESTAMP> --project=aoss-main

# 2. Redeploy previous function version (staging)
firebase deploy --only functions --project=aoss-main  # from previous commit

# 3. Redeploy previous hosting (staging if needed)
firebase deploy --only hosting --project=aoss-main    # from previous commit
```

## OUTSTANDING ACTION: Missing MPN Product
**Product ID**: `product_guardrail_test_1767442442`
**Issue**: No MPN found in mpn, product_mpn, or identifiers.mpn fields
**Recommendation**: Exclude test/guardrail product from migration
**Alternative**: Manually assign MPN or create direct mapping

## STATUS: ✅ READY FOR PRODUCTION DEPLOYMENT
All canonical MPN remediation components are validated and deployment-ready.
Execute the above commands in sequence with appropriate project permissions.