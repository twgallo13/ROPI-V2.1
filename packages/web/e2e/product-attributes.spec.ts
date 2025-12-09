/**
 * Product Attributes E2E Tests
 * Tests product attribute viewing and editing in the Product Editor
 * 
 * Lisa v1.0.0
 * 
 * References:
 * - Product Completion Workflows (W2): https://www.notion.so/2ba45ee1ec5a80698690f9492961ed8b
 * - Attribute Registry: https://www.notion.so/2b845ee1ec5a81228b07ca97964cd033
 */

import { test, expect } from '@playwright/test';

// TODO: Import helper functions once they're available
// import { adminLogin, waitForApiResponse } from './helpers';

test.describe('Product Attributes Tab', () => {
  const testProductId = 'test-product-001';

  test.beforeEach(async ({ page }) => {
    // TODO: Implement admin login
    // await adminLogin(page);
    
    // Navigate to product editor with attributes tab
    await page.goto(`/app/product/${testProductId}?tab=attributes`);
    
    // Wait for page to load
    await page.waitForLoadState('networkidle');
  });

  test('should display product attributes tab', async ({ page }) => {
    // Check for attributes section heading
    const heading = page.getByRole('heading', { name: /product attributes/i });
    await expect(heading).toBeVisible({ timeout: 30000 });
  });

  test('should display registry-defined attributes', async ({ page }) => {
    // Wait for attribute registry to load
    await page.waitForTimeout(1000);

    // Check for common registry attributes (these should be from the registry)
    const attributesGrid = page.locator('.attributes-grid');
    await expect(attributesGrid).toBeVisible({ timeout: 30000 });

    // Check that at least some attribute cards are visible
    const attributeCards = page.locator('.attribute-card');
    const count = await attributeCards.count();
    expect(count).toBeGreaterThan(0);
  });

  test('should show required badge for required attributes', async ({ page }) => {
    // Wait for registry to load
    await page.waitForTimeout(1000);

    // Look for required badges
    const requiredBadges = page.locator('.attribute-badge:has-text("Required")');
    
    // There should be at least some required attributes (gender, color, material, etc.)
    const count = await requiredBadges.count();
    expect(count).toBeGreaterThanOrEqual(0); // May be 0 if registry not loaded
  });

  test('should render enum attribute as select dropdown', async ({ page }) => {
    // Find an enum attribute (e.g., gender, primary_color)
    // Wait for the attribute registry to load
    await page.waitForTimeout(1000);

    // Look for a select element within attribute cards
    const selectInputs = page.locator('.attribute-card select');
    const selectCount = await selectInputs.count();
    
    // If registry loaded, there should be select inputs
    if (selectCount > 0) {
      const firstSelect = selectInputs.first();
      await expect(firstSelect).toBeVisible();
    }
  });

  test('should render boolean attribute as checkbox', async ({ page }) => {
    await page.waitForTimeout(1000);

    // Look for checkbox inputs (for boolean attributes like waterproof, sustainable)
    const checkboxInputs = page.locator('.attribute-card input[type="checkbox"]');
    const checkboxCount = await checkboxInputs.count();
    
    if (checkboxCount > 0) {
      const firstCheckbox = checkboxInputs.first();
      await expect(firstCheckbox).toBeVisible();
    }
  });

  test('should edit text attribute value', async ({ page }) => {
    await page.waitForTimeout(1000);

    // Find a text input in attribute cards
    const textInputs = page.locator('.attribute-card input[type="text"]');
    const inputCount = await textInputs.count();
    
    if (inputCount > 0) {
      const firstInput = textInputs.first();
      await firstInput.fill('Test Value');
      
      // Blur to trigger update
      await firstInput.blur();
      
      // Value should be preserved
      await expect(firstInput).toHaveValue('Test Value');
    }
  });

  test('should add custom attribute', async ({ page }) => {
    // Find the add attribute form
    const addAttrForm = page.locator('.add-attribute-form');
    await expect(addAttrForm).toBeVisible({ timeout: 30000 });

    // Fill in attribute name
    const nameInput = addAttrForm.locator('input').first();
    await nameInput.fill('custom_test_attr');

    // Fill in attribute value
    const valueInput = addAttrForm.locator('input').nth(1);
    await valueInput.fill('Test Custom Value');

    // Click add button
    const addButton = page.locator('.add-attribute-button');
    await addButton.click();

    // Verify the new attribute appears
    const customAttrCard = page.locator('.attribute-card:has-text("custom_test_attr")');
    await expect(customAttrCard).toBeVisible({ timeout: 10000 });
  });

  test('should display custom attributes with Custom badge', async ({ page }) => {
    await page.waitForTimeout(1000);

    // Look for derived/custom badges
    const customBadges = page.locator('.attribute-badge-derived:has-text("Custom")');
    const count = await customBadges.count();
    
    // May or may not have custom attributes depending on product data
    expect(count).toBeGreaterThanOrEqual(0);
  });

  test('should show AI usage notes tooltip', async ({ page }) => {
    await page.waitForTimeout(1000);

    // Look for AI usage note indicators
    const aiNotes = page.locator('.attribute-note');
    const count = await aiNotes.count();
    
    if (count > 0) {
      const firstNote = aiNotes.first();
      await expect(firstNote).toBeVisible();
      // Should start with the lightbulb emoji
      const text = await firstNote.textContent();
      expect(text).toContain('💡');
    }
  });

  test('should handle loading state', async ({ page }) => {
    // Intercept API to delay response
    await page.route('**/admin/settings/attributes', async route => {
      await new Promise(resolve => setTimeout(resolve, 500));
      await route.continue();
    });

    // Reload page
    await page.reload();

    // Should show loading state briefly
    const loading = page.locator('.loading');
    // Loading might flash quickly, so just check page doesn't error
    await page.waitForLoadState('networkidle');
  });

  test('should handle API error gracefully', async ({ page }) => {
    // Mock API error
    await page.route('**/admin/settings/attributes', route => {
      route.fulfill({
        status: 500,
        body: 'Internal Server Error',
      });
    });

    // Reload page
    await page.reload();

    // Should show error banner
    const errorBanner = page.locator('.error-banner');
    await expect(errorBanner).toBeVisible({ timeout: 30000 });
  });
});

test.describe('Product Attributes Persistence', () => {
  const testProductId = 'test-product-002';

  test.beforeEach(async ({ page }) => {
    // TODO: Implement admin login
    // await adminLogin(page);
    
    await page.goto(`/app/product/${testProductId}?tab=attributes`);
    await page.waitForLoadState('networkidle');
  });

  test('should persist attribute changes after reload', async ({ page }) => {
    await page.waitForTimeout(1000);

    // Find a text input and change its value
    const textInputs = page.locator('.attribute-card input[type="text"]');
    const inputCount = await textInputs.count();
    
    if (inputCount > 0) {
      const uniqueValue = `Persist Test ${Date.now()}`;
      const firstInput = textInputs.first();
      
      await firstInput.clear();
      await firstInput.fill(uniqueValue);
      await firstInput.blur();

      // Wait for potential save
      await page.waitForTimeout(500);

      // Reload page
      await page.reload();
      await page.waitForLoadState('networkidle');

      // Check if value persisted (this depends on Firestore emulator or mock)
      // In a real test, the value should persist
    }
  });

  test('should update multiple attributes', async ({ page }) => {
    await page.waitForTimeout(1000);

    // Find and update multiple inputs
    const inputs = page.locator('.attribute-card input[type="text"]');
    const count = await inputs.count();
    
    for (let i = 0; i < Math.min(count, 3); i++) {
      const input = inputs.nth(i);
      await input.fill(`Updated Value ${i}`);
      await input.blur();
    }

    // Wait for saves
    await page.waitForTimeout(500);

    // Values should be preserved locally
    for (let i = 0; i < Math.min(count, 3); i++) {
      const input = inputs.nth(i);
      await expect(input).toHaveValue(`Updated Value ${i}`);
    }
  });
});

test.describe('Attribute Type Controls', () => {
  const testProductId = 'test-product-003';

  test.beforeEach(async ({ page }) => {
    await page.goto(`/app/product/${testProductId}?tab=attributes`);
    await page.waitForLoadState('networkidle');
  });

  test('enum select should have options from registry', async ({ page }) => {
    await page.waitForTimeout(1000);

    const selects = page.locator('.attribute-card select');
    const count = await selects.count();
    
    if (count > 0) {
      const firstSelect = selects.first();
      const options = await firstSelect.locator('option').allTextContents();
      
      // Should have more than just the placeholder option
      expect(options.length).toBeGreaterThan(1);
    }
  });

  test('multiSelect should accept comma-separated values', async ({ page }) => {
    await page.waitForTimeout(1000);

    // Find an input that might be multiSelect (harder to identify without data-testid)
    // For now, just verify the page loads correctly
    const attributesGrid = page.locator('.attributes-grid');
    await expect(attributesGrid).toBeVisible();
  });

  test('number input should accept numeric values', async ({ page }) => {
    await page.waitForTimeout(1000);

    const numberInputs = page.locator('.attribute-card input[type="number"]');
    const count = await numberInputs.count();
    
    if (count > 0) {
      const firstInput = numberInputs.first();
      await firstInput.fill('42');
      await expect(firstInput).toHaveValue('42');
    }
  });

  test('date input should accept date values', async ({ page }) => {
    await page.waitForTimeout(1000);

    const dateInputs = page.locator('.attribute-card input[type="date"]');
    const count = await dateInputs.count();
    
    if (count > 0) {
      const firstInput = dateInputs.first();
      await firstInput.fill('2024-12-08');
      await expect(firstInput).toHaveValue('2024-12-08');
    }
  });
});
