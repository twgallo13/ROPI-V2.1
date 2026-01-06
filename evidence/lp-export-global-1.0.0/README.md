# Evidence for LP-export-global-1.0.0 HES A

Place required evidence files in this directory. Filenames must match the manifest in `docs/HES_A_LP-export-global-1.0.0.json`.

- `readiness-staging-<ts>.json` — admin-authenticated GET readiness response (staging)
- `product-18-test-completion.json` — completion response for product mpn=18-test
- `product-211737-completion.json` — completion response for product 211737-90h1-8
- `ui-decision-evidence.txt` — code citations (file:line) showing UI per-site decision
- `server-decision-evidence.txt` — code citations (file:line) showing server siteStatus generation
- `required-attributes-completion.json` — runtime list of attributes considered required for completion
- `required-attributes-export.json` — runtime list for export
- `attribute-delta.csv` — SDK vs Firestore attribute differences
- `site-gating-evidence.txt` — evidence of extractSelectedSites gating behavior (call stack + sample)
- `classification-evidence.txt` — explanation & code citations for classification attributes not applied
- `target-contract.md` — proposed RetailOps global readiness contract
- `migration-plan.md` — migration and compatibility plan
- `vvp-retailops-global.md` — non-developer VVP to prove new behavior
- `access-blockers.txt` — any missing permissions or blocked calls

Include the exact commands used to generate each file at top of each file or in this README.
