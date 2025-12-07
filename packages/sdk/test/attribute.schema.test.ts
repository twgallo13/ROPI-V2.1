import { AttributeSchema } from '../src/schema/attribute';

describe('AttributeSchema', () => {
  test('valid attribute passes', () => {
    const obj = {
      attribute_id: 'color-primary',
      label: 'Color Primary',
      data_type: 'string'
    };
    const parsed = AttributeSchema.safeParse(obj);
    expect(parsed.success).toBe(true);
  });

  test('invalid attribute id fails', () => {
    const obj = { attribute_id: 'Invalid ID', label: 'Bad', data_type: 'string' };
    const parsed = AttributeSchema.safeParse(obj);
    expect(parsed.success).toBe(false);
  });
});
