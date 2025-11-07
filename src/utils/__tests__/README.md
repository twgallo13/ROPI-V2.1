# CSV Parser Tests

## Overview
Unit tests for the CSV parser mapping functionality, covering:
- SKU mapping (ensures SKU maps to 'sku', not 'product_id')
- RICS fields (category, long description)
- Shipping dimensions (height, width, length, weight)
- DEFAULT_IGNORE list functionality
- Duplicate header detection
- Priority matching (exact > word-boundary > fuzzy)

## Running Tests
To run these tests, you'll need to install Jest:

```bash
npm install --save-dev jest @types/jest ts-jest
```

Then add to package.json:
```json
{
  "scripts": {
    "test": "jest"
  }
}
```

Create jest.config.js:
```javascript
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  testMatch: ['**/__tests__/**/*.test.ts'],
};
```

Run tests:
```bash
npm test
```

## Test Coverage
- ✅ SKU exact matching
- ✅ RICS field mapping
- ✅ Shipping dimension fields (with short codes)
- ✅ DEFAULT_IGNORE headers
- ✅ Duplicate header handling
- ✅ Priority matching algorithm
- ✅ Word-boundary regex matching
