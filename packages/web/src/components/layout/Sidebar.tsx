import { NavLink } from 'react-router-dom';
import { navigationConfig } from '@/config/nav';
import './Sidebar.css';

/**
 * Left sidebar navigation
 * Primary navigation for all main modules
 */
function Sidebar() {
  return (
    <aside className="sidebar">
      <nav className="sidebar-nav">
        {navigationConfig.map((item) => (
          <NavLink
            key={item.id}
            to={item.route}
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
  );
}

export default Sidebar;
