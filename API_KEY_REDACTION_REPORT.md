# API Key Redaction Report

**Date:** December 2, 2025  
**Scope:** Repository-wide scan for exposed Google API keys (AIza* pattern)

## Summary

Found **5 instances** of Google API keys across the repository:

### Active Source Files (FIXED in this PR)
1. ✅ `public/seed-templates.html:13` - **REDACTED** (Fixed in PR #134)
2. ✅ `scripts/upload-prompts.mjs:16` - **REDACTED** (Fixed in PR #135)

### Archived Artifacts (PROPOSED for manual review)
3. ⚠️ `operations/review-artifacts/attribute-registry/npm-test-v2.0.log:238`
4. ⚠️ `operations/review-artifacts/v3.3-acc-vocab-preview/npm-test-v3.3.log:147`
5. ⚠️ `operations/review-artifacts/v3.3-acc-vocab-preview/npm-test-v3.3.log:1286`

## Exposed Keys Identified

### Key 1: `AIzaSyD1aYB4AfqU5n1YfSOtLX5nbEYbnlTfcZ8`
- **Status:** ⚠️ COMPROMISED - must be rotated
- **Locations:**
  - `public/seed-templates.html` (fixed in PR #134)
  - Archived logs in `operations/review-artifacts/`

### Key 2: `AIzaSyBEk3l0J3YZYq2e8gF_p5LZ8Y3kP4XQ9Zw`
- **Status:** ⚠️ COMPROMISED - must be rotated
- **Locations:**
  - `scripts/upload-prompts.mjs` (fixed in PR #135)

## Actions Taken

### Immediate (Completed)
- ✅ PR #134: Replaced hardcoded key in `public/seed-templates.html` with placeholder
- ✅ PR #135: Updated `scripts/upload-prompts.mjs` to use environment variables
- ✅ Created this redaction report

### Proposed Actions for Archived Files

**Option A: Redact in place**
- Replace API keys in archived log files with `REDACTED_API_KEY_REMOVED_FOR_SECURITY`
- Commit the redacted versions

**Option B: Move to .gitignore**
- Add `operations/review-artifacts/` to `.gitignore`
- Remove from tracking (but keep local copies if needed)

**Option C: Remove entirely**
- Delete archived artifacts that contain keys
- These appear to be test logs from previous versions

## Recommended Next Steps

1. **Rotate compromised keys immediately:**
   - `AIzaSyD1aYB4AfqU5n1YfSOtLX5nbEYbnlTfcZ8`
   - `AIzaSyBEk3l0J3YZYq2e8gF_p5LZ8Y3kP4XQ9Zw`

2. **Review archived artifacts:**
   - Determine if logs in `operations/review-artifacts/` are needed
   - If not needed: delete and add directory to `.gitignore`
   - If needed: redact keys and commit

3. **Consider history purge:**
   - If sensitive, use `git-filter-repo` or BFG to remove keys from history
   - Requires force push and team coordination

4. **Add secret scanning:**
   - Implement GitHub secret scanning workflow (PR #TBD)
   - Add pre-commit hooks to prevent future commits

## Git History Considerations

These keys exist in commit history. After rotating keys, consider:
- Running `git log -S "AIzaSy" --all` to find all commits
- Using BFG Repo-Cleaner or git-filter-repo to purge history
- Force-pushing cleaned history (requires team coordination)

## Verification

After all fixes are merged, verify with:
```bash
git grep "AIza" | grep -v "REDACTED" | grep -v ".md"
```

Should return no results (except this report).
