import React, { useState } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import Toast from '../../components/Toast';

// Shared layout for all /settings/* subroutes. Provides tabs + breadcrumb + toast injection.

type ToastState = { show: boolean; message: string; type: 'success' | 'error' };

const tabs = [
  { to: '/settings/ai', label: 'AI Settings' },
  { to: '/settings/ai-templates', label: 'AI Templates' },
  { to: '/settings/vocab-managed', label: 'Vocab (Managed)' },
  { to: '/settings/prompts', label: 'AI Prompts' },
  { to: '/settings/vocab', label: 'Vocab / Dropdowns' },
  { to: '/settings/rules', label: 'Rules' },
  { to: '/settings/brands', label: 'Brands' },
  { to: '/settings/export', label: 'Export Settings' },
  { to: '/settings/export-rules', label: 'Export Rules' },
];

interface SettingsLayoutProps {
  children: React.ReactElement;
}

const SettingsLayout: React.FC<SettingsLayoutProps> = ({ children }) => {
  const [toast, setToast] = useState<ToastState>({ show: false, message: '', type: 'success' });
  const location = useLocation();

  const showToast = (message: string, type: 'success' | 'error') => {
    setToast({ show: true, message, type });
  };
  const hideToast = () => setToast(t => ({ ...t, show: false }));

  const activeTab = tabs.find(t => location.pathname.startsWith(t.to));

  // Inject onShowToast prop if child expects it
  const enhanced = React.cloneElement(children, { onShowToast: showToast });

  return (
    <div>
      <header className="mb-6">
        <h1 className="text-3xl font-bold text-gray-800">Settings</h1>
        <p className="text-gray-600 mt-1">Manage system-wide settings and configurations.</p>
        <nav className="mt-2 text-sm text-gray-500" aria-label="Breadcrumb">
          <ol className="list-reset flex">
            <li><span className="text-gray-500">Settings</span></li>
            <li className="mx-2">/</li>
            <li className="text-gray-800 font-medium">{activeTab?.label || 'AI Settings'}</li>
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
                `px-4 py-2 text-sm font-medium rounded-t-lg border-b-2 ${isActive ? 'border-indigo-500 text-indigo-600' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}`
              }
            >
              {tab.label}
            </NavLink>
          ))}
        </nav>
      </div>

      <main>
        {enhanced}
      </main>

      {toast.show && (
        <Toast message={toast.message} type={toast.type} onClose={hideToast} />
      )}
    </div>
  );
};

export default SettingsLayout;
