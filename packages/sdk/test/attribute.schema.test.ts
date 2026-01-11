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

  test('AttributeSchema accepts ai_use and defaults to false', () => {
    const parsed = AttributeSchema.parse({
      attribute_id: 'test_attr',
      label: 'Test Attr',
      data_type: 'string',
    } as any);
    expect(parsed.ai_use).toBe(false);

    const parsedTrue = AttributeSchema.parse({
      attribute_id: 'test_attr2',
      label: 'Test Attr 2',
      data_type: 'string',
      ai_use: true,
    } as any);
    expect(parsedTrue.ai_use).toBe(true);
  });
});
