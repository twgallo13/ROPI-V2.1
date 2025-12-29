import { NavLink } from 'react-router-dom';
import { navigationConfig } from '@/config/nav';
import './Sidebar.css';

/**
 * Left sidebar navigation
 * Primary navigation for all main modules
 * 
 * LP-product-ordering-import-completeness-0.1.0: Added mobile responsive behavior
 * - Collapsed on mobile (<=768px) by default
 * - Opens via hamburger toggle in TopBar
 * - Overlay closes on navigation or outside click
 */
interface SidebarProps {
  isOpen?: boolean;
  onClose?: () => void;
}

function Sidebar({ isOpen = false, onClose }: SidebarProps) {
  const handleNavClick = () => {
    // Close sidebar on mobile after navigation
    if (onClose) {
      onClose();
    }
  };

  return (
    <>
      {/* Overlay for mobile — closes sidebar when clicked */}
      {isOpen && (
        <div 
          className="sidebar-overlay" 
          onClick={onClose}
          aria-hidden="true"
        />
      )}
      
      <aside className={`sidebar ${isOpen ? 'sidebar-open' : ''}`}>
        <nav className="sidebar-nav">
          {navigationConfig.map((item) => (
            <NavLink
              key={item.id}
              to={item.route}
              onClick={handleNavClick}
              className={({ isActive }) =>
                `sidebar-nav-item ${isActive ? 'sidebar-nav-item-active' : ''}`
              }
            >
              <span className="sidebar-nav-icon">{item.icon}</span>
              <span className="sidebar-nav-label">{item.label}</span>
            </NavLink>
          ))}
        </nav>
      </aside>
    </>
  );
}

export default Sidebar;
