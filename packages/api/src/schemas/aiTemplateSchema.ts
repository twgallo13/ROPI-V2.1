import { AITemplateSchema } from '../../../sdk/src/schema/aiTemplate';
import { z } from 'zod';
export function validateAITemplate(data: unknown) {
  return AITemplateSchema.safeParse(data);
}
export type AITemplateType = z.infer<typeof AITemplateSchema>;
