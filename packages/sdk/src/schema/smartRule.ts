import { z } from 'zod';

export const SmartRuleCondition = z.object({
  field: z.string(),
  matchType: z.enum(['equals','contains','regex','in','exists','and','or','not']),
  value: z.union([z.string(), z.number(), z.array(z.string())]).optional(),
  options: z.any().optional()
});

export const SmartRuleAction = z.object({
  targetField: z.string(),
  valueTemplate: z.string(),
  confidenceModifier: z.number().optional()
});

export const SmartRuleSchema = z.object({
  ruleId: z.string().min(1),
  name: z.string().min(1),
  description: z.string().optional(),
  enabled: z.boolean().default(true),
  priority: z.number().default(1000),
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

export type SmartRuleType = z.infer<typeof SmartRuleSchema>;
export default SmartRuleSchema;
