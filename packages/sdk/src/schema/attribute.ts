import { z } from 'zod';

export const AttributeSchema = z.object({
  attribute_id: z.string().min(1).regex(/^[a-z0-9-_]+$/),
  label: z.string().min(1),
  external_header: z.string().optional(),
  category: z.string().optional(),
  data_type: z.enum(['string','number','boolean','enum','currency','json']),
  allowed_values: z.array(z.string()).optional(),
  synonyms: z.array(z.string()).optional(),
  required_for_completion: z.boolean().optional().default(false),
  required_for_export: z.boolean().optional().default(false),
  import_required: z.boolean().optional().default(false),
  ai_usage_notes: z.string().optional(),
  status: z.enum(['active','deprecated','hidden']).optional().default('active'),
  createdBy: z.string().optional(),
  createdAt: z.string().optional(),
  updatedBy: z.string().optional(),
  updatedAt: z.string().optional()
});

export type AttributeType = z.infer<typeof AttributeSchema>;
export default AttributeSchema;
