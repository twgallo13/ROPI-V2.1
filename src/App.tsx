import React, { Suspense, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useNavigate, useLocation } from 'react-router-dom';
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
import AITemplateBuilder from './pages/settings/AITemplateBuilder';
import VocabManagedPage from './pages/settings/VocabManagedPage';
import VocabDropdownsPage from './pages/settings/VocabDropdownsPage';
import RulesPage from './pages/settings/RulesPage';
import BrandsPage from './pages/settings/BrandsPage';
import ExportSettingsPage from './pages/settings/ExportSettingsPage';
import ExportRulesPage from './pages/settings/ExportRulesPage';
import UsersAdminPage from './pages/admin/UsersAdminPage';
import DescribePage from './pages/ai/DescribePage';
import AttributesCommandCenter from './pages/settings/AttributesCommandCenter';

function RouteManager() {
  const { user, role, authReady } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  // Save current route to sessionStorage on route changes
  useEffect(() => {
    if (authReady && user && location.pathname !== '/') {
      sessionStorage.setItem('lastRoute', location.pathname);
    }
  }, [authReady, user, location.pathname]);

  // Restore last route once auth is ready
  useEffect(() => {
    if (authReady && user) {
      const lastRoute = sessionStorage.getItem('lastRoute');
      if (lastRoute && lastRoute !== '/' && location.pathname === '/') {
        navigate(lastRoute, { replace: true });
      }
    }
  }, [authReady, user, navigate, location.pathname]);

  // Wait for auth to be ready before evaluating routes
  if (!authReady) {
    return <div className="flex items-center justify-center h-screen text-sm text-gray-500">Loading…</div>;
  }

  return (
    <>
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
          <Route path="ai-templates" element={<Suspense fallback={<div className="p-6 text-sm text-gray-500">Loading settings…</div>}><AITemplateBuilder /></Suspense>} />
          {/* Legacy prompts UI (kept for fallback; no nav link) */}
          {/* <Route path="prompts" element={<Suspense fallback={<div className="p-6 text-sm text-gray-500">Loading settings…</div>}><PromptsPage /></Suspense>} /> */}
          <Route path="vocab-managed" element={<Suspense fallback={<div className="p-6 text-sm text-gray-500">Loading settings…</div>}><VocabManagedPage /></Suspense>} />
          <Route path="vocab" element={<Suspense fallback={<div className="p-6 text-sm text-gray-500">Loading settings…</div>}><VocabDropdownsPage /></Suspense>} />
          <Route path="rules" element={<Suspense fallback={<div className="p-6 text-sm text-gray-500">Loading settings…</div>}><RulesPage /></Suspense>} />
          <Route path="brands" element={<Suspense fallback={<div className="p-6 text-sm text-gray-500">Loading settings…</div>}><BrandsPage /></Suspense>} />
          <Route path="export-rules" element={<Suspense fallback={<div className="p-6 text-sm text-gray-500">Loading settings…</div>}><ExportRulesPage /></Suspense>} />
          <Route path="admin-users" element={<Suspense fallback={<div className="p-6 text-sm text-gray-500">Loading settings…</div>}><UsersAdminPage /></Suspense>} />
          <Route path="attributes" element={<Suspense fallback={<div className="p-6 text-sm text-gray-500">Loading settings…</div>}><AttributesCommandCenter /></Suspense>} />
        </Route>
        
        {/* Catch-all for any other bad URL */}
        <Route path="*" element={<Navigate to="/" />} />
      </Routes>
      <DebugPill />
    </>
  );
}

function App() {
  return (
    <BrowserRouter>
      <RouteManager />
    </BrowserRouter>
  );
}

export default App;