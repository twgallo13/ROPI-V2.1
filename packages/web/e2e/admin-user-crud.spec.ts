/**
 * User Management E2E Tests
 * Tests admin user management workflow
 * 
 * Homer v1.0.0 - User Management
 */

import { test, expect } from '@playwright/test';

test.describe('Admin User Management', () => {
  test.beforeEach(async ({ page }) => {
    // TODO: Implement admin login helper
    // await adminLogin(page);
    
    // Navigate to users page
    await page.goto('/settings/users');
    
    // Wait for page to load
    await page.waitForSelector('h1:has-text("User Management")', { timeout: 60000 });
  });

  test('should display user management page', async ({ page }) => {
    // Verify page heading
    await expect(page.locator('h1')).toContainText('User Management');
    
    // Verify Create User button is visible
    await expect(page.locator('button:has-text("Create User")')).toBeVisible();
    
    // Verify search input is visible
    await expect(page.locator('input[placeholder*="Search"]')).toBeVisible();
  });

  test('should display users table', async ({ page }) => {
    // Wait for table to load
    await page.waitForSelector('.users-table', { timeout: 30000 });
    
    // Verify table headers
    await expect(page.locator('th:has-text("Email")')).toBeVisible();
    await expect(page.locator('th:has-text("Display Name")')).toBeVisible();
    await expect(page.locator('th:has-text("Role")')).toBeVisible();
    await expect(page.locator('th:has-text("Email Verified")')).toBeVisible();
    await expect(page.locator('th:has-text("Last Sign In")')).toBeVisible();
    await expect(page.locator('th:has-text("Status")')).toBeVisible();
    await expect(page.locator('th:has-text("Actions")')).toBeVisible();
  });

  test('should search users by email', async ({ page }) => {
    // Wait for table to load
    await page.waitForSelector('.users-table tbody tr', { timeout: 30000 });
    
    // Count initial rows
    const initialCount = await page.locator('.users-table tbody tr').count();
    expect(initialCount).toBeGreaterThan(0);
    
    // Search for specific email
    const searchInput = page.locator('input[placeholder*="Search"]');
    await searchInput.fill('theo@');
    
    // Wait for filtering
    await page.waitForTimeout(500);
    
    // Verify filtered results
    const filteredCount = await page.locator('.users-table tbody tr').count();
    expect(filteredCount).toBeLessThanOrEqual(initialCount);
    
    // Verify search term appears in results
    if (filteredCount > 0) {
      const firstEmail = await page.locator('.users-table tbody tr:first-child td:first-child').textContent();
      expect(firstEmail?.toLowerCase()).toContain('theo');
    }
  });

  test('should open create user modal', async ({ page }) => {
    // Click Create User button
    await page.click('button:has-text("Create User")');
    
    // Wait for modal to appear
    await page.waitForSelector('.modal', { timeout: 10000 });
    
    // Verify modal title
    await expect(page.locator('.modal h2')).toContainText('Create New User');
    
    // Verify form fields
    await expect(page.locator('#email')).toBeVisible();
    await expect(page.locator('#displayName')).toBeVisible();
    await expect(page.locator('#role')).toBeVisible();
    await expect(page.locator('input[type="checkbox"]')).toBeVisible();
    
    // Close modal
    await page.click('.modal-close');
    await page.waitForSelector('.modal', { state: 'hidden', timeout: 5000 });
  });

  test('should create a new user with password', async ({ page }) => {
    // Click Create User button
    await page.click('button:has-text("Create User")');
    
    // Wait for modal
    await page.waitForSelector('.modal');
    
    // Fill in form
    const timestamp = Date.now();
    const testEmail = `testuser${timestamp}@example.com`;
    
    await page.fill('#email', testEmail);
    await page.fill('#displayName', 'Test User');
    await page.selectOption('#role', 'user');
    await page.fill('#password', 'TestPassword123!');
    
    // Submit form
    await page.click('button[type="submit"]:has-text("Create User")');
    
    // Wait for success message
    await page.waitForSelector('.alert-success', { timeout: 10000 });
    await expect(page.locator('.alert-success')).toContainText('created successfully');
    
    // Verify user appears in table
    await page.waitForTimeout(1000);
    await expect(page.locator(`.users-table tbody tr:has-text("${testEmail}")`)).toBeVisible();
  });

  test('should create a new user with invite', async ({ page }) => {
    // Click Create User button
    await page.click('button:has-text("Create User")');
    
    // Wait for modal
    await page.waitForSelector('.modal');
    
    // Fill in form with invite option
    const timestamp = Date.now();
    const testEmail = `inviteuser${timestamp}@example.com`;
    
    await page.fill('#email', testEmail);
    await page.fill('#displayName', 'Invite User');
    await page.selectOption('#role', 'store');
    
    // Check send invite
    await page.check('input[type="checkbox"]');
    
    // Verify password field is hidden when invite is checked
    const passwordField = page.locator('#password');
    await expect(passwordField).not.toBeVisible();
    
    // Submit form
    await page.click('button[type="submit"]:has-text("Create User")');
    
    // Wait for success message
    await page.waitForSelector('.alert-success', { timeout: 10000 });
  });

  test('should edit user role', async ({ page }) => {
    // Wait for table to load
    await page.waitForSelector('.users-table tbody tr', { timeout: 30000 });
    
    // Click edit button on first non-current-user row
    // (Skip current user to avoid self-demotion)
    const editButtons = page.locator('.btn-action:has-text("✏️")');
    await editButtons.first().click();
    
    // Wait for edit modal
    await page.waitForSelector('.modal:has-text("Edit User")');
    
    // Change role (if not current user)
    const roleSelect = page.locator('#edit-role');
    if (!await roleSelect.isDisabled()) {
      await roleSelect.selectOption('district');
    }
    
    // Update display name
    await page.fill('#edit-displayName', 'Updated Display Name');
    
    // Save changes
    await page.click('button[type="submit"]:has-text("Save Changes")');
    
    // Wait for success message
    await page.waitForSelector('.alert-success', { timeout: 10000 });
    await expect(page.locator('.alert-success')).toContainText('updated successfully');
  });

  test('should send password reset', async ({ page }) => {
    // Wait for table to load
    await page.waitForSelector('.users-table tbody tr', { timeout: 30000 });
    
    // Click reset password button on first row
    const resetButtons = page.locator('.btn-action:has-text("🔑")');
    const firstResetButton = resetButtons.first();
    
    // Verify button is not disabled
    await expect(firstResetButton).not.toBeDisabled();
    
    await firstResetButton.click();
    
    // Wait for success message
    await page.waitForSelector('.alert-success', { timeout: 10000 });
    await expect(page.locator('.alert-success')).toContainText('Password reset');
  });

  test('should disable user (soft delete)', async ({ page }) => {
    // Create a test user first
    await page.click('button:has-text("Create User")');
    await page.waitForSelector('.modal');
    
    const timestamp = Date.now();
    const testEmail = `deleteuser${timestamp}@example.com`;
    
    await page.fill('#email', testEmail);
    await page.fill('#displayName', 'Delete Test User');
    await page.fill('#password', 'TestPassword123!');
    await page.click('button[type="submit"]:has-text("Create User")');
    await page.waitForSelector('.alert-success');
    
    // Find the newly created user row
    const userRow = page.locator(`.users-table tbody tr:has-text("${testEmail}")`);
    await userRow.waitFor({ state: 'visible' });
    
    // Click disable button (🚫)
    const disableButton = userRow.locator('.btn-action:has-text("🚫")');
    
    // Handle confirmation dialog
    page.once('dialog', dialog => dialog.accept());
    await disableButton.click();
    
    // Wait for success message
    await page.waitForSelector('.alert-success', { timeout: 10000 });
    await expect(page.locator('.alert-success')).toContainText('disabled successfully');
  });

  test('should prevent self-deletion', async ({ page }) => {
    // Wait for table to load
    await page.waitForSelector('.users-table tbody tr', { timeout: 30000 });
    
    // Find current user's row (should have no delete buttons)
    // Current user is the admin who is logged in
    const currentUserEmail = await page.evaluate(() => {
      return window.localStorage.getItem('currentUserEmail') || 'theo@shiekhshoes.org';
    });
    
    const currentUserRow = page.locator(`.users-table tbody tr:has-text("${currentUserEmail}")`);
    
    if (await currentUserRow.count() > 0) {
      // Verify delete buttons are not present for current user
      const deleteButtons = currentUserRow.locator('.btn-action:has-text("🗑️")');
      await expect(deleteButtons).not.toBeVisible();
    }
  });

  test('should display role badges with correct colors', async ({ page }) => {
    // Wait for table to load
    await page.waitForSelector('.users-table tbody tr', { timeout: 30000 });
    
    // Check for role badges
    const roleBadges = page.locator('.role-badge');
    const count = await roleBadges.count();
    
    expect(count).toBeGreaterThan(0);
    
    // Verify badge classes exist
    const adminBadges = page.locator('.role-admin');
    const districtBadges = page.locator('.role-district');
    const storeBadges = page.locator('.role-store');
    const userBadges = page.locator('.role-user');
    
    // At least one badge type should be visible
    const totalBadges = await adminBadges.count() + 
                        await districtBadges.count() + 
                        await storeBadges.count() + 
                        await userBadges.count();
    
    expect(totalBadges).toBeGreaterThan(0);
  });

  test('should display email verification status', async ({ page }) => {
    // Wait for table to load
    await page.waitForSelector('.users-table tbody tr', { timeout: 30000 });
    
    // Check for verification status badges
    const verifiedBadges = page.locator('.status-verified');
    const unverifiedBadges = page.locator('.status-unverified');
    
    const verifiedCount = await verifiedBadges.count();
    const unverifiedCount = await unverifiedBadges.count();
    
    // At least one status should be visible
    expect(verifiedCount + unverifiedCount).toBeGreaterThan(0);
  });

  test('should paginate users if more than page limit', async ({ page }) => {
    // Wait for table to load
    await page.waitForSelector('.users-table tbody tr', { timeout: 30000 });
    
    // Check if "Load More" button exists
    const loadMoreButton = page.locator('button:has-text("Load More")');
    
    if (await loadMoreButton.isVisible()) {
      // Get initial row count
      const initialCount = await page.locator('.users-table tbody tr').count();
      
      // Click Load More
      await loadMoreButton.click();
      
      // Wait for new rows to load
      await page.waitForTimeout(2000);
      
      // Verify more rows are loaded
      const newCount = await page.locator('.users-table tbody tr').count();
      expect(newCount).toBeGreaterThan(initialCount);
    }
  });

  test('should validate required fields on create', async ({ page }) => {
    // Click Create User button
    await page.click('button:has-text("Create User")');
    
    // Wait for modal
    await page.waitForSelector('.modal');
    
    // Try to submit without filling required fields
    await page.click('button[type="submit"]:has-text("Create User")');
    
    // Verify HTML5 validation or custom error
    const emailInput = page.locator('#email');
    const isInvalid = await emailInput.evaluate((el: HTMLInputElement) => {
      return !el.validity.valid || el.validationMessage !== '';
    });
    
    expect(isInvalid).toBe(true);
  });

  test('should prevent role dropdown edit for current user', async ({ page }) => {
    // Wait for table to load
    await page.waitForSelector('.users-table tbody tr', { timeout: 30000 });
    
    // Get current user email
    const currentUserEmail = await page.evaluate(() => {
      return window.localStorage.getItem('currentUserEmail') || 'theo@shiekhshoes.org';
    });
    
    // Find current user row
    const currentUserRow = page.locator(`.users-table tbody tr:has-text("${currentUserEmail}")`);
    
    if (await currentUserRow.count() > 0) {
      // Click edit on current user
      await currentUserRow.locator('.btn-action:has-text("✏️")').click();
      
      // Wait for edit modal
      await page.waitForSelector('.modal:has-text("Edit User")');
      
      // Verify role select is disabled
      const roleSelect = page.locator('#edit-role');
      await expect(roleSelect).toBeDisabled();
      
      // Verify hint message is shown
      await expect(page.locator('text=Cannot change your own role')).toBeVisible();
    }
  });
});
