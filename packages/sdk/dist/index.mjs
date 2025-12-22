import { z } from 'zod';

// src/validators/productValidator.ts
var ProductCoreSchema = z.object({
  sku: z.string().min(1, "SKU is required"),
  title: z.string().min(1, "Title is required"),
  brand: z.string().min(1, "Brand is required"),
  description: z.string().optional(),
  status: z.enum(["draft", "active", "archived"]),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime()
  // TODO (AOSS): Add remaining core fields from Section 2.1 schema
});
var ProductAttributesSchema = z.object({
  department: z.string().optional(),
  class: z.string().optional(),
  category: z.string().optional(),
  subcategory: z.string().optional(),
  gender: z.string().optional(),
  ageGroup: z.string().optional(),
  color: z.string().optional(),
  size: z.string().optional(),
  material: z.string().optional()
  // TODO (AOSS): Add remaining attributes from Section 2.1 and Attribute Registry
}).catchall(z.string().optional());
var ProductPricingSchema = z.object({
  msrp: z.number().positive().optional(),
  cost: z.number().positive().optional(),
  retailPrice: z.number().positive().optional(),
  currency: z.string().optional()
  // TODO (AOSS): Add remaining pricing fields from Section 2.1 schema
}).optional();
var ProductInventorySchema = z.object({
  quantity: z.number().int().min(0).optional(),
  warehouse: z.string().optional(),
  location: z.string().optional()
  // TODO (AOSS): Add remaining inventory fields from Section 2.1 schema
}).optional();
var ProductMediaSchema = z.object({
  images: z.array(z.string().url()).optional(),
  primaryImage: z.string().url().optional(),
  videos: z.array(z.string().url()).optional()
  // TODO (AOSS): Add remaining media fields from Section 2.1 schema
}).optional();
var ProductSchema = z.object({
  core: ProductCoreSchema,
  attributes: ProductAttributesSchema,
  pricing: ProductPricingSchema,
  inventory: ProductInventorySchema,
  media: ProductMediaSchema,
  // Metadata for import/normalization tracking
  _meta: z.object({
    source: z.string().optional(),
    importedAt: z.string().datetime().optional(),
    normalizedAt: z.string().datetime().optional(),
    validatedAt: z.string().datetime().optional()
  }).optional()
  // TODO (AOSS): Add remaining top-level fields from Section 2.1 schema
});
function validateProduct(input) {
  return ProductSchema.parse(input);
}
function safeValidateProduct(input) {
  return ProductSchema.safeParse(input);
}
var AttributeDataTypeSchema = z.enum([
  "string",
  "number",
  "boolean",
  "date",
  "array",
  "object"
]);
var AttributeConstraintSchema = z.object({
  type: z.enum(["required", "min", "max", "pattern", "enum", "range"]),
  value: z.any().optional(),
  message: z.string().optional()
  // TODO (AOSS): Add remaining constraint types from Section 2.2
});
var AttributeDefinitionSchema = z.object({
  key: z.string().min(1, "Attribute key is required"),
  label: z.string().min(1, "Attribute label is required"),
  dataType: AttributeDataTypeSchema,
  required: z.boolean().optional(),
  defaultValue: z.any().optional(),
  allowedValues: z.array(z.string()).optional(),
  constraints: z.array(AttributeConstraintSchema).optional(),
  description: z.string().optional(),
  category: z.string().optional()
  // TODO (AOSS): Add remaining fields from Section 2.2 schema
});
var AttributeValueSchema = z.object({
  key: z.string().min(1, "Attribute key is required"),
  value: z.any(),
  // Required - the actual attribute value
  source: z.string().optional(),
  confidence: z.number().min(0).max(1).optional(),
  validatedAt: z.string().datetime().optional()
  // TODO (AOSS): Add remaining value metadata from Section 2.2
}).strict();
var AttributeRegistrySchema = z.object({
  attributes: z.array(AttributeDefinitionSchema),
  version: z.string().optional(),
  updatedAt: z.string().optional()
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
  return z.array(AttributeDefinitionSchema).parse(input);
}
function safeValidateAttributeDefinition(input) {
  return AttributeDefinitionSchema.safeParse(input);
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
function validateTitle(title) {
  const issues = [];
  if (!title) {
    issues.push(
      createIssue(
        "MISSING_REQUIRED_FIELD",
        "error",
        "title",
        "Product title is required"
      )
    );
    return issues;
  }
  if (title.length < 5) {
    issues.push(
      createIssue(
        "INVALID_VALUE",
        "warning",
        "title",
        "Product title is very short (less than 5 characters)",
        title
      )
    );
  }
  if (title.length > 200) {
    issues.push(
      createIssue(
        "INVALID_VALUE",
        "error",
        "title",
        "Product title is too long (max 200 characters)",
        title
      )
    );
  }
  return issues;
}
function validateBrand(brand) {
  const issues = [];
  if (!brand) {
    issues.push(
      createIssue(
        "MISSING_REQUIRED_FIELD",
        "error",
        "brand",
        "Brand is required"
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
  const titleIssues = validateTitle(normalized.title);
  const brandIssues = validateBrand(normalized.brand);
  const pricingIssues = validatePricing(normalized);
  const inventoryIssues = validateInventory(normalized);
  const dateIssues = validateDates(normalized);
  const mediaIssues = validateMedia(normalized);
  const allIssues = [
    ...mpnIssues,
    ...skuIssues,
    ...titleIssues,
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

// src/normalization/importNormalizer.ts
var DEFAULT_COLUMN_MAPPINGS = [
  // Core fields — MPN is required (LP-2.1.0), SKU is optional
  { sourceColumn: "MPN", targetField: "mpn", required: true, transform: "trim" },
  { sourceColumn: "mpn", targetField: "mpn", required: true, transform: "trim" },
  { sourceColumn: "Manufacturer Part Number", targetField: "mpn", required: true, transform: "trim" },
  { sourceColumn: "SKU", targetField: "sku", required: false, transform: "trim" },
  { sourceColumn: "Product Name", targetField: "title", required: true, transform: "trim" },
  { sourceColumn: "Brand", targetField: "brand", required: true, transform: "trim" },
  { sourceColumn: "Description", targetField: "description", transform: "trim" },
  // Attributes
  { sourceColumn: "Department", targetField: "department", transform: "trim" },
  { sourceColumn: "Class", targetField: "class", transform: "trim" },
  { sourceColumn: "Category", targetField: "category", transform: "trim" },
  { sourceColumn: "Subcategory", targetField: "subcategory", transform: "trim" },
  { sourceColumn: "Gender", targetField: "gender", transform: "lowercase" },
  { sourceColumn: "Age Group", targetField: "ageGroup", transform: "trim" },
  { sourceColumn: "Color", targetField: "color", transform: "trim" },
  { sourceColumn: "Size", targetField: "size", transform: "trim" },
  { sourceColumn: "Material", targetField: "material", transform: "trim" },
  // Pricing
  { sourceColumn: "MSRP", targetField: "msrp", transform: "number" },
  { sourceColumn: "Cost", targetField: "cost", transform: "number" },
  { sourceColumn: "Retail Price", targetField: "retailPrice", transform: "number" },
  { sourceColumn: "Currency", targetField: "currency", transform: "uppercase", defaultValue: "USD" },
  // Inventory
  { sourceColumn: "Quantity", targetField: "quantity", transform: "number", defaultValue: 0 },
  { sourceColumn: "Warehouse", targetField: "warehouse", transform: "trim" },
  { sourceColumn: "Location", targetField: "location", transform: "trim" },
  // Dates
  { sourceColumn: "First Received", targetField: "firstReceived", transform: "date" },
  { sourceColumn: "Launch Date", targetField: "launchDate", transform: "date" },
  // Media (pipe-separated URLs)
  { sourceColumn: "Images", targetField: "images", transform: "array" },
  { sourceColumn: "Primary Image", targetField: "primaryImage", transform: "trim" }
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
    case "number": {
      const cleaned = strValue.replace(/[$,\s]/g, "");
      const num = parseFloat(cleaned);
      return isNaN(num) ? void 0 : num;
    }
    case "date": {
      try {
        const date = new Date(strValue);
        if (isNaN(date.getTime())) {
          return void 0;
        }
        return date.toISOString();
      } catch {
        return void 0;
      }
    }
    case "array": {
      return strValue.split(/[|,;]/).map((s) => s.trim()).filter((s) => s.length > 0);
    }
    default:
      return strValue.trim();
  }
}
function normalizeImportRow(sourceColumns, mappings = DEFAULT_COLUMN_MAPPINGS) {
  const normalized = {};
  for (const mapping of mappings) {
    const sourceValue = sourceColumns[mapping.sourceColumn];
    let normalizedValue = applyTransform(sourceValue, mapping.transform);
    if (normalizedValue === void 0 && mapping.defaultValue !== void 0) {
      normalizedValue = mapping.defaultValue;
    }
    if (normalizedValue !== void 0) {
      normalized[mapping.targetField] = normalizedValue;
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
      const value = normalized[mapping.targetField];
      if (value === void 0 || value === null || value === "") {
        missingFields.add(mapping.targetField);
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
function buildImportRows(csvData, batchId, userId, mappings) {
  const rows = [];
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
var ProductImageSchema = z.object({
  url: z.string().url("Image URL must be a valid URL"),
  alt: z.string().optional(),
  isPrimary: z.boolean().optional()
});
var ProductFlagsSchema = z.object({
  isOutlet: z.boolean().optional(),
  isOnlineExclusive: z.boolean().optional(),
  isLimited: z.boolean().optional()
});
var ProductMetaSchema = z.record(z.string(), z.string());
var CoreProductSchema = z.object({
  id: z.string().min(1, "ID is required"),
  sku: z.string().min(1, "SKU is required"),
  styleCode: z.string().regex(/^[A-Z0-9]+-[A-Z0-9]+$/, "Style code must match pattern like DZ5485-410"),
  brand: z.enum(["NIKE", "JORDAN"]),
  gender: z.enum(["MEN"]),
  category: z.enum(["FOOTWEAR"]),
  class: z.string().min(1, "Class is required"),
  colorPrimary: z.string().min(1, "Primary color is required"),
  colorSecondary: z.string().optional(),
  sizeScale: z.enum(["MENS_US"]),
  msrp: z.number().min(0, "MSRP must be non-negative"),
  price: z.number().min(0, "Price must be non-negative"),
  launchDate: z.string().datetime("Launch date must be ISO 8601 format"),
  season: z.string().optional(),
  status: z.enum(["DRAFT", "READY_FOR_EXPORT", "DISCONTINUED"]),
  images: z.array(ProductImageSchema),
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
var ImportRowRawSchema = z.record(z.string(), z.unknown());
var ImportRowSchema = z.object({
  source: z.enum(["SUPPLIER", "RETAILOPS_EXPORT", "MANUAL"]),
  rowId: z.string().min(1, "Row ID is required"),
  originalRowNumber: z.number().int().min(1, "Original row number must be a positive integer"),
  styleCode: z.string().min(1, "Style code is required"),
  brand: z.string().min(1, "Brand is required"),
  color: z.string().min(1, "Color is required"),
  size: z.string().min(1, "Size is required"),
  upc: z.string().min(1, "UPC is required"),
  raw: ImportRowRawSchema,
  normalizedGender: z.string().optional(),
  normalizedCategory: z.string().optional(),
  normalizedSizeScale: z.string().optional(),
  notes: z.string().optional()
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
  status: ["Status", "STATUS", "status", "Product Is Active"],
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
var SynonymsSchema = z.union([
  z.array(z.string()),
  z.record(z.string(), z.string()),
  z.array(z.object({ alias: z.string(), canonical: z.string() }))
]).optional();
var AttributeSchema = z.object({
  attribute_id: z.string().min(1).regex(/^[a-z0-9-_.]+$/),
  label: z.string().min(1),
  external_header: z.string().optional(),
  category: z.string().optional(),
  data_type: z.enum(["string", "number", "boolean", "enum", "currency", "json", "multiSelect", "date"]),
  allowed_values: z.array(z.string()).optional(),
  synonyms: SynonymsSchema,
  required_for_completion: z.boolean().optional().default(false),
  required_for_export: z.boolean().optional().default(false),
  import_required: z.boolean().optional().default(false),
  ai_usage_notes: z.string().optional(),
  status: z.enum(["active", "deprecated", "hidden"]).optional().default("active"),
  // LP-3.0.4: Added 'repo' to source enum for repository-sourced attributes
  source: z.enum(["notion", "derived", "json", "repo"]).optional(),
  createdBy: z.string().optional(),
  createdAt: z.union([z.string(), z.object({}).passthrough()]).optional(),
  updatedBy: z.string().optional(),
  updatedAt: z.union([z.string(), z.object({}).passthrough()]).optional()
});
var SmartRuleCondition = z.object({
  field: z.string(),
  matchType: z.enum(["equals", "contains", "regex", "in", "exists", "and", "or", "not"]),
  value: z.union([z.string(), z.number(), z.array(z.string())]).optional(),
  options: z.any().optional()
});
var SmartRuleAction = z.object({
  targetField: z.string(),
  valueTemplate: z.string(),
  confidenceModifier: z.number().optional()
});
var SmartRuleSchema = z.object({
  ruleId: z.string().min(1),
  name: z.string().min(1),
  description: z.string().optional(),
  enabled: z.boolean().default(true),
  priority: z.number().default(1e3),
  condition: z.union([SmartRuleCondition, z.array(SmartRuleCondition)]),
  action: SmartRuleAction,
  autoApply: z.boolean().optional().default(false),
  autoApplyConfidence: z.number().min(0).max(1).optional(),
  tags: z.array(z.string()).optional(),
  createdBy: z.string().optional(),
  createdAt: z.string().optional(),
  updatedBy: z.string().optional(),
  updatedAt: z.string().optional()
});
var Condition = z.object({
  field: z.string(),
  op: z.string(),
  value: z.string().optional()
});
var Voice = z.object({
  preset: z.string().optional(),
  avoid: z.array(z.string()).optional(),
  brandRules: z.array(z.string()).optional()
}).optional();
var AITemplateSchema = z.object({
  key: z.string().min(1),
  title: z.string().min(1),
  description: z.string().optional(),
  status: z.enum(["active", "draft", "disabled"]).default("draft"),
  scope: z.enum(["global", "store", "brand"]).optional().default("global"),
  version: z.number().optional(),
  conditions: z.array(Condition).optional(),
  matchMode: z.enum(["first", "best", "all"]).optional().default("best"),
  layout: z.object({
    headlineEnabled: z.boolean().optional(),
    pattern: z.string().optional(),
    bodyTemplate: z.string().optional()
  }).optional(),
  voice: Voice,
  seo: z.object({
    metaTitlePattern: z.string().optional(),
    metaDescPattern: z.string().optional()
  }).optional(),
  examples: z.array(z.string()).optional(),
  banned_terms: z.array(z.string()).optional(),
  updatedBy: z.string().optional(),
  updatedAt: z.string().optional()
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

export { AITemplateSchema, AttributeConstraintSchema, AttributeDataTypeSchema, AttributeDefinitionSchema, AttributeRegistrySchema, AttributeSchema, AttributeValueSchema, CoreProductSchema, DEFAULT_COLUMN_MAPPINGS, ImportRowRawSchema, ImportRowSchema, ProductAttributesSchema, ProductCoreSchema, ProductFlagsSchema, ProductImageSchema, ProductInventorySchema, ProductMediaSchema, ProductMetaSchema, ProductPricingSchema, ProductSchema, RETAILOPS_COLUMN_NAMES, RETAILOPS_HEADER_ROW, SDK_VERSION, SmartRuleAction, SmartRuleCondition, SmartRuleSchema, buildImportRow, buildImportRows, buildRetailOpsCsv, buildRetailOpsRow, canProcessRow, deriveProductId, detectCollisions, getRetailOpsHeaderRow, importRowJsonSchema, importRowToCoreProduct, importRowsToCoreProducts, isEmptyRow, normalizeDataType, normalizeImportRow, parseRetailOpsCsv, parsedRowsToImportRows, productJsonSchema, retailOpsCsvToCoreProducts, retailOpsCsvToCoreProductsWithDetails, retailOpsExportMapping, retailOpsRowToImportRow, safeValidateAttributeDefinition, safeValidateProduct, toSnakeCase, validateAttributeDefinition, validateAttributeRegistry, validateAttributeValue, validateAttributes, validateCoreProduct, validateCoreProductOrThrow, validateImportRow, validateImportRowSchema, validateImportRowSchemaOrThrow, validateProduct, validateRequiredFields, wouldCollide };
