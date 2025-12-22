/**
 * Attribute CRUD E2E Tests
 * Tests admin attribute management workflow
 * 
 * Lisa v0.2.0
 */

import { test, expect } from '@playwright/test';
import { TEST_USERS, signInWithEmail } from './helpers';

test.describe('Admin Attribute Management', () => {
  test.beforeEach(async ({ page }) => {
    // Sign in as admin first
    await signInWithEmail(page, TEST_USERS.admin.email, TEST_USERS.admin.password);
    
    // Navigate to attributes page
    await page.goto('/settings/attributes');
    
    // Wait for page to load
    const pageHeading = page.getByRole('heading', { name: /attribute manager/i, level: 1 });
    await pageHeading.waitFor({ state: 'visible', timeout: 30000 });
    
    // Wait for New Attribute button to be visible
    const newBtn = page.getByTestId('new-attribute-button');
    await newBtn.waitFor({ state: 'visible', timeout: 30000 });
  });

  test('should display attribute manager page', async ({ page }) => {
    const pageHeading = page.getByRole('heading', { name: /Attribute Manager/i, level: 1 });
    await expect(pageHeading).toBeVisible();
    await expect(page.getByTestId('new-attribute-button')).toBeVisible();
  });

  test('should create a new attribute', async ({ page }) => {
    // Click New Attribute button
    const newAttrBtn = page.getByTestId('new-attribute-button');
    await newAttrBtn.waitFor({ state: 'visible', timeout: 60000 });
    await newAttrBtn.click();
    
    // Wait for form to appear
    const form = page.locator('.attribute-form');
    await form.waitFor({ state: 'visible', timeout: 30000 });
    
    // Fill in form using testids
    const attrIdInput = page.getByTestId('attribute-id-input');
    await attrIdInput.fill('test-attr-001');
    
    const labelInput = page.getByTestId('attribute-label-input');
    await labelInput.fill('Test Attribute');
    
    const dataTypeSelect = page.getByTestId('data-type-select');
    await dataTypeSelect.selectOption('string');
    
    const categoryInput = page.getByTestId('category-input');
    await categoryInput.fill('Testing');
    
    // Save
    // await page.getByTestId('save-attribute-button').click();
    
    // TODO: Wait for API response
    // await waitForApiResponse(page, '/admin/settings/attributes');
    
    // Verify attribute appears in list
    // await expect(page.locator('text=Test Attribute')).toBeVisible();
  });

  test('should edit an existing attribute', async ({ page }) => {
    // TODO: Create a test attribute first
    
    // Click edit on first attribute
    // await page.click('.attribute-item:first-child button:has-text("Edit")');
    
    // Modify label
    // await page.fill('input[name="label"]', 'Updated Test Attribute');
    
    // Save
    // await page.click('button:has-text("Update")');
    
    // Verify update
    // await expect(page.locator('text=Updated Test Attribute')).toBeVisible();
  });

  test('should delete an attribute', async ({ page }) => {
    // TODO: Create a test attribute first
    
    // Mock confirmation dialog
    page.on('dialog', dialog => dialog.accept());
    
    // Click delete on first attribute
    // await page.click('.attribute-item:first-child button:has-text("Delete")');
    
    // TODO: Wait for API response
    // await waitForApiResponse(page, '/admin/settings/attributes/*');
    
    // Verify attribute removed from list
    // await expect(page.locator('.attribute-item:first-child')).not.toBeVisible();
  });

  test('should validate required fields', async ({ page }) => {
    // Click New Attribute button
    await page.getByTestId('new-attribute-button').click();
    
    // Wait for form to appear
    const form = page.locator('.attribute-form');
    await form.waitFor({ state: 'visible', timeout: 30000 });
    
    // Try to save without filling required fields
    // await page.click('button:has-text("Create")');
    
    // TODO: Verify validation errors appear
    // await expect(page.locator('.error:has-text("required")')).toBeVisible();
  });

  test('should filter attributes by status', async ({ page }) => {
    // TODO: Implement filter UI and test
    // await page.selectOption('select[name="status-filter"]', 'active');
    // await expect(page.locator('.attribute-item[data-status="active"]')).toBeVisible();
    // await expect(page.locator('.attribute-item[data-status="deprecated"]')).not.toBeVisible();
  });

  test('should search attributes', async ({ page }) => {
    // TODO: Implement search UI and test
    // await page.fill('input[name="search"]', 'brand');
    // await expect(page.locator('.attribute-item:has-text("brand")')).toBeVisible();
  });

  test('should handle API errors gracefully', async ({ page }) => {
    // TODO: Mock API error response
    // await page.route('**/admin/settings/attributes', route => {
    //   route.fulfill({ status: 500, body: 'Internal Server Error' });
    // });
    
    // await page.reload();
    
    // Verify error message displayed
    // await expect(page.locator('.error')).toContainText('Failed to load attributes');
  });

  test('should paginate attribute list', async ({ page }) => {
    // TODO: Create enough attributes to trigger pagination
    // await expect(page.locator('.pagination')).toBeVisible();
    // await page.click('button:has-text("Next")');
    // await expect(page.locator('.attribute-item')).toHaveCount(10);
  });

  test('should cancel attribute creation', async ({ page }) => {
    // Click New Attribute button
    const newAttrBtn = page.getByTestId('new-attribute-button');
    await newAttrBtn.waitFor({ state: 'visible', timeout: 60000 });
    await newAttrBtn.click();
    
    // Wait for form to appear
    const form = page.locator('.attribute-form');
    await form.waitFor({ state: 'visible', timeout: 30000 });
    
    // Fill in partial data using testid
    const attrIdInput = page.getByTestId('attribute-id-input');
    await attrIdInput.fill('cancelled-attr');
    
    // Cancel using testid
    const cancelBtn = page.getByTestId('cancel-attribute-button');
    await cancelBtn.click();
    
    // Verify form is hidden
    await form.waitFor({ state: 'hidden', timeout: 60000 });
  });
});

test.describe('Attribute Form Validation', () => {
  test.beforeEach(async ({ page }) => {
    // TODO: Admin login
    await page.goto('/settings/attributes');
    
    // Wait for New Attribute button and click it
    const newBtn = page.getByTestId('new-attribute-button');
    await newBtn.waitFor({ state: 'visible', timeout: 60000 });
    await newBtn.click();
    
    // Wait for form to appear
    const form = page.locator('.attribute-form');
    await form.waitFor({ state: 'visible', timeout: 30000 });
  });

  test('should validate attribute_id format', async ({ page }) => {
    // Test invalid characters using testid
    const attrIdInput = page.getByTestId('attribute-id-input');
    await attrIdInput.fill('Invalid ID With Spaces');
    // TODO: Verify validation error
  });

  test('should validate data_type selection', async ({ page }) => {
    // Ensure data_type is required
    // TODO: Test enum values work correctly
  });

  test('should show allowed_values field for enum type', async ({ page }) => {
    const dataTypeSelect = page.getByTestId('data-type-select');
    await dataTypeSelect.selectOption('enum');
    // TODO: Verify allowed_values input appears
    // const allowedValuesInput = page.getByTestId('allowed-values-input');
    // await expect(allowedValuesInput).toBeVisible();
  });
});
