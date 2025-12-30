"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SmartRuleSchema = exports.SmartRuleAction = exports.SmartRuleCondition = void 0;
const zod_1 = require("zod");
exports.SmartRuleCondition = zod_1.z.object({
    field: zod_1.z.string(),
    matchType: zod_1.z.enum(['equals', 'contains', 'regex', 'in', 'exists', 'and', 'or', 'not']),
    value: zod_1.z.union([zod_1.z.string(), zod_1.z.number(), zod_1.z.array(zod_1.z.string())]).optional(),
    options: zod_1.z.any().optional()
});
exports.SmartRuleAction = zod_1.z.object({
    targetField: zod_1.z.string(),
    valueTemplate: zod_1.z.string(),
    confidenceModifier: zod_1.z.number().optional()
});
exports.SmartRuleSchema = zod_1.z.object({
    ruleId: zod_1.z.string().min(1),
    name: zod_1.z.string().min(1),
    description: zod_1.z.string().optional(),
    enabled: zod_1.z.boolean().default(true),
    priority: zod_1.z.number().default(1000),
    condition: zod_1.z.union([exports.SmartRuleCondition, zod_1.z.array(exports.SmartRuleCondition)]),
    action: exports.SmartRuleAction,
    autoApply: zod_1.z.boolean().optional().default(false),
    autoApplyConfidence: zod_1.z.number().min(0).max(1).optional(),
    tags: zod_1.z.array(zod_1.z.string()).optional(),
    createdBy: zod_1.z.string().optional(),
    createdAt: zod_1.z.string().optional(),
    updatedBy: zod_1.z.string().optional(),
    updatedAt: zod_1.z.string().optional()
});
exports.default = exports.SmartRuleSchema;
//# sourceMappingURL=smartRule.js.map