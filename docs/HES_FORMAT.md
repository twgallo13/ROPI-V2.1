# HES Format — Homer Execution Summary (Canonical)

> **Status:** AUTHORITATIVE
>
> This is the **single documented HES format** for this repository.
> All HES documents must follow this JSON structure.
> Alternate formats are deprecated.

---

## HES JSON Schema

```json
{
  "from": "Homer",
  "to": "Lisa",
  "lp": "LP-<PhaseSlug>-<SemVer>",
  "date": "<YYYY-MM-DD>",
  "branch": "<branch-name>",
  "prNumber": <number>,
  "prUrl": "<GitHub PR URL>",
  "mergeCommitSha": "<sha or null>",
  "mergedAt": "<ISO timestamp or null>",
  "filesChanged": [
    {
      "path": "<relative path>",
      "action": "created | modified | deleted"
    }
  ],
  "commitShas": ["<sha>"],
  "ciRuns": [
    {
      "name": "<check name>",
      "runId": "<id>",
      "runUrl": "<url>",
      "status": "pass | fail | pending"
    }
  ],
  "deployInfo": {
    "runId": "<deploy run id or null>",
    "runUrl": "<deploy run url or null>",
    "stagingUrl": "<staging URL or null>",
    "deployedAt": "<ISO timestamp or null>"
  },
  "verification": {
    "<criterion>": {
      "status": "PASS | FAIL",
      "evidence": "<description of evidence>"
    }
  },
  "deviations": ["<list of deviations or blockers>"],
  "result": "VERIFIED SUCCESS | VERIFIED FAILURE"
}
```

---

## Required Fields

| Field | Required | Description |
|-------|----------|-------------|
| `from` | Yes | Always "Homer" |
| `to` | Yes | Always "Lisa" |
| `lp` | Yes | LP identifier |
| `date` | Yes | Execution date |
| `branch` | Yes | Git branch name |
| `prNumber` | Yes | PR number |
| `prUrl` | Yes | Full PR URL |
| `filesChanged` | Yes | Array of file changes |
| `commitShas` | Yes | Array of commit SHAs |
| `result` | Yes | Final verification status |

---

## Optional Fields

| Field | When Required | Description |
|-------|--------------|-------------|
| `mergeCommitSha` | After merge | Merge commit SHA |
| `mergedAt` | After merge | Merge timestamp |
| `ciRuns` | If CI involved | CI check details |
| `deployInfo` | If deployment | Deploy details |
| `verification` | For acceptance criteria | Per-criterion evidence |
| `deviations` | If any issues | List of blockers |

---

## Rules

1. **No interpretation.** HES contains evidence, not recommendations.
2. **Immutable references only.** SHAs, URLs, IDs — not descriptions.
3. **Explicit result.** Must end with `VERIFIED SUCCESS` or `VERIFIED FAILURE`.
4. **No partials.** Do not use "partially verified" or similar.

---

## Example

```json
{
  "from": "Homer",
  "to": "Lisa",
  "lp": "LP-governance-alignment-1.0.0",
  "date": "2026-01-05",
  "branch": "governance-alignment-2026-01-05",
  "prNumber": 443,
  "prUrl": "https://github.com/twgallo13/ROPI-V2.1/pull/443",
  "mergeCommitSha": null,
  "mergedAt": null,
  "filesChanged": [
    { "path": "GOVERNANCE.md", "action": "modified" },
    { "path": "PHASE_INDEX.md", "action": "modified" },
    { "path": "docs/DIRECTIVE_TEMPLATE.md", "action": "created" },
    { "path": "docs/HES_FORMAT.md", "action": "created" },
    { "path": "docs/VVP_TEMPLATE.md", "action": "created" },
    { "path": "docs/WORKFLOW.md", "action": "modified" }
  ],
  "commitShas": ["abc1234"],
  "ciRuns": [],
  "deployInfo": null,
  "verification": {
    "canonical_declaration": {
      "status": "PASS",
      "evidence": "GOVERNANCE.md contains canonical workflow authority statement"
    },
    "phase_identity": {
      "status": "PASS",
      "evidence": "PHASE_INDEX.md contains PhaseName, PhaseSlug, LP Prefix registry"
    },
    "directive_template": {
      "status": "PASS",
      "evidence": "docs/DIRECTIVE_TEMPLATE.md created with all required fields"
    }
  },
  "deviations": [],
  "result": "VERIFIED SUCCESS"
}
```

---

## Deprecated Formats

The following HES formats are **DEPRECATED** and should not be used:

- Markdown-only HES (use JSON)
- HES without explicit `result` field
- HES with interpretation or recommendations
