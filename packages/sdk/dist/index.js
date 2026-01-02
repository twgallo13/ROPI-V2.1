'use strict';

var zod = require('zod');

// src/validators/productValidator.ts

// config/attributeRegistry.json
var attributeRegistry_default = {
  version: "1.1.0",
  attributes: [
    {
      attribute_id: "sku",
      label: "SKU",
      external_header: "SKU",
      category: "sku_core",
      data_type: "text",
      required_for_completion: true,
      required_for_export: true,
      import_required: false,
      ai_usage_notes: "Primary SKU / item id. Optional for import (MPN is primary identifier).",
      status: "active",
      exportable: true,
      internalOnly: false,
      requiredForExport: true
    },
    {
      attribute_id: "style_id",
      label: "Style ID",
      external_header: "Style ID",
      category: "sku_core",
      data_type: "text",
      required_for_completion: false,
      required_for_export: false,
      import_required: false,
      status: "active",
      exportable: true,
      internalOnly: false,
      requiredForExport: false
    },
    {
      attribute_id: "mpn",
      label: "MPN",
      external_header: "MPN",
      category: "sku_core",
      data_type: "text",
      required_for_completion: true,
      required_for_export: true,
      import_required: true,
      ai_usage_notes: "Manufacturer part number. Required for import (LP-2.1.2).",
      status: "active",
      exportable: true,
      internalOnly: false,
      requiredForExport: true,
      export: {
        key: "sku",
        targets: [
          "shopify"
        ]
      }
    },
    {
      attribute_id: "gtin",
      label: "GTIN/UPC",
      external_header: "GTIN",
      category: "identifiers",
      data_type: "text",
      required_for_completion: false,
      required_for_export: true,
      import_required: false,
      ai_usage_notes: "Global Trade Item Number. Required for many export channels",
      status: "active",
      exportable: true,
      internalOnly: false,
      requiredForExport: true,
      export: {
        key: "barcode",
        targets: [
          "shopify",
          "google",
          "amazon"
        ]
      }
    },
    {
      attribute_id: "name",
      label: "Product Name",
      external_header: "Name",
      category: "sku_core",
      data_type: "text",
      required_for_completion: true,
      required_for_export: true,
      import_required: false,
      status: "active",
      exportable: true,
      internalOnly: false,
      requiredForExport: true,
      export: {
        key: "title",
        targets: [
          "shopify",
          "google",
          "amazon"
        ]
      }
    },
    {
      attribute_id: "slug",
      label: "URL Slug",
      external_header: "URL Slug",
      category: "sku_core",
      data_type: "text",
      required_for_completion: false,
      required_for_export: true,
      import_required: false,
      ai_usage_notes: "Required for web export",
      status: "active",
      exportable: true,
      internalOnly: false,
      requiredForExport: true
    },
    {
      attribute_id: "brand",
      label: "Brand",
      external_header: "Brand",
      category: "sku_core",
      data_type: "text",
      required_for_completion: true,
      required_for_export: true,
      import_required: false,
      status: "active",
      exportable: true,
      internalOnly: false,
      requiredForExport: true,
      export: {
        key: "vendor",
        targets: [
          "shopify"
        ]
      }
    },
    {
      attribute_id: "category",
      label: "Category",
      external_header: "Category",
      category: "classification",
      data_type: "select",
      allowed_values: [
        "Footwear",
        "Apparel",
        "Accessories",
        "Athletic",
        "Casual",
        "Dress",
        "Boots",
        "Sandals",
        "Sneakers",
        "Slippers"
      ],
      required_for_completion: true,
      required_for_export: true,
      import_required: true,
      status: "active",
      exportable: true,
      internalOnly: false,
      requiredForExport: true,
      export: {
        key: "product_type",
        targets: [
          "shopify",
          "google"
        ]
      }
    },
    {
      attribute_id: "class",
      label: "Class",
      external_header: "Class",
      category: "classification",
      data_type: "select",
      allowed_values: [
        "Athletic",
        "Casual",
        "Formal",
        "Outdoor",
        "Performance",
        "Fashion",
        "Comfort",
        "Work",
        "Sport"
      ],
      required_for_completion: true,
      required_for_export: true,
      import_required: false,
      status: "active",
      exportable: true,
      internalOnly: false,
      requiredForExport: true
    },
    {
      attribute_id: "department",
      label: "Department",
      external_header: "Department",
      category: "classification",
      data_type: "select",
      allowed_values: [
        "Mens",
        "Womens",
        "Kids",
        "Unisex",
        "Boys",
        "Girls"
      ],
      required_for_completion: true,
      required_for_export: true,
      import_required: true,
      status: "active",
      exportable: true,
      internalOnly: false,
      requiredForExport: true,
      export: {
        key: "department",
        targets: [
          "shopify",
          "google",
          "amazon"
        ]
      }
    },
    {
      attribute_id: "website",
      label: "Websites (Multi-select)",
      external_header: "Websites",
      category: "sku_core",
      data_type: "multiSelect",
      allowed_values: [
        "shiekh.com",
        "Karmaloop.com",
        "mltd.com",
        "sangremia.com",
        "plndr.com",
        "fbrkclothing.com",
        "Vnds.com",
        "Kazbah.com",
        "Tiltedsole.com",
        "NOT FOR WEB"
      ],
      required_for_completion: true,
      required_for_export: true,
      import_required: false,
      ai_usage_notes: "Drives site-specific descriptions & AI",
      status: "active",
      exportable: true,
      internalOnly: false,
      requiredForExport: true
    },
    {
      attribute_id: "product_is_active",
      label: "Product Is Active",
      external_header: "Product Is Active",
      category: "sku_core",
      data_type: "boolean",
      required_for_completion: true,
      required_for_export: false,
      import_required: false,
      ai_usage_notes: "Internal only",
      status: "active",
      exportable: false,
      internalOnly: true,
      requiredForExport: false
    },
    {
      attribute_id: "status",
      label: "Status",
      external_header: "Status",
      category: "sku_core",
      data_type: "text",
      required_for_completion: false,
      required_for_export: false,
      import_required: false,
      status: "active",
      exportable: false,
      internalOnly: true,
      requiredForExport: false
    },
    {
      attribute_id: "launch_date",
      label: "Launch Date",
      external_header: "Launch Date",
      category: "lifecycle",
      data_type: "date",
      required_for_completion: false,
      required_for_export: false,
      import_required: false,
      status: "active",
      exportable: false,
      internalOnly: true,
      requiredForExport: false
    },
    {
      attribute_id: "kl_post_date",
      label: "KL Post Date",
      external_header: "KL Post Date",
      category: "lifecycle",
      data_type: "date",
      required_for_completion: false,
      required_for_export: false,
      import_required: false,
      status: "active",
      exportable: false,
      internalOnly: true,
      requiredForExport: false
    },
    {
      attribute_id: "family_sizing",
      label: "Family Sizing",
      external_header: "Family Sizing",
      category: "lifecycle",
      data_type: "boolean",
      aliases: [
        "family_sharing"
      ],
      required_for_completion: false,
      required_for_export: false,
      import_required: false,
      ai_usage_notes: "LP-product-ordering-import-completeness-0.1.0: Changed to boolean. Coercion: true='true'|'1'|'yes'|'y'|'on'|'allowed'; false='false'|'0'|'no'|'n'|'off'|'not allowed'|'disallowed' (case-insensitive).",
      status: "active",
      exportable: false,
      internalOnly: true,
      requiredForExport: false
    },
    {
      attribute_id: "hype",
      label: "HYPE",
      external_header: "HYPE",
      category: "lifecycle",
      data_type: "boolean",
      required_for_completion: false,
      required_for_export: false,
      import_required: false,
      status: "active",
      exportable: false,
      internalOnly: true,
      requiredForExport: false
    },
    {
      attribute_id: "first_received",
      label: "First Received",
      external_header: "First Received",
      category: "lifecycle",
      data_type: "date",
      required_for_completion: false,
      required_for_export: false,
      import_required: false,
      status: "active",
      exportable: false,
      internalOnly: true,
      requiredForExport: false
    },
    {
      attribute_id: "last_received",
      label: "Last Received",
      external_header: "Last Received",
      category: "lifecycle",
      data_type: "date",
      required_for_completion: false,
      required_for_export: false,
      import_required: false,
      status: "active",
      exportable: false,
      internalOnly: true,
      requiredForExport: false
    },
    {
      attribute_id: "height",
      label: "Height",
      external_header: "Height",
      category: "dimensions",
      data_type: "number",
      required_for_completion: false,
      required_for_export: false,
      import_required: false,
      ai_usage_notes: "For shipping/ops only",
      status: "active",
      exportable: true,
      internalOnly: false,
      requiredForExport: false,
      export: {
        key: "height",
        omitIfEmpty: true,
        targets: [
          "shopify"
        ]
      }
    },
    {
      attribute_id: "length",
      label: "Length",
      external_header: "Length",
      category: "dimensions",
      data_type: "number",
      required_for_completion: false,
      required_for_export: false,
      import_required: false,
      status: "active",
      exportable: true,
      internalOnly: false,
      requiredForExport: false,
      export: {
        key: "length",
        omitIfEmpty: true,
        targets: [
          "shopify"
        ]
      }
    },
    {
      attribute_id: "width",
      label: "Width",
      external_header: "Width",
      category: "dimensions",
      data_type: "number",
      required_for_completion: false,
      required_for_export: false,
      import_required: false,
      ai_usage_notes: "Package / dimension width (kept for shipping)",
      status: "active",
      exportable: true,
      internalOnly: false,
      requiredForExport: false,
      export: {
        key: "width",
        omitIfEmpty: true,
        targets: [
          "shopify"
        ]
      }
    },
    {
      attribute_id: "shoe_width",
      label: "Shoe Width",
      external_header: "Shoe Width",
      category: "measurements",
      data_type: "select",
      allowed_values: [
        "Narrow",
        "Standard",
        "Wide",
        "Extra Wide"
      ],
      required_for_completion: false,
      required_for_export: false,
      import_required: false,
      ai_usage_notes: "Shoe width / fit width for footwear. Added to avoid collision with package 'width'.",
      status: "active",
      exportable: true,
      internalOnly: false,
      requiredForExport: false
    },
    {
      attribute_id: "weight",
      label: "Weight (oz)",
      external_header: "Weight",
      category: "measurements",
      data_type: "number",
      required_for_completion: false,
      required_for_export: false,
      import_required: false,
      ai_usage_notes: "Product weight in ounces. Used for shipping calculations.",
      status: "active",
      exportable: true,
      internalOnly: false,
      requiredForExport: false,
      export: {
        key: "weight",
        omitIfEmpty: true,
        targets: [
          "shopify",
          "google"
        ]
      }
    },
    {
      attribute_id: "gender",
      label: "Gender",
      external_header: "Gender",
      category: "identity_demographic",
      data_type: "select",
      allowed_values: [
        "Men's",
        "Women's",
        "Unisex",
        "Boys",
        "Girls",
        "Kids"
      ],
      synonyms: [
        "sex",
        "target_gender"
      ],
      required_for_completion: true,
      required_for_export: true,
      import_required: true,
      ai_usage_notes: "Primary demographic for product targeting. Used in product descriptions and filtering.",
      status: "active",
      exportable: true,
      internalOnly: false,
      requiredForExport: true,
      export: {
        key: "gender",
        targets: [
          "shopify",
          "google",
          "amazon"
        ]
      }
    },
    {
      attribute_id: "age_group",
      label: "Age Group",
      external_header: "Age Group",
      category: "identity_demographic",
      data_type: "select",
      allowed_values: [
        "Adult",
        "Grade-School",
        "Infant",
        "Kids",
        "Pre-School",
        "Toddler"
      ],
      synonyms: [
        "ageGroup",
        "age-group"
      ],
      required_for_completion: true,
      required_for_export: true,
      import_required: false,
      ai_usage_notes: "Used for Google Shopping feed and age-appropriate product descriptions.",
      status: "active",
      exportable: true,
      internalOnly: false,
      requiredForExport: true,
      export: {
        key: "age_group",
        targets: [
          "google"
        ]
      }
    },
    {
      attribute_id: "primary_color",
      label: "Primary Color",
      external_header: "Primary Color",
      category: "color",
      data_type: "select",
      allowed_values: [
        "Beige",
        "Black",
        "Blue",
        "Bronze",
        "Brown",
        "Clear",
        "Cream",
        "Cyan",
        "Floral",
        "Gold",
        "Gray",
        "Green",
        "Grey",
        "Metallic",
        "Multi Color",
        "Navy",
        "None",
        "Off-White",
        "Orange",
        "Pink",
        "Print",
        "Purple",
        "Red",
        "Silver",
        "Transparent",
        "Turquoise",
        "Wheat",
        "White",
        "Yellow"
      ],
      synonyms: [
        "color",
        "main_color",
        "colour"
      ],
      required_for_completion: true,
      required_for_export: true,
      import_required: true,
      ai_usage_notes: "Primary visible color for search and filtering. Use standardized color names.",
      status: "active",
      exportable: true,
      internalOnly: false,
      requiredForExport: true
    },
    {
      attribute_id: "descriptive_color",
      label: "Descriptive Color",
      external_header: "Descriptive Color",
      category: "color",
      data_type: "text",
      synonyms: [
        "descriptiveColor"
      ],
      required_for_completion: true,
      required_for_export: true,
      import_required: false,
      ai_usage_notes: "Used for copy & AI (more descriptive color phrasing than primary_color).",
      status: "active",
      exportable: true,
      internalOnly: false,
      requiredForExport: true
    },
    {
      attribute_id: "material",
      label: "Material(s)",
      external_header: "Material",
      category: "materials_construction",
      data_type: "multiSelect",
      allowed_values: [
        "Acrylic",
        "Canvas",
        "Cotton",
        "Cotton-Blend",
        "Cotton-Rich",
        "Crocodile",
        "Dacron",
        "Denim",
        "Down",
        "Egyptian-Cotton",
        "Fabric",
        "Fabric-And-Leather",
        "Faux-Fur",
        "Fleece",
        "Fur",
        "Gore-Tex",
        "Kevlar",
        "Kidskin",
        "Lambskin",
        "Leather",
        "Linen",
        "Linen-Blend",
        "Lizard",
        "Lurex",
        "Lycra",
        "Lycra Blend",
        "Mercerized-Cotton",
        "Mesh",
        "Merino-Wool",
        "Microfiber",
        "Microsuede",
        "Mohair",
        "Nappa-Leather",
        "Neoprene",
        "Nubuck",
        "Nylon",
        "Ostrich",
        "Patent-Leather",
        "Pima-Cotton",
        "Plain Weave",
        "Plastic",
        "Pleather",
        "Polartec-Fleece",
        "Poly-Cotton",
        "Poly-Rayon",
        "Polyester",
        "Polyester-Blend",
        "Polypropylene",
        "Polyurethane",
        "Pony",
        "Rayon",
        "Rayon-Blend",
        "Rubber",
        "Satin",
        "Sequin",
        "Shearling",
        "Sheepskin",
        "Sherpa",
        "Shetland",
        "Silk",
        "Silk-Blend",
        "Snakeskin",
        "Spandex",
        "Straw",
        "Suede",
        "Synthetic",
        "Tencel",
        "Thinsulate",
        "Ultrasuede",
        "Urethane",
        "Velcro",
        "Velvet",
        "Vinyl",
        "Viscose",
        "Viscose-Rayon",
        "Watersnake",
        "Wool",
        "Wool-Blend",
        "Worsted-Wool"
      ],
      synonyms: [
        "upper_material",
        "fabric"
      ],
      required_for_completion: true,
      required_for_export: true,
      import_required: true,
      ai_usage_notes: "Primary material for the product. Important for product descriptions and care instructions.",
      status: "active",
      exportable: true,
      internalOnly: false,
      requiredForExport: true
    },
    {
      attribute_id: "outsole_material",
      label: "Outsole Material",
      external_header: "Outsole Material",
      category: "materials_construction",
      data_type: "select",
      allowed_values: [
        "Cork",
        "Crepe",
        "Fabric",
        "Latex",
        "Leather",
        "Leather-and-Rubber",
        "Lug-sole",
        "Manmade",
        "Rubber",
        "Suede",
        "Vibram",
        "Wood"
      ],
      required_for_completion: false,
      required_for_export: false,
      import_required: false,
      ai_usage_notes: "Optional; used when outsole differs from upper.",
      status: "active",
      exportable: true,
      internalOnly: false,
      requiredForExport: false
    },
    {
      attribute_id: "closure_type",
      label: "Closure Type",
      external_header: "Closure",
      category: "materials_construction",
      data_type: "select",
      allowed_values: [
        "Buckle",
        "Bungee",
        "Button",
        "Clasp",
        "Clip",
        "D-ring",
        "Drawstring",
        "Elastic",
        "Flap",
        "Hook-and-eye",
        "Hook-and-loop",
        "Kiss-lock",
        "Lace-up",
        "Lobster-claw",
        "Magnet",
        "No-closure",
        "Pull-on",
        "Self-tie",
        "Slip-on",
        "Snap",
        "Toggle",
        "Turn-lock",
        "Velcro",
        "Zip",
        "Zipper",
        "wrap around"
      ],
      synonyms: [
        "closure",
        "fastening"
      ],
      required_for_completion: false,
      required_for_export: false,
      import_required: false,
      status: "active",
      exportable: true,
      internalOnly: false,
      requiredForExport: false
    },
    {
      attribute_id: "cut_type",
      label: "Cut Type",
      external_header: "Cut Type",
      category: "materials_construction",
      data_type: "select",
      allowed_values: [
        "Low",
        "Mid",
        "High"
      ],
      required_for_completion: false,
      required_for_export: false,
      import_required: false,
      status: "active",
      exportable: true,
      internalOnly: false,
      requiredForExport: false
    },
    {
      attribute_id: "fit",
      label: "Fit",
      external_header: "Fit",
      category: "materials_construction",
      data_type: "select",
      allowed_values: [
        "Runs A Half Size Big",
        "Runs A Half Size Small",
        "Runs One Size Big",
        "Runs One Size Small",
        "True To Size"
      ],
      required_for_completion: true,
      required_for_export: true,
      import_required: false,
      ai_usage_notes: "Drives copy and Smart Rules",
      status: "active",
      exportable: true,
      internalOnly: false,
      requiredForExport: true
    },
    {
      attribute_id: "heel_height",
      label: "Heel Height",
      external_header: "Heel Height",
      category: "materials_construction",
      data_type: "select",
      allowed_values: [
        '1-2"',
        '2-3"',
        '3-4"',
        '5"+'
      ],
      required_for_completion: false,
      required_for_export: false,
      import_required: false,
      status: "active",
      exportable: true,
      internalOnly: false,
      requiredForExport: false
    },
    {
      attribute_id: "platform_height",
      label: "Platform Height",
      external_header: "Platform Height",
      category: "materials_construction",
      data_type: "select",
      allowed_values: [
        "Flat",
        'Low 0-1"',
        "Medium 1-2'",
        'High 2-3"',
        'Ultra High 3-4"'
      ],
      required_for_completion: false,
      required_for_export: false,
      import_required: false,
      status: "active",
      exportable: true,
      internalOnly: false,
      requiredForExport: false
    },
    {
      attribute_id: "heel_type",
      label: "Heel Type",
      external_header: "Heel Type",
      category: "materials_construction",
      data_type: "select",
      allowed_values: [
        "Block Heel",
        "Cone Heel",
        "Flat",
        "Kitten Heel",
        "Stiletto",
        "Wedge Heel",
        "Platform"
      ],
      required_for_completion: false,
      required_for_export: false,
      import_required: false,
      status: "active",
      exportable: true,
      internalOnly: false,
      requiredForExport: false
    },
    {
      attribute_id: "shoe_height_map",
      label: "Shoe Height Map",
      external_header: "Shoe Height Map",
      category: "materials_construction",
      data_type: "select",
      allowed_values: [
        "above-the-knee",
        "ankle-high",
        "high-top",
        "knee-high",
        "low-top",
        "mid-calf",
        "mid-top",
        "thigh-high"
      ],
      required_for_completion: false,
      required_for_export: false,
      import_required: false,
      status: "active",
      exportable: true,
      internalOnly: false,
      requiredForExport: false
    },
    {
      attribute_id: "made_in",
      label: "Made In",
      external_header: "Made In",
      category: "compliance",
      data_type: "text",
      synonyms: [
        "country_of_origin"
      ],
      required_for_completion: false,
      required_for_export: false,
      import_required: false,
      ai_usage_notes: "Country where the product was manufactured. Required for some export channels.",
      status: "active",
      exportable: true,
      internalOnly: false,
      requiredForExport: false
    },
    {
      attribute_id: "league",
      label: "League",
      external_header: "League",
      category: "sport_league",
      data_type: "select",
      allowed_values: [
        "MLB",
        "NBA",
        "NCAA",
        "NFL",
        "NHL"
      ],
      required_for_completion: false,
      required_for_export: false,
      import_required: false,
      status: "active",
      exportable: true,
      internalOnly: false,
      requiredForExport: false
    },
    {
      attribute_id: "sports_team",
      label: "Sports Team",
      external_header: "Sports Team",
      category: "sport_league",
      data_type: "text",
      required_for_completion: false,
      required_for_export: false,
      import_required: false,
      ai_usage_notes: "Required when league is major",
      status: "active",
      exportable: true,
      internalOnly: false,
      requiredForExport: false
    },
    {
      attribute_id: "collection_name",
      label: "Collection Name",
      external_header: "Collection Name",
      category: "product_flags",
      data_type: "text",
      required_for_completion: false,
      required_for_export: false,
      import_required: false,
      ai_usage_notes: "Optional launch flag",
      status: "active",
      exportable: true,
      internalOnly: false,
      requiredForExport: false
    },
    {
      attribute_id: "fast_fashion",
      label: "Fast Fashion",
      external_header: "Fast Fashion",
      category: "product_flags",
      data_type: "boolean",
      required_for_completion: false,
      required_for_export: false,
      import_required: false,
      status: "active",
      exportable: true,
      internalOnly: false,
      requiredForExport: false
    },
    {
      attribute_id: "tax_class",
      label: "Tax Class",
      external_header: "Tax Class",
      category: "product_flags",
      data_type: "select",
      allowed_values: [
        "Taxable Goods",
        "None"
      ],
      required_for_completion: false,
      required_for_export: true,
      import_required: false,
      ai_usage_notes: "Required for export; default Taxable Goods",
      status: "active",
      exportable: true,
      internalOnly: false,
      requiredForExport: true
    },
    {
      attribute_id: "description_shiekh",
      label: "Description \u2013 Shiekh.com",
      external_header: "Description Shiekh",
      category: "descriptions_sites",
      data_type: "longText",
      required_for_completion: false,
      required_for_export: true,
      import_required: false,
      ai_usage_notes: "Required if website includes shiekh.com",
      status: "active",
      exportable: true,
      internalOnly: false,
      requiredForExport: true
    },
    {
      attribute_id: "description_karmaloop",
      label: "Description \u2013 Karmaloop",
      external_header: "Description Karmaloop",
      category: "descriptions_sites",
      data_type: "longText",
      required_for_completion: false,
      required_for_export: true,
      import_required: false,
      ai_usage_notes: "Required if website includes Karmaloop",
      status: "active",
      exportable: true,
      internalOnly: false,
      requiredForExport: true
    },
    {
      attribute_id: "description_mltd",
      label: "Description \u2013 MLTD",
      external_header: "Description MLTD",
      category: "descriptions_sites",
      data_type: "longText",
      required_for_completion: false,
      required_for_export: true,
      import_required: false,
      status: "active",
      exportable: true,
      internalOnly: false,
      requiredForExport: true
    },
    {
      attribute_id: "description_sangremia",
      label: "Description \u2013 Sangremia",
      external_header: "Description Sangremia",
      category: "descriptions_sites",
      data_type: "longText",
      required_for_completion: false,
      required_for_export: true,
      import_required: false,
      status: "active",
      exportable: true,
      internalOnly: false,
      requiredForExport: true
    },
    {
      attribute_id: "meta_name",
      label: "Meta Name",
      external_header: "Meta Name",
      category: "seo",
      data_type: "text",
      required_for_completion: false,
      required_for_export: true,
      import_required: false,
      status: "active",
      exportable: true,
      internalOnly: false,
      requiredForExport: true
    },
    {
      attribute_id: "meta_description",
      label: "Meta Description",
      external_header: "Meta Description",
      category: "seo",
      data_type: "longText",
      required_for_completion: false,
      required_for_export: true,
      import_required: false,
      status: "active",
      exportable: true,
      internalOnly: false,
      requiredForExport: true
    },
    {
      attribute_id: "keywords",
      label: "Keywords",
      external_header: "Keywords",
      category: "seo",
      data_type: "multiSelect",
      allowed_values: [],
      required_for_completion: false,
      required_for_export: true,
      import_required: false,
      ai_usage_notes: "SEO keywords used for export",
      status: "active",
      exportable: true,
      internalOnly: false,
      requiredForExport: true
    },
    {
      attribute_id: "rics_long_desc",
      label: "RICS Long Description",
      external_header: "RICS Long Description",
      category: "rics_reference",
      data_type: "longText",
      required_for_completion: false,
      required_for_export: false,
      import_required: false,
      usage: "reference_only",
      status: "active",
      exportable: true,
      internalOnly: false,
      requiredForExport: false
    },
    {
      attribute_id: "rics_short_description",
      label: "RICS Short Description",
      external_header: "RICS Short Description",
      category: "rics_reference",
      data_type: "text",
      required_for_completion: false,
      required_for_export: false,
      import_required: false,
      usage: "reference_only",
      status: "active",
      exportable: true,
      internalOnly: false,
      requiredForExport: false
    },
    {
      attribute_id: "media_status",
      label: "Media Status",
      external_header: "Media Status",
      category: "launch_media",
      data_type: "text",
      required_for_completion: false,
      required_for_export: false,
      import_required: false,
      ai_usage_notes: "Tracks image readiness",
      status: "active",
      exportable: true,
      internalOnly: false,
      requiredForExport: false
    },
    {
      attribute_id: "hide_image_date",
      label: "Hide Image Date",
      external_header: "Hide Image Date",
      category: "launch_media",
      data_type: "date",
      required_for_completion: false,
      required_for_export: false,
      import_required: false,
      status: "active",
      exportable: true,
      internalOnly: false,
      requiredForExport: false
    },
    {
      attribute_id: "map",
      label: "MAP",
      external_header: "MAP",
      category: "launch_media_pricing",
      data_type: "money",
      required_for_completion: false,
      required_for_export: false,
      import_required: false,
      status: "active",
      exportable: true,
      internalOnly: false,
      requiredForExport: false
    },
    {
      attribute_id: "scom_regular_price",
      label: "SCOM Regular Price",
      external_header: "SCOM Regular Price",
      category: "launch_media_pricing",
      data_type: "money",
      required_for_completion: false,
      required_for_export: false,
      import_required: false,
      status: "active",
      exportable: true,
      internalOnly: false,
      requiredForExport: false
    },
    {
      attribute_id: "scom_sale_price",
      label: "SCOM Sale Price",
      external_header: "SCOM Sale Price",
      category: "launch_media_pricing",
      data_type: "money",
      required_for_completion: false,
      required_for_export: false,
      import_required: false,
      status: "active",
      exportable: true,
      internalOnly: false,
      requiredForExport: false
    },
    {
      attribute_id: "promo",
      label: "Promo",
      external_header: "Promo",
      category: "launch_media_pricing",
      data_type: "boolean",
      required_for_completion: false,
      required_for_export: false,
      import_required: false,
      ai_usage_notes: "LP-product-ordering-import-completeness-0.1.0: Changed to boolean. Coercion: true='true'|'1'|'yes'|'y'|'on'|'allowed' (Allowed\u2192true); false='false'|'0'|'no'|'n'|'off'|'not allowed'|'disallowed' (Not Allowed\u2192false, case-insensitive).",
      status: "active",
      exportable: true,
      internalOnly: false,
      requiredForExport: false
    },
    {
      attribute_id: "standard_shipping_override",
      label: "Standard Shipping Override",
      external_header: "Standard Shipping Override",
      category: "launch_media_shipping",
      data_type: "money",
      required_for_completion: false,
      required_for_export: false,
      import_required: false,
      status: "active",
      exportable: true,
      internalOnly: false,
      requiredForExport: false
    },
    {
      attribute_id: "expedited_override_shipping",
      label: "Expedited Override Shipping",
      external_header: "Expedited Override Shipping",
      category: "launch_media_shipping",
      data_type: "money",
      required_for_completion: false,
      required_for_export: false,
      import_required: false,
      status: "active",
      exportable: true,
      internalOnly: false,
      requiredForExport: false
    },
    {
      attribute_id: "custom_message",
      label: "Custom Message (Internal)",
      external_header: "Custom Message",
      category: "launch_media_message",
      data_type: "longText",
      required_for_completion: false,
      required_for_export: false,
      import_required: false,
      usage: "internal_only",
      status: "active",
      exportable: true,
      internalOnly: false,
      requiredForExport: false
    },
    {
      attribute_id: "total_inv",
      label: "Total Inv",
      external_header: "Total Inv",
      category: "core_header_meta",
      data_type: "number",
      required_for_completion: false,
      required_for_export: false,
      import_required: false,
      usage: "display_only",
      status: "active",
      exportable: true,
      internalOnly: false,
      requiredForExport: false
    },
    {
      attribute_id: "warehouse_inv",
      label: "WHS Inv",
      external_header: "WHS Inv",
      category: "core_header_meta",
      data_type: "number",
      required_for_completion: false,
      required_for_export: false,
      import_required: false,
      usage: "display_only",
      status: "active",
      exportable: true,
      internalOnly: false,
      requiredForExport: false
    },
    {
      attribute_id: "store_inv",
      label: "Store Inv",
      external_header: "Store Inv",
      category: "core_header_meta",
      data_type: "number",
      required_for_completion: false,
      required_for_export: false,
      import_required: false,
      usage: "display_only",
      status: "active",
      exportable: true,
      internalOnly: false,
      requiredForExport: false
    },
    {
      attribute_id: "pattern",
      label: "Pattern",
      external_header: "Pattern",
      category: "material_design",
      data_type: "text",
      required_for_completion: false,
      required_for_export: false,
      import_required: false,
      ai_usage_notes: "Pattern type (solid, striped, floral, geometric, etc.)",
      status: "active",
      exportable: true,
      internalOnly: false,
      requiredForExport: false
    },
    {
      attribute_id: "sustainable",
      label: "Sustainable",
      external_header: "Sustainable",
      category: "attributes",
      data_type: "boolean",
      required_for_completion: false,
      required_for_export: false,
      import_required: false,
      ai_usage_notes: "Indicates if product meets sustainability standards",
      status: "active",
      exportable: true,
      internalOnly: false,
      requiredForExport: false
    },
    {
      attribute_id: "waterproof",
      label: "Waterproof",
      external_header: "Waterproof",
      category: "material_performance",
      data_type: "boolean",
      required_for_completion: false,
      required_for_export: false,
      import_required: false,
      ai_usage_notes: "Indicates if product is waterproof",
      status: "active",
      exportable: true,
      internalOnly: false,
      requiredForExport: false
    }
  ]
};

// src/registry/index.ts
function getAttributeRegistry() {
  return attributeRegistry_default;
}
function getAttributes() {
  return attributeRegistry_default.attributes;
}
function getAttributeById(attributeId) {
  const normalizedId = attributeId.toLowerCase().replace(/[-\s]/g, "_");
  return getAttributes().find((attr) => {
    const attrNormalized = attr.attribute_id.toLowerCase().replace(/[-\s]/g, "_");
    return attrNormalized === normalizedId;
  });
}
function getAllowedValues(attributeId) {
  const attr = getAttributeById(attributeId);
  if (!attr || !attr.allowed_values || attr.allowed_values.length === 0) {
    return void 0;
  }
  return attr.allowed_values;
}
function allowsCustomValues(attributeId) {
  const attr = getAttributeById(attributeId);
  return attr?.allow_custom_values === true;
}
function validateAttributeDomain(attributeId, value) {
  const attr = getAttributeById(attributeId);
  if (!attr) {
    return {
      valid: true,
      attributeId,
      value,
      message: `Attribute '${attributeId}' not found in registry (skipping domain check)`
    };
  }
  const allowedValues = attr.allowed_values;
  if (!allowedValues || allowedValues.length === 0) {
    return {
      valid: true,
      attributeId,
      value
    };
  }
  if (attr.allow_custom_values) {
    return {
      valid: true,
      attributeId,
      value,
      allowedValues
    };
  }
  if (value === null || value === void 0 || value === "") {
    return {
      valid: true,
      // Empty values are allowed (required check is separate)
      attributeId,
      value,
      allowedValues
    };
  }
  if (Array.isArray(value)) {
    const invalidValues = value.filter((v) => {
      const strVal = String(v).trim();
      return !allowedValues.some((av) => av.toLowerCase() === strVal.toLowerCase());
    });
    if (invalidValues.length > 0) {
      return {
        valid: false,
        attributeId,
        value,
        allowedValues,
        message: `Invalid values for '${attributeId}': [${invalidValues.join(", ")}]. Allowed: [${allowedValues.join(", ")}]`
      };
    }
    return {
      valid: true,
      attributeId,
      value,
      allowedValues
    };
  }
  const strValue = String(value).trim();
  const isValid = allowedValues.some((av) => av.toLowerCase() === strValue.toLowerCase());
  if (!isValid) {
    return {
      valid: false,
      attributeId,
      value: strValue,
      allowedValues,
      message: `Invalid value '${strValue}' for '${attributeId}'. Allowed: [${allowedValues.join(", ")}]`
    };
  }
  return {
    valid: true,
    attributeId,
    value: strValue,
    allowedValues
  };
}
function validateAttributeDomains(attributes) {
  const results = [];
  for (const [key, value] of Object.entries(attributes)) {
    const result = validateAttributeDomain(key, value);
    if (!result.valid) {
      results.push(result);
    }
  }
  return results;
}
function getRegistryVersion() {
  return attributeRegistry_default.version;
}
function isExportable(attributeId) {
  const attr = getAttributeById(attributeId);
  if (!attr) return true;
  if (attr.internalOnly === true) return false;
  return attr.exportable !== false;
}
function isRequiredForExport(attributeId) {
  const attr = getAttributeById(attributeId);
  if (!attr) return false;
  return attr.requiredForExport === true || attr.required_for_export === true;
}
function isInternalOnly(attributeId) {
  const attr = getAttributeById(attributeId);
  return attr?.internalOnly === true;
}
function getExportMeta(attributeId) {
  const attr = getAttributeById(attributeId);
  return attr?.export;
}
function getExportableAttributes() {
  return getAttributes().filter((attr) => {
    if (attr.internalOnly === true) return false;
    return attr.exportable !== false;
  });
}
function getRequiredForExportAttributes() {
  return getAttributes().filter(
    (attr) => attr.requiredForExport === true || attr.required_for_export === true
  );
}
function getInternalOnlyAttributes() {
  return getAttributes().filter((attr) => attr.internalOnly === true);
}
function getAttributesForTarget(target) {
  return getAttributes().filter((attr) => {
    if (attr.internalOnly === true || attr.exportable === false) return false;
    if (!attr.export?.targets) return true;
    return attr.export.targets.includes(target);
  });
}

// src/validators/productValidator.ts
var ProductCoreSchema = zod.z.object({
  sku: zod.z.string().min(1, "SKU is required"),
  title: zod.z.string().min(1, "Title is required"),
  brand: zod.z.string().min(1, "Brand is required"),
  description: zod.z.string().optional(),
  status: zod.z.enum(["draft", "active", "archived"]),
  createdAt: zod.z.string().datetime(),
  updatedAt: zod.z.string().datetime()
  // TODO (AOSS): Add remaining core fields from Section 2.1 schema
});
var ProductAttributesSchema = zod.z.object({
  department: zod.z.string().optional(),
  class: zod.z.string().optional(),
  category: zod.z.string().optional(),
  subcategory: zod.z.string().optional(),
  gender: zod.z.string().optional(),
  ageGroup: zod.z.string().optional(),
  color: zod.z.string().optional(),
  size: zod.z.string().optional(),
  material: zod.z.string().optional()
  // TODO (AOSS): Add remaining attributes from Section 2.1 and Attribute Registry
}).catchall(zod.z.string().optional());
var ProductPricingSchema = zod.z.object({
  msrp: zod.z.number().positive().optional(),
  cost: zod.z.number().positive().optional(),
  retailPrice: zod.z.number().positive().optional(),
  currency: zod.z.string().optional()
  // TODO (AOSS): Add remaining pricing fields from Section 2.1 schema
}).optional();
var ProductInventorySchema = zod.z.object({
  quantity: zod.z.number().int().min(0).optional(),
  warehouse: zod.z.string().optional(),
  location: zod.z.string().optional()
  // TODO (AOSS): Add remaining inventory fields from Section 2.1 schema
}).optional();
var ProductMediaSchema = zod.z.object({
  images: zod.z.array(zod.z.string().url()).optional(),
  primaryImage: zod.z.string().url().optional(),
  videos: zod.z.array(zod.z.string().url()).optional()
  // TODO (AOSS): Add remaining media fields from Section 2.1 schema
}).optional();
var ProductSchema = zod.z.object({
  core: ProductCoreSchema,
  attributes: ProductAttributesSchema,
  pricing: ProductPricingSchema,
  inventory: ProductInventorySchema,
  media: ProductMediaSchema,
  // Metadata for import/normalization tracking
  _meta: zod.z.object({
    source: zod.z.string().optional(),
    importedAt: zod.z.string().datetime().optional(),
    normalizedAt: zod.z.string().datetime().optional(),
    validatedAt: zod.z.string().datetime().optional()
  }).optional()
  // TODO (AOSS): Add remaining top-level fields from Section 2.1 schema
});
function validateProduct(input) {
  return ProductSchema.parse(input);
}
function safeValidateProduct(input) {
  return ProductSchema.safeParse(input);
}
function validateProductWithDomains(input) {
  const schemaResult = ProductSchema.safeParse(input);
  if (!schemaResult.success) {
    return {
      success: false,
      schemaErrors: schemaResult.error,
      domainErrors: []
    };
  }
  const product = schemaResult.data;
  const domainErrors = validateAttributeDomains(product.attributes || {});
  if (domainErrors.length > 0) {
    return {
      success: false,
      data: product,
      domainErrors
    };
  }
  return {
    success: true,
    data: product,
    domainErrors: []
  };
}
function validateAttributesOnly(attributes) {
  return validateAttributeDomains(attributes);
}
var AttributeDataTypeSchema = zod.z.enum([
  "string",
  "number",
  "boolean",
  "date",
  "array",
  "object"
]);
var AttributeConstraintSchema = zod.z.object({
  type: zod.z.enum(["required", "min", "max", "pattern", "enum", "range"]),
  value: zod.z.any().optional(),
  message: zod.z.string().optional()
  // TODO (AOSS): Add remaining constraint types from Section 2.2
});
var AttributeDefinitionSchema = zod.z.object({
  key: zod.z.string().min(1, "Attribute key is required"),
  label: zod.z.string().min(1, "Attribute label is required"),
  dataType: AttributeDataTypeSchema,
  required: zod.z.boolean().optional(),
  defaultValue: zod.z.any().optional(),
  allowedValues: zod.z.array(zod.z.string()).optional(),
  constraints: zod.z.array(AttributeConstraintSchema).optional(),
  description: zod.z.string().optional(),
  category: zod.z.string().optional()
  // TODO (AOSS): Add remaining fields from Section 2.2 schema
});
var AttributeValueSchema = zod.z.object({
  key: zod.z.string().min(1, "Attribute key is required"),
  value: zod.z.any(),
  // Required - the actual attribute value
  source: zod.z.string().optional(),
  confidence: zod.z.number().min(0).max(1).optional(),
  validatedAt: zod.z.string().datetime().optional()
  // TODO (AOSS): Add remaining value metadata from Section 2.2
}).strict();
var AttributeRegistrySchema = zod.z.object({
  attributes: zod.z.array(AttributeDefinitionSchema),
  version: zod.z.string().optional(),
  updatedAt: zod.z.string().optional()
  // TODO (AOSS): Add remaining registry metadata from Section 2.2
});
function validateAttributeDefinition(input) {
  return AttributeDefinitionSchema.parse(input);
}
function validateAttributeValue(input) {
  return AttributeValueSchema.parse(input);
}
function validateAttributeRegistry(input) {
  return AttributeRegistrySchema.parse(input);
}
function validateAttributes(input) {
  return zod.z.array(AttributeDefinitionSchema).parse(input);
}
function safeValidateAttributeDefinition(input) {
  return AttributeDefinitionSchema.safeParse(input);
}
var ExportTargetSchema = zod.z.enum(["shopify", "google", "amazon", "magento", "csv"]);
var RegistryExportMetaSchema = zod.z.object({
  /** Column key/header for export */
  key: zod.z.string().optional(),
  /** Omit from export if value is empty */
  omitIfEmpty: zod.z.boolean().optional(),
  /** Target channels */
  targets: zod.z.array(ExportTargetSchema).optional()
}).strict();
var SynonymsSchema = zod.z.union([
  zod.z.array(zod.z.string()),
  zod.z.record(zod.z.string(), zod.z.string()),
  zod.z.array(zod.z.object({ alias: zod.z.string(), canonical: zod.z.string() }))
]).optional();
var RegistryAttributeSchema = zod.z.object({
  // Required fields
  attribute_id: zod.z.string().min(1).regex(/^[a-z0-9-_.]+$/, "attribute_id must be lowercase with only a-z, 0-9, -, _, ."),
  label: zod.z.string().min(1),
  // Optional core fields
  external_header: zod.z.string().optional(),
  category: zod.z.string().optional(),
  data_type: zod.z.enum(["text", "select", "multiSelect", "boolean", "number", "date", "currency", "json", "longText", "string", "money"]).optional(),
  allowed_values: zod.z.array(zod.z.string()).optional(),
  allow_custom_values: zod.z.boolean().optional(),
  aliases: zod.z.array(zod.z.string()).optional(),
  synonyms: SynonymsSchema,
  // Completion/import flags
  required_for_completion: zod.z.boolean().optional(),
  required_for_export: zod.z.boolean().optional(),
  import_required: zod.z.boolean().optional(),
  import_strict: zod.z.boolean().optional(),
  // Metadata
  ai_usage_notes: zod.z.string().optional(),
  status: zod.z.enum(["active", "deprecated", "disabled"]).optional(),
  // LP-smart-rules-registry-1.0.0: Export control fields
  /** Whether this attribute can be included in exports */
  exportable: zod.z.boolean().optional(),
  /** Whether this attribute must have a value for export */
  requiredForExport: zod.z.boolean().optional(),
  /** Whether this attribute is internal-only */
  internalOnly: zod.z.boolean().optional(),
  /** Channel-specific export configuration */
  export: RegistryExportMetaSchema.optional()
});
var CanonicalRegistrySchema = zod.z.object({
  version: zod.z.string().regex(/^\d+\.\d+\.\d+$/, "version must be semver format (e.g., 1.0.0)"),
  attributes: zod.z.array(RegistryAttributeSchema).min(1, "Registry must have at least one attribute")
});
function validateRegistryAttribute(input) {
  return RegistryAttributeSchema.parse(input);
}
function safeValidateRegistryAttribute(input) {
  return RegistryAttributeSchema.safeParse(input);
}
function validateCanonicalRegistry(input) {
  return CanonicalRegistrySchema.parse(input);
}
function safeValidateCanonicalRegistry(input) {
  return CanonicalRegistrySchema.safeParse(input);
}
function validateExportControlConsistency(attr) {
  if (attr.internalOnly === true && attr.exportable === true) {
    return {
      valid: false,
      message: `Attribute '${attr.attribute_id}': internalOnly=true is inconsistent with exportable=true`
    };
  }
  if (attr.requiredForExport === true && attr.exportable === false) {
    return {
      valid: false,
      message: `Attribute '${attr.attribute_id}': requiredForExport=true is inconsistent with exportable=false`
    };
  }
  return { valid: true };
}
function validateRegistryExportConsistency(registry) {
  const errors = [];
  for (const attr of registry.attributes) {
    const result = validateExportControlConsistency(attr);
    if (!result.valid && result.message) {
      errors.push(result.message);
    }
  }
  return errors;
}

// src/validators/importValidator.ts
function createIssue(code, severity, field, message, value) {
  return { code, severity, field, message, value };
}
function validateMPN(mpn) {
  const issues = [];
  if (!mpn) {
    issues.push(
      createIssue(
        "MISSING_REQUIRED_FIELD",
        "error",
        "mpn",
        "MPN (Manufacturer Part Number) is required"
      )
    );
    return issues;
  }
  if (!/^[A-Z0-9\-_]+$/i.test(mpn)) {
    issues.push(
      createIssue(
        "INVALID_FORMAT",
        "error",
        "mpn",
        "MPN must contain only alphanumeric characters, hyphens, and underscores",
        mpn
      )
    );
  }
  if (mpn.length < 2 || mpn.length > 50) {
    issues.push(
      createIssue(
        "INVALID_VALUE",
        "error",
        "mpn",
        "MPN must be between 2 and 50 characters",
        mpn
      )
    );
  }
  return issues;
}
function validateSKU(sku) {
  const issues = [];
  if (!sku) {
    return issues;
  }
  if (!/^[A-Z0-9\-_]+$/i.test(sku)) {
    issues.push(
      createIssue(
        "INVALID_FORMAT",
        "error",
        "sku",
        "SKU must contain only alphanumeric characters, hyphens, and underscores",
        sku
      )
    );
  }
  if (sku.length < 3 || sku.length > 50) {
    issues.push(
      createIssue(
        "INVALID_VALUE",
        "error",
        "sku",
        "SKU must be between 3 and 50 characters",
        sku
      )
    );
  }
  return issues;
}
function validateName(name, title) {
  const issues = [];
  const productName = name || title;
  if (!productName) {
    return issues;
  }
  if (productName.length < 5) {
    issues.push(
      createIssue(
        "INVALID_VALUE",
        "warning",
        name ? "name" : "title",
        "Product name is very short (less than 5 characters)",
        productName
      )
    );
  }
  if (productName.length > 200) {
    issues.push(
      createIssue(
        "INVALID_VALUE",
        "error",
        name ? "name" : "title",
        "Product name is too long (max 200 characters)",
        productName
      )
    );
  }
  return issues;
}
function validateBrand(brand) {
  const issues = [];
  if (!brand) {
    return issues;
  }
  if (brand.length > 100) {
    issues.push(
      createIssue(
        "INVALID_VALUE",
        "error",
        "brand",
        "Brand is too long (max 100 characters)",
        brand
      )
    );
  }
  return issues;
}
function validatePricing(normalized) {
  const issues = [];
  if (normalized.msrp !== void 0) {
    if (typeof normalized.msrp !== "number" || normalized.msrp < 0) {
      issues.push(
        createIssue(
          "INVALID_PRICE",
          "error",
          "msrp",
          "MSRP must be a positive number",
          String(normalized.msrp)
        )
      );
    }
  }
  if (normalized.cost !== void 0) {
    if (typeof normalized.cost !== "number" || normalized.cost < 0) {
      issues.push(
        createIssue(
          "INVALID_PRICE",
          "error",
          "cost",
          "Cost must be a positive number",
          String(normalized.cost)
        )
      );
    }
  }
  if (normalized.retailPrice !== void 0) {
    if (typeof normalized.retailPrice !== "number" || normalized.retailPrice < 0) {
      issues.push(
        createIssue(
          "INVALID_PRICE",
          "error",
          "retailPrice",
          "Retail price must be a positive number",
          String(normalized.retailPrice)
        )
      );
    }
    if (normalized.msrp && normalized.retailPrice > normalized.msrp) {
      issues.push(
        createIssue(
          "INVALID_VALUE",
          "warning",
          "retailPrice",
          "Retail price is higher than MSRP",
          String(normalized.retailPrice)
        )
      );
    }
    if (normalized.cost && normalized.retailPrice < normalized.cost) {
      issues.push(
        createIssue(
          "INVALID_VALUE",
          "warning",
          "retailPrice",
          "Retail price is lower than cost (negative margin)",
          String(normalized.retailPrice)
        )
      );
    }
  }
  return issues;
}
function validateInventory(normalized) {
  const issues = [];
  if (normalized.quantity !== void 0) {
    if (typeof normalized.quantity !== "number" || normalized.quantity < 0 || !Number.isInteger(normalized.quantity)) {
      issues.push(
        createIssue(
          "INVALID_QUANTITY",
          "error",
          "quantity",
          "Quantity must be a non-negative integer",
          String(normalized.quantity)
        )
      );
    }
  }
  return issues;
}
function validateDates(normalized) {
  const issues = [];
  if (normalized.firstReceived !== void 0) {
    try {
      const date = new Date(normalized.firstReceived);
      if (isNaN(date.getTime())) {
        issues.push(
          createIssue(
            "INVALID_DATE",
            "error",
            "firstReceived",
            "Invalid date format",
            normalized.firstReceived
          )
        );
      } else if (date > /* @__PURE__ */ new Date()) {
        issues.push(
          createIssue(
            "INVALID_DATE",
            "warning",
            "firstReceived",
            "First received date is in the future",
            normalized.firstReceived
          )
        );
      }
    } catch {
      issues.push(
        createIssue(
          "INVALID_DATE",
          "error",
          "firstReceived",
          "Invalid date format",
          normalized.firstReceived
        )
      );
    }
  }
  if (normalized.launchDate !== void 0) {
    try {
      const date = new Date(normalized.launchDate);
      if (isNaN(date.getTime())) {
        issues.push(
          createIssue(
            "INVALID_DATE",
            "error",
            "launchDate",
            "Invalid date format",
            normalized.launchDate
          )
        );
      }
    } catch {
      issues.push(
        createIssue(
          "INVALID_DATE",
          "error",
          "launchDate",
          "Invalid date format",
          normalized.launchDate
        )
      );
    }
  }
  return issues;
}
function validateMedia(normalized) {
  const issues = [];
  if (normalized.primaryImage !== void 0) {
    try {
      new URL(normalized.primaryImage);
    } catch {
      issues.push(
        createIssue(
          "INVALID_FORMAT",
          "error",
          "primaryImage",
          "Invalid URL format",
          normalized.primaryImage
        )
      );
    }
  }
  if (normalized.images !== void 0 && Array.isArray(normalized.images)) {
    for (let i = 0; i < normalized.images.length; i++) {
      try {
        new URL(normalized.images[i]);
      } catch {
        issues.push(
          createIssue(
            "INVALID_FORMAT",
            "error",
            `images[${i}]`,
            "Invalid URL format",
            normalized.images[i]
          )
        );
      }
    }
  }
  return issues;
}
function validateImportRow(normalized) {
  const errors = [];
  const warnings = [];
  const mpnIssues = validateMPN(normalized.mpn);
  const skuIssues = validateSKU(normalized.sku);
  const nameIssues = validateName(normalized.name, normalized.title);
  const brandIssues = validateBrand(normalized.brand);
  const pricingIssues = validatePricing(normalized);
  const inventoryIssues = validateInventory(normalized);
  const dateIssues = validateDates(normalized);
  const mediaIssues = validateMedia(normalized);
  const allIssues = [
    ...mpnIssues,
    ...skuIssues,
    ...nameIssues,
    ...brandIssues,
    ...pricingIssues,
    ...inventoryIssues,
    ...dateIssues,
    ...mediaIssues
  ];
  for (const issue of allIssues) {
    if (issue.severity === "error") {
      errors.push(issue);
    } else {
      warnings.push(issue);
    }
  }
  return {
    isValid: errors.length === 0,
    errors,
    warnings
  };
}
function canProcessRow(validation) {
  return validation.isValid;
}

// src/normalization/legacyToRegistryMap.ts
var LEGACY_TO_REGISTRY = {
  // ======================================================================
  // SKU / Identifiers (category: sku_core, identifiers)
  // ======================================================================
  "mpn": "mpn",
  "MPN": "mpn",
  "manufacturerPartNumber": "mpn",
  "sku": "sku",
  "SKU": "sku",
  "name": "name",
  "productName": "name",
  "title": "name",
  // legacy alias
  "brand": "brand",
  "styleId": "style_id",
  "style_id": "style_id",
  "gtin": "gtin",
  "upc": "gtin",
  "slug": "slug",
  // ======================================================================
  // Colors (category: color)
  // Registry: primary_color, descriptive_color
  // ======================================================================
  "color": "primary_color",
  "primaryColor": "primary_color",
  "primary_color": "primary_color",
  "mainColor": "primary_color",
  "main_color": "primary_color",
  "descriptiveColor": "descriptive_color",
  "descriptive_color": "descriptive_color",
  // ======================================================================
  // RICS Reference Fields (category: rics_reference)
  // Note: Registry only has rics_long_desc, rics_short_description
  // ricsCategory and ricsColor are not in registry - kept for legacy CSV import
  // ======================================================================
  "ricsLongDesc": "rics_long_desc",
  "ricsLongDescription": "rics_long_desc",
  "rics_long_desc": "rics_long_desc",
  "ricsShortDesc": "rics_short_description",
  "ricsShortDescription": "rics_short_description",
  "rics_short_description": "rics_short_description",
  // Legacy RICS fields not in registry - map to themselves (unmapped reference)
  "ricsCategory": "rics_category",
  "rics_category": "rics_category",
  "ricsColor": "rics_color",
  "rics_color": "rics_color",
  // ======================================================================
  // Classification (category: classification)
  // ======================================================================
  "category": "category",
  "class": "class",
  "department": "department",
  "subcategory": "subcategory",
  // ======================================================================
  // Identity / Demographic (category: identity_demographic)
  // ======================================================================
  "gender": "gender",
  "ageGroup": "age_group",
  "age_group": "age_group",
  // ======================================================================
  // Materials & Construction (category: materials_construction)
  // ======================================================================
  "material": "material",
  "closureType": "closure_type",
  "closure_type": "closure_type",
  "cutType": "cut_type",
  "cut_type": "cut_type",
  // LP-1.4.3 aliases
  "heelHeight": "heel_height",
  "heel_height": "heel_height",
  "platformHeight": "platform_height",
  "platform_height": "platform_height",
  "hideImageUntilDate": "hide_image_date",
  "hide_image_date": "hide_image_date",
  "drawing": "drawing",
  // ======================================================================
  // Sizing / Measurements (category: measurements)
  // ======================================================================
  "size": "size",
  "shoeWidth": "shoe_width",
  "shoe_width": "shoe_width",
  "weight": "weight",
  "height": "height",
  "width": "width",
  "length": "length",
  // ======================================================================
  // Lifecycle / Dates (category: lifecycle)
  // ======================================================================
  "launchDate": "launch_date",
  "launch_date": "launch_date",
  "firstReceived": "first_received",
  "first_received": "first_received",
  "lastReceived": "last_received",
  "last_received": "last_received",
  // ======================================================================
  // Pricing
  // Note: msrp, cost, retailPrice kept as-is (not in registry as separate attributes)
  // ======================================================================
  "msrp": "msrp",
  "cost": "cost",
  "retailPrice": "retail_price",
  "retail_price": "retail_price",
  // ======================================================================
  // Inventory / Logistics
  // ======================================================================
  "quantity": "quantity",
  "warehouse": "warehouse",
  "location": "location",
  // ======================================================================
  // Media
  // ======================================================================
  "images": "images",
  "primaryImage": "primary_image",
  "primary_image": "primary_image",
  // ======================================================================
  // Website / Assignment (category: sku_core)
  // ======================================================================
  "website": "website",
  "websites": "website",
  // ======================================================================
  // Descriptions (category: copy)
  // ======================================================================
  "description": "description",
  "shortDescription": "short_description",
  "short_description": "short_description",
  "longDescription": "long_description",
  "long_description": "long_description"
};
var REGISTRY_TO_LEGACY = Object.entries(LEGACY_TO_REGISTRY).reduce((acc, [legacy, registry]) => {
  if (!acc[registry]) {
    acc[registry] = legacy;
  }
  return acc;
}, {});

// config/import-corrections.json
var import_corrections_default = {
  _version: "1.0.0",
  _description: "LP-importer-mapping-recon-1.4.0: Explicit typo corrections and canonicalization mappings for CSV imports. All lookups are case-insensitive. Values map to canonical Attribute Registry allowed_values.",
  material: {
    pholyester: "Polyester",
    polyster: "Polyester",
    ployester: "Polyester",
    polester: "Polyester",
    lether: "Leather",
    leater: "Leather",
    canvass: "Canvas",
    suade: "Suede",
    syntetic: "Synthetic"
  },
  age_group: {
    adults: "Adult",
    "adult's": "Adult",
    adlut: "Adult",
    kids: "Kids",
    kid: "Kids",
    children: "Kids",
    toddlers: "Toddler",
    infants: "Infant",
    baby: "Infant",
    babies: "Infant",
    "pre-school": "Pre-School",
    preschool: "Pre-School",
    "grade school": "Grade-School",
    gradeschool: "Grade-School",
    "grade-school": "Grade-School"
  },
  class: {
    sandle: "Casual",
    sandal: "Casual",
    sandals: "Casual",
    sneaker: "Athletic",
    sneakers: "Athletic",
    boot: "Outdoor",
    boots: "Outdoor",
    slipper: "Comfort",
    slippers: "Comfort",
    slide: "Casual",
    slides: "Casual",
    atheletic: "Athletic",
    athelete: "Athletic",
    athetic: "Athletic",
    cassual: "Casual",
    casuall: "Casual"
  },
  category: {
    slides: "Sandals",
    slide: "Sandals",
    sandle: "Sandals",
    sandal: "Sandals",
    sneaker: "Sneakers",
    boot: "Boots",
    slipper: "Slippers",
    footware: "Footwear",
    apperal: "Apparel",
    accessory: "Accessories"
  },
  gender: {
    male: "men's",
    m: "men's",
    men: "men's",
    man: "men's",
    mens: "men's",
    female: "women's",
    f: "women's",
    women: "women's",
    woman: "women's",
    womens: "women's",
    unisex: "unisex",
    u: "unisex",
    boy: "boys",
    girl: "girls"
  },
  department: {
    footware: "Footwear",
    shoes: "Footwear",
    clothing: "Clothing",
    clothes: "Clothing",
    accessory: "Accessories"
  }
};

// src/normalization/importNormalizer.ts
var IMPORT_CORRECTIONS = import_corrections_default;
var MULTI_SELECT_FIELDS = ["material", "website", "websites", "features", "images"];
function canonicalizeValue(value, targetField) {
  if (!value || typeof value !== "string") return value;
  const corrections = IMPORT_CORRECTIONS[targetField];
  if (!corrections) return value;
  const lowerValue = value.toLowerCase().trim();
  const canonical = corrections[lowerValue];
  if (canonical) {
    console.debug(`[LP-1.4.0] Canonicalized ${targetField}: "${value}" \u2192 "${canonical}"`);
    return canonical;
  }
  return value;
}
function toMultiSelectArray(value) {
  if (value === void 0 || value === null || value === "") return [];
  if (Array.isArray(value)) {
    return value.map((v) => String(v).trim()).filter((v) => v.length > 0);
  }
  const strValue = String(value);
  if (strValue.includes("|") || strValue.includes(",") || strValue.includes(";")) {
    return strValue.split(/[|,;]/).map((s) => s.trim()).filter((s) => s.length > 0);
  }
  return [strValue.trim()];
}
function isMultiSelectField(targetField) {
  return MULTI_SELECT_FIELDS.includes(targetField.toLowerCase());
}
function normalizeTargetFieldToRegistry(targetField) {
  if (!targetField) return targetField;
  const mapped = LEGACY_TO_REGISTRY[targetField];
  if (mapped) {
    return mapped;
  }
  return targetField;
}
function sourceColumnMatchesHeader(sourceColumn, header) {
  const normalizedHeader = header.toLowerCase().trim();
  if (Array.isArray(sourceColumn)) {
    return sourceColumn.some((alias) => alias.toLowerCase().trim() === normalizedHeader);
  }
  return sourceColumn.toLowerCase().trim() === normalizedHeader;
}
var DEFAULT_COLUMN_MAPPINGS = [
  // ======================================================================
  // Core Identifiers (category: sku_core)
  // MPN is required (LP-2.1.0), SKU is optional
  // ======================================================================
  { sourceColumn: ["MPN", "mpn", "Manufacturer Part Number"], targetField: "mpn", required: true, transform: "trim" },
  { sourceColumn: ["SKU", "sku", "Style"], targetField: "sku", required: false, transform: "trim" },
  { sourceColumn: ["Product Name", "Name", "name", "Title"], targetField: "name", required: false, transform: "trim" },
  { sourceColumn: ["Brand", "brand"], targetField: "brand", required: false, transform: "trim" },
  { sourceColumn: ["Description", "description"], targetField: "description", transform: "trim" },
  { sourceColumn: ["Style ID", "styleId", "style_id"], targetField: "style_id", transform: "trim" },
  { sourceColumn: ["GTIN", "gtin", "UPC", "upc"], targetField: "gtin", transform: "trim" },
  // ======================================================================
  // Classification (category: classification)
  // ======================================================================
  { sourceColumn: ["Department", "department"], targetField: "department", transform: "trim" },
  { sourceColumn: ["Class", "class"], targetField: "class", transform: "trim" },
  { sourceColumn: ["Category", "category"], targetField: "category", transform: "trim" },
  { sourceColumn: ["Subcategory", "subcategory"], targetField: "subcategory", transform: "trim" },
  // ======================================================================
  // Site Assignment (category: sku_core - multiSelect)
  // LP-1.4.0: website is multiSelect, will be converted to array
  // ======================================================================
  { sourceColumn: ["Website", "website", "Websites", "websites", "Site"], targetField: "website", transform: "trim" },
  // ======================================================================
  // Identity / Demographic (category: identity_demographic)
  // ======================================================================
  { sourceColumn: ["Gender", "gender"], targetField: "gender", transform: "lowercase" },
  { sourceColumn: ["Age Group", "ageGroup", "age_group"], targetField: "age_group", transform: "trim" },
  // ======================================================================
  // Colors (category: color)
  // Registry: primary_color, descriptive_color
  // ======================================================================
  { sourceColumn: ["Color", "Primary Color", "color", "primary_color"], targetField: "primary_color", transform: "trim" },
  { sourceColumn: ["Descriptive Color", "DescriptiveColor", "descriptive_color"], targetField: "descriptive_color", transform: "trim" },
  // ======================================================================
  // Materials & Construction (category: materials_construction)
  // LP-1.4.0: material is multiSelect, will be converted to array
  // ======================================================================
  { sourceColumn: ["Material", "material", "Materials"], targetField: "material", transform: "trim" },
  { sourceColumn: ["Closure Type", "closure", "closure_type"], targetField: "closure_type", transform: "trim" },
  { sourceColumn: ["Cut Type", "cut_type"], targetField: "cut_type", transform: "trim" },
  { sourceColumn: ["Fit", "fit"], targetField: "fit", transform: "trim" },
  // ======================================================================
  // Additional fields added in LP-1.4.3
  // ======================================================================
  { sourceColumn: ["Drawing", "drawing"], targetField: "drawing", transform: "trim" },
  { sourceColumn: ["Hide Image Until Date", "Hide Image Date", "hide_image_until_date", "hide_image_date"], targetField: "hide_image_date", transform: "date" },
  { sourceColumn: ["Heel Height", "heelHeight", "heel_height"], targetField: "heel_height", transform: "trim" },
  { sourceColumn: ["Platform Height", "platformHeight", "platform_height"], targetField: "platform_height", transform: "trim" },
  // SCOM Pricing (RetailOps)
  { sourceColumn: ["SCOM Regular Price", "scom_regular_price"], targetField: "scom_regular_price", transform: "number" },
  { sourceColumn: ["SCOM Sale Price", "scom_sale_price"], targetField: "scom_sale_price", transform: "number" },
  // ======================================================================
  // Sports & Collections (category: classification)
  // LP-1.4.0: Added sports_team and collection_name mappings
  // ======================================================================
  { sourceColumn: ["Sports Team", "sports_team", "Team"], targetField: "sports_team", transform: "trim" },
  { sourceColumn: ["Collection Name", "collection_name", "Collection"], targetField: "collection_name", transform: "trim" },
  { sourceColumn: ["League", "league"], targetField: "league", transform: "trim" },
  // ======================================================================
  // Sizing / Measurements (category: measurements)
  // ======================================================================
  { sourceColumn: ["Size", "size"], targetField: "size", transform: "trim" },
  { sourceColumn: ["Shoe Width", "shoe_width"], targetField: "shoe_width", transform: "trim" },
  { sourceColumn: ["Weight", "weight"], targetField: "weight", transform: "number" },
  // ======================================================================
  // RICS Reference Fields (category: rics_reference)
  // Note: rics_category and rics_color are reference fields (not in registry)
  // ======================================================================
  { sourceColumn: ["RICS Category", "rics_category", "ricsCategory"], targetField: "rics_category", transform: "trim" },
  { sourceColumn: ["RICS Color", "rics_color", "ricsColor"], targetField: "rics_color", transform: "trim" },
  { sourceColumn: ["RICS Long Description", "RICS Long Desc", "rics_long_desc"], targetField: "rics_long_desc", transform: "trim" },
  { sourceColumn: ["RICS Short Description", "RICS Short Desc", "rics_short_description"], targetField: "rics_short_description", transform: "trim" },
  // ======================================================================
  // Pricing
  // ======================================================================
  { sourceColumn: ["MSRP", "msrp"], targetField: "msrp", transform: "number" },
  { sourceColumn: ["Cost", "cost"], targetField: "cost", transform: "number" },
  { sourceColumn: ["Retail Price", "retailPrice", "retail_price"], targetField: "retail_price", transform: "number" },
  { sourceColumn: ["Currency", "currency"], targetField: "currency", transform: "uppercase", defaultValue: "USD" },
  // ======================================================================
  // Inventory / Logistics
  // ======================================================================
  { sourceColumn: ["Quantity", "Qty", "quantity"], targetField: "quantity", transform: "number", defaultValue: 0 },
  { sourceColumn: ["Warehouse", "warehouse"], targetField: "warehouse", transform: "trim" },
  { sourceColumn: ["Location", "location"], targetField: "location", transform: "trim" },
  // ======================================================================
  // Lifecycle / Dates (category: lifecycle)
  // ======================================================================
  { sourceColumn: ["First Received", "firstReceived", "first_received"], targetField: "first_received", transform: "date" },
  { sourceColumn: ["Launch Date", "launchDate", "launch_date"], targetField: "launch_date", transform: "date" },
  // ======================================================================
  // Media
  // ======================================================================
  { sourceColumn: ["Images", "images", "image_urls"], targetField: "images", transform: "array" },
  { sourceColumn: ["Primary Image", "primaryImage", "primary_image"], targetField: "primary_image", transform: "trim" }
];
function applyTransform(value, transform) {
  if (value === null || value === void 0 || value === "") {
    return void 0;
  }
  const strValue = String(value);
  switch (transform) {
    case "trim":
      return strValue.trim();
    case "uppercase":
      return strValue.trim().toUpperCase();
    case "lowercase":
      return strValue.trim().toLowerCase();
    case "boolean": {
      const normalized = strValue.trim().toLowerCase();
      const trueValues = ["true", "1", "yes", "y", "on", "allowed"];
      const falseValues = ["false", "0", "no", "n", "off", "not allowed", "disallowed"];
      if (trueValues.includes(normalized)) {
        return true;
      }
      if (falseValues.includes(normalized)) {
        return false;
      }
      return void 0;
    }
    case "number": {
      const cleaned = strValue.replace(/[$,\s]/g, "");
      const num = parseFloat(cleaned);
      return isNaN(num) ? void 0 : num;
    }
    case "date": {
      const s = strValue.trim();
      const isoMatch = s.match(/^(\d{4})-(\d{2})-(\d{2})$/);
      if (isoMatch) {
        const [, y, m, d] = isoMatch;
        return `${y}-${m}-${d}`;
      }
      const mdy = s.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2,4})$/);
      if (mdy) {
        let [, mm, dd, yy] = mdy;
        mm = mm.padStart(2, "0");
        dd = dd.padStart(2, "0");
        if (yy.length === 2) {
          const n = parseInt(yy, 10);
          const full = n >= 70 ? 1900 + n : 2e3 + n;
          yy = String(full);
        }
        return `${yy}-${mm}-${dd}`;
      }
      const parsed = new Date(s);
      if (!isNaN(parsed.getTime())) {
        const y = parsed.getFullYear();
        const mm = String(parsed.getMonth() + 1).padStart(2, "0");
        const dd = String(parsed.getDate()).padStart(2, "0");
        return `${y}-${mm}-${dd}`;
      }
      return void 0;
    }
    case "array": {
      return strValue.split(/[|,;]/).map((s) => s.trim()).filter((s) => s.length > 0);
    }
    default:
      return strValue.trim();
  }
}
function findSourceValue(sourceColumns, sourceColumn) {
  if (Array.isArray(sourceColumn)) {
    for (const alias of sourceColumn) {
      if (sourceColumns[alias] !== void 0) {
        return sourceColumns[alias];
      }
      const key2 = Object.keys(sourceColumns).find(
        (k) => k.toLowerCase().trim() === alias.toLowerCase().trim()
      );
      if (key2 && sourceColumns[key2] !== void 0) {
        return sourceColumns[key2];
      }
    }
    return void 0;
  }
  if (sourceColumns[sourceColumn] !== void 0) {
    return sourceColumns[sourceColumn];
  }
  const key = Object.keys(sourceColumns).find(
    (k) => k.toLowerCase().trim() === sourceColumn.toLowerCase().trim()
  );
  return key ? sourceColumns[key] : void 0;
}
function normalizeImportRow(sourceColumns, mappings = DEFAULT_COLUMN_MAPPINGS) {
  const normalized = {};
  for (const mapping of mappings) {
    const sourceValue = findSourceValue(sourceColumns, mapping.sourceColumn);
    let normalizedValue = applyTransform(sourceValue, mapping.transform);
    if (normalizedValue === void 0 && mapping.defaultValue !== void 0) {
      normalizedValue = mapping.defaultValue;
    }
    if (normalizedValue !== void 0) {
      const canonicalTarget = normalizeTargetFieldToRegistry(mapping.targetField);
      if (typeof normalizedValue === "string") {
        normalizedValue = canonicalizeValue(normalizedValue, canonicalTarget);
      }
      if (isMultiSelectField(canonicalTarget)) {
        const arrayValue = toMultiSelectArray(normalizedValue);
        normalizedValue = arrayValue.map((item) => canonicalizeValue(item, canonicalTarget));
      }
      normalized[canonicalTarget] = normalizedValue;
    }
  }
  return normalized;
}
function deriveProductId({ mpn, sku }) {
  const source = mpn || sku;
  if (!source) {
    return void 0;
  }
  return String(source).toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}
function isEmptyRow(sourceColumns) {
  return Object.values(sourceColumns).every(
    (value) => value === null || value === void 0 || value === ""
  );
}
function validateRequiredFields(normalized, mappings = DEFAULT_COLUMN_MAPPINGS) {
  const missingFields = /* @__PURE__ */ new Set();
  for (const mapping of mappings) {
    if (mapping.required) {
      const canonicalTarget = normalizeTargetFieldToRegistry(mapping.targetField);
      const value = normalized[canonicalTarget];
      if (value === void 0 || value === null || value === "") {
        missingFields.add(canonicalTarget);
      }
    }
  }
  return Array.from(missingFields);
}

// ../../node_modules/.pnpm/uuid@9.0.1/node_modules/uuid/dist/esm-browser/rng.js
var getRandomValues;
var rnds8 = new Uint8Array(16);
function rng() {
  if (!getRandomValues) {
    getRandomValues = typeof crypto !== "undefined" && crypto.getRandomValues && crypto.getRandomValues.bind(crypto);
    if (!getRandomValues) {
      throw new Error("crypto.getRandomValues() not supported. See https://github.com/uuidjs/uuid#getrandomvalues-not-supported");
    }
  }
  return getRandomValues(rnds8);
}

// ../../node_modules/.pnpm/uuid@9.0.1/node_modules/uuid/dist/esm-browser/stringify.js
var byteToHex = [];
for (let i = 0; i < 256; ++i) {
  byteToHex.push((i + 256).toString(16).slice(1));
}
function unsafeStringify(arr, offset = 0) {
  return byteToHex[arr[offset + 0]] + byteToHex[arr[offset + 1]] + byteToHex[arr[offset + 2]] + byteToHex[arr[offset + 3]] + "-" + byteToHex[arr[offset + 4]] + byteToHex[arr[offset + 5]] + "-" + byteToHex[arr[offset + 6]] + byteToHex[arr[offset + 7]] + "-" + byteToHex[arr[offset + 8]] + byteToHex[arr[offset + 9]] + "-" + byteToHex[arr[offset + 10]] + byteToHex[arr[offset + 11]] + byteToHex[arr[offset + 12]] + byteToHex[arr[offset + 13]] + byteToHex[arr[offset + 14]] + byteToHex[arr[offset + 15]];
}

// ../../node_modules/.pnpm/uuid@9.0.1/node_modules/uuid/dist/esm-browser/native.js
var randomUUID = typeof crypto !== "undefined" && crypto.randomUUID && crypto.randomUUID.bind(crypto);
var native_default = {
  randomUUID
};

// ../../node_modules/.pnpm/uuid@9.0.1/node_modules/uuid/dist/esm-browser/v4.js
function v4(options, buf, offset) {
  if (native_default.randomUUID && !buf && !options) {
    return native_default.randomUUID();
  }
  options = options || {};
  const rnds = options.random || (options.rng || rng)();
  rnds[6] = rnds[6] & 15 | 64;
  rnds[8] = rnds[8] & 63 | 128;
  if (buf) {
    offset = offset || 0;
    for (let i = 0; i < 16; ++i) {
      buf[offset + i] = rnds[i];
    }
    return buf;
  }
  return unsafeStringify(rnds);
}
var v4_default = v4;

// src/builders/importRowBuilder.ts
function buildImportRow(sourceColumns, options) {
  const { batchId, lineNumber, userId, mappings = DEFAULT_COLUMN_MAPPINGS, skipEmpty = true } = options;
  if (skipEmpty && isEmptyRow(sourceColumns)) {
    return null;
  }
  const rowId = v4_default();
  const normalized = normalizeImportRow(sourceColumns, mappings);
  let validation = validateImportRow(normalized);
  const missingFields = validateRequiredFields(normalized, mappings);
  if (missingFields.length > 0) {
    validation.errors.push({
      code: "MISSING_REQUIRED_FIELD",
      severity: "error",
      field: "required_fields",
      message: `Missing required fields: ${missingFields.join(", ")}`
    });
    validation.isValid = false;
  }
  const productId = deriveProductId({ mpn: normalized.mpn, sku: normalized.sku });
  const meta = {
    rowId,
    batchId,
    productId,
    importedAt: (/* @__PURE__ */ new Date()).toISOString(),
    importedBy: userId,
    status: validation.isValid ? "pending" : "failed",
    ...validation.isValid ? {} : { errorMessage: validation.errors.map((e) => e.message).join("; ") }
  };
  const row = {
    rowId,
    batchId,
    source: {
      columns: sourceColumns,
      lineNumber
    },
    normalized,
    validation,
    meta
  };
  return row;
}
function convertClientMappings(clientMappings) {
  return Object.entries(clientMappings).map(([sourceColumn, targetField]) => ({
    sourceColumn,
    targetField,
    transform: "trim"
  }));
}
function buildImportRows(csvData, batchId, userId, mappingsOrClientMappings) {
  const rows = [];
  let mappings;
  if (mappingsOrClientMappings) {
    if (Array.isArray(mappingsOrClientMappings)) {
      mappings = mappingsOrClientMappings;
    } else if (typeof mappingsOrClientMappings === "object" && Object.keys(mappingsOrClientMappings).length > 0) {
      mappings = convertClientMappings(mappingsOrClientMappings);
    }
  }
  for (let i = 0; i < csvData.length; i++) {
    const lineNumber = i + 2;
    const sourceColumns = csvData[i];
    const row = buildImportRow(sourceColumns, {
      batchId,
      lineNumber,
      userId,
      mappings,
      skipEmpty: true
    });
    if (row) {
      rows.push(row);
    }
  }
  return rows;
}
var productJsonSchema = {
  "$id": "https://ropi-aoss/schemas/product.schema.json",
  "$schema": "http://json-schema.org/draft-07/schema#",
  "title": "AOSS Product",
  "description": "Canonical product representation for Nike men's footwear (MVP). This schema defines the internal product structure used throughout AOSS.",
  "type": "object",
  "properties": {
    "id": { "type": "string", "description": "Internal UUID or Firestore document ID", "minLength": 1 },
    "sku": { "type": "string", "description": "Internal SKU identifier", "minLength": 1 },
    "styleCode": { "type": "string", "description": "Product style code (e.g., 'DZ5485-410')", "pattern": "^[A-Z0-9]+-[A-Z0-9]+$" },
    "brand": { "type": "string", "enum": ["NIKE", "JORDAN"], "description": "Product brand (MVP: Nike men's footwear)" },
    "gender": { "type": "string", "enum": ["MEN"], "description": "Target gender (MVP: Men only)" },
    "category": { "type": "string", "enum": ["FOOTWEAR"], "description": "Product category (MVP: Footwear only)" },
    "class": { "type": "string", "description": "Product class (e.g., 'BASKETBALL', 'RUNNING', 'LIFESTYLE')", "minLength": 1 },
    "colorPrimary": { "type": "string", "description": "Primary color name", "minLength": 1 },
    "colorSecondary": { "type": "string", "description": "Secondary color name (optional)" },
    "sizeScale": { "type": "string", "enum": ["MENS_US"], "description": "Size scale system (MVP: Men's US only)" },
    "msrp": { "type": "number", "description": "Manufacturer's suggested retail price", "minimum": 0 },
    "price": { "type": "number", "description": "Selling price", "minimum": 0 },
    "launchDate": { "type": "string", "format": "date-time", "description": "Product launch date (ISO 8601 format)" },
    "season": { "type": "string", "description": "Product season (e.g., 'FA24', 'SP25')" },
    "status": { "type": "string", "enum": ["DRAFT", "READY_FOR_EXPORT", "DISCONTINUED"], "description": "Product lifecycle status" },
    "images": {
      "type": "array",
      "description": "Product images",
      "items": {
        "type": "object",
        "properties": {
          "url": { "type": "string", "format": "uri", "description": "Image URL" },
          "alt": { "type": "string", "description": "Alt text for accessibility" },
          "isPrimary": { "type": "boolean", "description": "Whether this is the primary/hero image" }
        },
        "required": ["url"],
        "additionalProperties": false
      }
    },
    "flags": {
      "type": "object",
      "description": "Product flags for special handling",
      "properties": {
        "isOutlet": { "type": "boolean", "description": "Product is outlet/clearance" },
        "isOnlineExclusive": { "type": "boolean", "description": "Product is online-only" },
        "isLimited": { "type": "boolean", "description": "Product is limited edition" }
      },
      "additionalProperties": false
    },
    "meta": {
      "type": "object",
      "description": "Free-form key/value metadata",
      "additionalProperties": { "type": "string" }
    }
  },
  "required": ["id", "sku", "styleCode", "brand", "gender", "category", "class", "colorPrimary", "sizeScale", "msrp", "price", "launchDate", "status", "images"],
  "additionalProperties": false
};
var ProductImageSchema = zod.z.object({
  url: zod.z.string().url("Image URL must be a valid URL"),
  alt: zod.z.string().optional(),
  isPrimary: zod.z.boolean().optional()
});
var ProductFlagsSchema = zod.z.object({
  isOutlet: zod.z.boolean().optional(),
  isOnlineExclusive: zod.z.boolean().optional(),
  isLimited: zod.z.boolean().optional()
});
var ProductMetaSchema = zod.z.record(zod.z.string(), zod.z.string());
var CoreProductSchema = zod.z.object({
  id: zod.z.string().min(1, "ID is required"),
  sku: zod.z.string().min(1, "SKU is required"),
  styleCode: zod.z.string().regex(/^[A-Z0-9]+-[A-Z0-9]+$/, "Style code must match pattern like DZ5485-410"),
  brand: zod.z.enum(["NIKE", "JORDAN"]),
  gender: zod.z.enum(["MEN"]),
  category: zod.z.enum(["FOOTWEAR"]),
  class: zod.z.string().min(1, "Class is required"),
  colorPrimary: zod.z.string().min(1, "Primary color is required"),
  colorSecondary: zod.z.string().optional(),
  sizeScale: zod.z.enum(["MENS_US"]),
  msrp: zod.z.number().min(0, "MSRP must be non-negative"),
  price: zod.z.number().min(0, "Price must be non-negative"),
  launchDate: zod.z.string().datetime("Launch date must be ISO 8601 format"),
  season: zod.z.string().optional(),
  status: zod.z.enum(["DRAFT", "READY_FOR_EXPORT", "DISCONTINUED"]),
  images: zod.z.array(ProductImageSchema),
  flags: ProductFlagsSchema.optional(),
  meta: ProductMetaSchema.optional()
});
function validateCoreProduct(input) {
  const result = CoreProductSchema.safeParse(input);
  if (result.success) {
    return { ok: true, value: result.data };
  }
  const errors = result.error.issues.map((issue) => {
    const path = issue.path.join(".");
    return path ? `${path}: ${issue.message}` : issue.message;
  });
  return { ok: false, errors };
}
function validateCoreProductOrThrow(input) {
  return CoreProductSchema.parse(input);
}
var importRowJsonSchema = {
  "$id": "https://ropi-aoss/schemas/import-row.schema.json",
  "$schema": "http://json-schema.org/draft-07/schema#",
  "title": "AOSS Import Row",
  "description": "Normalized representation of a single CSV row from the Import Engine. This schema represents an already-parsed row (after raw CSV \u2192 structured row, before full Product mapping).",
  "type": "object",
  "properties": {
    "source": { "type": "string", "enum": ["SUPPLIER", "RETAILOPS_EXPORT", "MANUAL"], "description": "Origin of the import data" },
    "rowId": { "type": "string", "description": "Unique identifier for this row within the import batch", "minLength": 1 },
    "originalRowNumber": { "type": "integer", "description": "Line number in the original CSV file (1-indexed)", "minimum": 1 },
    "styleCode": { "type": "string", "description": "Product style code from supplier data", "minLength": 1 },
    "brand": { "type": "string", "description": "Brand name as provided by supplier", "minLength": 1 },
    "color": { "type": "string", "description": "Color description from supplier data", "minLength": 1 },
    "size": { "type": "string", "description": "Size value from supplier data", "minLength": 1 },
    "upc": { "type": "string", "description": "Universal Product Code (barcode)", "minLength": 1 },
    "raw": { "type": "object", "description": "Snapshot of the original supplier fields (column name \u2192 value)", "additionalProperties": true },
    "normalizedGender": { "type": "string", "description": "Gender value normalized to AOSS standard (e.g., 'MEN', 'WOMEN', 'UNISEX')" },
    "normalizedCategory": { "type": "string", "description": "Category value normalized to AOSS standard (e.g., 'FOOTWEAR', 'APPAREL')" },
    "normalizedSizeScale": { "type": "string", "description": "Size scale normalized to AOSS standard (e.g., 'MENS_US', 'WOMENS_US')" },
    "notes": { "type": "string", "description": "Optional notes or comments about this import row" }
  },
  "required": ["source", "rowId", "originalRowNumber", "styleCode", "brand", "color", "size", "upc", "raw"],
  "additionalProperties": false
};
var ImportRowRawSchema = zod.z.record(zod.z.string(), zod.z.unknown());
var ImportRowSchema = zod.z.object({
  source: zod.z.enum(["SUPPLIER", "RETAILOPS_EXPORT", "MANUAL"]),
  rowId: zod.z.string().min(1, "Row ID is required"),
  originalRowNumber: zod.z.number().int().min(1, "Original row number must be a positive integer"),
  styleCode: zod.z.string().min(1, "Style code is required"),
  brand: zod.z.string().min(1, "Brand is required"),
  color: zod.z.string().min(1, "Color is required"),
  size: zod.z.string().min(1, "Size is required"),
  upc: zod.z.string().min(1, "UPC is required"),
  raw: ImportRowRawSchema,
  normalizedGender: zod.z.string().optional(),
  normalizedCategory: zod.z.string().optional(),
  normalizedSizeScale: zod.z.string().optional(),
  notes: zod.z.string().optional()
});
function validateImportRowSchema(input) {
  const result = ImportRowSchema.safeParse(input);
  if (result.success) {
    return { ok: true, value: result.data };
  }
  const errors = result.error.issues.map((issue) => {
    const path = issue.path.join(".");
    return path ? `${path}: ${issue.message}` : issue.message;
  });
  return { ok: false, errors };
}
function validateImportRowSchemaOrThrow(input) {
  return ImportRowSchema.parse(input);
}

// src/export/retailOps.ts
var retailOpsExportMapping = {
  columns: [
    {
      name: "SKU",
      source: "sku",
      required: true,
      description: "Internal SKU identifier"
    },
    {
      name: "Product Name",
      source: "",
      required: true,
      default: "",
      transform: "buildProductName",
      // TODO: CoreProduct doesn't have a title field. Build from brand + class + colorPrimary.
      description: "Product display name built from brand, class, and color"
    },
    {
      name: "Brand",
      source: "brand",
      required: true,
      description: "Product brand (NIKE or JORDAN)"
    },
    {
      name: "Description",
      source: "",
      required: false,
      default: "",
      // TODO: CoreProduct doesn't have a description field. Could use meta.description if available.
      description: "Product description (not available in CoreProduct)"
    },
    {
      name: "Department",
      source: "gender",
      required: false,
      transform: "mapGenderToDepartment",
      description: "Maps gender to department (MEN -> Mens)"
    },
    {
      name: "Category",
      source: "category",
      required: false,
      description: "Product category (FOOTWEAR)"
    },
    {
      name: "Color",
      source: "colorPrimary",
      required: false,
      description: "Primary color name"
    },
    {
      name: "Size",
      source: "",
      required: false,
      default: "",
      // TODO: CoreProduct represents a style, not a size-specific SKU. Size not available at product level.
      description: "Size value (not available at product level)"
    },
    {
      name: "MSRP",
      source: "msrp",
      required: true,
      transform: "formatCurrency",
      description: "Manufacturers suggested retail price"
    },
    {
      name: "Cost",
      source: "",
      required: false,
      default: "",
      // TODO: CoreProduct doesn't have a cost field. Requires inventory/procurement data.
      description: "Product cost (not available in CoreProduct)"
    },
    {
      name: "Retail Price",
      source: "price",
      required: true,
      transform: "formatCurrency",
      description: "Selling price"
    },
    {
      name: "Currency",
      source: "",
      required: false,
      default: "USD",
      description: "Currency code. Defaults to USD for MVP."
    },
    {
      name: "Quantity",
      source: "",
      required: false,
      default: "",
      // TODO: CoreProduct doesn't have inventory quantity. Requires inventory data.
      description: "Inventory quantity (not available in CoreProduct)"
    },
    {
      name: "Warehouse",
      source: "",
      required: false,
      default: "",
      // TODO: CoreProduct doesn't have warehouse info. Requires inventory data.
      description: "Warehouse location (not available in CoreProduct)"
    },
    {
      name: "First Received",
      source: "",
      required: false,
      default: "",
      // TODO: CoreProduct doesn't have first received date. Requires inventory data.
      description: "First received date (not available in CoreProduct)"
    },
    {
      name: "Launch Date",
      source: "launchDate",
      required: false,
      transform: "formatDate",
      description: "Product launch date"
    },
    {
      name: "Images",
      source: "images",
      required: false,
      transform: "joinImages",
      description: "Pipe-separated list of image URLs"
    },
    {
      name: "Primary Image",
      source: "images",
      required: false,
      transform: "getPrimaryImage",
      description: "Primary/hero image URL"
    }
  ]
};
function getRetailOpsHeaderRow() {
  return retailOpsExportMapping.columns.map((col) => col.name);
}
function buildProductName(product) {
  const parts = [product.brand, product.class, "-", product.colorPrimary].filter(Boolean);
  return parts.join(" ").trim();
}
function mapGenderToDepartment(gender) {
  const mapping = {
    MEN: "Mens",
    WOMEN: "Womens",
    UNISEX: "Unisex",
    KIDS: "Kids"
  };
  return mapping[gender] || gender;
}
function formatCurrency(value) {
  if (typeof value !== "number" || isNaN(value)) {
    return "";
  }
  return value.toFixed(2);
}
function formatDate(isoDate) {
  if (!isoDate) {
    return "";
  }
  try {
    const date = new Date(isoDate);
    if (isNaN(date.getTime())) {
      return "";
    }
    return date.toISOString().split("T")[0];
  } catch {
    return "";
  }
}
function joinImages(images) {
  if (!Array.isArray(images) || images.length === 0) {
    return "";
  }
  return images.map((img) => img.url).join("|");
}
function getPrimaryImage(images) {
  if (!Array.isArray(images) || images.length === 0) {
    return "";
  }
  const primary = images.find((img) => img.isPrimary);
  return primary ? primary.url : images[0]?.url || "";
}
function resolvePath(obj, path) {
  if (!path) {
    return void 0;
  }
  const parts = path.split(".");
  let current = obj;
  for (const part of parts) {
    if (current === null || current === void 0) {
      return void 0;
    }
    if (typeof current === "object") {
      current = current[part];
    } else {
      return void 0;
    }
  }
  return current;
}
function applyTransform2(transformName, value, product) {
  switch (transformName) {
    case "buildProductName":
      return buildProductName(product);
    case "mapGenderToDepartment":
      return mapGenderToDepartment(String(value || ""));
    case "formatCurrency":
      return formatCurrency(value);
    case "formatDate":
      return formatDate(String(value || ""));
    case "joinImages":
      return joinImages(value);
    case "getPrimaryImage":
      return getPrimaryImage(value);
    default:
      return value;
  }
}
function escapeCSV(value) {
  if (value === null || value === void 0) {
    return "";
  }
  const strValue = String(value);
  const needsQuoting = strValue.includes(",") || strValue.includes('"') || strValue.includes("\n") || strValue.includes("\r");
  if (needsQuoting) {
    const escaped = strValue.replace(/"/g, '""');
    return `"${escaped}"`;
  }
  return strValue;
}
function buildRetailOpsRow(product) {
  const row = {};
  for (const column of retailOpsExportMapping.columns) {
    let value;
    if (column.source) {
      value = resolvePath(product, column.source);
    }
    if (column.transform) {
      value = applyTransform2(column.transform, value, product);
    }
    if (value === void 0 || value === null || value === "") {
      value = column.default !== void 0 ? column.default : "";
    }
    if (typeof value === "object") {
      value = String(value);
    }
    row[column.name] = value;
  }
  return row;
}
function buildRetailOpsCsv(products) {
  const headers = getRetailOpsHeaderRow();
  const headerLine = headers.map(escapeCSV).join(",");
  const dataLines = products.map((product) => {
    const row = buildRetailOpsRow(product);
    return headers.map((header) => escapeCSV(row[header])).join(",");
  });
  return [headerLine, ...dataLines].join("\n");
}
var RETAILOPS_COLUMN_NAMES = getRetailOpsHeaderRow();
var RETAILOPS_HEADER_ROW = getRetailOpsHeaderRow().join(",");

// src/import/retailOps.ts
function parseCSVLine(line, delimiter = ",") {
  const result = [];
  let current = "";
  let inQuotes = false;
  let i = 0;
  while (i < line.length) {
    const char = line[i];
    if (inQuotes) {
      if (char === '"') {
        if (i + 1 < line.length && line[i + 1] === '"') {
          current += '"';
          i += 2;
          continue;
        }
        inQuotes = false;
        i++;
        continue;
      }
      current += char;
      i++;
    } else {
      if (char === '"') {
        inQuotes = true;
        i++;
        continue;
      }
      if (char === delimiter) {
        result.push(current);
        current = "";
        i++;
        continue;
      }
      current += char;
      i++;
    }
  }
  result.push(current);
  return result;
}
function parseRetailOpsCsv(csv, options) {
  const {
    delimiter = ",",
    hasHeaderRow = true,
    trimFields = true,
    skipEmptyRows = true
  } = options || {};
  const lines = csv.split(/\r?\n/);
  if (lines.length === 0) {
    return [];
  }
  const result = [];
  let headers = [];
  let dataStartIndex = 0;
  if (hasHeaderRow && lines.length > 0) {
    headers = parseCSVLine(lines[0], delimiter);
    if (trimFields) {
      headers = headers.map((h) => h.trim());
    }
    dataStartIndex = 1;
  }
  for (let i = dataStartIndex; i < lines.length; i++) {
    const line = lines[i];
    if (skipEmptyRows && (!line || line.trim() === "")) {
      continue;
    }
    const values = parseCSVLine(line, delimiter);
    const raw = {};
    for (let j = 0; j < headers.length; j++) {
      let value = values[j] || "";
      if (trimFields) {
        value = value.trim();
      }
      raw[headers[j]] = value;
    }
    for (let j = headers.length; j < values.length; j++) {
      let value = values[j] || "";
      if (trimFields) {
        value = value.trim();
      }
      raw[`_col${j}`] = value;
    }
    result.push({
      raw,
      rowNumber: i - dataStartIndex + 1
      // 1-based, relative to data rows
    });
  }
  return result;
}
var COLUMN_MAPPINGS = {
  sku: ["SKU", "Sku", "sku", "Item SKU", "Product SKU"],
  mpn: ["MPN", "Mpn", "mpn", "Manufacturer Part Number"],
  brand: ["Brand", "BRAND", "brand", "Vendor", "Manufacturer"],
  name: ["Name", "NAME", "name", "Product Name", "ProductName", "Title"],
  description: ["Description", "DESCRIPTION", "description", "RICS Short Description", "RICS Long Desc"],
  department: ["Department", "DEPARTMENT", "department", "Dept"],
  category: ["Category", "CATEGORY", "category", "RICS Category"],
  class: ["Class", "CLASS", "class", "Product Class"],
  gender: ["Gender", "GENDER", "gender"],
  ageGroup: ["Age Group", "AgeGroup", "age_group"],
  color: ["Color", "COLOR", "color", "Primary Color", "Descriptive Color", "RICS Color"],
  size: ["Size", "SIZE", "size"],
  msrp: ["MSRP", "msrp", "MAP", "SCOM Regular Price", "Regular Price"],
  retailPrice: ["Retail Price", "RetailPrice", "retail_price", "SCOM Sale Price", "Sale Price", "Price"],
  cost: ["Cost", "COST", "cost"],
  currency: ["Currency", "CURRENCY", "currency"],
  quantity: ["Quantity", "QTY", "qty", "Total Inv", "Warehouse Inv"],
  warehouse: ["Warehouse", "WAREHOUSE", "warehouse", "Location"],
  launchDate: ["Launch Date", "LaunchDate", "launch_date", "Release Date"],
  images: ["Images", "IMAGES", "images", "Media", "Image URLs"],
  primaryImage: ["Primary Image", "PrimaryImage", "primary_image", "Main Image"],
  // NOTE: 'Product Is Active' is intentionally **not** included as a synonym for status.
  // Product Is Active is a separate operational command/flag and must be treated as pass-through.
  status: ["Status", "STATUS", "status"],
  styleId: ["Style ID", "StyleID", "style_id", "Style"]
};
function findColumnValue(raw, key) {
  const variations = COLUMN_MAPPINGS[key] || [key];
  for (const variation of variations) {
    if (raw[variation] !== void 0 && raw[variation] !== "") {
      return raw[variation];
    }
  }
  return "";
}
function retailOpsRowToImportRow(parsed) {
  const { raw, rowNumber } = parsed;
  const sku = findColumnValue(raw, "sku");
  const mpn = findColumnValue(raw, "mpn");
  const brand = findColumnValue(raw, "brand");
  const color = findColumnValue(raw, "color");
  const size = findColumnValue(raw, "size");
  const gender = findColumnValue(raw, "gender");
  const department = findColumnValue(raw, "department");
  const category = findColumnValue(raw, "category");
  const styleCode = mpn || sku || `ROW-${rowNumber}`;
  const rowId = sku || `retailops:${rowNumber}`;
  const upc = sku;
  let normalizedGender;
  const genderSource = gender || department || "";
  if (/\b(men|mens|men's|male)\b/i.test(genderSource)) {
    normalizedGender = "MEN";
  } else if (/\b(women|womens|women's|female)\b/i.test(genderSource)) {
    normalizedGender = "WOMEN";
  } else if (/\b(kids|child|children|toddler|infant|youth|boys?|girls?)\b/i.test(genderSource)) {
    normalizedGender = "KIDS";
  } else if (/\b(unisex)\b/i.test(genderSource)) {
    normalizedGender = "UNISEX";
  }
  let normalizedCategory;
  const categorySource = `${department} ${category}`.trim();
  if (/\b(footwear|shoe|sneaker|boot|sandal|clog|slipper)\b/i.test(categorySource)) {
    normalizedCategory = "FOOTWEAR";
  } else if (/\b(apparel|clothing|shirt|pants|jacket|top)\b/i.test(categorySource)) {
    normalizedCategory = "APPAREL";
  } else if (category) {
    normalizedCategory = category.toUpperCase();
  } else if (department) {
    normalizedCategory = department.toUpperCase();
  }
  const normalizedSizeScale = normalizedGender === "MEN" ? "MENS_US" : void 0;
  const statusRaw = raw["Status"] || raw["STATUS"] || raw["status"] || "";
  const productIsActiveRaw = raw["Product Is Active"] || raw["product_is_active"] || raw["PRODUCT_IS_ACTIVE"] || "";
  if (!raw["_passThrough"]) {
    raw["_passThrough"] = {};
  }
  raw["_passThrough"].status = statusRaw;
  raw["_passThrough"].product_is_active = productIsActiveRaw;
  delete raw["Status"];
  delete raw["status"];
  delete raw["STATUS"];
  delete raw["Product Is Active"];
  delete raw["product_is_active"];
  delete raw["PRODUCT_IS_ACTIVE"];
  return {
    source: "RETAILOPS_EXPORT",
    rowId,
    originalRowNumber: rowNumber,
    styleCode,
    brand: brand.trim(),
    color: color.trim(),
    size: size.trim(),
    upc,
    raw,
    normalizedGender,
    normalizedCategory,
    normalizedSizeScale
  };
}
function parseNumeric(value) {
  if (!value || value.trim() === "") {
    return 0;
  }
  const cleaned = value.replace(/[$€£,\s]/g, "");
  const num = parseFloat(cleaned);
  return isNaN(num) ? 0 : num;
}
function parseDate(value) {
  if (!value || value.trim() === "") {
    return (/* @__PURE__ */ new Date()).toISOString();
  }
  let date = new Date(value);
  if (!isNaN(date.getTime())) {
    return date.toISOString();
  }
  const parts = value.split(/[\/\-]/);
  if (parts.length === 3) {
    const [p1, p2, p3] = parts.map((p) => parseInt(p, 10));
    if (p3 > 100) {
      date = new Date(p3, p1 - 1, p2);
    } else if (p1 > 100) {
      date = new Date(p1, p2 - 1, p3);
    }
    if (!isNaN(date.getTime())) {
      return date.toISOString();
    }
  }
  return (/* @__PURE__ */ new Date()).toISOString();
}
function normalizeBrand(brand) {
  const upper = brand.toUpperCase().trim();
  if (upper === "NIKE" || upper.includes("NIKE")) {
    return "NIKE";
  }
  if (upper === "JORDAN" || upper.includes("JORDAN")) {
    return "JORDAN";
  }
  return null;
}
function deriveClass(raw) {
  const category = String(raw["Category"] || raw["RICS Category"] || "");
  const classVal = String(raw["Class"] || "");
  const combined = `${category} ${classVal}`.toLowerCase();
  if (/basketball/i.test(combined)) {
    return "BASKETBALL";
  }
  if (/running|run/i.test(combined)) {
    return "RUNNING";
  }
  if (/training|gym|fitness/i.test(combined)) {
    return "TRAINING";
  }
  if (/soccer|football/i.test(combined)) {
    return "SOCCER";
  }
  if (/tennis/i.test(combined)) {
    return "TENNIS";
  }
  if (/golf/i.test(combined)) {
    return "GOLF";
  }
  if (/skateboard|skate/i.test(combined)) {
    return "SKATEBOARDING";
  }
  return "LIFESTYLE";
}
function parseImages(raw) {
  const images = [];
  const imagesStr = String(findColumnValue(raw, "images") || "");
  const primaryImageStr = String(findColumnValue(raw, "primaryImage") || "");
  if (imagesStr.includes(";") || imagesStr.includes(",")) {
    const imageParts = imagesStr.split(";").filter(Boolean);
    for (const part of imageParts) {
      const subParts = part.split(",");
      if (subParts.length >= 1) {
        if (subParts[0].startsWith("http")) {
          images.push({ url: subParts[0].trim() });
        }
      }
    }
  } else if (imagesStr.includes("|")) {
    const urls = imagesStr.split("|").filter(Boolean);
    for (const url of urls) {
      if (url.trim().startsWith("http")) {
        images.push({ url: url.trim() });
      }
    }
  } else if (imagesStr.startsWith("http")) {
    images.push({ url: imagesStr.trim() });
  }
  if (primaryImageStr && primaryImageStr.startsWith("http")) {
    const primaryUrl = primaryImageStr.trim();
    const existingPrimary = images.find((img) => img.url === primaryUrl);
    if (existingPrimary) {
      existingPrimary.isPrimary = true;
    } else {
      images.unshift({ url: primaryUrl, isPrimary: true });
    }
  } else if (images.length > 0) {
    images[0].isPrimary = true;
  }
  return images;
}
function importRowToCoreProduct(row) {
  const raw = row.raw;
  const brand = normalizeBrand(row.brand);
  if (!brand) {
    throw new Error(
      `Unsupported brand "${row.brand}" for MVP. Only NIKE and JORDAN are supported.`
    );
  }
  const msrpStr = findColumnValue(raw, "msrp");
  const priceStr = findColumnValue(raw, "retailPrice");
  const msrp = parseNumeric(msrpStr);
  const price = parseNumeric(priceStr) || msrp;
  const launchDateStr = findColumnValue(raw, "launchDate");
  const launchDate = parseDate(launchDateStr);
  const images = parseImages(raw);
  const productClass = deriveClass(raw);
  const coreProduct = {
    id: row.rowId,
    sku: row.rowId,
    styleCode: row.styleCode,
    brand,
    gender: "MEN",
    // MVP: Nike men's footwear only
    category: "FOOTWEAR",
    // MVP: Footwear only
    class: productClass,
    colorPrimary: row.color || "Unknown",
    sizeScale: "MENS_US",
    // MVP: Men's US sizes only
    msrp: msrp || 0,
    price: price || 0,
    launchDate,
    status: "READY_FOR_EXPORT",
    images,
    meta: {
      retailOpsRowId: row.rowId,
      originalBrand: row.brand,
      importSource: "RETAILOPS_EXPORT"
    }
  };
  const descriptiveColor = raw["Descriptive Color"] || "";
  if (descriptiveColor && descriptiveColor !== row.color) {
    coreProduct.colorSecondary = descriptiveColor;
  }
  const seasonMatch = launchDate.match(/^(\d{4})/);
  if (seasonMatch) {
    const year = seasonMatch[1].slice(2);
    const month = new Date(launchDate).getMonth();
    const season = month < 6 ? "SP" : "FA";
    coreProduct.season = `${season}${year}`;
  }
  return coreProduct;
}
function retailOpsCsvToCoreProducts(csv, options) {
  const parsed = parseRetailOpsCsv(csv, options);
  const products = [];
  for (const row of parsed) {
    try {
      const importRow = retailOpsRowToImportRow(row);
      const product = importRowToCoreProduct(importRow);
      products.push(product);
    } catch {
      continue;
    }
  }
  return products;
}
function retailOpsCsvToCoreProductsWithDetails(csv, options) {
  const parsed = parseRetailOpsCsv(csv, options);
  const products = [];
  const skipped = [];
  for (const row of parsed) {
    try {
      const importRow = retailOpsRowToImportRow(row);
      const product = importRowToCoreProduct(importRow);
      products.push(product);
    } catch (error) {
      skipped.push({
        rowNumber: row.rowNumber,
        reason: error instanceof Error ? error.message : "Unknown error",
        raw: row.raw
      });
    }
  }
  return {
    products,
    skipped,
    totalRows: parsed.length
  };
}
function parsedRowsToImportRows(parsed) {
  return parsed.map(retailOpsRowToImportRow);
}
function importRowsToCoreProducts(rows) {
  const products = [];
  for (const row of rows) {
    try {
      products.push(importRowToCoreProduct(row));
    } catch {
      continue;
    }
  }
  return products;
}
var SynonymsSchema2 = zod.z.union([
  zod.z.array(zod.z.string()),
  zod.z.record(zod.z.string(), zod.z.string()),
  zod.z.array(zod.z.object({ alias: zod.z.string(), canonical: zod.z.string() }))
]).optional();
var ExportMetadataSchema = zod.z.object({
  /** Column key/header for export (if different from attribute_id) */
  key: zod.z.string().optional(),
  /** Omit this field from export if value is empty/null/undefined */
  omitIfEmpty: zod.z.boolean().optional().default(false),
  /** Export target channels this attribute applies to */
  targets: zod.z.array(zod.z.enum(["shopify", "google", "amazon", "magento", "csv"])).optional()
}).optional();
var AttributeSchema = zod.z.object({
  attribute_id: zod.z.string().min(1).regex(/^[a-z0-9-_.]+$/),
  label: zod.z.string().min(1),
  external_header: zod.z.string().optional(),
  category: zod.z.string().optional(),
  data_type: zod.z.enum(["string", "number", "boolean", "enum", "currency", "json", "multiSelect", "date"]),
  allowed_values: zod.z.array(zod.z.string()).optional(),
  synonyms: SynonymsSchema2,
  required_for_completion: zod.z.boolean().optional().default(false),
  required_for_export: zod.z.boolean().optional().default(false),
  import_required: zod.z.boolean().optional().default(false),
  ai_usage_notes: zod.z.string().optional(),
  status: zod.z.enum(["active", "deprecated", "hidden"]).optional().default("active"),
  // LP-3.0.4: Added 'repo' to source enum for repository-sourced attributes
  source: zod.z.enum(["notion", "derived", "json", "repo"]).optional(),
  // LP-smart-rules-registry-1.0.0: Export control flags
  /** Whether this attribute can be included in exports (default: true for most, false for internal fields) */
  exportable: zod.z.boolean().optional().default(true),
  /** Whether this attribute must have a value for the product to be export-ready */
  requiredForExport: zod.z.boolean().optional().default(false),
  /** Whether this attribute is for internal use only and should never be exposed to external channels */
  internalOnly: zod.z.boolean().optional().default(false),
  /** Channel-specific export configuration */
  export: ExportMetadataSchema,
  createdBy: zod.z.string().optional(),
  createdAt: zod.z.union([zod.z.string(), zod.z.object({}).passthrough()]).optional(),
  updatedBy: zod.z.string().optional(),
  updatedAt: zod.z.union([zod.z.string(), zod.z.object({}).passthrough()]).optional()
});
var SmartRuleCondition = zod.z.object({
  field: zod.z.string(),
  matchType: zod.z.enum(["equals", "contains", "regex", "in", "exists", "and", "or", "not"]),
  value: zod.z.union([zod.z.string(), zod.z.number(), zod.z.array(zod.z.string())]).optional(),
  options: zod.z.any().optional()
});
var SmartRuleAction = zod.z.object({
  targetField: zod.z.string(),
  valueTemplate: zod.z.string(),
  confidenceModifier: zod.z.number().optional()
});
var SmartRuleSchema = zod.z.object({
  ruleId: zod.z.string().min(1),
  name: zod.z.string().min(1),
  description: zod.z.string().optional(),
  enabled: zod.z.boolean().default(true),
  priority: zod.z.number().default(1e3),
  condition: zod.z.union([SmartRuleCondition, zod.z.array(SmartRuleCondition)]),
  action: SmartRuleAction,
  autoApply: zod.z.boolean().optional().default(false),
  autoApplyConfidence: zod.z.number().min(0).max(1).optional(),
  tags: zod.z.array(zod.z.string()).optional(),
  createdBy: zod.z.string().optional(),
  createdAt: zod.z.string().optional(),
  updatedBy: zod.z.string().optional(),
  updatedAt: zod.z.string().optional()
});
var Condition = zod.z.object({
  field: zod.z.string(),
  op: zod.z.string(),
  value: zod.z.string().optional()
});
var Voice = zod.z.object({
  preset: zod.z.string().optional(),
  avoid: zod.z.array(zod.z.string()).optional(),
  brandRules: zod.z.array(zod.z.string()).optional()
}).optional();
var AITemplateSchema = zod.z.object({
  key: zod.z.string().min(1),
  title: zod.z.string().min(1),
  description: zod.z.string().optional(),
  status: zod.z.enum(["active", "draft", "disabled"]).default("draft"),
  scope: zod.z.enum(["global", "store", "brand"]).optional().default("global"),
  version: zod.z.number().optional(),
  conditions: zod.z.array(Condition).optional(),
  matchMode: zod.z.enum(["first", "best", "all"]).optional().default("best"),
  layout: zod.z.object({
    headlineEnabled: zod.z.boolean().optional(),
    pattern: zod.z.string().optional(),
    bodyTemplate: zod.z.string().optional()
  }).optional(),
  voice: Voice,
  seo: zod.z.object({
    metaTitlePattern: zod.z.string().optional(),
    metaDescPattern: zod.z.string().optional()
  }).optional(),
  examples: zod.z.array(zod.z.string()).optional(),
  banned_terms: zod.z.array(zod.z.string()).optional(),
  updatedBy: zod.z.string().optional(),
  updatedAt: zod.z.string().optional()
});

// src/lib/stringUtils.ts
function toSnakeCase(input) {
  if (!input) return "";
  let s = input.replace(/\./g, "_");
  s = s.replace(/([a-z0-9])([A-Z])/g, "$1_$2");
  s = s.replace(/[\s\-]+/g, "_");
  s = s.replace(/[^A-Za-z0-9_]/g, "");
  s = s.replace(/__+/g, "_").replace(/^_+|_+$/g, "");
  return s.toLowerCase();
}
var DATA_TYPE_MAP = {
  // String variants
  "text": "string",
  "longtext": "string",
  "string": "string",
  "varchar": "string",
  "char": "string",
  // Enum/select variants
  "select": "enum",
  "dropdown": "enum",
  "enum": "enum",
  "choice": "enum",
  // Boolean variants
  "boolean": "boolean",
  "bool": "boolean",
  "yesno": "boolean",
  "checkbox": "boolean",
  // Number variants
  "number": "number",
  "int": "number",
  "integer": "number",
  "float": "number",
  "decimal": "number",
  "numeric": "number",
  "price": "number",
  "currency": "number",
  "money": "number",
  // Array variants
  "array": "array",
  "list": "array",
  "multiselect": "array",
  "multi-select": "array",
  // Date variants
  "date": "date",
  "datetime": "date",
  "timestamp": "date",
  // Object/JSON variants
  "object": "object",
  "json": "object",
  "map": "object"
};
function normalizeDataType(dataType) {
  if (!dataType) return "string";
  const normalized = DATA_TYPE_MAP[dataType.toLowerCase().trim()];
  return normalized || "string";
}
function wouldCollide(id1, id2) {
  return toSnakeCase(id1) === toSnakeCase(id2);
}
function detectCollisions(ids) {
  const canonicalMap = /* @__PURE__ */ new Map();
  for (const id of ids) {
    const canonical = toSnakeCase(id);
    const existing = canonicalMap.get(canonical) || [];
    existing.push(id);
    canonicalMap.set(canonical, existing);
  }
  const collisions = [];
  for (const [canonical, originals] of canonicalMap) {
    if (originals.length > 1) {
      collisions.push({ canonical, originals });
    }
  }
  return collisions;
}

// src/index.ts
var SDK_VERSION = "0.6.0";

exports.AITemplateSchema = AITemplateSchema;
exports.AttributeConstraintSchema = AttributeConstraintSchema;
exports.AttributeDataTypeSchema = AttributeDataTypeSchema;
exports.AttributeDefinitionSchema = AttributeDefinitionSchema;
exports.AttributeRegistrySchema = AttributeRegistrySchema;
exports.AttributeSchema = AttributeSchema;
exports.AttributeValueSchema = AttributeValueSchema;
exports.CanonicalRegistrySchema = CanonicalRegistrySchema;
exports.CoreProductSchema = CoreProductSchema;
exports.DEFAULT_COLUMN_MAPPINGS = DEFAULT_COLUMN_MAPPINGS;
exports.ExportMetadataSchema = ExportMetadataSchema;
exports.ExportTargetSchema = ExportTargetSchema;
exports.ImportRowRawSchema = ImportRowRawSchema;
exports.ImportRowSchema = ImportRowSchema;
exports.LEGACY_TO_REGISTRY = LEGACY_TO_REGISTRY;
exports.ProductAttributesSchema = ProductAttributesSchema;
exports.ProductCoreSchema = ProductCoreSchema;
exports.ProductFlagsSchema = ProductFlagsSchema;
exports.ProductImageSchema = ProductImageSchema;
exports.ProductInventorySchema = ProductInventorySchema;
exports.ProductMediaSchema = ProductMediaSchema;
exports.ProductMetaSchema = ProductMetaSchema;
exports.ProductPricingSchema = ProductPricingSchema;
exports.ProductSchema = ProductSchema;
exports.REGISTRY_TO_LEGACY = REGISTRY_TO_LEGACY;
exports.RETAILOPS_COLUMN_NAMES = RETAILOPS_COLUMN_NAMES;
exports.RETAILOPS_HEADER_ROW = RETAILOPS_HEADER_ROW;
exports.RegistryAttributeSchema = RegistryAttributeSchema;
exports.RegistryExportMetaSchema = RegistryExportMetaSchema;
exports.SDK_VERSION = SDK_VERSION;
exports.SmartRuleAction = SmartRuleAction;
exports.SmartRuleCondition = SmartRuleCondition;
exports.SmartRuleSchema = SmartRuleSchema;
exports.allowsCustomValues = allowsCustomValues;
exports.buildImportRow = buildImportRow;
exports.buildImportRows = buildImportRows;
exports.buildRetailOpsCsv = buildRetailOpsCsv;
exports.buildRetailOpsRow = buildRetailOpsRow;
exports.canProcessRow = canProcessRow;
exports.deriveProductId = deriveProductId;
exports.detectCollisions = detectCollisions;
exports.getAllowedValues = getAllowedValues;
exports.getAttributeById = getAttributeById;
exports.getAttributeRegistry = getAttributeRegistry;
exports.getAttributes = getAttributes;
exports.getAttributesForTarget = getAttributesForTarget;
exports.getExportMeta = getExportMeta;
exports.getExportableAttributes = getExportableAttributes;
exports.getInternalOnlyAttributes = getInternalOnlyAttributes;
exports.getRegistryVersion = getRegistryVersion;
exports.getRequiredForExportAttributes = getRequiredForExportAttributes;
exports.getRetailOpsHeaderRow = getRetailOpsHeaderRow;
exports.importRowJsonSchema = importRowJsonSchema;
exports.importRowToCoreProduct = importRowToCoreProduct;
exports.importRowsToCoreProducts = importRowsToCoreProducts;
exports.isEmptyRow = isEmptyRow;
exports.isExportable = isExportable;
exports.isInternalOnly = isInternalOnly;
exports.isRequiredForExport = isRequiredForExport;
exports.normalizeDataType = normalizeDataType;
exports.normalizeImportRow = normalizeImportRow;
exports.normalizeTargetFieldToRegistry = normalizeTargetFieldToRegistry;
exports.parseRetailOpsCsv = parseRetailOpsCsv;
exports.parsedRowsToImportRows = parsedRowsToImportRows;
exports.productJsonSchema = productJsonSchema;
exports.retailOpsCsvToCoreProducts = retailOpsCsvToCoreProducts;
exports.retailOpsCsvToCoreProductsWithDetails = retailOpsCsvToCoreProductsWithDetails;
exports.retailOpsExportMapping = retailOpsExportMapping;
exports.retailOpsRowToImportRow = retailOpsRowToImportRow;
exports.safeValidateAttributeDefinition = safeValidateAttributeDefinition;
exports.safeValidateCanonicalRegistry = safeValidateCanonicalRegistry;
exports.safeValidateProduct = safeValidateProduct;
exports.safeValidateRegistryAttribute = safeValidateRegistryAttribute;
exports.sourceColumnMatchesHeader = sourceColumnMatchesHeader;
exports.toSnakeCase = toSnakeCase;
exports.validateAttributeDefinition = validateAttributeDefinition;
exports.validateAttributeDomain = validateAttributeDomain;
exports.validateAttributeDomains = validateAttributeDomains;
exports.validateAttributeRegistry = validateAttributeRegistry;
exports.validateAttributeValue = validateAttributeValue;
exports.validateAttributes = validateAttributes;
exports.validateAttributesOnly = validateAttributesOnly;
exports.validateCanonicalRegistry = validateCanonicalRegistry;
exports.validateCoreProduct = validateCoreProduct;
exports.validateCoreProductOrThrow = validateCoreProductOrThrow;
exports.validateExportControlConsistency = validateExportControlConsistency;
exports.validateImportRow = validateImportRow;
exports.validateImportRowSchema = validateImportRowSchema;
exports.validateImportRowSchemaOrThrow = validateImportRowSchemaOrThrow;
exports.validateProduct = validateProduct;
exports.validateProductWithDomains = validateProductWithDomains;
exports.validateRegistryAttribute = validateRegistryAttribute;
exports.validateRegistryExportConsistency = validateRegistryExportConsistency;
exports.validateRequiredFields = validateRequiredFields;
exports.wouldCollide = wouldCollide;
