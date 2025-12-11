// packages/web/src/lib/stringUtils.ts
export function toSnakeCase(input: string) {
  if (!input) return input;
  const replaced = input
    .replace(/\./g, '_')
    .replace(/[\s\-]+/g, '_')
    .replace(/([a-z0-9])([A-Z])/g, (_, a, b) => `${a}_${b}`)
    .replace(/__+/g, '_')
    .toLowerCase()
    .replace(/[^a-z0-9_]/g, '');
  return replaced.startsWith('_') ? replaced.slice(1) : replaced;
}

export default toSnakeCase;
