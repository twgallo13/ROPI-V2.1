# Artifact & Naming Conventions (Strict)

**Phase:** completion-readiness  
**Owner:** Homer  
**Status:** IMMUTABLE RULES

---

## Directory Structure

All LP artifacts **must** follow this structure:

```
artifacts/LP-completion-readiness-00X/
├── screenshots/           # VVP screenshots
│   └── {step}-{role}-{timestamp}.png
├── {command}-{timestamp}.txt          # Command logs
├── {command}-{timestamp}.log          # Execution logs
└── firestore-{path}-{timestamp}.json  # Firestore snapshots
```

---

## Naming Conventions

### LP Artifact Directories

**Format:** `artifacts/LP-completion-readiness-00X/`

**Examples:**
- `artifacts/LP-completion-readiness-001/`
- `artifacts/LP-completion-readiness-002/`
- `artifacts/LP-completion-readiness-009/`

**Rules:**
- Always use 3-digit zero-padded numbers (001-009)
- Never abbreviate "LP-completion-readiness"
- Never use alternative separators

---

### Screenshots

**Format:** `artifacts/LP-completion-readiness-00X/screenshots/{step}-{role}-{timestamp}.png`

**Examples:**
- `artifacts/LP-completion-readiness-004/screenshots/product-page-blocked-20260108T120000Z.png`
- `artifacts/LP-completion-readiness-005/screenshots/export-ui-ready-main-20260108T143022Z.png`
- `artifacts/LP-completion-readiness-007/screenshots/live-update-attr-t3-product-updated.png`

**Rules:**
- Always PNG format
- Use descriptive step name (e.g., `product-page`, `export-ui`)
- Include role/state (e.g., `blocked`, `ready`, `before`, `after`)
- Timestamp format: ISO 8601 (YYYYMMDDTHHMMSSZ) or semantic (t0, t1, t2, t3)
- Hyphens only, no underscores

---

### Log Files

**Format:** `artifacts/LP-completion-readiness-00X/{command}-{timestamp}.txt` or `.log`

**Examples:**
- `artifacts/LP-completion-readiness-001/registry-sync.log`
- `artifacts/LP-completion-readiness-001/verify-attributes-meta-output.txt`
- `artifacts/LP-completion-readiness-003/jest-results.txt`
- `artifacts/LP-completion-readiness-009/test-legacy-normalization.log`

**Rules:**
- Use `.log` for execution logs (stdout/stderr)
- Use `.txt` for script outputs or reports
- Command name should match the actual command (e.g., `registry-sync` for sync command)
- Timestamp optional if single file per LP

---

### Firestore Snapshots

**Format:** `artifacts/LP-completion-readiness-00X/firestore-{path}-{timestamp}.json`

OR

**Format:** `artifacts/LP-completion-readiness-00X/{descriptive-name}.json`

**Examples:**
- `artifacts/LP-completion-readiness-001/attributesMeta.json`
- `artifacts/LP-completion-readiness-001/sample-attribute-keys.json`
- `artifacts/LP-completion-readiness-002/exportSettings-before.json`
- `artifacts/LP-completion-readiness-002/exportSettings-after.json`
- `artifacts/LP-completion-readiness-006/attribute-<id>-before.json`
- `artifacts/LP-completion-readiness-006/attribute-<id>-after.json`

**Rules:**
- Always JSON format
- Use descriptive names reflecting Firestore path or purpose
- For before/after snapshots, use `-before` and `-after` suffixes
- Replace `/` in Firestore paths with `-` (e.g., `settings/attributesMeta` → `attributesMeta.json`)

---

### API Response Files

**Format:** `artifacts/LP-completion-readiness-00X/api-{endpoint}-{scenario}.json`

**Examples:**
- `artifacts/LP-completion-readiness-004/api-product-completion-<id>.json`
- `artifacts/LP-completion-readiness-005/readiness-blocked.json`
- `artifacts/LP-completion-readiness-005/readiness-ready.json`
- `artifacts/LP-completion-readiness-005/export-dryrun-blocked.log`

**Rules:**
- JSON for response bodies
- `.log` or `.txt` for full curl output including headers
- Scenario suffix: `blocked`, `ready`, `success`, `error`

---

### Test Artifacts

**Format:** `artifacts/LP-completion-readiness-00X/{test-name}-{purpose}.{json|txt|log}`

**Examples:**
- `artifacts/LP-completion-readiness-003/eval-sample-input.json`
- `artifacts/LP-completion-readiness-003/eval-sample-output.json`
- `artifacts/LP-completion-readiness-009/attribute-legacy-doc.json`
- `artifacts/LP-completion-readiness-009/eval-result.json`

**Rules:**
- Use descriptive test names
- Separate input/output files clearly
- JSON for structured data, txt/log for test runner output

---

### Timeline Documents

**Format:** `artifacts/LP-completion-readiness-007/timeline.md`

**Rules:**
- Markdown format for timelines
- Document each step with timestamp
- Include screenshots references inline

---

## HES Evidence Pointers

When referencing artifacts in HES JSON, use relative paths from repository root:

**Correct:**
```json
"artifact_file": "artifacts/LP-completion-readiness-001/registry-sync.log"
```

**Incorrect:**
```json
"artifact_file": "/workspaces/ROPI-V2.1/artifacts/LP-completion-readiness-001/registry-sync.log"
"artifact_file": "./artifacts/LP-001/registry-sync.log"
```

---

## VVP Screenshot References

When referencing screenshots in VVP markdown, use relative paths from repository root with backticks:

**Correct:**
```markdown
**Screenshot:**
`artifacts/LP-completion-readiness-004/screenshots/product-page-blocked-{product-id}.png`
```

**Incorrect:**
```markdown
**Screenshot:**
evidence/completion-readiness/artifacts/product-page-blocked-{product-id}.png
/workspaces/ROPI-V2.1/artifacts/LP-completion-readiness-004/screenshots/product-page-blocked.png
```

---

## Global Evidence Rules (All HES Files)

Every HES must include:

### Required Top-Level Fields

```json
{
  "lp_id": "LP-completion-readiness-00X",
  "lp_title": "...",
  "owner": "Homer",
  "verification_date": "YYYY-MM-DD",
  "verifier": "Homer",
  "result": "PENDING | VERIFIED SUCCESS | VERIFIED FAILURE",
  "branch": "governance/lp-sequential-numbering-2026-01-07",
  "prNumber": null,
  "commitShas": [],
  "ciRuns": [],
  "deployInfo": {
    "staging_deploy_sha": "",
    "staging_deploy_timestamp": "",
    "staging_url": "https://ropi-aoss-staging.web.app"
  }
}
```

### Evidence Section

Must include artifact file paths, commands, timestamps, and results.

### Verification Section

Must include acceptance criteria with evidence pointers.

### evaluatedAt Field

Required for any deterministic calculation (completion engine, export readiness).

### Sign-Off Section

```json
{
  "sign_off": {
    "homer_approved": false,
    "approval_date": "",
    "final_result": "PENDING | VERIFIED SUCCESS | VERIFIED FAILURE"
  }
}
```

---

## VVP Requirements

Every VVP must include:

1. **LP identifier** at top
2. **Verification date**
3. **Verifier** (Homer)
4. **Result** (PENDING / PASS / FAIL)
5. **Objective** section
6. **Prerequisites** section
7. **Test Scenarios** with:
   - Exact steps
   - Expected results
   - Actual results (to be filled)
   - Screenshot placeholders with correct paths
8. **Verification Checklist**
9. **Sign-Off** section

---

## Timestamps

All timestamps must use ISO 8601 format:

**Format:** `YYYY-MM-DDTHH:MM:SSZ`

**Example:** `2026-01-08T12:34:56Z`

---

## Final Sign-Off Flow

1. Homer completes implementation & staging verification for each LP
2. Homer fills HES template with evidence, sets:
   - `homer_approved: true`
   - `result: "VERIFIED SUCCESS"`
3. Homer completes VVP with screenshots and observations, sets:
   - `result: "PASS"`
4. When all 9 HES files are `VERIFIED SUCCESS` and VVPs are `PASS`:
   - Update `SIGN_OFF_CHECKLIST.md`
   - Request final phase sign-off

---

## Schema References

- **HES Format:** [docs/HES_FORMAT.md](../../docs/HES_FORMAT.md)
- **VVP Template:** [docs/VVP_TEMPLATE.md](../../docs/VVP_TEMPLATE.md)

---

**Document Version:** 1.0  
**Last Updated:** 2026-01-08  
**Owner:** Homer  
**Status:** IMMUTABLE
