import React, { Suspense } from 'react';
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
import ExportRulesPage from './pages/settings/ExportRulesPage';
import UsersAdminPage from './pages/admin/UsersAdminPage';
import DescribePage from './pages/ai/DescribePage';

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
          path="/ai/describe"
          element={
            user && role === 'admin' ? (
              <MainLayout>
                <DescribePage />
              </MainLayout>
            ) : (
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
          {/* Default redirect to export settings */}
          <Route index element={<Navigate to="export" replace />} />
          <Route path="export" element={<Suspense fallback={<div className="p-6 text-sm text-gray-500">Loading settings…</div>}><ExportSettingsPage /></Suspense>} />
          <Route path="ai" element={<Suspense fallback={<div className="p-6 text-sm text-gray-500">Loading settings…</div>}><AISettingsPage /></Suspense>} />
          <Route path="prompts" element={<Suspense fallback={<div className="p-6 text-sm text-gray-500">Loading settings…</div>}><PromptsPage /></Suspense>} />
          <Route path="vocab-managed" element={<Suspense fallback={<div className="p-6 text-sm text-gray-500">Loading settings…</div>}><VocabManagedPage /></Suspense>} />
          <Route path="vocab" element={<Suspense fallback={<div className="p-6 text-sm text-gray-500">Loading settings…</div>}><VocabDropdownsPage /></Suspense>} />
          <Route path="rules" element={<Suspense fallback={<div className="p-6 text-sm text-gray-500">Loading settings…</div>}><RulesPage /></Suspense>} />
          <Route path="brands" element={<Suspense fallback={<div className="p-6 text-sm text-gray-500">Loading settings…</div>}><BrandsPage /></Suspense>} />
          <Route path="export-rules" element={<Suspense fallback={<div className="p-6 text-sm text-gray-500">Loading settings…</div>}><ExportRulesPage /></Suspense>} />
          <Route path="admin-users" element={<Suspense fallback={<div className="p-6 text-sm text-gray-500">Loading settings…</div>}><UsersAdminPage /></Suspense>} />
        </Route>
        
        {/* Catch-all for any other bad URL */}
        <Route path="*" element={<Navigate to="/" />} />
      </Routes>
      <DebugPill />
    </BrowserRouter>
  );
}

export default App;