/**
 * User Management Page
 * 
 * Full CRUD interface for managing users with Firebase Auth and custom claims.
 * Admin-only access.
 * 
 * Homer v1.0.0 - User Management
 */

import { useState } from 'react';
import PageLayout from '@/components/common/PageLayout';
import ConfirmModal from '@/components/common/ConfirmModal';
import { useUsers, type User, type CreateUserData, type UpdateUserData } from '@/hooks/useUsers';
import { useAuth } from '@/contexts/AuthProvider';
import './UsersManager.css';

interface UserFormData {
  email: string;
  password: string;
  displayName: string;
  role: string;
  sendInvite: boolean;
}

function UsersManager() {
  const { currentUser } = useAuth();
  const { 
    users, 
    loading, 
    error, 
    roles,
    hasMore,
    fetchUsers,
    createUser,
    updateUser,
    deleteUser,
    resetPassword,
  } = useUsers();
  
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [formData, setFormData] = useState<UserFormData>({
    email: '',
    password: '',
    displayName: '',
    role: 'viewer',
    sendInvite: false,
  });
  const [formError, setFormError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  
  // ConfirmModal state for delete operations
  const [showConfirmDelete, setShowConfirmDelete] = useState(false);
  const [pendingDeleteUid, setPendingDeleteUid] = useState<string | null>(null);
  const [pendingDeleteIsSoft, setPendingDeleteIsSoft] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  
  // Filter users by search query
  const filteredUsers = users.filter(user => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      user.email?.toLowerCase().includes(query) ||
      user.displayName?.toLowerCase().includes(query) ||
      user.uid.toLowerCase().includes(query)
    );
  });
  
  // Handle form input changes
  const handleFormChange = (field: keyof UserFormData, value: string | boolean) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    setFormError(null);
  };
  
  // Handle create user
  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    setSuccessMessage(null);
    
    try {
      // Validate
      if (!formData.email) {
        setFormError('Email is required');
        return;
      }
      
      if (!formData.password && !formData.sendInvite) {
        setFormError('Password is required (or enable Send Invite)');
        return;
      }
      
      const data: CreateUserData = {
        email: formData.email,
        password: formData.sendInvite ? undefined : formData.password,
        displayName: formData.displayName || undefined,
        role: formData.role,
        sendInvite: formData.sendInvite,
      };
      
      await createUser(data);
      
      setSuccessMessage(`User ${formData.email} created successfully`);
      setShowCreateModal(false);
      setFormData({
        email: '',
        password: '',
        displayName: '',
        role: 'viewer',
        sendInvite: false,
      });
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Failed to create user');
    }
  };
  
  // Handle update user
  const handleUpdateUser = async (uid: string, data: UpdateUserData) => {
    setFormError(null);
    setSuccessMessage(null);
    
    try {
      await updateUser(uid, data);
      setSuccessMessage('User updated successfully');
      setEditingUser(null);
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Failed to update user');
    }
  };
  
  // Handle delete user - show confirmation first
  const handleDeleteUser = (uid: string, soft: boolean) => {
    setPendingDeleteUid(uid);
    setPendingDeleteIsSoft(soft);
    setShowConfirmDelete(true);
  };

  // Handle confirmed delete user - perform the actual deletion
  const handleConfirmDelete = async () => {
    if (!pendingDeleteUid) return;

    setFormError(null);
    setSuccessMessage(null);
    setIsDeleting(true);

    try {
      await deleteUser(pendingDeleteUid, pendingDeleteIsSoft);
      setSuccessMessage(
        pendingDeleteIsSoft ? 'User disabled successfully' : 'User deleted successfully'
      );
      setShowConfirmDelete(false);
      setPendingDeleteUid(null);
      setPendingDeleteIsSoft(false);
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Failed to delete user');
      setShowConfirmDelete(false);
      setPendingDeleteUid(null);
      setPendingDeleteIsSoft(false);
    } finally {
      setIsDeleting(false);
    }
  };
  
  // Handle reset password
  const handleResetPassword = async (uid: string) => {
    setFormError(null);
    setSuccessMessage(null);
    
    try {
      const result = await resetPassword(uid);
      setSuccessMessage(result.message);
      
      if (result.resetLink) {
        console.log('Password reset link:', result.resetLink);
      }
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Failed to send password reset');
    }
  };
  
  // Handle load more
  const handleLoadMore = () => {
    if (!loading && hasMore) {
      fetchUsers();
    }
  };
  
  return (
    <PageLayout title="User Management">
      <div className="users-manager">
        {/* Header */}
        <div className="users-header">
          <div className="users-search">
            <input
              type="text"
              placeholder="Search by email, name, or UID..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="search-input"
            />
          </div>
          <button
            onClick={() => setShowCreateModal(true)}
            className="btn-primary"
            disabled={loading}
          >
            + Create User
          </button>
        </div>
        
        {/* Error/Success Messages */}
        {error && <div className="alert alert-error">{error}</div>}
        {formError && <div className="alert alert-error">{formError}</div>}
        {successMessage && <div className="alert alert-success">{successMessage}</div>}
        
        {/* Users Table */}
        {loading && users.length === 0 ? (
          <div className="loading">Loading users...</div>
        ) : (
          <>
            <div className="users-table-container">
              <table className="users-table">
                <thead>
                  <tr>
                    <th>Email</th>
                    <th>Display Name</th>
                    <th>Role</th>
                    <th>Email Verified</th>
                    <th>Last Sign In</th>
                    <th>Status</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredUsers.map((user) => (
                    <tr key={user.uid} className={user.disabled ? 'user-disabled' : ''}>
                      <td>
                        <div className="user-email">
                          {user.email}
                          <span className="user-uid">{user.uid}</span>
                        </div>
                      </td>
                      <td>{user.displayName || '-'}</td>
                      <td>
                        <span className={`role-badge role-${user.role}`}>
                          {user.role || 'user'}
                        </span>
                      </td>
                      <td>
                        {user.emailVerified ? (
                          <span className="status-verified">✓ Verified</span>
                        ) : (
                          <span className="status-unverified">✗ Unverified</span>
                        )}
                      </td>
                      <td>
                        {user.metadata.lastSignInTime
                          ? new Date(user.metadata.lastSignInTime).toLocaleDateString()
                          : 'Never'}
                      </td>
                      <td>
                        {user.disabled ? (
                          <span className="status-disabled">Disabled</span>
                        ) : (
                          <span className="status-active">Active</span>
                        )}
                      </td>
                      <td>
                        <div className="user-actions">
                          <button
                            onClick={() => setEditingUser(user)}
                            className="btn-action"
                            title="Edit user"
                          >
                            ✏️
                          </button>
                          <button
                            onClick={() => handleResetPassword(user.uid)}
                            className="btn-action"
                            title="Reset password"
                            disabled={!user.email}
                          >
                            🔑
                          </button>
                          {user.uid !== currentUser?.uid && (
                            <>
                              <button
                                onClick={() => handleDeleteUser(user.uid, true)}
                                className="btn-action"
                                title="Disable user"
                              >
                                🚫
                              </button>
                              <button
                                onClick={() => handleDeleteUser(user.uid, false)}
                                className="btn-action btn-danger"
                                title="Delete user permanently"
                              >
                                🗑️
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            
            {/* Load More */}
            {hasMore && (
              <div className="load-more">
                <button
                  onClick={handleLoadMore}
                  className="btn-secondary"
                  disabled={loading}
                >
                  {loading ? 'Loading...' : 'Load More'}
                </button>
              </div>
            )}
            
            {/* Empty State */}
            {filteredUsers.length === 0 && !loading && (
              <div className="empty-state">
                <p>No users found</p>
              </div>
            )}
          </>
        )}
        
        {/* Create User Modal */}
        {showCreateModal && (
          <div className="modal-overlay" onClick={() => setShowCreateModal(false)}>
            <div className="modal" onClick={(e) => e.stopPropagation()}>
              <div className="modal-header">
                <h2>Create New User</h2>
                <button onClick={() => setShowCreateModal(false)} className="modal-close">
                  ×
                </button>
              </div>
              
              <form onSubmit={handleCreateUser} className="user-form">
                <div className="form-group">
                  <label htmlFor="email">Email *</label>
                  <input
                    id="email"
                    type="email"
                    value={formData.email}
                    onChange={(e) => handleFormChange('email', e.target.value)}
                    required
                    className="form-input"
                  />
                </div>
                
                <div className="form-group">
                  <label htmlFor="displayName">Display Name</label>
                  <input
                    id="displayName"
                    type="text"
                    value={formData.displayName}
                    onChange={(e) => handleFormChange('displayName', e.target.value)}
                    className="form-input"
                  />
                </div>
                
                <div className="form-group">
                  <label htmlFor="role">Role *</label>
                  <select
                    id="role"
                    value={formData.role}
                    onChange={(e) => handleFormChange('role', e.target.value)}
                    className="form-select"
                  >
                    {roles.map((role) => (
                      <option key={role.value} value={role.value}>
                        {role.label} - {role.description}
                      </option>
                    ))}
                  </select>
                </div>
                
                <div className="form-group">
                  <label className="checkbox-label">
                    <input
                      type="checkbox"
                      checked={formData.sendInvite}
                      onChange={(e) => handleFormChange('sendInvite', e.target.checked)}
                    />
                    Send invite email (user sets own password)
                  </label>
                </div>
                
                {!formData.sendInvite && (
                  <div className="form-group">
                    <label htmlFor="password">Temporary Password *</label>
                    <input
                      id="password"
                      type="password"
                      value={formData.password}
                      onChange={(e) => handleFormChange('password', e.target.value)}
                      required={!formData.sendInvite}
                      className="form-input"
                      minLength={6}
                    />
                    <small className="form-hint">Minimum 6 characters</small>
                  </div>
                )}
                
                <div className="modal-footer">
                  <button
                    type="button"
                    onClick={() => setShowCreateModal(false)}
                    className="btn-secondary"
                  >
                    Cancel
                  </button>
                  <button type="submit" className="btn-primary" disabled={loading}>
                    {loading ? 'Creating...' : 'Create User'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
        
        {/* Edit User Modal */}
        {editingUser && (
          <div className="modal-overlay" onClick={() => setEditingUser(null)}>
            <div className="modal" onClick={(e) => e.stopPropagation()}>
              <div className="modal-header">
                <h2>Edit User</h2>
                <button onClick={() => setEditingUser(null)} className="modal-close">
                  ×
                </button>
              </div>
              
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  const formData = new FormData(e.currentTarget);
                  const data: UpdateUserData = {
                    displayName: formData.get('displayName') as string,
                    role: formData.get('role') as string,
                    emailVerified: formData.get('emailVerified') === 'on',
                  };
                  handleUpdateUser(editingUser.uid, data);
                }}
                className="user-form"
              >
                <div className="form-group">
                  <label>Email</label>
                  <input
                    type="text"
                    value={editingUser.email || ''}
                    disabled
                    className="form-input"
                  />
                  <small className="form-hint">Email cannot be changed</small>
                </div>
                
                <div className="form-group">
                  <label htmlFor="edit-displayName">Display Name</label>
                  <input
                    id="edit-displayName"
                    name="displayName"
                    type="text"
                    defaultValue={editingUser.displayName || ''}
                    className="form-input"
                  />
                </div>
                
                <div className="form-group">
                  <label htmlFor="edit-role">Role</label>
                  <select
                    id="edit-role"
                    name="role"
                    defaultValue={editingUser.role || 'user'}
                    className="form-select"
                    disabled={editingUser.uid === currentUser?.uid}
                  >
                    {roles.map((role) => (
                      <option key={role.value} value={role.value}>
                        {role.label} - {role.description}
                      </option>
                    ))}
                  </select>
                  {editingUser.uid === currentUser?.uid && (
                    <small className="form-hint">Cannot change your own role</small>
                  )}
                </div>
                
                <div className="form-group">
                  <label className="checkbox-label">
                    <input
                      name="emailVerified"
                      type="checkbox"
                      defaultChecked={editingUser.emailVerified}
                    />
                    Email Verified
                  </label>
                </div>
                
                <div className="modal-footer">
                  <button
                    type="button"
                    onClick={() => setEditingUser(null)}
                    className="btn-secondary"
                  >
                    Cancel
                  </button>
                  <button type="submit" className="btn-primary" disabled={loading}>
                    {loading ? 'Saving...' : 'Save Changes'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Delete Confirmation Modal */}
        <ConfirmModal
          isOpen={showConfirmDelete}
          title={pendingDeleteIsSoft ? 'Disable User?' : 'Delete User Permanently?'}
          message={
            pendingDeleteIsSoft
              ? 'This user will be disabled and cannot log in. They can be re-enabled later.'
              : 'This action cannot be undone. The user account and all associated data will be permanently deleted.'
          }
          confirmLabel={pendingDeleteIsSoft ? 'Disable' : 'Delete'}
          isDangerous={!pendingDeleteIsSoft}
          isLoading={isDeleting}
          onConfirm={handleConfirmDelete}
          onCancel={() => {
            setShowConfirmDelete(false);
            setPendingDeleteUid(null);
            setPendingDeleteIsSoft(false);
          }}
        />
      </div>
    </PageLayout>
  );
}

export default UsersManager;
