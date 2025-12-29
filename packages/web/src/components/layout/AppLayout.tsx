import { useState } from 'react';
import { Outlet } from 'react-router-dom';
import TopBar from './TopBar';
import Sidebar from './Sidebar';
import { EmailVerificationBanner } from '../Auth/EmailVerificationBanner';
import './AppLayout.css';

/**
 * Main application layout shell
 * Implements top bar, left sidebar, and content area
 * 
 * PROMPT_018C_vB: Added EmailVerificationBanner for email verification policy
 * LP-product-ordering-import-completeness-0.1.0: Added mobile responsive sidebar with hamburger toggle
 */
function AppLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const toggleSidebar = () => {
    setSidebarOpen(!sidebarOpen);
  };

  const closeSidebar = () => {
    setSidebarOpen(false);
  };

  return (
    <div className="app-layout">
      <TopBar onToggleSidebar={toggleSidebar} />
      <EmailVerificationBanner />
      <div className="app-body">
        <Sidebar isOpen={sidebarOpen} onClose={closeSidebar} />
        <main className="app-content">
          <Outlet />
        </main>
      </div>
    </div>
  );
}

export default AppLayout;
