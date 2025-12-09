# User Management Documentation

## Overview

The ROPI AOSS User Management system provides complete CRUD (Create, Read, Update, Delete) operations for managing users, roles, and permissions through Firebase Authentication and custom claims. This system is admin-only and integrates seamlessly with the existing AOSS architecture.

**Version:** Homer v1.0.0  
**Feature Branch:** `feature/users-admin`  
**Status:** Production-ready

---

## Table of Contents

1. [Architecture](#architecture)
2. [Data Models](#data-models)
3. [API Endpoints](#api-endpoints)
4. [Frontend Components](#frontend-components)
5. [Security & Authorization](#security--authorization)
6. [Testing](#testing)
7. [Deployment](#deployment)
8. [Operational Tasks](#operational-tasks)
9. [Troubleshooting](#troubleshooting)

---

## Architecture

### System Overview

```
┌─────────────────────────────────────────────────────────────┐
│                    Frontend (React)                          │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  UsersManager Component                               │  │
│  │  ┌────────────────────────────────────────────────┐  │  │
│  │  │  useUsers Hook                                  │  │  │
│  │  │  - fetchUsers() / createUser()                  │  │  │
│  │  │  - updateUser() / deleteUser()                  │  │  │
│  │  │  - resetPassword() / fetchRoles()               │  │  │
│  │  └────────────────────────────────────────────────┘  │  │
│  └──────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
                            ↕ HTTPS + Auth Token
┌─────────────────────────────────────────────────────────────┐
│              Backend API (Cloud Functions)                   │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  User Endpoints (/admin/settings/users)             │  │
│  │  - requireAdmin middleware                           │  │
│  │  - Firebase Admin SDK                                │  │
│  └──────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
                            ↕
┌─────────────────────────────────────────────────────────────┐
│              Firebase Services                               │
│  ┌──────────────────┐    ┌──────────────────────────────┐  │
│  │  Firebase Auth   │    │  Firestore                   │  │
│  │  - User records  │    │  users/profiles/data/{uid}  │  │
│  │  - Custom claims │    │  - Profile metadata          │  │
│  └──────────────────┘    └──────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
```

### Key Components

1. **Frontend (React)**
   - `UsersManager.tsx` - Main UI component for user management
   - `useUsers.ts` - React hook for API interactions
   - Route: `/settings/users`

2. **Backend API (Cloud Functions)**
   - `packages/api/src/endpoints/admin/users.ts` - User CRUD handlers
   - `packages/api/src/apiApp.ts` - Route registration
   - Protected by `requireAdmin` middleware

3. **Data Storage**
   - **Firebase Auth** - User authentication records and custom claims
   - **Firestore** - User profile documents at `users/profiles/data/{uid}`

---

## Data Models

### User Response (API)

```typescript
interface UserResponse {
  uid: string;                          // Firebase Auth UID
  email: string | undefined;            // User email
  displayName: string | undefined;      // Display name
  emailVerified: boolean;               // Email verification status
  role: string | undefined;             // User role (from custom claims)
  customClaims: Record<string, any>;    // All custom claims
  metadata: {
    creationTime: string;               // Account creation timestamp
    lastSignInTime: string;             // Last sign-in timestamp
    lastRefreshTime: string;            // Token refresh timestamp
  };
  disabled: boolean;                    // Account disabled status
  providerData: any[];                  // OAuth provider data
}
```

### User Profile (Firestore)

**Collection Path:** `users/profiles/data/{uid}`

```typescript
interface UserProfile {
  uid: string;                          // Firebase Auth UID
  email: string;                        // User email
  displayName?: string;                 // Display name
  role: string;                         // User role
  emailVerified: boolean;               // Email verification status
  createdAt: Timestamp;                 // Profile creation timestamp
  updatedAt: Timestamp;                 // Last update timestamp
  lastSignInTime?: string;              // Last sign-in timestamp
  createdBy: string;                    // UID of admin who created
  updatedBy: string;                    // UID of admin who last updated
  deletedAt?: Timestamp;                // Soft delete timestamp
  metadata?: Record<string, any>;       // Additional metadata
}
```

### Roles

```typescript
type Role = 'admin' | 'district' | 'store' | 'user';
```

| Role      | Label            | Description                 | Permissions                          |
|-----------|------------------|-----------------------------|--------------------------------------|
| `admin`   | Admin            | Full system access          | All CRUD operations, user management |
| `district`| District Manager | District-level access       | District-scoped operations           |
| `store`   | Store Manager    | Store-level access          | Store-scoped operations              |
| `user`    | User             | Basic read-only access      | Read-only access                     |

---

## API Endpoints

All endpoints require admin authentication via `requireAdmin` middleware.

### Base URL

```
Production: https://us-central1-ropi-bccee.cloudfunctions.net/api
Staging: https://us-central1-ropi-bccee.cloudfunctions.net/api
Local: http://localhost:5001/ropi-bccee/us-central1/api
```

### Authentication

All requests must include an `Authorization` header with a valid Firebase ID token:

```
Authorization: Bearer <firebase-id-token>
```

### Endpoints

#### 1. List Users

```http
GET /admin/settings/users?limit=20&pageToken=<token>
```

**Query Parameters:**
- `limit` (optional): Number of users per page (default: 20)
- `pageToken` (optional): Pagination token for next page

**Response:**
```json
{
  "users": [
    {
      "uid": "abc123",
      "email": "user@example.com",
      "displayName": "User Name",
      "emailVerified": true,
      "role": "user",
      "metadata": {
        "creationTime": "2024-01-01T00:00:00Z",
        "lastSignInTime": "2024-12-09T00:00:00Z"
      },
      "disabled": false
    }
  ],
  "pageToken": "next-page-token",
  "totalUsers": 20
}
```

#### 2. Get Single User

```http
GET /admin/settings/users/:uid
```

**Response:**
```json
{
  "uid": "abc123",
  "email": "user@example.com",
  "displayName": "User Name",
  "emailVerified": true,
  "role": "admin",
  "customClaims": { "role": "admin" },
  "metadata": {
    "creationTime": "2024-01-01T00:00:00Z",
    "lastSignInTime": "2024-12-09T00:00:00Z"
  },
  "disabled": false,
  "profile": {
    "uid": "abc123",
    "email": "user@example.com",
    "role": "admin",
    "createdAt": "...",
    "updatedAt": "..."
  }
}
```

#### 3. Create User

```http
POST /admin/settings/users
Content-Type: application/json

{
  "email": "newuser@example.com",
  "password": "SecurePassword123!",
  "displayName": "New User",
  "role": "user",
  "sendInvite": false
}
```

**Request Body:**
- `email` (required): User email address
- `password` (conditional): Required if `sendInvite` is false
- `displayName` (optional): User display name
- `role` (optional): User role (default: "user")
- `sendInvite` (optional): Send invitation email instead of setting password

**Response:** Same as Get Single User (201 Created)

#### 4. Update User

```http
PATCH /admin/settings/users/:uid
Content-Type: application/json

{
  "displayName": "Updated Name",
  "role": "admin",
  "emailVerified": true,
  "disabled": false
}
```

**Request Body:** (all fields optional)
- `email`: New email address
- `displayName`: New display name
- `role`: New role
- `emailVerified`: Email verification status
- `disabled`: Account disabled status

**Response:** Same as Get Single User (200 OK)

**Validation:**
- Cannot remove own admin role (403 Forbidden)
- Role must be one of: admin, district, store, user

#### 5. Delete User

```http
DELETE /admin/settings/users/:uid?soft=<true|false>
```

**Query Parameters:**
- `soft` (optional): Soft delete (disable) vs. hard delete (default: false)

**Soft Delete:**
- Sets `disabled: true` in Firebase Auth
- Sets `deletedAt` timestamp in Firestore profile
- User can be restored

**Hard Delete:**
- Removes user from Firebase Auth
- Deletes Firestore profile document
- Cannot be undone

**Response:** 204 No Content

**Validation:**
- Cannot delete own account (403 Forbidden)

#### 6. Reset Password

```http
POST /admin/settings/users/:uid/reset-password
```

**Response:**
```json
{
  "message": "Password reset link generated",
  "email": "user@example.com",
  "resetLink": "https://..."
}
```

**Note:** In production, the `resetLink` should be sent via email service (SendGrid, etc.) and not returned in the response.

#### 7. Get Roles

```http
GET /admin/settings/roles
```

**Response:**
```json
{
  "roles": [
    {
      "value": "admin",
      "label": "Admin",
      "description": "Full system access"
    },
    {
      "value": "district",
      "label": "District Manager",
      "description": "District-level access"
    },
    {
      "value": "store",
      "label": "Store Manager",
      "description": "Store-level access"
    },
    {
      "value": "user",
      "label": "User",
      "description": "Basic read-only access"
    }
  ]
}
```

### Error Responses

```json
{
  "error": "ERROR_CODE",
  "message": "Human-readable error message"
}
```

**Common Error Codes:**
- `401 Unauthorized` - Missing or invalid authentication token
- `403 Forbidden` - Insufficient permissions (not admin)
- `404 NOT_FOUND` - User not found
- `409 CONFLICT` - Email already exists
- `400 VALIDATION_ERROR` - Invalid request data
- `500 INTERNAL_ERROR` - Server error

---

## Frontend Components

### UsersManager Component

**Location:** `packages/web/src/pages/Settings/UsersManager.tsx`

**Route:** `/settings/users`

**Features:**
- User list table with search and filtering
- Pagination support
- Create user modal with password or invite flow
- Edit user modal with role management
- Password reset functionality
- Soft/hard delete with confirmation
- Role badges with color coding
- Email verification status indicators
- Responsive mobile-first design

**Key UI Elements:**

1. **Search Bar** - Filter users by email, name, or UID
2. **Create User Button** - Opens modal for new user creation
3. **Users Table** - Displays all users with:
   - Email and UID
   - Display name
   - Role badge
   - Email verification status
   - Last sign-in time
   - Account status (Active/Disabled)
   - Action buttons (Edit, Reset Password, Disable, Delete)

4. **Create User Modal**
   - Email input (required)
   - Display name input
   - Role selector (dropdown)
   - Password input (conditional)
   - Send Invite checkbox

5. **Edit User Modal**
   - Display name input
   - Role selector (disabled for current user)
   - Email verified checkbox

**Safety Features:**
- Cannot remove own admin role
- Cannot delete own account
- Confirmation dialogs for destructive actions
- Clear visual distinction between soft and hard delete

### useUsers Hook

**Location:** `packages/web/src/hooks/useUsers.ts`

**Usage:**

```typescript
import { useUsers } from '@/hooks/useUsers';

function MyComponent() {
  const {
    users,              // Array of users
    loading,            // Loading state
    error,              // Error message
    roles,              // Available roles
    hasMore,            // More pages available
    fetchUsers,         // Fetch users with pagination
    getUser,            // Get single user
    createUser,         // Create new user
    updateUser,         // Update existing user
    deleteUser,         // Delete user
    resetPassword,      // Send password reset
    fetchRoles,         // Fetch available roles
  } = useUsers();
  
  // Component logic...
}
```

**Optimistic Updates:**
- Create: Immediately adds user to local state
- Update: Immediately updates user in local state
- Delete: Immediately removes user from local state
- Reverts on error

---

## Security & Authorization

### Admin-Only Access

All user management endpoints and UI are protected by:

1. **Backend:** `requireAdmin` middleware
   - Verifies Firebase Auth token
   - Checks `role: 'admin'` custom claim
   - Returns 401/403 for unauthorized access

2. **Frontend:** `isAdmin` check from AuthProvider
   - Renders UI only for admins
   - Redirects non-admins to home

### Custom Claims

User roles are stored as Firebase Auth custom claims:

```json
{
  "role": "admin"
}
```

**Setting Custom Claims:**

Use the existing script:

```bash
node scripts/set-admin-custom-claim.js <user-email-or-uid>
```

**Custom Claims Priority:**

1. Custom claims in Firebase Auth token (production)
2. Fallback to `metadata/admins` collection (staging)

### Firestore Security Rules

```javascript
// Admin check via custom claims
function isAdmin() {
  return request.auth != null && request.auth.token.role == 'admin';
}

// User profile access rules
match /users/profiles/data/{uid} {
  allow read: if isAdmin() || request.auth.uid == uid;
  allow write: if isAdmin();
}
```

### Self-Protection

The system prevents admins from accidentally locking themselves out:

1. **Cannot remove own admin role** - Edit user endpoint blocks this
2. **Cannot delete own account** - Delete user endpoint blocks this
3. **Edit UI disables role dropdown for current user**
4. **Delete buttons hidden for current user row**

---

## Testing

### Unit Tests

**Backend Tests:** `packages/api/src/endpoints/admin/users.test.ts`

```bash
cd packages/api
pnpm test src/endpoints/admin/users.test.ts
```

**Frontend Tests:** `packages/web/src/hooks/useUsers.test.ts`

```bash
cd packages/web
pnpm test src/hooks/useUsers.test.ts
```

### E2E Tests

**Location:** `packages/web/e2e/admin-user-crud.spec.ts`

```bash
cd packages/web
pnpm exec playwright test e2e/admin-user-crud.spec.ts
```

**Test Coverage:**
- Display user management page
- List users in table
- Search and filter users
- Create user with password
- Create user with invite
- Edit user role and display name
- Send password reset email
- Disable user (soft delete)
- Delete user (hard delete)
- Prevent self-deletion
- Role badge rendering
- Email verification status
- Pagination

### Manual Testing Checklist

- [ ] Sign in as admin (theo@shiekhshoes.org)
- [ ] Navigate to /settings/users
- [ ] Verify users table loads
- [ ] Search for users by email
- [ ] Create new user with password
- [ ] Create new user with invite
- [ ] Edit user display name
- [ ] Change user role
- [ ] Send password reset email
- [ ] Disable user (soft delete)
- [ ] Verify disabled user shows in table
- [ ] Try to edit own role (should be disabled)
- [ ] Try to delete own account (buttons hidden)
- [ ] Load more users (if pagination present)
- [ ] Verify responsive mobile layout

---

## Deployment

### Prerequisites

1. Admin user with custom claim set:
   ```bash
   node scripts/set-admin-custom-claim.js theo@shiekhshoes.org
   ```

2. Firebase project configured
3. Cloud Functions deployed
4. Hosting configured

### Deploy to Staging

```bash
# Deploy functions
pnpm --filter @ropi-aoss/api build
npx firebase-tools deploy --only functions:api --project ropi-bccee

# Deploy hosting
pnpm --filter @ropi-aoss/web build
npx firebase-tools deploy --only hosting:aoss-staging --project ropi-bccee
```

### Deploy to Production

```bash
# Deploy functions
pnpm --filter @ropi-aoss/api build
npx firebase-tools deploy --only functions:api --project ropi-bccee

# Deploy hosting
pnpm --filter @ropi-aoss/web build
npx firebase-tools deploy --only hosting:aoss-production --project ropi-bccee
```

### CI/CD Integration

The feature is integrated into existing CI/CD workflows:

- `.github/workflows/deploy-staging.yml` - Auto-deploys on merge to aoss-main
- `.github/workflows/test.yml` - Runs tests on PR

### Rollback

If issues arise after deployment:

1. **Rollback Functions:**
   ```bash
   npx firebase-tools functions:delete api --project ropi-bccee
   # Then redeploy previous version
   ```

2. **Rollback Hosting:**
   ```bash
   npx firebase-tools hosting:rollback --project ropi-bccee
   ```

3. **Restore User Data:**
   - Soft-deleted users: Remove `deletedAt` field and set `disabled: false`
   - Hard-deleted users: Restore from Firestore backup (if available)

---

## Operational Tasks

### Create Admin User

```bash
# Set admin custom claim
node scripts/set-admin-custom-claim.js user@example.com

# Verify in Firebase Console
# https://console.firebase.google.com/project/ropi-bccee/authentication/users
```

### Bulk User Import

For bulk user creation, use Firebase Admin SDK script:

```javascript
const admin = require('firebase-admin');
admin.initializeApp();

const users = [
  { email: 'user1@example.com', displayName: 'User 1', role: 'user' },
  { email: 'user2@example.com', displayName: 'User 2', role: 'store' },
];

async function bulkCreate() {
  for (const user of users) {
    const userRecord = await admin.auth().createUser({
      email: user.email,
      displayName: user.displayName,
      password: 'TempPassword123!',
    });
    
    await admin.auth().setCustomUserClaims(userRecord.uid, { role: user.role });
    
    await admin.firestore()
      .collection('users')
      .doc('profiles')
      .collection('data')
      .doc(userRecord.uid)
      .set({
        uid: userRecord.uid,
        email: user.email,
        displayName: user.displayName,
        role: user.role,
        emailVerified: false,
        createdAt: admin.firestore.Timestamp.now(),
        updatedAt: admin.firestore.Timestamp.now(),
        createdBy: 'bulk-import',
        updatedBy: 'bulk-import',
      });
  }
}

bulkCreate();
```

### Restore Soft-Deleted User

```javascript
const admin = require('firebase-admin');
const uid = 'user-uid';

// Re-enable in Auth
await admin.auth().updateUser(uid, { disabled: false });

// Remove deletedAt from Firestore
await admin.firestore()
  .collection('users')
  .doc('profiles')
  .collection('data')
  .doc(uid)
  .update({
    deletedAt: admin.firestore.FieldValue.delete(),
    updatedAt: admin.firestore.Timestamp.now(),
  });
```

### Audit User Activity

Query Firestore for user profile changes:

```javascript
const admin = require('firebase-admin');

const profiles = await admin.firestore()
  .collection('users')
  .doc('profiles')
  .collection('data')
  .where('updatedAt', '>', new Date('2024-12-01'))
  .get();

profiles.forEach(doc => {
  const data = doc.data();
  console.log(`${data.email} - Updated by ${data.updatedBy} at ${data.updatedAt}`);
});
```

---

## Troubleshooting

### Common Issues

#### 1. "Admin role required" Error

**Symptom:** 403 Forbidden when accessing user management

**Cause:** User does not have admin custom claim

**Solution:**
```bash
node scripts/set-admin-custom-claim.js <user-email>
# User must sign out and sign back in
```

#### 2. Password Reset Email Not Sent

**Symptom:** Password reset returns success but no email received

**Cause:** Email service not configured (current implementation logs link only)

**Solution:**
- Integrate SendGrid or Firebase Email Extension
- Update `resetPasswordHandler` to send actual email
- For now, copy reset link from API response (staging only)

#### 3. User Not Appearing in Table

**Symptom:** Created user not visible in table

**Cause:** 
- Profile not created in Firestore
- Client-side filtering active

**Solution:**
- Clear search filter
- Check browser console for errors
- Verify profile document exists in Firestore

#### 4. Cannot Edit User Role

**Symptom:** Role dropdown is disabled

**Cause:** Trying to edit current user

**Solution:** This is intentional for safety. Use another admin account to change roles.

#### 5. Pagination Not Working

**Symptom:** "Load More" button doesn't appear

**Cause:** Fewer than 20 users total

**Solution:** No action needed. Pagination only shows when there are more users than page limit.

---

## Future Enhancements

### Phase 2 Features

1. **Email Service Integration**
   - Send actual invitation emails
   - Send password reset emails
   - Email templates for onboarding

2. **Advanced Filtering**
   - Filter by role
   - Filter by verification status
   - Filter by account status (active/disabled)
   - Date range filters

3. **Bulk Operations**
   - Select multiple users
   - Bulk role assignment
   - Bulk disable/enable
   - CSV export

4. **User Activity Logs**
   - Track user actions
   - Display last activity
   - Audit trail for admin actions

5. **Permission Groups**
   - Group-based permissions
   - Custom permission sets
   - Permission inheritance

6. **Self-Service Features**
   - Users can update own profile
   - Users can change own password
   - Profile picture upload

---

## References

- **Firebase Auth Admin SDK:** https://firebase.google.com/docs/auth/admin
- **Custom Claims:** https://firebase.google.com/docs/auth/admin/custom-claims
- **Firestore Security Rules:** https://firebase.google.com/docs/firestore/security/get-started
- **AOSS Notion Docs:** https://www.notion.so/2b845ee1ec5a81e58df8f9633b2e0e2b

---

## Support

For issues or questions:

1. Check this documentation
2. Review existing PRs and issues on GitHub
3. Contact Lisa (integration agent) or Homer (implementation agent)

---

**Document Version:** 1.0.0  
**Last Updated:** December 9, 2024  
**Author:** Homer (AI Implementation Agent)
