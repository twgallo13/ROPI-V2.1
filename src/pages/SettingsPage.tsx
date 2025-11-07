import React from 'react';
import { NavLink, Outlet, useLocation, Navigate } from 'react-router-dom';

const tabs = [
  { to: 'ai', label: 'AI Settings' },
  { to: 'vocab-managed', label: 'Vocab (Managed)' },
  { to: 'prompts', label: 'AI Prompts' },
  { to: 'vocab', label: 'Vocab / Dropdowns' },
  { to: 'rules', label: 'Rules' },
  { to: 'brands', label: 'Brands' },
  { to: 'export', label: 'Export Settings' },
];

const SettingsPage: React.FC = () => {
  const location = useLocation();
  const parts = location.pathname.split('/').filter(Boolean);
  const current = parts[1] === 'settings' ? parts[2] : undefined;
  const currentLabel = tabs.find(t => t.to === current)?.label || 'AI Settings';

  // Redirect bare /settings to default subroute
  if (parts[0] === 'settings' && !current) {
    return <Navigate to="/settings/ai" replace />;
  }

  return (
    <div>
      <header className="mb-6">
        <h1 className="text-3xl font-bold text-gray-800">Settings</h1>
        <p className="text-gray-600 mt-1">Manage system-wide settings and configurations.</p>
        {/* Breadcrumb */}
        <nav className="mt-2 text-sm text-gray-500" aria-label="Breadcrumb">
          <ol className="list-reset flex">
            <li>
              <span className="text-gray-500">Settings</span>
            </li>
            <li className="mx-2">/</li>
            <li className="text-gray-800 font-medium">{currentLabel}</li>
          </ol>
        </nav>
      </header>

      <div className="border-b border-gray-200 mb-6">
        <nav className="-mb-px flex space-x-4" aria-label="Tabs">
          {tabs.map(tab => (
            <NavLink
              key={tab.to}
              to={tab.to}
              className={({ isActive }) =>
                `px-4 py-2 text-sm font-medium rounded-t-lg border-b-2 ${
                  isActive
                    ? 'border-indigo-500 text-indigo-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`
              }
            >
              {tab.label}
            </NavLink>
          ))}
        </nav>
      </div>

      <main>
        <Outlet />
      </main>
    </div>
  );
};

export default SettingsPage;