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
 */
function AppLayout() {
  return (
    <div className="app-layout">
      <TopBar />
      <EmailVerificationBanner />
      <div className="app-body">
        <Sidebar />
        <main className="app-content">
          <Outlet />
        </main>
      </div>
    </div>
  );
}

export default AppLayout;
