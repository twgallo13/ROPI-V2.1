# Browser Testing Instructions for Product Editor Debug

## Status Summary

✅ **PR #239 Merged**: e5dedc905ce63f401142a55fe84d5cf85ce478b4  
✅ **Deployed to Staging**: https://ropi-aoss-staging.web.app  
✅ **Firestore Check Complete**: Product 14943667 **EXISTS** in Firestore  

---

## Manual Browser Testing Required

### Step 1: Open the Product Editor Page

1. Open Chrome (incognito mode recommended)
2. Navigate to: **https://ropi-aoss-staging.web.app/app/products/14943667**
3. Sign in as: **theo@shiekhshoes.org** (Google sign-in)

### Step 2: Capture Console Debug Logs

Open DevTools → Console and copy ALL lines that start with:

```
[ProductEditorPage] Product ID from URL:
[useProduct] Loading product ...
[useProduct] Setting up Firestore listener ...
[useProduct] Firestore snapshot ...
[useProduct] Product data received...
```

**Also run these commands in the console and capture output:**

```javascript
console.log('loading:', !!document.querySelector('.product-editor-loading'));
console.log('notFound:', !!document.querySelector('.product-editor-error'));
console.log('editorDOM:', !!document.querySelector('.product-editor'));
console.log('localcache:', localStorage.getItem('aoss:product:14943667') ? 'present' : 'missing');
```

### Step 3: Capture Network Activity

In DevTools → Network tab:

1. Filter by **Fetch/XHR**
2. Look for requests to:
   - `firestore.googleapis.com` (runQuery or WebChannel)
   - `/api/products/14943667` (if any)
   - `/api/admin/settings/lists/*` (if triggered)

For each request, capture:
- URL
- Request Headers (Authorization header)
- Response Status
- Response Body (first ~400 chars)

### Step 4: Take Screenshots

1. **Console** - showing all debug logs
2. **Full Page** - showing blank/error/editor state
3. **Network Tab** - showing Firestore requests

---

## Expected Scenarios

### Scenario A: Product Loads Successfully
**Expected Console Output:**
```
[ProductEditorPage] Product ID from URL: 14943667
[useProduct] Loading product 14943667, Firebase available: true
[useProduct] Setting up Firestore listener for product 14943667...
[useProduct] Firestore snapshot for product 14943667: exists=true
[useProduct] Product data received, keys: ['id', 'name', 'brand', ...]
```
**Expected DOM:**
```
loading: false
notFound: false
editorDOM: true ✓
localcache: present
```

### Scenario B: Product Not Found (Unlikely - doc exists in Firestore)
**Expected Console Output:**
```
[ProductEditorPage] Product ID from URL: 14943667
[useProduct] Loading product 14943667, Firebase available: true
[useProduct] Setting up Firestore listener for product 14943667...
[useProduct] Firestore snapshot for product 14943667: exists=false
[useProduct] Product 14943667 not found in Firestore, using mock data
```

### Scenario C: Product ID Missing from URL
**Expected Page Display:**
```
Error: No product ID in URL
Please use /app/products/:id
[Back to Products button]
```

### Scenario D: Firebase Not Available
**Expected Console Output:**
```
[ProductEditorPage] Product ID from URL: 14943667
[useProduct] Loading product 14943667, Firebase available: false
```

---

## Known Firestore Document Status

**Document Check Result:**
```
exists: true ✓

Key fields:
- id: 14943667
- name: 950
- brand: NEW ERA CAPS
- sku: undefined
- attributes: 13 keys
- department: Accessories
- category: Causal
- class: Hats
- status: intake
- isActive: true
```

**Full document data (first 1000 chars):**
```json
{
  "featured": false,
  "warehouseInv": 11,
  "storeInv": 116,
  "media": {},
  "variants": [],
  "isActive": true,
  "coreProduct": false,
  "promo": false,
  "shipping": {
    "expeditedOverride": false,
    "length": 0,
    "width": 0,
    "weight": 0,
    "height": 0,
    "standardOverride": false
  },
  "price": {
    "ricsRetail": 0,
    "scomSale": 0,
    "scomRegular": 0
  },
  "fastfashion": false,
  "brand": "NEW ERA CAPS",
  "map": false,
  "aiContext": {
    "featureBullets": [],
    "keywords": [],
    "designNotes": ""
  },
  "lastReceived": "2025-11-06T08:00:00.000Z",
  "mpn": "14943667",
  "tax": {},
  "hype": false,
  "familySizing": false,
  "firstReceived": "2025-11-11T08:00:00.000Z",
  "status": "intake",
  "gender": "Mens",
  "launch": {
    "fastFashion": false,
    "hype": false
  },
  "ageGroup": "Adults",
  "materials": [],
  "style": {
    "id": "14943667"
  },
  "id": "14943667",
  "department": "Accessories",
  "category": "Causal",
  "class": "Hats"
}
```

---

## What to Do After Testing

Once you've captured the console logs, network activity, and screenshots, paste them back here so I can:

1. Determine which scenario occurred
2. Identify the root cause of the blank page
3. Create a follow-up fix if needed
4. Complete the final Homer Summary with all artifacts

**The document EXISTS in Firestore**, so if the page is still blank, we need to determine:
- Is the Firestore listener starting?
- Is the snapshot arriving?
- Is the product data being parsed correctly?
- Is the component rendering being blocked by some condition?

The debug logs will reveal exactly where the flow is breaking.
