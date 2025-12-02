import { Outlet } from 'react-router-dom';
import TopBar from './TopBar';
import Sidebar from './Sidebar';
import './AppLayout.css';

/**
 * Main application layout shell
 * Implements top bar, left sidebar, and content area
 */
function AppLayout() {
  return (
    <div className="app-layout">
      <TopBar />
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
