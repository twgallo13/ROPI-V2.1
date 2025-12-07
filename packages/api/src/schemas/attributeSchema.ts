import { z } from 'zod';
import { AttributeSchema } from '@ropi-aoss/sdk';

export function validateAttribute(data: unknown) {
  return AttributeSchema.safeParse(data);
}
export type AttributeType = z.infer<typeof AttributeSchema>;
