import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './contexts/AuthContext';
import MainLayout from './components/MainLayout';
import DebugPill from './components/DebugPill';

// Import all our pages
import LaunchPage from './pages/LaunchPage';
import IntakeQueuePage from './pages/IntakeQueuePage';
import CompleteQueuePage from './pages/CompleteQueuePage';
import SettingsPage from './pages/SettingsPage';
import ImportPage from './pages/ImportPage';
import PromptsPage from './pages/settings/Prompts';
import AISettingsPage from './pages/settings/AISettingsPage';
import VocabManagedPage from './pages/settings/VocabManagedPage';
import VocabDropdownsPage from './pages/settings/VocabDropdownsPage';
import RulesPage from './pages/settings/RulesPage';
import BrandsPage from './pages/settings/BrandsPage';
import ExportSettingsPage from './pages/settings/ExportSettingsPage';

function App() {
  const { user, role } = useAuth();

  return (
    <BrowserRouter>
      <Routes>
        {/* Public-facing Launch Hub */}
        <Route path="/" element={<LaunchPage />} />

        {/* Protected Specialist & Admin Routes */}
        <Route 
          path="/intake"
          element={
            user ? (
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
            user ? (
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
            user && role === 'admin' ? (
              <MainLayout>
                <ImportPage />
              </MainLayout>
            ) : (
              // If you're logged in but not an admin, go to intake
              // If you're not logged in, go to home
              <Navigate to={user ? "/intake" : "/"} />
            )
          } 
        />
        <Route 
          path="/settings/*"
          element={
            user && role === 'admin' ? (
              <MainLayout>
                <SettingsPage />
              </MainLayout>
            ) : (
              <Navigate to={user ? "/intake" : "/"} />
            )
          }
        >
          {/* Default redirect to AI settings handled in SettingsPage, but define index as fallback */}
          <Route index element={<AISettingsPage />} />
          <Route path="ai" element={<AISettingsPage />} />
          <Route path="vocab-managed" element={<VocabManagedPage />} />
          <Route path="prompts" element={<PromptsPage />} />
          <Route path="vocab" element={<VocabDropdownsPage />} />
          <Route path="rules" element={<RulesPage />} />
          <Route path="brands" element={<BrandsPage />} />
          <Route path="export" element={<ExportSettingsPage />} />
        </Route>
        
        {/* Catch-all for any other bad URL */}
        <Route path="*" element={<Navigate to="/" />} />
      </Routes>
      <DebugPill />
    </BrowserRouter>
  );
}

export default App;