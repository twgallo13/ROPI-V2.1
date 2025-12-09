# Manual Verification Checklist - List Endpoint Feature
**Feature**: List endpoint + client materialization + validation
**Branch**: aoss-main (merged from feature/users-admin)
**Deploy Date**: 2025-01-XX
**Staging URL**: https://ropi-aoss-staging.web.app
**API URL**: https://us-central1-ropi-bccee.cloudfunctions.net/api

## Prerequisites
- Login to staging as: **theo@shiekhshoes.org**
- Open browser DevTools (F12) → Network tab
- Clear browser cache before testing

---

## Test 1: Frontend Authentication & Application Load
**Goal**: Verify user can login and app loads correctly

### Steps:
1. Navigate to https://ropi-aoss-staging.web.app
2. Login as theo@shiekhshoes.org
3. Verify redirect to /app/products after successful login

### Expected Results:
- ✅ Login successful
- ✅ Products page loads without errors
- ✅ Product list displays

### Actual Results:
- [ ] Login: _______
- [ ] Products page: _______
- [ ] Screenshot: (attach screenshot of /app/products)

---

## Test 2: API Authentication Headers
**Goal**: Verify Firebase Auth token is being sent in API requests

### Steps:
1. With DevTools Network tab open, navigate to /app/products
2. Find any API request (e.g., to /api/products)
3. Inspect request headers
4. Verify "Authorization: Bearer <token>" header is present

### Expected Results:
- ✅ Authorization header exists
- ✅ Token format is "Bearer eyJ..." (JWT)

### Actual Results:
- [ ] Authorization header present: _______
- [ ] Token format correct: _______
- [ ] Screenshot: (attach Network tab screenshot showing Authorization header)

---

## Test 3: List Endpoint - Department List Fetch
**Goal**: Verify GET /api/admin/settings/lists/departments returns normalized data

### Steps:
1. In DevTools Console, run this command (replace <TOKEN> with actual token from Network tab):
```javascript
fetch('https://us-central1-ropi-bccee.cloudfunctions.net/api/admin/settings/lists/departments', {
  headers: { 'Authorization': 'Bearer <YOUR_TOKEN_HERE>' }
}).then(r => r.json()).then(console.log)
```

### Expected Results:
- ✅ HTTP 200 response
- ✅ Response body has structure: `{ items: [...], values: [...] }`
- ✅ `items` is an array of list items (e.g., ["Men's", "Women's", ...])
- ✅ `values` is an array matching items

### Actual Results:
- [ ] HTTP Status: _______
- [ ] Response structure: _______
- [ ] Sample response: (paste first 3 items)
```json

```

---

## Test 4: Product Detail Page - Attribute Dropdown with List Values
**Goal**: Verify attribute dropdown shows list values from API

### Steps:
1. Navigate to /app/product/14943667 (or any valid product ID)
2. Scroll to "Product Attributes" section
3. Find the "department" attribute dropdown (if it exists)
4. Click to open the dropdown
5. Verify dropdown options match the list values from Test 3

### Expected Results:
- ✅ Product page loads
- ✅ Product Attributes tab visible
- ✅ Department dropdown shows list values
- ✅ No console errors related to list fetching

### Actual Results:
- [ ] Product page loads: _______
- [ ] Attributes tab visible: _______
- [ ] Department dropdown present: _______
- [ ] Dropdown options: (list first 5 options)
  - _______
  - _______
  - _______
- [ ] Screenshot: (attach screenshot of product page with dropdown open)

---

## Test 5: Client-Side Validation - Invalid Value
**Goal**: Verify client blocks saving invalid attribute values

### Steps:
1. On product detail page, find an attribute with a list (e.g., department)
2. Open browser console and manually set an invalid value:
```javascript
// This will bypass dropdown validation
document.querySelector('select[name="department"]').value = 'InvalidDepartment';
```
3. Click "Save" or trigger form submission
4. Verify validation error appears

### Expected Results:
- ✅ Validation error message displays
- ✅ Error message says something like "Invalid value for department"
- ✅ Form does not submit
- ✅ Console shows no errors

### Actual Results:
- [ ] Validation error shown: _______
- [ ] Error message: "_______"
- [ ] Form blocked: _______
- [ ] Screenshot: (attach screenshot of validation error)

---

## Test 6: Valid Attribute Save
**Goal**: Verify saving a valid attribute value works

### Steps:
1. On product detail page, select a valid value from department dropdown
2. Click "Save" button
3. Wait for save confirmation
4. Refresh the page
5. Verify the saved value persists

### Expected Results:
- ✅ Save succeeds (success toast/message)
- ✅ No console errors
- ✅ Value persists after page refresh
- ✅ Firestore document updated (check in Firebase Console if needed)

### Actual Results:
- [ ] Save success message: _______
- [ ] Console errors: _______
- [ ] Value persists: _______
- [ ] Firestore doc ID: _______ (optional)

---

## Test 7: Settings → Attribute Manager CRUD
**Goal**: Verify attribute manager can create/read/update/delete attributes

### Steps:
1. Navigate to /app/settings (or wherever Attribute Manager is located)
2. Click "Attribute Manager" or similar nav item
3. Test Create:
   - Click "Add Attribute" button
   - Fill in attribute name, type, etc.
   - Set allowed_values or allowedValuesRef (e.g., "lists/departments")
   - Click "Save"
   - Verify attribute appears in list
4. Test Read:
   - Click on newly created attribute
   - Verify all fields display correctly
5. Test Update:
   - Edit attribute name or allowed values
   - Click "Save"
   - Verify changes persist
6. Test Delete:
   - Click "Delete" on test attribute
   - Confirm deletion
   - Verify attribute removed from list

### Expected Results:
- ✅ Create: Attribute created successfully
- ✅ Read: Attribute details display correctly
- ✅ Update: Changes save and persist
- ✅ Delete: Attribute removed from list

### Actual Results:
- [ ] Create success: _______
- [ ] Read success: _______
- [ ] Update success: _______
- [ ] Delete success: _______
- [ ] Screenshot: (attach screenshot of Attribute Manager)

---

## Test 8: Console Error Check
**Goal**: Verify no JavaScript errors in console

### Steps:
1. Throughout all tests above, monitor browser console
2. Note any errors, warnings, or failed network requests

### Expected Results:
- ✅ No errors related to list fetching
- ✅ No errors related to attribute validation
- ✅ No 401/403 API errors (except for unauthenticated test in Test 3 setup)

### Actual Results:
- [ ] Errors observed: _______
- [ ] Warnings observed: _______
- [ ] Failed requests: _______

---

## Summary
- **Total Tests**: 8
- **Passed**: _______
- **Failed**: _______
- **Blocked**: _______

### Issues Found:
1. _______
2. _______
3. _______

### Sign-off:
- [ ] All critical tests passed
- [ ] Ready for production deployment
- [ ] Issues documented in tech-debt ticket

**Verified by**: _______  
**Date**: _______
