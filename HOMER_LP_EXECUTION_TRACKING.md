# Homer's LP Execution Tracking
# LP: Staging Verification Pass — Canonical MPN Remediation (target: aoss-main)
# Status: ISSUED FOR EXECUTION
# Target: aoss-main (STAGING ONLY)

## STEP 0: PARAMETERIZATION CHECKLIST ✅ COMPLETED
- [✅] Audit all scripts/docs for "production" references
- [✅] Update deployment commands for --project=aoss-main
- [✅] Commit parameterization changes
- [⚠️] Record PR links for parameterization commits (pending)

## STEP 1: CONFIRM PRs & COMMITS ⏳ IN PROGRESS
- [✅] Create staging branch: mpn-staging/aoss-main
- [ ] Provide PR links and commit SHAs for deployment
- [ ] Verify all remediation code is ready

## STEP 2: DEPLOY TO STAGING (aoss-main)
- [ ] Deploy Firestore rules: firebase deploy --project=aoss-main --only firestore:rules
- [ ] Deploy Firestore indexes: firebase deploy --project=aoss-main --only firestore:indexes  
- [ ] Build and deploy functions: firebase deploy --project=aoss-main --only functions
- [ ] Build and deploy hosting: firebase deploy --project=aoss-main --only hosting
- [ ] Save staging_deploy_log.txt with full console output

## STEP 3: MIGRATION IN STAGING
- [ ] Run migration: node packages/api/scripts/migrate_mpn.js --apply --batch-size=200 --project=aoss-main
- [ ] Save migration_apply_aoss-main.json
- [ ] Verify missing_count and handle if > 0

## STEP 4: RESOLVE MISSING MPN PRODUCT
- [ ] Choose option A (exclude) or B (assign MPN) for product_guardrail_test_1767442442
- [ ] Document resolution in missing_mpn_resolution.md
- [ ] Commit exclusion criteria or MPN assignment

## STEP 5: FULL VERIFICATION ON STAGING
- [ ] Product Page/Completion verification (screenshots + API calls)
- [ ] Observations flow verification (logs + UI snapshots)
- [ ] Smart Rules verification (rule evaluation logs)
- [ ] Regression checks (5+ previously working products)
- [ ] Compile all evidence

## STEP 6: PRODUCT_ID SWEEP
- [ ] Run code sweep: rg -n --hidden -S "(product_id|productId|productIdentifiers|MPN|mpn)"
- [ ] Create product_id_references.csv with resolution actions
- [ ] Document all references and how they were handled

## STEP 7: ASSEMBLE EVIDENCE
- [ ] Create verification_pack_aoss-main.zip
- [ ] Include all required artifacts from evidence list
- [ ] Verify all files are present and complete

## STEP 8: SUBMIT FOR REVIEW
- [ ] Attach verification pack to LP
- [ ] Provide executive summary (3-5 bullets)
- [ ] Submit for ISA phase owner review

## REQUIRED DELIVERABLES
- [ ] PR/commit links and SHAs
- [ ] staging_deploy_log.txt  
- [ ] migration_apply_aoss-main.json
- [ ] missing_mpn_resolution.md
- [ ] verification_pack_aoss-main.zip
- [ ] product_id_references.csv
- [ ] Executive summary

## PROGRESS TRACKING
Started: ___________
Step 0 Complete: ___________
Step 1 Complete: ___________
Step 2 Complete: ___________
Step 3 Complete: ___________
Step 4 Complete: ___________
Step 5 Complete: ___________
Step 6 Complete: ___________
Step 7 Complete: ___________
Step 8 Complete: ___________
Submitted: ___________