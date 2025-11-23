# Theo Verification Checklist — Lisa v3.3.0

**Staging URL:** https://ropi-bccee.web.app/settings/attributes

**Date:** 2025-11-23

---

## ✅ Grouping & Search

- [ ] **Search "Gender"**
  - [ ] See a single grouped entry for `descriptive.gender` (not 3 separate rows)
  - [ ] Within that group, see multiple labels/variants (e.g., "Gender", "RICS Gender", "Group")
  - [ ] Can click to expand and see variant details

- [ ] **Search for another multi-variant attribute** (if available)
  - [ ] Confirm similar grouping behavior

- [ ] **General search still works**
  - [ ] Typing partial names filters correctly
  - [ ] Results make sense

---

## ✅ Badges

- [ ] **On at least one grouped attribute, confirm:**
  - [ ] **Core** badge visible where appropriate (foundation attributes)
  - [ ] **Vendor / Legacy / AI** badges appear where expected
  - [ ] **Deprecated** badge (if any exist)

- [ ] **Hover/scan badges**
  - [ ] Make sense to a human (not just tech jargon)
  - [ ] Colors/styling look good

---

## ✅ Vocab Display (Known Select Attribute)

- [ ] **Open an attribute with vocab** (e.g., `descriptive.gender` or another known select attribute)
  - [ ] In **Validation tab**, see "Allowed Values" section
  - [ ] Values appear as a list of tags/pills
  - [ ] Values are readable and match expectations from registry

- [ ] **Check for allowedValuesRef**
  - [ ] If present, confirm a note like "Sourced from: settings/lists/..."

---

## ✅ Non-Vocab Attribute Behavior

- [ ] **Open an attribute WITHOUT vocab** (e.g., a free-text field like `sku_core.name`)
  - [ ] "Allowed Values" section is hidden or clearly marked as "no vocab"
  - [ ] No broken/grayed-out junk

---

## ✅ Product-Value Preview

- [ ] **For at least one attribute with data:**
  - [ ] See a "Current Product Values" or similar section
  - [ ] Either:
    - [ ] Simple distribution of values (e.g., Male: 62, Female: 54, ...)
    - [ ] OR a clear message "preview not available yet" (but no errors/broken UI)

- [ ] **Check distribution makes sense**
  - [ ] No negative numbers
  - [ ] No obviously wrong values
  - [ ] Counts and percentages look reasonable

---

## ✅ Attach Vocab Helper (Optional)

- [ ] **If a stable vocab set is detected:**
  - [ ] See a blue banner suggesting "Attach vocab..."
  - [ ] Click "Attach vocab..." button
  - [ ] Modal appears with detected values
  - [ ] Can close modal without errors

- [ ] **If no stable set detected:**
  - [ ] No banner (which is correct)

---

## ✅ General Regressions

- [ ] **ACC still loads quickly**
  - [ ] No long delays on page load
  - [ ] Search is responsive

- [ ] **Basic search/filtering works**
  - [ ] Can search by label, path, description
  - [ ] Filters (category, foundation, exportable) still work

- [ ] **Navigation to attribute details**
  - [ ] Click on attribute row → detail drawer opens
  - [ ] No console errors in browser dev tools

---

## ✅ Version Confirmation

- [ ] **In repo:** `.lisa_version.json` shows `v3.3.0`
- [ ] **In Firestore:** (if accessible) `settings/meta/lisaVersion` shows `v3.3.0`

---

## Final Report

Once all items above are checked, provide feedback:

**✅ v3.3.0 verified** with any notes (especially UX confusion, slow loading, or unclear badges/labels).

OR

**❌ Issues found:** [describe issues and which checklist items failed]

---

**Notes:**
- Test with real data if available
- Check browser console for any errors
- If any item is unclear or can't be tested, note it in feedback
