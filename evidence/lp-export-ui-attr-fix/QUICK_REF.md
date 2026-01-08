# HES C Quick Reference — LP-export-ui-attr-fix-1.0.0

**Status:** ⏳ AWAITING MAINTAINER DEPLOY  
**Commit:** `8e0b80c`  
**PR:** #459  
**Workflow:** Deploy AOSS Staging (ID: 212118351)

---

## 🚨 IMMEDIATE ACTION REQUIRED

**A maintainer must run the workflow:**

```bash
gh workflow run 212118351 --ref 8e0b80c
```

**Or via UI:**
https://github.com/twgallo13/ROPI-V2.1/actions/workflows/deploy-staging.yml
→ Click "Run workflow" → Set ref = `8e0b80c` → Run

**Full instructions:** [MAINTAINER_DEPLOY_REQUEST.md](../MAINTAINER_DEPLOY_REQUEST.md)

---

## 📋 Files Created

| File | Purpose |
|------|---------|
| `MAINTAINER_DEPLOY_REQUEST.md` | Copy-paste message for maintainer |
| `HOMER_RESPONSE_LP-export-ui-attr-fix-1.0.0.md` | Complete response to Lisa |
| `evidence/lp-export-ui-attr-fix/README.md` | Evidence collection overview |
| `evidence/lp-export-ui-attr-fix/VERIFICATION_PLAN.md` | Step-by-step HES C plan |
| `evidence/lp-export-ui-attr-fix/execute_hes_c.sh` | Automated verification script |
| `evidence/lp-export-ui-attr-fix/collect_deploy_info.sh` | Deploy metadata extractor |
| `evidence/lp-export-ui-attr-fix/QUICK_REF.md` | This file |
| `docs/HES_C_LP-export-ui-attr-fix-1.0.0.json` | HES C manifest template |

---

## 🔄 Workflow (Post-Deploy)

### 1. Collect Deploy Info
```bash
cd evidence/lp-export-ui-attr-fix
./collect_deploy_info.sh <RUN_ID>
```

### 2. Update Manifest
Copy values from `deploy/deploy-summary.json` → `docs/HES_C_LP-export-ui-attr-fix-1.0.0.json`

### 3. Execute HES C
```bash
cd evidence/lp-export-ui-attr-fix
./execute_hes_c.sh
```

### 4. Complete Manifest
Fill in all `__PASS_or_FAIL__` and `result` fields

### 5. Create Package
```bash
cd evidence/lp-export-ui-attr-fix
zip -r HES_CONSOLIDATED.zip deploy/ baseline/ global-mode/ classification/ vvp/ network/ persistence/ README.md VERIFICATION_PLAN.md
cp ../../docs/HES_C_LP-export-ui-attr-fix-1.0.0.json HES_C_manifest.json
zip HES_CONSOLIDATED.zip HES_C_manifest.json
mkdir -p consolidated
mv HES_CONSOLIDATED.zip consolidated/
sha256sum consolidated/HES_CONSOLIDATED.zip > consolidated/HES_CONSOLIDATED.sha256
```

### 6. Return to Lisa
- `docs/HES_C_LP-export-ui-attr-fix-1.0.0.json`
- `evidence/lp-export-ui-attr-fix/consolidated/HES_CONSOLIDATED.zip`
- `evidence/lp-export-ui-attr-fix/consolidated/HES_CONSOLIDATED.sha256`

---

## ⏱️ Timeline

| Phase | Duration |
|-------|----------|
| Maintainer deploy | ~10 min |
| Collect deploy info | ~5 min |
| Execute HES C (automated) | ~40 min |
| Execute HES C (manual) | ~90 min |
| Complete manifest | ~15 min |
| Create package | ~10 min |
| **TOTAL** | **~2.75 hours** |

---

## 📦 Evidence Structure

```
evidence/lp-export-ui-attr-fix/
├── README.md
├── VERIFICATION_PLAN.md
├── QUICK_REF.md
├── execute_hes_c.sh
├── collect_deploy_info.sh
├── deploy/
│   ├── deploy-run-info.json
│   ├── deploy-logs.txt
│   ├── service-account-evidence.txt
│   └── deploy-summary.json
├── baseline/
│   ├── readiness-baseline.json
│   ├── product-completion-baseline.json
│   ├── ui-screenshots/
│   └── firestore-baseline/
├── global-mode/
│   ├── readiness-global.json
│   ├── product-completion-global.json
│   ├── required-attributes-runtime.json
│   ├── toggle-evidence.txt
│   └── ui-screenshots/
├── classification/
│   ├── classification-enforcement.json
│   ├── vvp-screenshots/
│   └── firestore-enforcement/
├── vvp/
│   ├── vvp-ui-global/
│   │   ├── product-18-test/
│   │   └── product-211737-90h1-8/
│   └── commands-used.txt
├── network/
│   ├── attr-save-network.json
│   ├── completion-fetch-network.json
│   └── readiness-fetch-network.json
├── persistence/
│   ├── persistence-repro.json
│   └── firestore-persisted-state/
└── consolidated/
    ├── HES_CONSOLIDATED.zip
    └── HES_CONSOLIDATED.sha256
```

---

## ✅ Pre-Flight Checklist

Before executing HES C:
- [ ] Maintainer has run workflow
- [ ] Deploy run ID obtained
- [ ] Staging URL accessible: https://ropi-aoss-staging.web.app
- [ ] `gcloud auth login` completed
- [ ] Browser DevTools ready for network captures
- [ ] Access to Firestore console confirmed
- [ ] Feature flag toggle access confirmed

---

## 🆘 Troubleshooting

### Issue: 403 workflow dispatch error
**Solution:** Must use maintainer token with `workflow` scope

### Issue: gcloud not authenticated
**Solution:** Run `gcloud auth login`

### Issue: Staging URL not accessible
**Solution:** Check workflow logs for deploy errors; verify Firebase hosting target

### Issue: Cannot toggle feature flags
**Solution:** Check Firestore permissions; verify `settings/exportSettings` path

---

## 📞 Contact

- **Issue Tracker:** PR #459
- **Orchestrator:** Lisa
- **Agent:** Homer
- **Repository:** twgallo13/ROPI-V2.1
