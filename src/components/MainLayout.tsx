import React from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

const MainLayout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { role, logout } = useAuth();

  return (
    <div className="flex h-screen bg-gray-100">
      {/* Sidebar */}
      <div className="w-64 bg-gray-800 text-white flex flex-col">
        <div className="p-4 text-xl font-bold">ROPI v2</div>
        <nav className="flex-1 p-4 space-y-2">
          <Link to="/" className="block p-2 rounded hover:bg-gray-700">
            Launch Hub
          </Link>
          <Link to="/intake" className="block p-2 rounded hover:bg-gray-700">
            Intake Queue
          </Link>
          <Link to="/complete" className="block p-2 rounded hover:bg-gray-700">
            Complete Queue
          </Link>
          
          {/* Admin-Only Links */}
          {role === 'admin' && (
            <>
              <Link to="/import" className="block p-2 rounded hover:bg-gray-700">
                Import
              </Link>
              <Link to="/settings" className="block p-2 rounded hover:bg-gray-700">
                Settings
              </Link>
            </>
          )}
        </nav>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Top Navbar */}
        <header className="bg-white shadow-md p-4 flex justify-end">
          <button 
            onClick={logout} 
            className="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600"
          >
            Log Out
          </button>
        </header>
        
        {/* Page Content */}
        <main className="flex-1 overflow-y-auto p-6">
          {children}
        </main>
      </div>
    </div>
  );
};

export default MainLayout;