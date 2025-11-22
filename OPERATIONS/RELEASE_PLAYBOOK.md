# Release Playbook

## Final Sanity Check - November 22, 2025

### Headless Import Verification

**Import Output:**
```
WROTE product doc: products_v2/_M_P_N_0_0_1_
WROTE product doc: products/_M_P_N_0_0_1_
All headers mapped
```

### TEST-001 Product Summary

**10 Critical Fields + Dropship Fields:**
```json
{
  "sku_core": {
    "department": "Footwear",
    "class": "Athletic",
    "category": "Running",
    "styleId": "STYLE-001",
    "coreProduct": true,
    "productIsActive": true,
    "mpn": "MPN001",
    "sku": "TEST-001",
    "brand": "Adidas",
    "name": "Adidas Air",
    "dropshipName": "FastShip Inc",
    "productIsDropship": true
  },
  "descriptive": {
    "ageGroup": "Adult",
    "gender": "male",
    "sportsTeam": "LA Lakers",
    "league": "NBA",
    "fit": "True",
    "material": ["Leather"],
    "cutType": "Low",
    "closureType": "Lace-up",
    "platformHeight": "Low",
    "heelType": "Stiletto",
    "shoeHeightMap": "Low",
    "heelHeight": 1.2,
    "outsoleMaterial": "Rubber",
    "primaryColor": "Black",
    "descriptiveColor": "Black",
    "keywords": ["running", "breathable"],
    "description": "Test product description",
    "slug": "adidas-air",
    "familySizing": false,
    "madeIn": ["China"],
    "metaName": "Adidas Air",
    "metaDescription": "SEO meta desc"
  },
  "pricing": {
    "map": 49.99,
    "promo": true,
    "scomRegularPrice": 120,
    "scomSalePrice": 99
  },
  "technical": {
    "website": ["main"],
    "height": 4,
    "length": 12,
    "width": 4.5,
    "weight": 1.2,
    "standardShippingOverride": 5.99,
    "expeditedOverrideShipping": 9.99,
    "hideImageDate": "2025-11-21T00:00:00.000Z",
    "taxClass": false,
    "mediaStatus": "Images Ready",
    "lastReceived": "2025-11-01T00:00:00.000Z",
    "firstReceived": "2025-10-01T00:00:00.000Z",
    "store1": 5,
    "storeInv": 20,
    "warehouseInv": 50,
    "whsInv": 10,
    "store4": 3,
    "totalInv": 88,
    "status": "Active"
  },
  "launch": {
    "hype": false,
    "fastFashion": false,
    "newCollection": "AirForce1",
    "klPostDate": "2025-10-01T00:00:00.000Z",
    "launchDate": "2025-10-01T00:00:00.000Z"
  },
  "source": {
    "rics": {
      "shortDescription": "Short RICS desc",
      "longDescription": "Long RICS desc",
      "brand": "Adidas",
      "category": "Running",
      "color": "Black"
    }
  },
  "ai": {}
}
```

### Verification Status
✅ All 10 critical fields present
✅ Dropship fields confirmed (dropshipName: "FastShip Inc", productIsDropship: true)
✅ All CSV headers mapped successfully
✅ Products written to both products and products_v2 collections

