# Attribute Registry — Human & JSON

[← Back to ROPI AOSS (Main Page)](Ropi%20AOSS%202b645ee1ec5a80e5b64fd04cea9e0d52.md)

This page defines the product-level (MPN-level) attributes used by ROPI, their mapping to RetailOps (RO), their data types, export/import requirements, and how AI uses them.

All attributes in this registry are **MPN-level** (product-level).

SKUs are stored only as reference strings (for RO export) and have **no separate attributes**.

---

## Attribute Registry — Human View

| Attribute Id | Label | Tab | Section | Required | Export Required | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| sku | SKU | Core Information | SKU & Product Core | Y | Y | Primary SKU / item id |
| styleId | Style ID | Core Information | SKU & Product Core | N | N | Vendor or internal style id |
| mpn | MPN | Core Information | SKU & Product Core | Y | Y | Manufacturer part number |
| name | Product Name | Core Information | SKU & Product Core | Y | Y | Display name |
| slug | URL Slug | Core Information | SKU & Product Core | N | Y | Required for web export |
| brand | Brand | Core Information | SKU & Product Core | Y | Y |  |
| category | Category | Core Information | SKU & Product Core | Y | Y |  |
| class | Class | Core Information | SKU & Product Core | Y | Y |  |
| department | Department | Core Information | SKU & Product Core | Y | Y |  |
| website | Websites (Multi-select) | Core Information | SKU & Product Core | Y | Y | Drives site-specific descriptions & AI |
| productIsActive | Product Is Active | Core Information | SKU & Product Core | Y | N | Internal only |
| status | Status | Core Information | SKU & Product Core | N | N | Workflow state |
| launchDate | Launch Date | Core Information | Lifecycle (Meta) | N | N | Required only for launch products |
| klPostDate | KL Post Date | Core Information | Lifecycle (Meta) | N | N | Optional |
| familySizing | Family Sizing | Core Information | Lifecycle (Meta) | N | N | Optional launch meta |
| hype | HYPE | Core Information | Lifecycle (Meta) | N | N | Optional launch flag |
| firstReceived | First Received | Core Information | Lifecycle (Meta) | N | N | Meta only |
| lastReceived | Last Received | Core Information | Lifecycle (Meta) | N | N | Meta only |
| height | Height | Core Information | Dimensions | N | N | For shipping/ops only |
| length | Length | Core Information | Dimensions | N | N |  |
| width | Width | Core Information | Dimensions | N | N |  |
| weight | Weight | Core Information | Dimensions | N | N |  |
| gender | Gender | Product Attributes | Identity & Demographic | Y | Y | Core descriptive |
| ageGroup | Age Group | Product Attributes | Identity & Demographic | Y | Y | Core descriptive |
| primaryColor | Primary Color | Product Attributes | Color | Y | Y | Used for filters |
| descriptiveColor | Descriptive Color | Product Attributes | Color | Y | Y | Used for copy & AI |
| material | Material(s) | Product Attributes | Materials & Construction | Y | Y | Core descriptive |
| outsoleMaterial | Outsole Material | Product Attributes | Materials & Construction | N | N | Optional |
| closureType | Closure Type | Product Attributes | Materials & Construction | N | N | Optional |
| cutType | Cut Type | Product Attributes | Materials & Construction | N | N | Optional |
| fit | Fit | Product Attributes | Materials & Construction | Y | Y | Drives copy and Smart Rules |
| heelHeight | Heel Height | Product Attributes | Materials & Construction | N | N | Optional |
| platformHeight | Platform Height | Product Attributes | Materials & Construction | N | N | Optional |
| heelType | Heel Type | Product Attributes | Materials & Construction | N | N | Optional |
| shoeHeightMap | Shoe Height Map | Product Attributes | Materials & Construction | N | N | Normalized height |
| madeIn | Made In | Product Attributes | Materials & Construction | N | N | Optional |
| league | League | Product Attributes | Sport & League | N | N | Used when sportsTeam set |
| sportsTeam | Sports Team | Product Attributes | Sport & League | N | N | Required when league is major |
| collectionName | Collection Name | Product Attributes | Product Flags & Tax | N | N | Optional launch flag |
| fastFashion | Fast Fashion | Product Attributes | Product Flags & Tax | N | N | Optional flag |
| taxClass | Tax Class | Product Attributes | Product Flags & Tax | N | Y | Required for export; default Taxable Goods |
| descriptionShiekh | Description – [Shiekh.com](http://Shiekh.com) | Descriptions & SEO | Site Descriptions | N | Y | Required if website includes [Shiekh.com](http://Shiekh.com) |
| descriptionKarmaloop | Description – Karmaloop | Descriptions & SEO | Site Descriptions | N | Y | Required if website includes Karmaloop |
| descriptionMltd | Description – MLTD | Descriptions & SEO | Site Descriptions | N | Y | Required if website includes MLTD |
| descriptionSangremia | Description – Sangremia | Descriptions & SEO | Site Descriptions | N | Y | Required if website includes Sangremia |
| metaName | Meta Name | Descriptions & SEO | SEO | N | Y | Required for export |
| metaDescription | Meta Description | Descriptions & SEO | SEO | N | Y | Required for export |
| keywords | Keywords | Descriptions & SEO | SEO | N | Y | Required for export |
| ricsLongDesc | RICS Long Description | Descriptions & SEO | Source Text (RICS Ref) | N | N | Reference-only; not exported |
| ricsShortDescription | RICS Short Description | Descriptions & SEO | Source Text (RICS Ref) | N | N | Reference-only; not exported |
| mediaStatus | Media Status | Launch & Media | Product Images | N | N | Tracks image readiness |
| hideImageDate | Hide Image Date | Launch & Media | Product Images | N | N | Internal control |
| map | MAP | Launch & Media | Core Pricing (Launch) | N | N | Optional |
| scomRegularPrice | SCOM Regular Price | Launch & Media | Core Pricing (Launch) | N | N | Optional |
| scomSalePrice | SCOM Sale Price | Launch & Media | Core Pricing (Launch) | N | N | Optional |
| promo | Promo | Launch & Media | Core Pricing (Launch) | N | N | Optional promo tags |
| standardShippingOverride | Standard Shipping Override | Launch & Media | Shipping Overrides | N | N | Optional override |
| expeditedOverrideShipping | Expedited Override Shipping | Launch & Media | Shipping Overrides | N | N | Optional override |
| customMessage | Custom Message (Internal) | Launch & Media | Internal Launch Message | N | N | Internal only; never exported |
| totalInv | Total Inv | Core Information | Header Meta (read-only) | N | N | Derived; used for display |
| warehouseInv | WHS Inv | Core Information | Header Meta (read-only) | N | N | Derived; used for display |
| storeInv | Store Inv | Core Information | Header Meta (read-only) | N | N | Derived; used for display |

---

## Machine-Readable Attribute Registry — JSON

```json
{
  "version": "1.0.0",
  "attributes": {
    "sku":            { "tab": "core", "section": "core-sku",            "required": true,  "exportRequired": true  },
    "styleId":        { "tab": "core", "section": "core-sku",            "required": false, "exportRequired": false },
    "mpn":            { "tab": "core", "section": "core-sku",            "required": true,  "exportRequired": true  },
    "name":           { "tab": "core", "section": "core-sku",            "required": true,  "exportRequired": true  },
    "slug":           { "tab": "core", "section": "core-sku",            "required": false, "exportRequired": true  },
    "brand":          { "tab": "core", "section": "core-sku",            "required": true,  "exportRequired": true  },
    "category":       { "tab": "core", "section": "core-sku",            "required": true,  "exportRequired": true  },
    "class":          { "tab": "core", "section": "core-sku",            "required": true,  "exportRequired": true  },
    "department":     { "tab": "core", "section": "core-sku",            "required": true,  "exportRequired": true  },
    "website":        { "tab": "core", "section": "core-sku",            "required": true,  "exportRequired": true  },
    "productIsActive":{ "tab": "core", "section": "core-sku",            "required": true,  "exportRequired": false },
    "status":         { "tab": "core", "section": "core-sku",            "required": false, "exportRequired": false },

    "launchDate":     { "tab": "core", "section": "core-lifecycle",      "required": false, "exportRequired": false },
    "klPostDate":     { "tab": "core", "section": "core-lifecycle",      "required": false, "exportRequired": false },
    "familySizing":   { "tab": "core", "section": "core-lifecycle",      "required": false, "exportRequired": false },
    "hype":           { "tab": "core", "section": "core-lifecycle",      "required": false, "exportRequired": false },
    "firstReceived":  { "tab": "core", "section": "core-lifecycle",      "required": false, "exportRequired": false },
    "lastReceived":   { "tab": "core", "section": "core-lifecycle",      "required": false, "exportRequired": false },

    "height":         { "tab": "core", "section": "core-dimensions",     "required": false, "exportRequired": false },
    "length":         { "tab": "core", "section": "core-dimensions",     "required": false, "exportRequired": false },
    "width":          { "tab": "core", "section": "core-dimensions",     "required": false, "exportRequired": false },
    "weight":         { "tab": "core", "section": "core-dimensions",     "required": false, "exportRequired": false },

    "gender":         { "tab": "attributes", "section": "attributes-identity",   "required": true, "exportRequired": true },
    "ageGroup":       { "tab": "attributes", "section": "attributes-identity",   "required": true, "exportRequired": true },

    "primaryColor":   { "tab": "attributes", "section": "attributes-color",      "required": true, "exportRequired": true },
    "descriptiveColor":{ "tab": "attributes","section": "attributes-color",      "required": true, "exportRequired": true },

    "material":       { "tab": "attributes", "section": "attributes-materials",  "required": true, "exportRequired": true },
    "outsoleMaterial":{ "tab": "attributes", "section": "attributes-materials",  "required": false,"exportRequired": false },
    "closureType":    { "tab": "attributes", "section": "attributes-materials",  "required": false,"exportRequired": false },
    "cutType":        { "tab": "attributes", "section": "attributes-materials",  "required": false,"exportRequired": false },
    "fit":            { "tab": "attributes", "section": "attributes-materials",  "required": true, "exportRequired": true },
    "heelHeight":     { "tab": "attributes", "section": "attributes-materials",  "required": false,"exportRequired": false },
    "platformHeight": { "tab": "attributes", "section": "attributes-materials",  "required": false,"exportRequired": false },
    "heelType":       { "tab": "attributes", "section": "attributes-materials",  "required": false,"exportRequired": false },
    "shoeHeightMap":  { "tab": "attributes", "section": "attributes-materials",  "required": false,"exportRequired": false },
    "madeIn":         { "tab": "attributes", "section": "attributes-materials",  "required": false,"exportRequired": false },

    "league":         { "tab": "attributes", "section": "attributes-flags",      "required": false,"exportRequired": false },
    "sportsTeam":     { "tab": "attributes", "section": "attributes-flags",      "required": false,"exportRequired": false },

    "collectionName": { "tab": "attributes", "section": "attributes-flags",      "required": false,"exportRequired": false },
    "fastFashion":    { "tab": "attributes", "section": "attributes-flags",      "required": false,"exportRequired": false },
    "taxClass":       { "tab": "attributes", "section": "attributes-flags",      "required": false,"exportRequired": true },

    "descriptionShiekh":    { "tab": "descriptions", "section": "descriptions-sites", "required": false, "exportRequired": true },
    "descriptionKarmaloop": { "tab": "descriptions", "section": "descriptions-sites", "required": false, "exportRequired": true },
    "descriptionMltd":      { "tab": "descriptions", "section": "descriptions-sites", "required": false, "exportRequired": true },
    "descriptionSangremia": { "tab": "descriptions", "section": "descriptions-sites", "required": false, "exportRequired": true },

    "metaName":       { "tab": "descriptions", "section": "seo",                "required": false, "exportRequired": true },
    "metaDescription":{ "tab": "descriptions", "section": "seo",                "required": false, "exportRequired": true },
    "keywords":       { "tab": "descriptions", "section": "seo",                "required": false, "exportRequired": true },

    "ricsLongDesc": {
      "tab": "descriptions",
      "section": "rics-reference",
      "required": false,
      "exportRequired": false,
      "usage": "reference_only"
    },
    "ricsShortDescription": {
      "tab": "descriptions",
      "section": "rics-reference",
      "required": false,
      "exportRequired": false,
      "usage": "reference_only"
    },

    "mediaStatus":    { "tab": "launch-media", "section": "launch-media-images",   "required": false, "exportRequired": false },
    "hideImageDate":  { "tab": "launch-media", "section": "launch-media-images",   "required": false, "exportRequired": false },

    "map":            { "tab": "launch-media", "section": "launch-media-pricing",  "required": false, "exportRequired": false },
    "scomRegularPrice":{ "tab": "launch-media","section": "launch-media-pricing",  "required": false, "exportRequired": false },
    "scomSalePrice":  { "tab": "launch-media", "section": "launch-media-pricing",  "required": false, "exportRequired": false },
    "promo":          { "tab": "launch-media", "section": "launch-media-pricing",  "required": false, "exportRequired": false },

    "standardShippingOverride": {
      "tab": "launch-media",
      "section": "launch-media-shipping",
      "required": false,
      "exportRequired": false
    },
    "expeditedOverrideShipping": {
      "tab": "launch-media",
      "section": "launch-media-shipping",
      "required": false,
      "exportRequired": false
    },

    "customMessage": {
      "tab": "launch-media",
      "section": "launch-media-message",
      "required": false,
      "exportRequired": false,
      "usage": "internal_only"
    },

    "totalInv":      { "tab": "core", "section": "core-header-meta", "required": false, "exportRequired": false, "usage": "display_only" },
    "warehouseInv":  { "tab": "core", "section": "core-header-meta", "required": false, "exportRequired": false, "usage": "display_only" },
    "storeInv":      { "tab": "core", "section": "core-header-meta", "required": false, "exportRequired": false, "usage": "display_only" }
  }
}
```

---

## 2. Machine-Readable Attribute Registry (JSON Schema)

This JSON Schema defines the structure for all 66 attributes with their metadata. Each attribute entry includes id, label, dataType, category, import/export behavior, and AI usage.

**✅ COMPLETE JSON FILE:** Download `ropi-attribute-registry.json` (68 attributes with full metadata)

### Registry Statistics

| Metric | Count |
| --- | --- |
| Total Attributes | 68 |
| descriptive | 25 |
| launch | 5 |
| pricing | 4 |
| sku_core | 10 |
| source_metadata | 5 |
| technical | 19 |
| Required for Export | 18 |
| AI Generated | 7 |

### 2.1 Registry Schema Definition

```json
{
  "$schema": "[https://json-schema.org/draft-07/schema#](https://json-schema.org/draft-07/schema#)",
  "title": "ROPI Attribute Registry",
  "description": "Machine-readable registry of all attributes used in the ROPI Product Document. Each entry defines metadata and behavior for a single attribute.",
  "type": "object",
  "additionalProperties": false,
  "properties": {
    "attributes": {
      "type": "array",
      "items": {
        "type": "object",
        "additionalProperties": false,
        "required": [
          "id",
          "label",
          "roHeader",
          "category",
          "dataType",
          "requiredForExport",
          "export",
          "import",
          "description"
        ],
        "properties": {
          "id": {
            "type": "string",
            "description": "Internal attribute id (e.g. primaryColor, ageGroup). Used as the key in product.attributes."
          },
          "label": {
            "type": "string",
            "description": "Human-readable label shown in UI."
          },
          "roHeader": {
            "type": "string",
            "description": "Column name used when importing/exporting to RetailOps or other sources."
          },
          "category": {
            "type": "string",
            "description": "Logical grouping.",
            "enum": ["descriptive", "launch", "pricing", "sku_core", "source_metadata", "technical"]
          },
          "dataType": {
            "type": "string",
            "description": "Value data type.",
            "enum": ["text", "longText", "number", "boolean", "select", "multiSelect", "money", "date"]
          },
          "requiredForExport": {
            "type": "boolean",
            "description": "If true, must be present before product can be exported."
          },
          "export": {
            "type": "boolean",
            "description": "If true, attribute participates in outbound exports."
          },
          "import": {
            "type": "boolean",
            "description": "If true, attribute can be populated via imports."
          },
          "aiGenerated": {
            "type": "boolean",
            "description": "If true, value is primarily generated by AI processes."
          },
          "description": {
            "type": "string",
            "description": "Short explanation of what this attribute controls."
          },
          "aiUsage": {
            "type": "array",
            "description": "How this attribute is used by AI systems.",
            "items": {
              "type": "string",
              "enum": ["templateSelection", "smartRules", "productDescriptions", "launchHub", "seo", "internalOnly"]
            }
          }
        }
      }
    }
  }
}
```

### 2.2 Example Attribute Entry

Use this format when adding entries to the registry:

```json
{
  "id": "primaryColor",
  "label": "Primary Color",
  "roHeader": "Primary Color",
  "category": "descriptive",
  "dataType": "select",
  "requiredForExport": true,
  "export": true,
  "import": true,
  "aiGenerated": false,
  "description": "Main visible color of the product used for navigation, filtering, and presentation.",
  "aiUsage": ["templateSelection", "smartRules", "productDescriptions", "launchHub"]
}
```

### 2.3 Full Attribute Array

**Note:** The complete 66-attribute array should be generated from the Human Attribute Table (Section 1 above). Each row in the table maps to one entry in the `attributes` array using the schema structure defined above.

**File location:** `BUILD_ROPI_AOSS_v1/02-schema/attribute-registry.json`

---

## 3. Attribute Domains (Allowed Values for Select/Multi-Select)

These are the valid options for each Select and Multi-Select attribute. Smart Rules and validation use these to enforce data quality.

### 3.1 Age Group

`Adult` | `Grade-School` | `Infant` | `Kids` | `Pre-School` | `Toddler`

### 3.2 Gender

`Men's` | `Women's` | `Unisex` | `Boys` | `Girls` | `Kids`

### 3.3 Website

[`shiekh.com`](http://shiekh.com) | [`Karmaloop.com`](http://Karmaloop.com) | [`mltd.com`](http://mltd.com) | [`sangremia.com`](http://sangremia.com) | [`plndr.com`](http://plndr.com) | [`fbrkclothing.com`](http://fbrkclothing.com) | [`Vnds.com`](http://Vnds.com) | [`Kazbah.com`](http://Kazbah.com) | [`Tiltedsole.com`](http://Tiltedsole.com) | `NOT FOR WEB`

### 3.4 League

`MLB` | `NBA` | `NCAA` | `NFL` | `NHL`

### 3.5 Fit

`Runs A Half Size Big` | `Runs A Half Size Small` | `Runs One Size Big` | `Runs One Size Small` | `True To Size`

### 3.6 Promo

`Allowed` | `Disallowed`

### 3.7 Cut Type

`Low` | `Mid` | `High`

### 3.8 Tax Class

`Taxable Goods` | `None`

### 3.9 Closure Type

`Buckle` | `Bungee` | `Button` | `Clasp` | `Clip` | `D-ring` | `Drawstring` | `Elastic` | `Flap` | `Hook-and-eye` | `Hook-and-loop` | `Kiss-lock` | `Lace-up` | `Lobster-claw` | `Magnet` | `No-closure` | `Pull-on` | `Self-tie` | `Slip-on` | `Snap` | `Toggle` | `Turn-lock` | `Velcro` | `Zip` | `Zipper` | `wrap around`

### 3.10 Platform Height

`Flat` | `Low 0-1"` | `Medium 1-2'` | `High 2-3"` | `Ultra High 3-4"`

### 3.11 Heel Type

`Block Heel` | `Cone Heel` | `Flat` | `Kitten Heel` | `Stiletto` | `Wedge Heel` | `Platform`

### 3.12 Shoe Height Map

`above-the-knee` | `ankle-high` | `high-top` | `knee-high` | `low-top` | `mid-calf` | `mid-top` | `thigh-high`

### 3.13 Heel Height

`1-2"` | `2-3"` | `3-4"` | `5"+`

### 3.14 Outsole Material

`Cork` | `Crepe` | `Fabric` | `Latex` | `Leather` | `Leather-and-Rubber` | `Lug-sole` | `Manmade` | `Rubber` | `Suede` | `Vibram` | `Wood`

### 3.15 Primary Color

`Beige` | `Black` | `Blue` | `Bronze` | `Brown` | `Clear` | `Cream` | `Cyan` | `Floral` | `Gold` | `Gray` | `Green` | `Grey` | `Metallic` | `Multi Color` | `Navy` | `None` | `Off-White` | `Orange` | `Pink` | `Print` | `Purple` | `Red` | `Silver` | `Transparent` | `Turquoise` | `Wheat` | `White` | `Yellow`

### 3.16 Material (Multi-Select)

`Acrylic` | `Canvas` | `Cotton` | `Cotton-Blend` | `Cotton-Rich` | `Crocodile` | `Dacron` | `Denim` | `Down` | `Egyptian-Cotton` | `Fabric` | `Fabric-And-Leather` | `Faux-Fur` | `Fleece` | `Fur` | `Gore-Tex` | `Kevlar` | `Kidskin` | `Lambskin` | `Leather` | `Linen` | `Linen-Blend` | `Lizard` | `Lurex` | `Lycra` | `Lycra Blend` | `Mercerized-Cotton` | `Mesh` | `Merino-Wool` | `Microfiber` | `Microsuede` | `Mohair` | `Nappa-Leather` | `Neoprene` | `Nubuck` | `Nylon` | `Ostrich` | `Patent-Leather` | `Pima-Cotton` | `Plain Weave` | `Plastic` | `Pleather` | `Polartec-Fleece` | `Poly-Cotton` | `Poly-Rayon` | `Polyester` | `Polyester-Blend` | `Polypropylene` | `Polyurethane` | `Pony` | `Rayon` | `Rayon-Blend` | `Rubber` | `Satin` | `Sequin` | `Shearling` | `Sheepskin` | `Sherpa` | `Shetland` | `Silk` | `Silk-Blend` | `Snakeskin` | `Spandex` | `Straw` | `Suede` | `Synthetic` | `Tencel` | `Thinsulate` | `Ultrasuede` | `Urethane` | `Velcro` | `Velvet` | `Vinyl` | `Viscose` | `Viscose-Rayon` | `Watersnake` | `Wool` | `Wool-Blend` | `Worsted-Wool`

### 3.17 Sports Team

**NFL:** Arizona Cardinals, Atlanta Falcons, Baltimore Ravens, Buffalo Bills, Carolina Panthers, Chicago Bears, Cincinnati Bengals, Cleveland Browns, Dallas Cowboys, Denver Broncos, Detroit Lions, Green Bay Packers, Houston Texans, Indianapolis Colts, Jacksonville Jaguars, Kansas City Chiefs, Las Vegas Raiders, Los Angeles Chargers, Los Angeles Rams, Miami Dolphins, Minnesota Vikings, New England Patriots, New Orleans Saints, New York Giants, New York Jets, Oakland Raiders, Philadelphia Eagles, Pittsburgh Steelers, San Francisco 49ers, Seattle Seahawks, Tampa Bay Buccaneers, Washington Redskins

**MLB:** Arizona Diamondbacks, Atlanta Braves, Baltimore Orioles, Boston Red Sox, Chicago Cubs, Chicago White Sox, Cincinnati Reds, Cleveland Indians, Colorado Rockies, Detroit Tigers, Houston Astros, Kansas City Royals, Los Angeles Angels, Los Angeles Dodgers, Miami Marlins, Milwaukee Brewers, Minnesota Twins, New York Mets, New York Yankees, Oakland Athletics, Philadelphia Phillies, Pittsburgh Pirates, San Diego Padres, San Francisco Giants, Seattle Mariners, St. Louis Cardinals, Tampa Bay Rays, Texas Rangers, Toronto Blue Jays, Washington Nationals

**NBA:** Atlanta Hawks, Boston Celtics, Brooklyn Nets, Charlotte Hornets, Chicago Bulls, Cleveland Cavaliers, Dallas Mavericks, Denver Nuggets, Detroit Pistons, Golden State Warriors, Houston Rockets, Indiana Pacers, Los Angeles Clippers, Los Angeles Lakers, Memphis Grizzlies, Miami Heat, Milwaukee Bucks, Minnesota Timberwolves, New Orleans Pelicans, New York Knicks, Oklahoma City Thunder, Orlando Magic, Philadelphia 76ers, Phoenix Suns, Portland Trail Blazers, San Antonio Spurs, San Diego Clippers, Toronto Raptors, Washington Wizards

**NHL:** Anaheim Ducks, Arizona Coyotes, Boston Bruins, Buffalo Sabres, Calgary Flames, Carolina Hurricanes, Chicago Blackhawks, Colorado Avalanche, Columbus Blue Jackets, Dallas Stars, Detroit Red Wings, Edmonton Oilers, Los Angeles Kings, Minnesota Wild, Montreal Canadiens, Nashville Predators, New Jersey Devils, New York Islanders, New York Rangers, Ottawa Senators, Philadelphia Flyers, Pittsburgh Penguins, San Jose Sharks, St. Louis Blues, Tampa Bay Lightning, Toronto Maple Leafs, Vancouver Canucks, Vegas Golden Knights, Washington Capitals, Winnipeg Jets

**NCAA:** USC Trojans, North Carolina Tar Heels

### 3.18 Collection Name

**Jordan:** Jordan 1, Jordan 2, Jordan 2/3, Jordan 3, Jordan 4, Jordan 5, Jordan 6, Jordan 7, Jordan 8, Jordan 9, Jordan 10, Jordan 11, Jordan 12, Jordan 13, Jordan 14, Jumpman MVP, Spizike, True Flight, Flight Origin 3, Flight Court, Zion 3, Luka, Luka 2, Luka 3, Tatum 3

**Nike Air Max:** Air Max, Air Max 90, Air Max 95, Air Max 97, Air Max 98, Air Max 270, Air Max 720, Air Max 2090, Air Max Exceed, Air Max Infinity, Air Max LTD 3, Air Max Motion 2, Max Aura 6, Stadium 90, VaporMax, Vomero 5

**Nike Other:** Air Force 1, Blazer Low, Blazer Mid, Cortez, Dn8, ReactX, Nike

**Vans:** Authentic, Era, Sk8-Hi, Slip-On, Comfi Cush, All Star

**New Balance:** New Balance, 247, 327, 550, 574, 1080, 1906R, 2002R, 9060, Fresh Foam, WRPD

**Adidas:** Adidas, Adifom, Adizero Aruku, Campus, Gazelle, Samba, Superstar, Yeezy Boost 350 V2, Yeezy Foam Runner, Yeezy Slides

**Puma:** Puma, Easy Rider, Fenty, Lamelo Ball, Speedcat, Suede

**Other:** Book 1, Dunk Low, Dunk High, Paul George 4

**Other:** Book 1, Dunk Low, Dunk High, Paul George 4

### 3.19 Drawing (Launch Calendar)

### drawing

- **Key:** `drawing`
- **Group:** Launch & Calendar
- **Type:** Enum (string)
- **Allowed values:**
    - `fcfs` — "First come, first serve"
    - `store_only` — "Store-only drawing"
    - `web_only` — "Web-only drawing"
    - `store_web` — "Store & web drawing"
    - `token_set` — "Token/drawing configured in Magento"

**Usage:**

- Displayed on the Product Editor **Launch** tab as a select field.
- Displayed on internal Launch Calendar cards and detail views to remind staff how the launch is being run (drawing vs FCFS, store vs web).
- Internal-only; not required for RetailOps export and not included in the Launch Calendar public feed API (Section 6.7).

**Notes:**

- Used as a reminder flag when a token-based drawing flow has been configured in Magento (`token_set`).
- Optional; default is `null` / no drawing info set.

### Search/Filter Flags

For each attribute, the registry may define flags like:

- `search`: whether this attribute may be included in full-text search.
- `filter`: whether this attribute can be used as a filter facet.
- `requiredForFilters`: whether it must be populated for high-quality filter UX.

The Search & Filter Settings module (`/app/settings/search`) must only allow facet configuration using attributes where `filter === true`. This prevents unsupported fields from being exposed as filters.

---

## 4. Full JSON Schema (Machine-Readable)

The complete JSON file with all 66 attributes and their domains is available at:

`BUILD_ROPI_AOSS_v1/02-schema/attribute-registry.json`

This file is used by:

- Import Engine (validation)
- Smart Rules Engine (domain checks)
- Product Editor (dropdown options)
- AI Describe Engine (allowed values)
- Export Engine (field mapping)

---

---

### Navigation

← Previous: [Attribute Domain Rules — JSON (Section 2.3)](Attribute%20Domain%20Rules%20%E2%80%94%20JSON%20(Section%202%203)%202b845ee1ec5a8056bc5cc7b29fce11df.md)

→ Next: [Import Engine — Row Schema (Section 3.1)](Import%20Engine%20%E2%80%94%20Row%20Schema%20(Section%203%201)%202b845ee1ec5a81b4afa9d1375e153900.md)

[← Back to ROPI AOSS Hub]({{https://www.notion.so/2b645ee1ec5a80e5b64fd04cea9e0d52}})

{

"path": "/Notion/link_69265bd0a644819182985a79b1bea511/fetch",

"args": "{"id":"2b845ee1ec5a807aacaac5d063ddbec7"}"

}

-->

[ropi-attribute-registry.json](ropi-attribute-registry.json)