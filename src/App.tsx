import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './contexts/AuthContext';
import MainLayout from './components/MainLayout';

// Import all our pages
import LaunchPage from './pages/LaunchPage';
import IntakeQueuePage from './pages/IntakeQueuePage';
import CompleteQueuePage from './pages/CompleteQueuePage';
import SettingsPage from './pages/SettingsPage';
import ImportPage from './pages/ImportPage';

function App() {
  const { isAuthenticated, role } = useAuth();

  return (
    <BrowserRouter>
      <Routes>
        {/* Public-facing Launch Hub */}
        <Route path="/" element={<LaunchPage />} />

        {/* Protected Specialist & Admin Routes */}
        <Route 
          path="/intake"
          element={
            isAuthenticated ? (
              <MainLayout>
                <IntakeQueuePage />
              </MainLayout>
            ) : (
              <Navigate to="/" />
            )
          } 
        />
        <Route 
          path="/complete"
          element={
            isAuthenticated ? (
              <MainLayout>
                <CompleteQueuePage />
              </MainLayout>
            ) : (
              <Navigate to="/" />
            )
          } 
        />

        {/* Protected Admin-Only Routes */}
        <Route 
          path="/import"
          element={
            isAuthenticated && role === 'admin' ? (
              <MainLayout>
                <ImportPage />
              </MainLayout>
            ) : (
              // If you're logged in but not an admin, go to intake
              // If you're not logged in, go to home
              <Navigate to={isAuthenticated ? "/intake" : "/"} />
            )
          } 
        />
        <Route 
          path="/settings"
          element={
            isAuthenticated && role === 'admin' ? (
              <MainLayout>
                <SettingsPage />
              </MainLayout>
            ) : (
              // If you're logged in but not an admin, go to intake
              // If you're not logged in, go to home
              <Navigate to={isAuthenticated ? "/intake" : "/"} />
            )
          } 
        />
        
        {/* Catch-all for any other bad URL */}
        <Route path="*" element={<Navigate to="/" />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;