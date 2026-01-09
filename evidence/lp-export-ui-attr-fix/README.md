# LP-export-ui-attr-fix-1.0.0 Evidence Collection

**LP:** LP-export-ui-attr-fix-1.0.0  
**PR:** #459  
**Commit:** 8e0b80c  
**Date:** 2026-01-08  
**Agent:** Homer  
**Orchestrator:** Lisa

---

## Directory Structure

```
evidence/lp-export-ui-attr-fix/
├── README.md (this file)
├── deploy/
│   ├── deploy-run-info.json          # Workflow run metadata
│   ├── deploy-logs.txt               # Full deploy logs
│   └── service-account-evidence.txt  # SA email and auth confirmation
├── baseline/
│   ├── readiness-baseline.json       # Readiness API with SITE_SCOPED OFF
│   ├── product-completion-baseline.json
│   ├── ui-screenshots/               # UI baseline screenshots
│   └── firestore-baseline/           # Raw Firestore JSON dumps
│       ├── settings-attributesMeta.json
│       └── attribute-doc-sample.json
├── global-mode/
│   ├── readiness-global.json         # Readiness API with GLOBAL ON
│   ├── product-completion-global.json
│   ├── required-attributes-runtime.json
│   ├── ui-screenshots/               # UI GLOBAL mode screenshots
│   └── toggle-evidence.txt           # Exact toggle steps and actor
├── classification/
│   ├── classification-enforcement.json  # Enforcement demonstration
│   └── vvp-screenshots/              # Before/after enforcement changes
├── vvp/
│   ├── vvp-ui-global/                # VVP flow demonstrations
│   │   ├── product-18-test/
│   │   └── product-211737-90h1-8/
│   └── commands-used.txt             # Exact commands and outputs
├── network/
│   ├── attr-save-network.json        # Request/response traces
│   ├── completion-fetch-network.json
│   └── readiness-fetch-network.json
├── persistence/
│   ├── persistence-repro.json        # Bug reproduction attempt
│   └── firestore-persisted-state/    # Raw Firestore documents
└── consolidated/
    └── HES_CONSOLIDATED.zip          # Final consolidated package
```

---

## Collection Status

| Step | Status | Evidence Files |
|------|--------|----------------|
| Deploy Completion | ⏳ PENDING | `deploy/deploy-run-info.json`, `deploy/deploy-logs.txt` |
| Baseline (SITE_SCOPED OFF) | ⏳ PENDING | `baseline/*` |
| GLOBAL Mode Verification | ⏳ PENDING | `global-mode/*` |
| Classification Enforcement | ⏳ PENDING | `classification/*` |
| VVP Demonstration | ⏳ PENDING | `vvp/*` |
| Network Evidence | ⏳ PENDING | `network/*` |
| Persistence Bug Reproduction | ⏳ PENDING | `persistence/*` |
| HES C Manifest | ⏳ PENDING | `docs/HES_C_LP-export-ui-attr-fix-1.0.0.json` |
| Consolidated Package | ⏳ PENDING | `consolidated/HES_CONSOLIDATED.zip` |

---

## Notes

- All timestamps must be UTC
- All Firestore reads must be raw JSON (no screenshots only)
- Each artifact must link to immutable reference (run ID, URL, timestamp)
- Network captures must include headers, bodies, timestamps
- Match each network capture to corresponding UI screenshot

---

## Governance Requirements

Per `GOVERNANCE.md`, HES C manifest must include:
- `from`, `to`, `lp` fields (verbatim)
- Actions executed (branch/commit/deploy with run ID & URL)
- Artifacts created/modified (list with exact paths/URLs)
- PR URL(s) and PR number(s)
- CI run IDs and direct URLs
- Deploy run ID and staging hosting URL(s)
- Firestore evidence (full JSON)
- Exact command outputs / logs
- Explicit `VERIFIED SUCCESS` or `VERIFIED FAILURE` line with justification
