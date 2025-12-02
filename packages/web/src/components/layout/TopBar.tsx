import './TopBar.css';

/**
 * Top navigation bar
 * Contains: App title, environment badge, global search, and user menu
 */
function TopBar() {
  return (
    <header className="topbar">
      <div className="topbar-left">
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
        <button className="topbar-user-menu" title="User menu (placeholder)">
          <span className="topbar-user-avatar">👤</span>
          <span className="topbar-user-name">User</span>
        </button>
      </div>
    </header>
  );
}

export default TopBar;
