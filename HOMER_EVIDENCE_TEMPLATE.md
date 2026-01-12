# Evidence Template for Homer - LP Completion
# LP: Staging Verification Pass — Canonical MPN Remediation (target: aoss-main)

## REQUIRED DELIVERABLES CHECKLIST

### 1. PRs/COMMITS ✅
- [ ] PR links for canonical MPN remediation implementation
- [ ] PR links for staging parameterization changes  
- [ ] Final commit SHA(s) deployed to aoss-main
- [ ] Link to staging branch: mpn-staging/aoss-main

**Template:**
```
PR 1: [Title] - [GitHub URL]
Commit SHA: [hash]

PR 2: [Title] - [GitHub URL] 
Commit SHA: [hash]

Final deployed commit: [hash]
```

### 2. STAGING DEPLOY RECEIPT ✅
- [ ] staging_deploy_log.txt with full console output
- [ ] Timestamped deploy logs for each step
- [ ] Firebase deploy confirmation messages

**Required Commands Output:**
```
firebase deploy --project=aoss-main --only firestore:rules
firebase deploy --project=aoss-main --only firestore:indexes
firebase deploy --project=aoss-main --only functions
firebase deploy --project=aoss-main --only hosting
```

### 3. VERIFICATION PACK (verification_pack_aoss-main.zip) ✅
**Required Files:**
- [ ] before_after_examples.md
- [ ] regression_checks.md
- [ ] product_id_references.csv
- [ ] migration_report_aoss-main.json
- [ ] missing_mpn_resolution.md
- [ ] staging_deploy_log.txt
- [ ] rules_verification.json

### 4. AUTOMATED CHECKS RESULTS ✅
- [ ] Product_id sweep: `rg -n --hidden -S "(product_id|productId|productIdentifiers|mpn|MPN)" > /tmp/product-id-sweep-aoss-main.txt`
- [ ] Filtered CSV with resolution actions

### 5. EXECUTIVE SUMMARY ✅
**Template (3-5 bullets):**
- Staging deploy succeeded (timestamp: _______)
- Migration counts: updated X/Y, missing Z (resolution: ______)
- Verification outcome: Product Page [PASS/FAIL], Observations [PASS/FAIL], Smart Rules [PASS/FAIL]
- Residual risks: [None/List any]

---

## MISSING MPN RESOLUTION OPTIONS

### Option A: Exclude as Test Data (RECOMMENDED)
1. Create `missing_mpn_exclusion_criteria.md`:
   - State why product_guardrail_test_1767442442 is excluded
   - Provide evidence it's test/guardrail data
   - Document exclusion procedure
2. Create `product_migrations_excluded.csv`:
   - Product ID, reason, approver

### Option B: Assign Valid MPN
1. Determine valid MPN from attributes or business owner
2. Update product doc in staging with mpn and mpn_normalized
3. Re-run migration to confirm inclusion
4. Document update in missing_mpn_resolution.md

---

## VERIFICATION FLOWS TO DOCUMENT

### Product Page/Completion
- [ ] Screenshot of product editor with fields populated
- [ ] API call: `curl -v "https://ropi-aoss-staging.web.app/api/products/<mpn>/completion"`
- [ ] Response body showing completion data

### Observations  
- [ ] Observations UI snapshots showing product presence
- [ ] Logs showing mpn_normalized usage (not product_id)
- [ ] Rule evaluation traces

### Smart Rules
- [ ] Before/after rule evaluation logs  
- [ ] Evidence of mpn_normalized as key in rule execution
- [ ] Rule firing confirmation with proper product resolution

---

## SUBMISSION PACKAGE FOR ISA REVIEW

**Final deliverables to attach:**
1. All PR/commit links and SHAs
2. staging_deploy_log.txt
3. migration_apply_aoss-main.json  
4. missing_mpn_resolution.md
5. verification_pack_aoss-main.zip
6. product_id_references.csv
7. Executive summary

**Homer: Complete all checklist items before submitting for ISA phase owner review.**