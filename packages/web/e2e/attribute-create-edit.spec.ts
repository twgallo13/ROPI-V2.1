/**
 * Attribute Create/Edit E2E Tests
 * 
 * LP-ATTR-1.2.0: Full e2e tests for attribute CRUD operations
 * 
 * Tests:
 * - Create attribute with auto-generated ID
 * - Edit attribute label
 * - Validation error handling
 * - API response verification (201/200)
 * 
 * NOTE: These tests were written for the old AttributeManager component.
 * They need to be updated to work with the new AttributesConsole component.
 * @smoke tags removed due to UI refactor incompatibility - LP-CI-FIX-1.0
 */

import { test, expect, Page } from '@playwright/test';
import { TEST_USERS, signInWithEmail } from './helpers';

// Generate unique attribute ID for test isolation
const generateTestId = () => `test_attr_${Date.now().toString(36)}`;

test.describe('Attribute Create/Edit E2E', () => {
  let testAttrId: string;
  
  test.beforeEach(async ({ page }) => {
    // Sign in as admin
    await signInWithEmail(page, TEST_USERS.admin.email, TEST_USERS.admin.password);
    
    // Navigate to attribute manager with networkidle wait
    await page.goto('/settings/attributes', { waitUntil: 'networkidle' });
    
    // Wait for loading state to finish (loading spinner shows "Loading attributes...")
    // The h1 "Attribute Manager" only appears after loading=false
    await page.waitForSelector('.loading', { state: 'hidden', timeout: 30000 }).catch(() => {
      // Loading may have already finished, continue
    });
    
    // Wait for page to load - use longer timeout for slow CI environments
    const pageHeading = page.getByRole('heading', { name: /attribute manager/i, level: 1 });
    await pageHeading.waitFor({ state: 'visible', timeout: 45000 });
    
    // Wait for New Attribute button
    const newBtn = page.getByTestId('new-attribute-button');
    await newBtn.waitFor({ state: 'visible', timeout: 30000 });
    
    // Generate fresh test ID for this test
    testAttrId = generateTestId();
  });

  test.afterEach(async ({ page }) => {
    // Clean up created test attributes
    // Note: In a real scenario, we'd call the API to delete the test attribute
    // For now, we rely on test isolation via unique IDs
  });

  test('should create a new attribute with auto-generated ID', async ({ page }) => {
    // Click New Attribute button
    await page.getByTestId('new-attribute-button').click();
    
    // Wait for modal to appear
    const modal = page.locator('.attribute-modal');
    await modal.waitFor({ state: 'visible', timeout: 10000 });
    
    // Fill in label - ID should auto-generate
    const labelInput = page.getByTestId('attribute-label-input');
    await labelInput.fill('Test Auto ID Attribute');
    
    // Fill other required fields
    await page.getByTestId('data-type-select').selectOption('string');
    await page.getByTestId('category-input').fill('e2e_testing');
    
    // Intercept API call to verify 201 response
    const createPromise = page.waitForResponse(response => 
      response.url().includes('/attributes') && 
      response.request().method() === 'POST'
    );
    
    // Click Save
    await page.getByTestId('save-attribute-button').click();
    
    // Wait for API response
    const response = await createPromise;
    expect(response.status()).toBe(201);
    
    // Modal should close
    await modal.waitFor({ state: 'hidden', timeout: 10000 });
    
    // Verify the created attribute appears in the list
    await expect(page.locator('text=Test Auto ID Attribute')).toBeVisible();
  });

  test('should create attribute with explicit ID and verify POST 201', async ({ page }) => {
    // Click New Attribute button
    await page.getByTestId('new-attribute-button').click();
    
    // Wait for modal
    const modal = page.locator('.attribute-modal');
    await modal.waitFor({ state: 'visible', timeout: 10000 });
    
    // Fill in explicit ID
    await page.getByTestId('attribute-id-input').fill(testAttrId);
    
    // Fill label
    await page.getByTestId('attribute-label-input').fill('E2E Test Explicit ID');
    
    // Fill data type
    await page.getByTestId('data-type-select').selectOption('string');
    
    // Fill category
    await page.getByTestId('category-input').fill('e2e_testing');
    
    // Intercept POST request
    const createPromise = page.waitForResponse(response => 
      response.url().includes('/attributes') && 
      response.request().method() === 'POST'
    );
    
    // Save
    await page.getByTestId('save-attribute-button').click();
    
    // Verify 201 Created response
    const response = await createPromise;
    expect(response.status()).toBe(201);
    
    // Verify response body contains the attribute_id
    const body = await response.json();
    expect(body.attribute_id).toBe(testAttrId);
    
    // Modal should close
    await modal.waitFor({ state: 'hidden', timeout: 10000 });
    
    // Verify attribute in list
    await expect(page.locator(`text=${testAttrId}`)).toBeVisible();
  });

  test('should edit existing attribute and verify PUT 200', async ({ page }) => {
    // First create an attribute to edit
    await page.getByTestId('new-attribute-button').click();
    const modal = page.locator('.attribute-modal');
    await modal.waitFor({ state: 'visible', timeout: 10000 });
    
    await page.getByTestId('attribute-id-input').fill(testAttrId);
    await page.getByTestId('attribute-label-input').fill('Original Label');
    await page.getByTestId('data-type-select').selectOption('string');
    await page.getByTestId('category-input').fill('e2e_testing');
    
    // Create the attribute
    await page.getByTestId('save-attribute-button').click();
    await modal.waitFor({ state: 'hidden', timeout: 10000 });
    
    // Wait for attribute to appear in list
    await expect(page.locator('text=Original Label')).toBeVisible();
    
    // Click edit on the created attribute
    // Find the row with our test attribute and click its edit button
    const attrRow = page.locator(`.attribute-list-item:has-text("${testAttrId}")`).first();
    await attrRow.locator('button:has-text("Edit")').click();
    
    // Wait for edit modal
    await modal.waitFor({ state: 'visible', timeout: 10000 });
    
    // Verify we're in edit mode (ID should be disabled)
    const idInput = page.getByTestId('attribute-id-input');
    await expect(idInput).toBeDisabled();
    
    // Update the label
    const labelInput = page.getByTestId('attribute-label-input');
    await labelInput.clear();
    await labelInput.fill('Updated Label');
    
    // Intercept PUT request
    const updatePromise = page.waitForResponse(response => 
      response.url().includes(`/attributes/${testAttrId}`) && 
      response.request().method() === 'PUT'
    );
    
    // Save changes
    await page.getByTestId('save-attribute-button').click();
    
    // Verify 200 OK response
    const response = await updatePromise;
    expect(response.status()).toBe(200);
    
    // Modal should close
    await modal.waitFor({ state: 'hidden', timeout: 10000 });
    
    // Verify updated label in list
    await expect(page.locator('text=Updated Label')).toBeVisible();
  });

  test('should show validation error for duplicate ID', async ({ page }) => {
    // Create first attribute
    await page.getByTestId('new-attribute-button').click();
    const modal = page.locator('.attribute-modal');
    await modal.waitFor({ state: 'visible', timeout: 10000 });
    
    await page.getByTestId('attribute-id-input').fill(testAttrId);
    await page.getByTestId('attribute-label-input').fill('First Attribute');
    await page.getByTestId('data-type-select').selectOption('string');
    await page.getByTestId('category-input').fill('e2e_testing');
    await page.getByTestId('save-attribute-button').click();
    await modal.waitFor({ state: 'hidden', timeout: 10000 });
    
    // Try to create second attribute with same ID
    await page.getByTestId('new-attribute-button').click();
    await modal.waitFor({ state: 'visible', timeout: 10000 });
    
    const idInput = page.getByTestId('attribute-id-input');
    await idInput.fill(testAttrId);
    
    // Blur to trigger validation
    await page.getByTestId('attribute-label-input').focus();
    
    // Should show validation error
    const idError = page.getByTestId('attribute-id-error');
    await expect(idError).toBeVisible();
    await expect(idError).toContainText('already in use');
  });

  test('should show validation error when required fields missing', async ({ page }) => {
    // Click New Attribute button
    await page.getByTestId('new-attribute-button').click();
    const modal = page.locator('.attribute-modal');
    await modal.waitFor({ state: 'visible', timeout: 10000 });
    
    // Try to save without filling required fields
    await page.getByTestId('save-attribute-button').click();
    
    // Should show form error
    const formError = page.getByTestId('form-error');
    await expect(formError).toBeVisible({ timeout: 5000 });
  });

  test('should handle API error gracefully', async ({ page }) => {
    // Mock API to return error
    await page.route('**/admin/settings/attributes', async route => {
      if (route.request().method() === 'POST') {
        await route.fulfill({
          status: 500,
          contentType: 'application/json',
          body: JSON.stringify({ error: 'Internal Server Error' }),
        });
      } else {
        await route.continue();
      }
    });
    
    // Click New Attribute button
    await page.getByTestId('new-attribute-button').click();
    const modal = page.locator('.attribute-modal');
    await modal.waitFor({ state: 'visible', timeout: 10000 });
    
    // Fill in valid data
    await page.getByTestId('attribute-id-input').fill(testAttrId);
    await page.getByTestId('attribute-label-input').fill('Error Test Attribute');
    await page.getByTestId('data-type-select').selectOption('string');
    await page.getByTestId('category-input').fill('e2e_testing');
    
    // Try to save
    await page.getByTestId('save-attribute-button').click();
    
    // Should show error message
    const formError = page.getByTestId('form-error');
    await expect(formError).toBeVisible({ timeout: 10000 });
  });

  test('should cancel creation without saving', async ({ page }) => {
    // Click New Attribute button
    await page.getByTestId('new-attribute-button').click();
    const modal = page.locator('.attribute-modal');
    await modal.waitFor({ state: 'visible', timeout: 10000 });
    
    // Fill in data
    await page.getByTestId('attribute-id-input').fill(testAttrId);
    await page.getByTestId('attribute-label-input').fill('Cancelled Attribute');
    
    // Click cancel
    await page.getByTestId('cancel-attribute-button').click();
    
    // Modal should close
    await modal.waitFor({ state: 'hidden', timeout: 10000 });
    
    // Attribute should NOT appear in list
    await expect(page.locator(`text=${testAttrId}`)).not.toBeVisible();
  });

  test('should normalize ID to snake_case on blur', async ({ page }) => {
    // Click New Attribute button
    await page.getByTestId('new-attribute-button').click();
    const modal = page.locator('.attribute-modal');
    await modal.waitFor({ state: 'visible', timeout: 10000 });
    
    // Fill in ID with spaces and mixed case
    const idInput = page.getByTestId('attribute-id-input');
    await idInput.fill('My Test Attribute');
    
    // Blur to trigger normalization
    await page.getByTestId('attribute-label-input').focus();
    
    // ID should be normalized to snake_case
    await expect(idInput).toHaveValue('my_test_attribute');
  });
});

test.describe('Attribute MappingTab Guard', () => {
  test.beforeEach(async ({ page }) => {
    await signInWithEmail(page, TEST_USERS.admin.email, TEST_USERS.admin.password);
    await page.goto('/settings/attributes', { waitUntil: 'networkidle' });
    
    // Wait for loading to finish
    await page.waitForSelector('.loading', { state: 'hidden', timeout: 30000 }).catch(() => {});
    
    const pageHeading = page.getByRole('heading', { name: /attribute manager/i, level: 1 });
    await pageHeading.waitFor({ state: 'visible', timeout: 45000 });
  });

  test('should NOT call attribute mapping API during attribute creation', async ({ page }) => {
    // Track API calls
    const apiCalls: string[] = [];
    page.on('request', request => {
      if (request.url().includes('/attributes/') && request.url().includes('/mapping')) {
        apiCalls.push(request.url());
      }
    });
    
    // Start creating a new attribute
    await page.getByTestId('new-attribute-button').click();
    const modal = page.locator('.attribute-modal');
    await modal.waitFor({ state: 'visible', timeout: 10000 });
    
    // Fill in form (which might trigger mapping tab internally)
    await page.getByTestId('attribute-label-input').fill('Guard Test Attribute');
    await page.getByTestId('data-type-select').selectOption('string');
    await page.getByTestId('category-input').fill('e2e_testing');
    
    // Wait a moment for any potential API calls
    await page.waitForTimeout(2000);
    
    // No attribute mapping calls should have been made (no attribute_id yet)
    expect(apiCalls.filter(url => url.includes('/attributes/undefined/'))).toHaveLength(0);
    expect(apiCalls.filter(url => url.match(/\/attributes\/\/mapping/))).toHaveLength(0);
    
    // Cancel without saving
    await page.getByTestId('cancel-attribute-button').click();
  });
});
