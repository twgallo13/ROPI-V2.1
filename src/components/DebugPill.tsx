import React, { useState, useEffect } from 'react';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from '../contexts/AuthContext';

const DebugPill: React.FC = () => {
  const [isVisible, setIsVisible] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [productCount, setProductCount] = useState<number | null>(null);
  const [settingsCount, setSettingsCount] = useState<number | null>(null);
  const { currentUser } = useAuth();

  useEffect(() => {
    // Show debug pill only in development or when ?debug=true is in URL
    const isDev = import.meta.env.DEV;
    const hasDebugParam = new URLSearchParams(window.location.search).has('debug');
    setIsVisible(isDev || hasDebugParam);
  }, []);

  useEffect(() => {
    if (isExpanded) {
      fetchCounts();
    }
  }, [isExpanded]);

  const fetchCounts = async () => {
    try {
      const productsSnapshot = await getDocs(collection(db, 'products'));
      setProductCount(productsSnapshot.size);

      const settingsSnapshot = await getDocs(collection(db, 'settings'));
      setSettingsCount(settingsSnapshot.size);
    } catch (error) {
      console.error('Error fetching counts:', error);
    }
  };

  if (!isVisible) return null;

  const projectId = import.meta.env.VITE_FIREBASE_PROJECT_ID || 'unknown';
  const userEmail = currentUser?.email || 'not logged in';

  return (
    <div className="fixed bottom-4 right-4 z-50">
      {!isExpanded ? (
        <button
          onClick={() => setIsExpanded(true)}
          className="bg-purple-600 hover:bg-purple-700 text-white text-xs font-mono px-3 py-2 rounded-full shadow-lg transition-all"
          title="Show debug info"
        >
          🐛 Debug
        </button>
      ) : (
        <div className="bg-gray-900 text-white text-xs font-mono p-4 rounded-lg shadow-2xl min-w-[280px]">
          <div className="flex justify-between items-center mb-3">
            <span className="font-bold text-purple-400">Debug Info</span>
            <button
              onClick={() => setIsExpanded(false)}
              className="text-gray-400 hover:text-white"
            >
              ✕
            </button>
          </div>
          
          <div className="space-y-2">
            <div>
              <span className="text-gray-400">Project ID:</span>
              <div className="text-green-400 break-all">{projectId}</div>
            </div>
            
            <div>
              <span className="text-gray-400">User:</span>
              <div className="text-blue-400 break-all">{userEmail}</div>
            </div>
            
            <div className="border-t border-gray-700 pt-2 mt-2">
              <span className="text-gray-400">Firestore Collections:</span>
              <div className="ml-2 mt-1 space-y-1">
                <div>
                  <span className="text-gray-500">/products:</span>{' '}
                  <span className="text-yellow-400">
                    {productCount === null ? 'loading...' : productCount}
                  </span>
                </div>
                <div>
                  <span className="text-gray-500">/settings:</span>{' '}
                  <span className="text-yellow-400">
                    {settingsCount === null ? 'loading...' : settingsCount}
                  </span>
                </div>
              </div>
            </div>
            
            <button
              onClick={fetchCounts}
              className="w-full mt-2 bg-purple-600 hover:bg-purple-700 text-white px-2 py-1 rounded text-xs"
            >
              Refresh Counts
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default DebugPill;
