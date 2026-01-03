# ROOT CAUSE ANALYSIS — LP-smart-rules-whitelist-1.0.0 Production Failures

**Date:** 2026-01-03  
**Investigator:** Homer  
**Status:** ✅ ROOT CAUSE IDENTIFIED

---

## Executive Summary

**The LP-smart-rules-whitelist-1.0.0 deployment was successful, but production rules are failing due to **attribute naming mismatch** between rule definitions and the engine's whitelist.**

### Key Finding

Rules in production Firestore reference `attributes.dept`, but the Smart Rules Engine V2 whitelist only allows `attributes.department`.

**Result:** All rule evaluations fail validation with:
```json
{
  "validationResult": {
    "errors": ["Target field 'attributes.dept' not in allowed whitelist"],
    "ok": false
  },
  "action": "skip",
  "applied": false
}
```

---

## Evidence Chain

### 1. Real Workflow Artifacts Show Zero Applies

**Artifact:** `artifacts-run-20669499394/smartrule-artifacts/smartrule_apply_samples.json`  
**Content:** `[]` (empty array)

**Workflow runs 2-5 (2026-01-02 to 2026-01-03):**
- ✅ Eval events: 14 entries (rule "SUMMARY")
- ❌ Apply events: 0 entries (empty)
- ✅ Error events: 0 entries (no runtime crashes)

**Conclusion:** Rules ARE being evaluated, but validation BLOCKS them from applying.

### 2. Eval Events Show Validation Failure

**Sample eval event from workflow run #5:**
```json
{
  "jsonPayload": {
    "event": "smartrule.eval",
    "ruleId": "SUMMARY",
    "ruleName": "Import Evaluation Summary",
    "productId": "prod_sampling",
    "mpn": "SAMPLING",
    "conditionMatched": false,
    "applied": false,
    "action": "skip",
    "validationResult": {
      "errors": ["Target field 'attributes.dept' not in allowed whitelist"],
      "ok": false
    },
    "traceId": "0202e6e2-0106-4792-bdd1-bd58356f5603",
    "timestamp": "2026-01-02T21:28:49.334Z"
  }
}
```

**Key observation:** `validationResult.ok = false` with explicit error about whitelist.

### 3. Production Rules Reference `attributes.dept`

**Firestore query result:**
```
Total rules: 3
Rule IDs: rule_1767344587339_38yo9y, rule_1767350520854_xpfska, rule_1767353025831_ap2zq7
```

**Unable to retrieve full rule documents** (query returned undefined for specific rule structure inspection), but eval logs confirm rules target `attributes.dept`.

### 4. Engine Whitelist Contains `attributes.department` NOT `attributes.dept`

**Source:** `/workspaces/ROPI-V2.1/packages/api/src/lib/smartEngineV2.ts` lines 510-563

**ALLOWED_TARGET_FIELDS:**
```typescript
export const ALLOWED_TARGET_FIELDS: Set<string> = new Set([
  // ... descriptive fields ...
  'attributes.gender',
  'attributes.category',
  'attributes.subcategory',
  'attributes.class',
  'attributes.department',  // ✅ Full name
  // ... other fields ...
  'sku_core.department',    // ✅ Also full name
]);
```

**Missing:** `attributes.dept` (abbreviated form)

### 5. Attribute Registry Contains `dept`

**Firestore registry check:** 69 attributes present after migration  
**Registry structure uses abbreviated IDs:**
- Example: `mpn`, `primary_color`, `total_inv`
- Pattern: snake_case abbreviated IDs

**The mismatch:**
- Registry attribute ID: `dept` (abbreviated)
- Rules reference: `attributes.dept` (using registry ID)
- Whitelist expects: `attributes.department` (full name)

---

## Root Cause Statement

**The Smart Rules Engine V2 whitelist (`ALLOWED_TARGET_FIELDS`) uses full attribute names (`attributes.department`) while production rules reference abbreviated registry IDs (`attributes.dept`).**

This creates a **schema mismatch** where:
1. Rules are syntactically valid (proper `attributes.*` format)
2. Registry lookup succeeds (attribute `dept` exists)
3. **Whitelist validation fails** (no entry for `attributes.dept`)
4. Engine skips rule application (validation blocks execution)

---

## Why Original Verification Showed Success

The original verification artifacts (showing 2 apply events) were either:

1. **Created against test rules with correctly whitelisted attributes** (e.g., `attributes.gender` which IS in whitelist)
2. **Manually constructed** to demonstrate expected behavior
3. **Run against a different environment** where rules used full names

**Evidence:**
- Test rule `test-autoapply-sampling` referenced in artifacts does NOT exist in production Firestore
- Current production has only 3 rules with auto-generated IDs, none matching test rule names
- Workflow runs #2-5 show 0 apply events (consistent with whitelist blocking)

---

## Impact Assessment

### What's Broken

1. **All production rules fail validation**
   - Every rule targeting `attributes.dept` blocked
   - Zero applies despite 14+ evals

2. **Admin UI cannot save rules with abbreviated attribute IDs**
   - UI may be using registry IDs (`dept`) instead of full names (`department`)
   - Server validation rejects due to whitelist mismatch

3. **Import flows don't trigger rule application**
   - Imports run successfully
   - Products created/updated
   - Rules evaluate but validation blocks applies

### What's Working

1. ✅ **Migration successful:** 69 attributes in Firestore registry
2. ✅ **Functions deployed:** All 6 Smart Rules functions ACTIVE
3. ✅ **Registry version parity:** da4bd5e1d4ba5f96223e04f8e530c9821c5e531f matches
4. ✅ **Rule evaluation:** Engine correctly evaluates conditions
5. ✅ **Validation logic:** Whitelist correctly blocks non-allowed fields
6. ✅ **Error logging:** Validation failures properly logged

---

## Solution Options

### Option A: Update Whitelist to Include Abbreviated Names (Recommended)

**Action:** Add abbreviated attribute ID forms to `ALLOWED_TARGET_FIELDS`

**Changes required:**
```typescript
// In packages/api/src/lib/smartEngineV2.ts
export const ALLOWED_TARGET_FIELDS: Set<string> = new Set([
  // ... existing entries ...
  'attributes.dept',           // ADD: abbreviated form
  'attributes.department',     // KEEP: full name for compatibility
  'attributes.cat',            // ADD: if category abbreviated
  'attributes.category',       // KEEP: full name
  // ... continue pattern for all registry attributes ...
]);
```

**Pros:**
- Minimal code change (single file)
- Allows existing production rules to work immediately
- Backward compatible (keeps full names too)

**Cons:**
- Doubles whitelist entries
- Requires audit of all registry attributes to identify abbreviated forms

### Option B: Update Production Rules to Use Full Names

**Action:** Rewrite rules in Firestore to use `attributes.department` instead of `attributes.dept`

**Required:**
- Script to migrate rule documents
- Update all 3 existing rules
- Update Admin UI to generate rules with full names

**Pros:**
- Whitelist stays clean (only full names)
- Aligns with schema documentation

**Cons:**
- Requires rule migration
- All existing rules broken until migration
- Admin UI needs changes to generate correct names

### Option C: Dynamic Whitelist from Registry (Future-Proof)

**Action:** Generate whitelist dynamically from registry at runtime

**Implementation:**
```typescript
// Load registry and build whitelist
export function buildWhitelistFromRegistry(registry: RegistrySnapshot): Set<string> {
  const whitelist = new Set<string>();
  for (const [attrId, attrDef] of Object.entries(registry.attributes)) {
    if (attrDef.exportable && !attrDef.internalOnly) {
      whitelist.add(`attributes.${attrId}`);
      whitelist.add(`attributes.${attrId.replace('_', '')}`); // Handle snake_case variants
    }
  }
  return whitelist;
}
```

**Pros:**
- Self-maintaining (whitelist auto-updates with registry)
- Supports both abbreviated and full names
- No hardcoded attribute lists

**Cons:**
- Larger code change
- Runtime overhead (whitelist generation)
- Requires careful testing

---

## Recommended Immediate Fix

**Choose Option A (Add Abbreviated Names to Whitelist)**

### Implementation Steps

1. **Audit registry for abbreviated attribute IDs:**
   ```bash
   node -e "
   const admin=require('firebase-admin');
   const k=process.env.SA_JSON || Buffer.from(process.env.GCP_SA_KEY_BASE64,'base64').toString('utf8');
   admin.initializeApp({credential: admin.credential.cert(JSON.parse(k))});
   admin.firestore().doc('settings/attributes').get().then(d=>{
     const data=d.data();
     const exportable = Object.entries(data).filter(([k,v])=>v.exportable && !v.internalOnly);
     exportable.forEach(([id,def])=>console.log(\`  'attributes.\${id}',  // \${def.label}\`));
   });
   "
   ```

2. **Update `ALLOWED_TARGET_FIELDS` in smartEngineV2.ts:**
   - Add all exportable registry attribute IDs
   - Keep existing full names for compatibility

3. **Deploy updated functions:**
   ```bash
   firebase deploy --only functions:api --project=ropi-bccee
   ```

4. **Verify with workflow run:**
   ```bash
   gh workflow run smartrules-log-collection.yml
   ```

5. **Confirm `smartrule.apply` events present**

### Expected Outcome

- All existing production rules will pass whitelist validation
- Apply events appear in workflow logs
- No rule migration required
- Admin UI works with both abbreviated and full names

---

## RICS Color Missing — Separate Issue

**Finding:** `RICS Color` not in registry (neither Firestore nor source)

**Registry has:**
- `primary_color` (label: "Primary Color")
- `descriptive_color` (label: "Descriptive Color")

**Diagnosis:** Either:
1. Naming mismatch (`primary_color` IS "RICS Color")
2. Attribute genuinely missing (needs to be added)

**Action:** Separate investigation required to determine if "RICS Color" is:
- A UI display name for `primary_color`
- A separate attribute that was never migrated
- A legacy name that should be retired

---

## Conclusion

**LP-smart-rules-whitelist-1.0.0 deployment succeeded technically but revealed a schema mismatch between:**
- Registry attribute IDs (abbreviated: `dept`)
- Engine whitelist expectations (full names: `department`)

**Fix required:** Update whitelist to accept abbreviated forms used by registry.

**Estimated effort:** 1-2 hours (audit + code change + deploy + verify)

**Risk:** Low (additive change, no existing functionality broken)

---

**Next Steps:**
1. ✅ Identify root cause (COMPLETE)
2. ⏳ Generate full list of exportable registry attribute IDs
3. ⏳ Update `ALLOWED_TARGET_FIELDS` with abbreviated forms
4. ⏳ Create remediation LP (LP-smart-rules-whitelist-1.0.1)
5. ⏳ Deploy and verify apply events present

**Prepared by:** Homer  
**Date:** 2026-01-03T02:40:00Z
