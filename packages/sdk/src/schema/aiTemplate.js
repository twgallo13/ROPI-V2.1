"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AITemplateSchema = void 0;
const zod_1 = require("zod");
const Condition = zod_1.z.object({
    field: zod_1.z.string(),
    op: zod_1.z.string(),
    value: zod_1.z.string().optional()
});
const Voice = zod_1.z.object({
    preset: zod_1.z.string().optional(),
    avoid: zod_1.z.array(zod_1.z.string()).optional(),
    brandRules: zod_1.z.array(zod_1.z.string()).optional()
}).optional();
exports.AITemplateSchema = zod_1.z.object({
    key: zod_1.z.string().min(1),
    title: zod_1.z.string().min(1),
    description: zod_1.z.string().optional(),
    status: zod_1.z.enum(['active', 'draft', 'disabled']).default('draft'),
    scope: zod_1.z.enum(['global', 'store', 'brand']).optional().default('global'),
    version: zod_1.z.number().optional(),
    conditions: zod_1.z.array(Condition).optional(),
    matchMode: zod_1.z.enum(['first', 'best', 'all']).optional().default('best'),
    layout: zod_1.z.object({
        headlineEnabled: zod_1.z.boolean().optional(),
        pattern: zod_1.z.string().optional(),
        bodyTemplate: zod_1.z.string().optional()
    }).optional(),
    voice: Voice,
    seo: zod_1.z.object({
        metaTitlePattern: zod_1.z.string().optional(),
        metaDescPattern: zod_1.z.string().optional()
    }).optional(),
    examples: zod_1.z.array(zod_1.z.string()).optional(),
    banned_terms: zod_1.z.array(zod_1.z.string()).optional(),
    updatedBy: zod_1.z.string().optional(),
    updatedAt: zod_1.z.string().optional()
});
exports.default = exports.AITemplateSchema;
//# sourceMappingURL=aiTemplate.js.map