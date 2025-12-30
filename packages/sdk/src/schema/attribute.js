"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AttributeSchema = void 0;
const zod_1 = require("zod");
/**
 * Attribute Schema
 *
 * Defines the structure for product attribute definitions in the registry.
 *
 * Lisa v1.0.0
 *
 * References:
 * - Attribute Registry: https://www.notion.so/2b845ee1ec5a81228b07ca97964cd033
 * - Attribute Validation Schema: https://www.notion.so/2b845ee1ec5a805fba0ef665dfb17396
 */
/**
 * Synonyms schema - accepts multiple formats for flexibility:
 * - Array of strings: ["blk", "blu"]
 * - Object map (alias -> canonical): { "blk": "Black", "blu": "Blue" }
 * - Array of objects: [{ alias: "blk", canonical: "Black" }]
 *
 * LP-3.0.4: Updated to accept object map format used in Firestore
 */
const SynonymsSchema = zod_1.z.union([
    zod_1.z.array(zod_1.z.string()),
    zod_1.z.record(zod_1.z.string(), zod_1.z.string()),
    zod_1.z.array(zod_1.z.object({ alias: zod_1.z.string(), canonical: zod_1.z.string() }))
]).optional();
exports.AttributeSchema = zod_1.z.object({
    attribute_id: zod_1.z.string().min(1).regex(/^[a-z0-9-_.]+$/),
    label: zod_1.z.string().min(1),
    external_header: zod_1.z.string().optional(),
    category: zod_1.z.string().optional(),
    data_type: zod_1.z.enum(['string', 'number', 'boolean', 'enum', 'currency', 'json', 'multiSelect', 'date']),
    allowed_values: zod_1.z.array(zod_1.z.string()).optional(),
    synonyms: SynonymsSchema,
    required_for_completion: zod_1.z.boolean().optional().default(false),
    required_for_export: zod_1.z.boolean().optional().default(false),
    import_required: zod_1.z.boolean().optional().default(false),
    ai_usage_notes: zod_1.z.string().optional(),
    status: zod_1.z.enum(['active', 'deprecated', 'hidden']).optional().default('active'),
    // LP-3.0.4: Added 'repo' to source enum for repository-sourced attributes
    source: zod_1.z.enum(['notion', 'derived', 'json', 'repo']).optional(),
    createdBy: zod_1.z.string().optional(),
    createdAt: zod_1.z.union([zod_1.z.string(), zod_1.z.object({}).passthrough()]).optional(),
    updatedBy: zod_1.z.string().optional(),
    updatedAt: zod_1.z.union([zod_1.z.string(), zod_1.z.object({}).passthrough()]).optional(),
});
exports.default = exports.AttributeSchema;
//# sourceMappingURL=attribute.js.map