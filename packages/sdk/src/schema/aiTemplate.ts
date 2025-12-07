import { z } from 'zod';

const Condition = z.object({
  field: z.string(),
  op: z.string(),
  value: z.string().optional()
});

const Voice = z.object({
  preset: z.string().optional(),
  avoid: z.array(z.string()).optional(),
  brandRules: z.array(z.string()).optional()
}).optional();

export const AITemplateSchema = z.object({
  key: z.string().min(1),
  title: z.string().min(1),
  description: z.string().optional(),
  status: z.enum(['active','draft','disabled']).default('draft'),
  scope: z.enum(['global','store','brand']).optional().default('global'),
  version: z.number().optional(),
  conditions: z.array(Condition).optional(),
  matchMode: z.enum(['first','best','all']).optional().default('best'),
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

export type AITemplateType = z.infer<typeof AITemplateSchema>;
export default AITemplateSchema;
