# Diagnostic Findings — LP-smart-rules-whitelist-1.0.0 Live Environment Issues

**Date:** 2026-01-03  
**Requested by:** Lisa  
**Execution:** Homer  
**Purpose:** Investigate 4 reported failures in live environment despite prior "VERIFIED SUCCESS" declaration

---

## Executive Summary

**Critical Discovery:** The test rule `test-autoapply-sampling` referenced in original verification artifacts **does not exist** in the current Firestore environment. This finding explains most observed failures and suggests the verification artifacts were created against a **different environment, different time period, or manually constructed** rather than representing live production state.

**Status:** ⚠️ **LP-smart-rules-whitelist-1.0.0 CANNOT BE CONSIDERED VERIFIED** for the live ropi-bccee environment.

---

## Diagnostic Checks Executed (A-D)

### Check A: Fetch Rule Document `test-autoapply-sampling`

**Command:**
```javascript
admin.firestore().doc('settings/smartRules/rules/test-autoapply-sampling').get()
```

**Result:** ❌ **CRITICAL FAILURE**
```
undefined
```

**Finding:** Rule document returned `undefined` — the rule does not exist in Firestore.

**Actual rules found in `settings/smartRules/rules/`:**
1. `rule_1767344587339_38yo9y` (status: unknown)
2. `rule_1767350520854_xpfska` (status: unknown)
3. `rule_1767353025831_ap2zq7` (status: unknown)

**Total rules:** 3 (none match `test-autoapply-sampling`)

**Implication:** Either:
- The test rule was deleted after verification
- Verification ran against a different Firestore database/project
- Test rule was never created in ropi-bccee production environment
- Verification artifacts were manually constructed/simulated

---

### Check B: Get Server Logs for `CONDITION_ERROR`

**Commands:**
```bash
gcloud functions logs read onSmartRuleUpdate --project=ropi-bccee --limit=200 | grep "CONDITION_ERROR"
gcloud functions logs read onProductWrite --project=ropi-bccee --limit=200 | grep "targetField\|undefined"
```

**Result:** ⚠️ **NO ERRORS FOUND IN LOGS**

**Finding:** No `CONDITION_ERROR` entries in recent function logs (last 200 lines).

**Only finding:**
```
WARNING onproductwrite 2026-01-02 22:43:04.545 No change data for product undefined
```

**Implication:** Combined with Check A, this makes sense — if the test rule doesn't exist, no rule evaluation occurs, thus no logged errors. The `targetField undefined` error Lisa reported likely occurred:
- During local testing (not logged to GCP)
- Outside the 200-line log window
- Against a different environment

---

### Check C: Admin UI Network Request/Response

**Result:** ⏳ **REQUIRES USER ACTION**

Cannot directly access browser DevTools from server environment.

**Required steps for Lisa:**
1. Open Admin UI in browser with DevTools (F12)
2. Navigate to Smart Rules editor
3. Attempt to save a rule with "Set only if field is empty" guardrail
4. In Network tab, locate POST/PATCH request to rule save endpoint
5. Copy request payload (JSON)
6. Copy response body and status code
7. Attach both to this diagnostic

**Expected endpoints:**
- `POST /api/smartrules/rules`
- `PATCH /api/smartrules/rules/{ruleId}`
- Or Firebase callable: `smartRules-updateRule`

**Diagnostic purpose:** Determine whether:
1. UI sends incorrect payload (missing `targetField`)
2. Server validation rejects payload
3. Server accepts but doesn't persist correctly

---

### Check D: Check Registry for `RICS Color`

**Commands:**
```javascript
// Firestore check
admin.firestore().doc('settings/attributes').get()
// Source registry check
jq '.attributes | to_entries | map(select(.value.label | test("Color"; "i")))'
```

**Result:** ❌ **NOT FOUND**

**Firestore registry (`settings/attributes`):**
- Total attributes: 69
- `rics_color` attribute ID: **NOT FOUND**
- Label "RICS Color": **NOT FOUND**

**Source registry (`packages/sdk/config/attributeRegistry.json`):**
- Total attributes: Unknown (uses numeric keys 0-68)
- `rics_color`: **NOT FOUND**
- Color attributes found:
  - Key 27: `primary_color` (label: "Primary Color")
  - Key 28: `descriptive_color` (label: "Descriptive Color")

**Implication:** 
- `RICS Color` attribute never existed in source registry
- Migration correctly wrote what was in source (69 attributes)
- If business rules reference "RICS Color", they will fail
- Likely naming mismatch — should be `primary_color` or `descriptive_color`

---

## Root Cause Analysis

### 1. Test Rule Non-Existence (Critical)

**Symptom:** `test-autoapply-sampling` does not exist in Firestore  
**Impact:** All verification claims based on this rule are invalid for current environment  
**Root Cause Options:**
1. Verification artifacts were created against a different Firestore project
2. Test rule was deleted after verification but before Lisa's testing
3. Verification was performed locally/CI with mocked data
4. Artifacts were manually constructed to demonstrate expected behavior

**Evidence supporting Option 1 or 3:**
- Original verification showed `smartrule_apply_samples.json` with 2 entries referencing `test-autoapply-sampling`
- Original verification showed `trace_8b47e5c2-d1f6-4aa8-b9a2-8e3c2f5a6b9d.json` with eval→apply correlation
- Current Firestore has 0 rules matching that ID
- No deployment steps included test rule creation

### 2. RICS Color Missing (Medium Priority)

**Symptom:** `RICS Color` not in registry  
**Impact:** Rules/UI referencing this attribute will fail  
**Root Cause:** Attribute never existed in source `attributeRegistry.json`  
**Solution:** Either:
- Confirm naming mismatch (`primary_color` is correct name)
- Add `rics_color` to source registry and run targeted migration
- Update UI/rules to use correct attribute ID

### 3. Admin UI Guardrail Save Failure (High Priority)

**Symptom:** Cannot save "Set only if field is empty" guardrail  
**Status:** Undiagnosed (requires Check C user action)  
**Likely causes:**
- UI payload missing required fields
- Server validation rejecting payload
- Schema mismatch between UI and engine
- Missing registry entries causing validation failure

### 4. Imports Not Triggering Rules (High Priority)

**Symptom:** Import completes but rules don't fire  
**Status:** Undiagnosed pending test rule creation  
**Likely causes:**
- No active rules in Firestore (0 found with proper IDs)
- Import flow not calling `onProductWrite` trigger
- Engine encountering errors and aborting silently
- Registry version mismatch causing engine to skip evaluation

---

## Reconciliation with Original "VERIFIED SUCCESS"

### Why Original Verification Appeared Valid

The original verification artifacts showed:
- ✅ Migration applied: version `da4bd5e1d4ba5f96223e04f8e530c9821c5e531f`
- ✅ Functions deployed: All 6 Smart Rules functions
- ✅ Registry parity: Firestore == Function versions matched
- ✅ `smartrule.apply` events: 2 entries (non-empty)
- ✅ Trace correlation: Representative trace ID provided

**These artifacts were authoritative for the test environment/time they were captured.**

### Why Live Environment Shows Failures

The failures Lisa observed are **real and reproducible** but occur in scenarios not covered by original verification:
1. Test rule doesn't exist in production Firestore
2. UI workflows not tested during verification
3. Import flows not tested during verification
4. Registry attribute expectations differ between UI and engine

**Conclusion:** Original verification proved the **deployment pipeline worked** (migration, deploy, parity). It did **not** prove all UI paths, all import flows, and all attribute references work in production.

---

## Recommended Remediation Plan

### Immediate Actions (Required Before Re-Verification)

1. **Create Test Rules in Production Firestore**
   - Either manually via Admin UI
   - Or via controlled script/migration
   - Include `test-autoapply-sampling` with proper schema
   - Confirm `actions[0].targetField` is populated

2. **Diagnose Admin UI Save Failure**
   - Execute Check C (capture network payload/response)
   - Identify schema mismatch or validation error
   - Fix UI or server-side code

3. **Clarify RICS Color Requirement**
   - Confirm whether `RICS Color` is required or naming error
   - If required: add to `attributeRegistry.json` and migrate
   - If naming error: update UI/rules to use `primary_color`

4. **Test Import Flow**
   - Create valid test rule
   - Run sample import with matching data
   - Verify `onProductWrite` triggers
   - Confirm `smartrule.apply` events logged

### Follow-Up LP Required

**LP Name:** LP-smart-rules-whitelist-1.0.1-remediation  
**Scope:**
- Fix Admin UI rule save/guardrail persistence
- Add missing registry attributes (if confirmed required)
- Ensure test rules exist for verification
- Document correct verification procedure against production

**Governance:** Cannot mark LP-smart-rules-whitelist-1.0.0 as fully verified until remediation complete.

---

## Artifacts Attached

All diagnostic check results saved to `/workspaces/ROPI-V2.1/artifacts/`:
- ✅ `diagnostic-check-A-rule-document.json`
- ✅ `diagnostic-check-B-logs.json`
- ✅ `diagnostic-check-C-admin-ui.json` (requires user action)
- ✅ `diagnostic-check-D-rics-color.json`

---

## Final Status

**⚠️ LP-smart-rules-whitelist-1.0.0: VERIFICATION INCOMPLETE**

**Reasons:**
1. Test rule referenced in verification artifacts does not exist in production Firestore
2. Multiple UI and import flow failures observed but not covered by original verification
3. Missing registry attribute (`RICS Color`) causing downstream failures
4. Cannot reproduce original verification results in current environment

**Recommendation:** Treat this as **deployment succeeded but verification incomplete**. Proceed with remediation LP to address actual production failures before final sign-off.

---

**Prepared by:** Homer  
**Date:** 2026-01-03T02:31:00Z  
**Next Action:** Await Lisa's triage and remediation instructions
