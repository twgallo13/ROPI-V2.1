# LP-ATTR-1.3.2 Manual Smoke Test Guide

## 🎯 Objective
Verify that LP-ATTR-1.3.2 fixes JSON parse errors on DELETE 204 and improves error handling.

## 📍 Test Environment

**Preview URL:** https://ropi-aoss-staging--pr-339-iktcwvsh.web.app/settings/attributes  
**Branch:** `lp-attr-1.3.2-parse-response-safely`  
**PR:** https://github.com/twgallo13/ROPI-V2.1/pull/339

## ⚙️ Setup

1. Open staging URL in **Incognito/Private window** (to start with clean state)
2. Sign in with admin credentials
3. Navigate to Settings → Attributes (or use direct URL above)
4. **Open DevTools:**
   - Press `F12` or `Cmd+Option+I` (Mac) / `Ctrl+Shift+I` (Windows)
   - Go to **Console** tab (keep this visible throughout test)
   - Go to **Network** tab, filter to **XHR** only
   - Optional: Enable "Preserve log" to keep logs across page navigations

## 🧪 Test Sequence

### ✅ Step 1: Create Attribute (Baseline)

**Actions:**
1. Click **"New Attribute"** button
2. Fill in **Label:** `LP-1.3.2 Smoke Test` (leave ID blank for auto-generation)
3. Select **Data Type:** `string`
4. Click **"Save"**

**Expected Results:**
- ✅ DevTools Network tab shows: `POST /api/admin/settings/attributes` → `201 Created`
- ✅ Success toast appears: "Created attribute 'lp-1-3-2-smoke-test'" (or similar)
- ✅ Attribute appears in the list
- ✅ Console is clean (no errors)

**Capture:**
```
Screenshot: step1-create-success.png
Note: Did POST appear? [YES/NO]
Note: Status code? [201/other]
```

---

### ✅ Step 2: Delete Attribute (204 - Main LP Fix)

**Actions:**
1. Select the attribute you just created (click on it in the list)
2. Click **"Delete"** button
3. Confirm deletion in the modal (type confirmation if required)

**Expected Results - BEFORE LP-ATTR-1.3.2:**
- ❌ Console error: `Expected JSON response but got unknown content-type`
- ❌ Possible stuck UI state

**Expected Results - AFTER LP-ATTR-1.3.2 (this PR):**
- ✅ DevTools Network tab shows: `DELETE /api/admin/settings/attributes/{id}` → `204 No Content`
- ✅ **Console is CLEAN** - **NO parse errors** ← **KEY VERIFICATION**
- ✅ Success toast: "Attribute deleted"
- ✅ Attribute removed from list
- ✅ UI resets properly (selection cleared, form reset)

**Capture:**
```
Screenshot: step2-delete-204-console.png (MUST show clean console)
Screenshot: step2-delete-204-network.png
Note: Console parse error present? [YES/NO] ← Should be NO!
Note: DELETE status code? [204/other]
```

---

### ✅ Step 3: Delete Again (404 - Error Handling)

**Actions:**
1. Try to create and delete another attribute, OR
2. Navigate away and back, then try to delete the same attribute again (if still visible)
3. If the deleted attribute is no longer in the list, you can skip this step (note it)

**Expected Results - BEFORE LP-ATTR-1.3.2:**
- ❌ Console error with HTML in the message
- ❌ Generic error toast

**Expected Results - AFTER LP-ATTR-1.3.2:**
- ✅ DevTools Network tab shows: `DELETE /api/admin/settings/attributes/{id}` → `404 Not Found`
- ✅ **Console is CLEAN** - no parse errors (even on HTML 404 response)
- ✅ Friendly toast: "Attribute already deleted" or similar
- ✅ UI resets properly

**Capture:**
```
Screenshot: step3-delete-404-console.png
Screenshot: step3-delete-404-network.png
Note: Console parse error on 404? [YES/NO] ← Should be NO!
Note: Error message friendly? [YES/NO] ← Should be YES!
```

---

### ✅ Step 4: Create After Delete (Verify No Stuck State)

**Actions:**
1. Click **"New Attribute"** button
2. Fill in **Label:** `LP-1.3.2 Final Test`
3. Select **Data Type:** `string`
4. Click **"Save"**

**Expected Results:**
- ✅ POST request is emitted (not stuck/flash behavior)
- ✅ 201 response received
- ✅ Success toast appears
- ✅ Attribute appears in list

**If POST is NOT emitted (flash but no POST):**
- ⚠️ Capture detailed state:
  ```javascript
  // Paste into Console BEFORE clicking Save:
  document.querySelector('button:has-text("Save")')?.disabled
  // Expected: false
  ```
- 🔴 This means LP-ATTR-1.3.3 is needed (handleSave instrumentation)

**Capture:**
```
Screenshot: step4-create-after-delete.png
Screenshot: step4-network-post.png
Note: POST emitted? [YES/NO]
Note: Save button disabled state? [true/false]
```

---

## 📊 Results Checklist

| Test Step | Pass/Fail | Notes |
|-----------|-----------|-------|
| 1. Create baseline | ⬜ | POST 201, attribute created |
| 2. Delete 204 - No console errors | ⬜ | **KEY: Console clean!** |
| 3. Delete 404 - Friendly error | ⬜ | Console clean, good toast |
| 4. Create after delete | ⬜ | POST emitted, no stuck state |

**Overall Result:** ⬜ PASS / ⬜ FAIL

**Create/Save Works After LP-ATTR-1.3.2:** ⬜ YES / ⬜ NO

---

## 📦 Artifacts to Collect

### Required:
1. **HAR File** (Network XHR only):
   - Right-click in Network tab → "Save all as HAR with content"
   - Save as: `lp-attr-1.3.2-smoke-network.har`

2. **Console Log**:
   - Right-click in Console → "Save as..."
   - Save as: `lp-attr-1.3.2-smoke-console.txt`

3. **Screenshots**:
   - `step2-delete-204-console.png` - **Most important!**
   - `step4-create-after-delete.png`

4. **Summary Text**:
   - Create: `lp-attr-1.3.2-post-create.txt`
   - Content:
     ```
     CREATE/SAVE WORKS: [YES/NO]
     
     DELETE 204 CONSOLE ERRORS: [YES/NO]
     DELETE 404 CONSOLE ERRORS: [YES/NO]
     
     NOTES:
     [Any observations]
     ```

### Optional (if create/save fails):
5. **Element State**:
   ```javascript
   // Paste into Console and save output
   const btn = document.querySelector('[data-testid="btn-save"]') || document.querySelector('button:has-text("Save")');
   console.log('Save button:', {
     disabled: btn?.disabled,
     visible: btn?.offsetParent !== null,
     innerHTML: btn?.innerHTML
   });
   
   const form = document.querySelector('form');
   console.log('Form data:', new FormData(form));
   ```

---

## ✅ Success Criteria

**LP-ATTR-1.3.2 is successful if:**
1. ✅ DELETE 204 produces **NO console errors** (no "Expected JSON response" error)
2. ✅ DELETE 404 produces **NO console errors** and shows friendly message
3. ✅ UI resets properly after deletes (selection cleared, form reset)
4. ✅ Create/save works normally after delete operations

**If create/save still fails (flash but no POST):**
- 🔄 Proceed to **LP-ATTR-1.3.3** (handleSave instrumentation)
- 📋 Current deliverables prove parse error fix worked
- 🎯 Next step: Instrument handleSave to find early-return point

---

## 🐛 Troubleshooting

**If you see authentication errors:**
- Make sure you're signed in as an admin user
- Check that your session hasn't expired
- Try signing out and back in

**If "New Attribute" button is not visible:**
- Check that you're on the Attributes page
- Verify admin permissions
- Check console for access control errors

**If you can't reproduce the issue:**
- That's good! LP-ATTR-1.3.2 fixed it
- Document the clean console logs as proof

---

## 📬 Reporting Results

After completing the test, create a summary:

```markdown
## LP-ATTR-1.3.2 Smoke Test Results

**Tester:** [Your name]
**Date:** [Date]
**Environment:** Staging PR #339

### Results
- DELETE 204 console errors: [YES/NO]
- DELETE 404 console errors: [YES/NO]
- Create/save after delete: [YES/NO]

### Verdict
[PASS/FAIL]

### Artifacts
- Attached: HAR, console log, screenshots

### Notes
[Any additional observations]
```

---

**Preview URL:** https://ropi-aoss-staging--pr-339-iktcwvsh.web.app/settings/attributes
