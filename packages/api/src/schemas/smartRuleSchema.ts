import { SmartRuleSchema } from '@ropi-aoss/sdk';
import { z } from 'zod';
export function validateSmartRule(data: unknown) {
  return SmartRuleSchema.safeParse(data);
}
export type SmartRuleType = z.infer<typeof SmartRuleSchema>;
