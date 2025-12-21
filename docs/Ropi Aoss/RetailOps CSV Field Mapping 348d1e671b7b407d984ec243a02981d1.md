# RetailOps CSV Field Mapping

(AOSS v1.0 Official Reference)

This page defines the column-by-column mapping used by the Export Manager when generating RetailOps CSV files.

- CSV headers come from **Import Engine — Row Schema (Section 3.1)**
- Internal values come from **Product Schema (Section 2.1)**
- This mapping is the **canonical reference** for:
    - CSV generation
    - Export Manager implementation
    - QA testing
    - AI codegen for mapping functions
    - TypeScript model generation

---

## 1. Identity & Classification Columns

| CSV Column | AOSS Field (`maps_to`) | Required | Notes |
| --- | --- | --- | --- |
| SKU | `sku` | Yes | Primary key |
| StyleID | `styleId` | No | Optional style grouping |
| MPN | `mpn` | Yes | Manufacturer part number |
| ProductName | `name` | Yes | Customer-facing product name |
| Slug | `slug` | No | URL-friendly slug |
| Brand | `brand` | Yes | Normalized brand |
| Category | `category` | Yes | Product category |
| Class | `class` | Yes | Product class |
| Department | `department` | Yes | Department hierarchy |

---

## 2. Site & Launch Fields

| CSV Column | AOSS Field (`maps_to`) | Required | Notes |
| --- | --- | --- | --- |
| Websites | `website[]` | Yes | Joined with ` |
| ProductIsActive | `productIsActive` | No | Defaults to true |
| LaunchDate | `launchDate` | No | Launch Calendar only |
| KLPostDate | `klPostDate` | No | Karmaloop marketing |
| FamilySizing | `familySizing` | No | Launch grouping |
| Hype | `hype` | No | Launch Calendar metadata |

---

## 3. Dates (Optional)

| CSV Column | AOSS Field | Required |
| --- | --- | --- |
| FirstReceived | `firstReceived` | No |
| LastReceived | `lastReceived` | No |

---

## 4. Physical Dimensions

| CSV Column | AOSS Field | Notes |
| --- | --- | --- |
| Height | `height` |  |
| Length | `length` |  |
| Width | `width` |  |
| Weight | `weight` |  |

---

## 5. Demographics

| CSV Column | AOSS Field |
| --- | --- |
| Gender | `gender` |
| AgeGroup | `ageGroup` |

---

## 6. Color & Material

| CSV Column | AOSS Field |
| --- | --- |
| PrimaryColor | `primaryColor` |
| DescriptiveColor | `descriptiveColor` |
| Material | `material` |
| OutsoleMaterial | `outsoleMaterial` |
| ClosureType | `closureType` |
| CutType | `cutType` |
| Fit | `fit` |
| HeelHeight | `heelHeight` |
| PlatformHeight | `platformHeight` |
| HeelType | `heelType` |
| ShoeHeightMap | `shoeHeightMap` |
| MadeIn | `madeIn` |
| League | `league` |
| SportsTeam | `sportsTeam` |

---

## 7. Collection / Tax / Promo

| CSV Column | AOSS Field |
| --- | --- |
| CollectionName | `collectionName` |
| FastFashion | `fastFashion` |
| TaxClass | `taxClass` |
| Promo | `promo` |

---

## 8. Shipping (Optional)

| CSV Column | AOSS Field |
| --- | --- |
| StdShipOverride | `standardShippingOverride` |
| ExpeditedShipOverride | `expeditedOverrideShipping` |

---

## 9. Inventory Metrics (Optional)

| CSV Column | AOSS Field |
| --- | --- |
| TotalInv | `totalInv` |
| WarehouseInv | `warehouseInv` |
| StoreInv | `storeInv` |

---

## 10. RICS Fields (Inbound Only — Never Exported)

| CSV Column | AOSS Field | Note |
| --- | --- | --- |
| RICS_LongDesc | `ricsLongDesc` | **Reference only, never exported** |
| RICS_ShortDesc | `ricsShortDescription` | **Inbound only, not exported** |

---

## 11. Summary Rules (Export Manager)

**Outbound RetailOps CSV includes:**

- All columns from Row Schema (Section 3.1)
- Except `usage: "reference_only"` fields (RICS)
- Values pulled from Product Schema (Section 2.1)
- Joined multi-select values for Websites

**Required for Export (Readiness):**

- SKU, Brand, Department, Class, Category
- TaxClass
- Gender / Age / PrimaryColor (per validation)
- Per-website descriptions
- Per-website SEO
- Validation = valid
- No blocking Observations / Smart Rules
- Ready_for_export = true
- Uploaded_to_ro = false

---

This page is the **single source of truth** for all RetailOps CSV mapping decisions across AOSS.