import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import SignInModal from '@/components/Auth/SignInModal';
import './TopBar.css';

/**
 * Top navigation bar
 * Contains: App title, environment badge, global search, and user menu
 * 
 * Auth Integration (PROMPT_018B):
 * - Shows "Sign In" button when currentUser == null
 * - Shows user avatar/dropdown when authenticated
 * - Dropdown menu: Display name, Profile (placeholder), Sign out
 * 
 * LP-product-ordering-import-completeness-0.1.0: Added hamburger menu for mobile sidebar toggle
 */
interface TopBarProps {
  onToggleSidebar?: () => void;
}

function TopBar({ onToggleSidebar }: TopBarProps) {
  const { currentUser, isAdmin, signOut, loading } = useAuth();
  const navigate = useNavigate();
  const [showSignInModal, setShowSignInModal] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);

  const handleSignOut = async () => {
    try {
      await signOut();
      setShowUserMenu(false);
      navigate('/launch-calendar'); // Redirect to Launch Calendar after sign-out
    } catch (error: any) {
      console.error('Sign-out failed:', error);
      alert(error.message || 'Sign-out failed. Please try again.');
    }
  };

  // Get user display name or email
  const userDisplayName = currentUser?.displayName || currentUser?.email || 'User';
  
  // Get first letter for avatar if no photoURL
  const userInitial = userDisplayName.charAt(0).toUpperCase();

  return (
    <>
      <header className="topbar">
        <div className="topbar-left">
          {/* Hamburger menu for mobile — LP-product-ordering-import-completeness-0.1.0 */}
          <button
            className="topbar-hamburger"
            onClick={onToggleSidebar}
            aria-label="Toggle navigation menu"
            data-testid="hamburger-menu"
          >
            <span className="topbar-hamburger-line"></span>
            <span className="topbar-hamburger-line"></span>
            <span className="topbar-hamburger-line"></span>
          </button>
          
          <h1 className="topbar-title">ROPI AOSS</h1>
          <span className="topbar-badge topbar-badge-staging">Staging</span>
        </div>
        
        <div className="topbar-center">
          <input
            type="search"
            className="topbar-search"
            placeholder="Search products, SKUs, attributes..."
            disabled
            title="Global search (non-functional stub)"
          />
        </div>
        
        <div className="topbar-right">
          {loading ? (
            // Loading state during auth initialization
            <div className="topbar-loading">Loading...</div>
          ) : currentUser ? (
            // Authenticated: Show user menu
            <div className="topbar-user-wrapper">
              <button
                className="topbar-user-menu"
                onClick={() => setShowUserMenu(!showUserMenu)}
                title="User menu"
                data-testid="user-menu-trigger"
              >
                {currentUser.photoURL ? (
                  <img
                    src={currentUser.photoURL}
                    alt="User avatar"
                    className="topbar-user-avatar-img"
                  />
                ) : (
                  <span className="topbar-user-avatar">{userInitial}</span>
                )}
                <span className="topbar-user-name" data-testid="user-display-name">
                  {userDisplayName}
                  {isAdmin && <span className="topbar-admin-badge" data-testid="admin-badge">Admin</span>}
                </span>
                <span className="topbar-dropdown-arrow">▼</span>
              </button>

              {showUserMenu && (
                <div className="topbar-user-dropdown">
                  <div className="topbar-dropdown-header">
                    <div className="topbar-dropdown-email">{currentUser.email}</div>
                    {isAdmin && <div className="topbar-dropdown-role">Administrator</div>}
                  </div>
                  
                  <div className="topbar-dropdown-divider" />
                  
                  <Link 
                    to="/settings/profile" 
                    className="topbar-dropdown-item"
                    onClick={() => setShowUserMenu(false)}
                  >
                    👤 Profile
                  </Link>
                  
                  <div className="topbar-dropdown-divider" />
                  
                  <button className="topbar-dropdown-item" onClick={handleSignOut} data-testid="signout-button">
                    🚪 Sign out
                  </button>
                </div>
              )}
            </div>
          ) : (
            // Unauthenticated: Show Sign In button
            <button
              className="topbar-signin-btn"
              onClick={() => setShowSignInModal(true)}
              data-testid="signin-trigger"
            >
              Sign In
            </button>
          )}
        </div>
      </header>

      {/* Sign-In Modal */}
      <SignInModal
        isOpen={showSignInModal}
        onClose={() => setShowSignInModal(false)}
      />

      {/* Click outside to close user menu */}
      {showUserMenu && (
        <div
          className="topbar-dropdown-overlay"
          onClick={() => setShowUserMenu(false)}
        />
      )}
    </>
  );
}

export default TopBar;
