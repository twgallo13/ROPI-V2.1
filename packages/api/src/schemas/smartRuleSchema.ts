import { SmartRuleSchema } from '../../../sdk/src/schema/smartRule';
import { z } from 'zod';
export function validateSmartRule(data: unknown) {
  return SmartRuleSchema.safeParse(data);
}
export type SmartRuleType = z.infer<typeof SmartRuleSchema>;
