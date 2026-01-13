import { validateProductWithDomains } from './src/index.js';

const validProduct = {
  core: {
    sku: 'TEST-001',
    title: 'Test Product',
    brand: 'Test Brand',
    status: 'draft',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  attributes: {
    gender: "Men's",
    primary_color: 'Black',
    department: 'Mens', // Valid value per registry
  },
};

const result = validateProductWithDomains(validProduct);
console.log('Validation result:', JSON.stringify(result, null, 2));
