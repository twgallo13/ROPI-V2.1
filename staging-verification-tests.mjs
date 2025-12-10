#!/usr/bin/env node

/**
 * Staging Verification Tests for aoss.v0.8.1
 * Tests the following:
 * 1. Admin endpoints (users, roles)
 * 2. User CRUD operations
 * 3. 204 No Content handling
 * 4. ConfirmModal integration
 */

const STAGING_API_BASE = 'https://ropi-aoss-staging.web.app';
const API_BASE = 'https://ropi-aoss-staging.web.app/api';

// Color codes for output
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
};

function log(color, ...args) {
  console.log(`${color}`, ...args, colors.reset);
}

async function testAdminEndpoints(token) {
  log(colors.cyan, '\n=== Testing Admin Endpoints ===');
  
  try {
    // Test /api/admin/settings/users
    log(colors.blue, 'Testing GET /api/admin/settings/users');
    const usersRes = await fetch(`${API_BASE}/admin/settings/users`, {
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    });
    
    if (usersRes.status === 200) {
      const data = await usersRes.json();
      log(colors.green, `✓ GET /api/admin/settings/users → ${usersRes.status} OK`);
      log(colors.blue, `  Response contains users: ${data.users?.length || 0} users`);
    } else {
      log(colors.red, `✗ GET /api/admin/settings/users → ${usersRes.status}`);
    }
    
    // Test /api/admin/settings/roles
    log(colors.blue, 'Testing GET /api/admin/settings/roles');
    const rolesRes = await fetch(`${API_BASE}/admin/settings/roles`, {
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    });
    
    if (rolesRes.status === 200) {
      const data = await rolesRes.json();
      log(colors.green, `✓ GET /api/admin/settings/roles → ${rolesRes.status} OK`);
      log(colors.blue, `  Response contains roles: ${data.roles?.length || 0} roles`);
    } else {
      log(colors.red, `✗ GET /api/admin/settings/roles → ${rolesRes.status}`);
    }
  } catch (err) {
    log(colors.red, `✗ Admin endpoints test error: ${err.message}`);
  }
}

async function test204Handling(token) {
  log(colors.cyan, '\n=== Testing 204 No Content Handling ===');
  
  try {
    log(colors.blue, 'Testing DELETE endpoint (expects 204 or success)');
    log(colors.yellow, 'Note: Actual delete test must be done via UI to test ConfirmModal');
    log(colors.blue, 'Scenario: Delete user via ConfirmModal should return 204 with no JSON body');
    log(colors.blue, 'Expected: No "Expected JSON response" error thrown by apiFetch');
  } catch (err) {
    log(colors.red, `✗ 204 handling test error: ${err.message}`);
  }
}

async function testAPIEndpoints(token) {
  log(colors.cyan, '\n=== Testing API Response Formats ===');
  
  try {
    // Get current user profile (should return 200 with JSON)
    log(colors.blue, 'Testing GET /api/user/profile (expects 200 + JSON)');
    const profileRes = await fetch(`${API_BASE}/user/profile`, {
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    });
    
    if (profileRes.status === 200) {
      const data = await profileRes.json();
      log(colors.green, `✓ GET /api/user/profile → ${profileRes.status} OK`);
      log(colors.blue, `  User: ${data.uid || 'unknown'}, Role: ${data.role || 'unknown'}`);
    } else {
      log(colors.red, `✗ GET /api/user/profile → ${profileRes.status}`);
    }
  } catch (err) {
    log(colors.red, `✗ API endpoints test error: ${err.message}`);
  }
}

async function runTests() {
  log(colors.cyan, '\n╔═══════════════════════════════════════════════════════════╗');
  log(colors.cyan, '║   STAGING VERIFICATION - aoss.v0.8.1                     ║');
  log(colors.cyan, '║   PR #247: apiFetch 204 handling                         ║');
  log(colors.cyan, '║   PR #248: ConfirmModal component                        ║');
  log(colors.cyan, '╚═══════════════════════════════════════════════════════════╝\n');

  log(colors.yellow, 'IMPORTANT: This script tests automated endpoints.');
  log(colors.yellow, 'UI tests (Sign-in, ConfirmModal, Products) must be done manually.\n');

  log(colors.blue, 'To run UI tests:');
  log(colors.blue, '1. Navigate to https://ropi-aoss-staging.web.app');
  log(colors.blue, '2. Open DevTools (F12) → Network tab');
  log(colors.blue, '3. Sign in as theo@shiekh.com (admin)');
  log(colors.blue, '4. Run in console: firebase.auth().currentUser.getIdTokenResult().then(r => console.log(r.claims))');
  log(colors.blue, '5. Navigate to Admin → Users to test CRUD and ConfirmModal');
  log(colors.blue, '6. Monitor Network tab for response codes:\n');
  log(colors.yellow, '   - POST /api/user/create → 201 (create user)');
  log(colors.yellow, '   - PATCH /api/user/{uid} → 200 (update user)');
  log(colors.yellow, '   - DELETE /api/user/{uid} → 204 (delete user)');
  log(colors.yellow, '   - POST /api/user/{uid}/disable → 200 (disable user)\n');

  // Get a test token if available
  log(colors.blue, 'Running automated API endpoint tests...\n');
  
  // Note: These tests will fail without auth, but they demonstrate the test structure
  log(colors.yellow, '⚠ API tests require authentication token from signed-in browser session');
  log(colors.yellow, '  Automated testing skipped - tests must be run manually via browser\n');

  log(colors.cyan, '╔═══════════════════════════════════════════════════════════╗');
  log(colors.cyan, '║   MANUAL VERIFICATION CHECKLIST                          ║');
  log(colors.cyan, '╚═══════════════════════════════════════════════════════════╝\n');

  log(colors.blue, '□ Sign-in Test');
  log(colors.blue, '  - Sign in as theo@shiekh.com');
  log(colors.blue, '  - Verify admin role in console');
  log(colors.blue, '  - Expected: firebase.auth().currentUser exists with admin claims\n');

  log(colors.blue, '□ Admin Endpoints');
  log(colors.blue, '  - GET /api/admin/settings/users → 200 + JSON');
  log(colors.blue, '  - GET /api/admin/settings/roles → 200 + JSON\n');

  log(colors.blue, '□ Create User');
  log(colors.blue, '  - POST /api/user/create with role → 201');
  log(colors.blue, '  - Verify user added to list\n');

  log(colors.blue, '□ Edit User');
  log(colors.blue, '  - PATCH /api/user/{uid} with displayName/role/emailVerified → 200');
  log(colors.blue, '  - Verify changes applied\n');

  log(colors.blue, '□ Delete User via ConfirmModal');
  log(colors.blue, '  - Click delete button');
  log(colors.blue, '  - ConfirmModal appears (NOT window.confirm)');
  log(colors.blue, '  - Confirm delete');
  log(colors.blue, '  - DELETE → 204 No Content');
  log(colors.blue, '  - No "Expected JSON response" error');
  log(colors.blue, '  - UI updates (user removed from list)\n');

  log(colors.blue, '□ Disable User');
  log(colors.blue, '  - Click disable button');
  log(colors.blue, '  - ConfirmModal appears');
  log(colors.blue, '  - POST → 200');
  log(colors.blue, '  - User marked as disabled\n');

  log(colors.blue, '□ Products Admin Flow');
  log(colors.blue, '  - Navigate to Products as admin');
  log(colors.blue, '  - Perform a quick edit');
  log(colors.blue, '  - Verify PATCH → 200 succeeds\n');

  log(colors.blue, '□ No Native Confirm Dialog');
  log(colors.blue, '  - Throughout all operations');
  log(colors.blue, '  - window.confirm() should NEVER appear\n');

  log(colors.cyan, '╔═══════════════════════════════════════════════════════════╗');
  log(colors.cyan, '║   COMPLETION                                             ║');
  log(colors.cyan, '╚═══════════════════════════════════════════════════════════╝\n');

  log(colors.green, 'To verify all checks pass:');
  log(colors.green, '1. Complete manual tests above');
  log(colors.green, '2. Screenshot or note all response codes');
  log(colors.green, '3. Report back with verification results\n');

  log(colors.yellow, 'Key commits merged:');
  log(colors.yellow, '  PR #247: 240b13b105dfbc9c9441d9a7b772d106cfb05f92');
  log(colors.yellow, '  PR #248: 4ac8b1f43dae25d214b9581b11a2c81c3bc8b936\n');
}

runTests().catch(err => {
  log(colors.red, 'Test runner error:', err.message);
  process.exit(1);
});
