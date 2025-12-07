import { z } from 'zod';
import { AttributeSchema } from '../../../sdk/src/schema/attribute';

export function validateAttribute(data: unknown) {
  return AttributeSchema.safeParse(data);
}
export type AttributeType = z.infer<typeof AttributeSchema>;
