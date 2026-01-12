import { Routes, Route, Navigate } from 'react-router-dom';
import AppLayout from './components/layout/AppLayout';
import HomePage from './pages/HomePage';
import ProductsPage from './pages/ProductsPage';
import ProductEditorPage from './pages/ProductEditorPage';
import LaunchCalendarPage from './pages/LaunchCalendarPage';
import ImportManagerPage from './pages/ImportManagerPage';
import ImportBatchDetailPage from './pages/ImportBatchDetailPage';
import ExportPage from './pages/ExportPage';
import ObservationsPage from './pages/ObservationsPage';
import ObservationsCapturePage from './pages/ObservationsCapturePage';
// AttributesPage now uses new master-detail console (PVS-0.2.3)
// SmartRulesPage removed - redirect to /settings/smart-rules instead
import SettingsPage from './pages/SettingsPage';
import SettingsSubPage from './pages/settings/SettingsSubPage';
import SmartRulesSettingsPage from './pages/settings/SmartRulesSettingsPage';
import AttributesConsole from './pages/Settings/AttributesConsole';
import AttributesTable from './pages/Settings/AttributesTable';
import UsersManager from './pages/Settings/UsersManager';
import ProfilePage from './pages/Settings/ProfilePage';
import PermissionsPage from './pages/Settings/PermissionsPage';
import ProductKickOffPage from './pages/ProductKickOffPage';
import LaunchProductSetup from './pages/LaunchProductSetup';
import AITemplateBuilder from './pages/settings/ai-templates/AITemplateBuilder';

function App() {
  return (
    <Routes>
      <Route path="/" element={<AppLayout />}>
        {/* Default redirect to home */}
        <Route index element={<Navigate to="/home" replace />} />
        
        {/* Main navigation routes */}
        <Route path="home" element={<HomePage />} />
        <Route path="products" element={<ProductsPage />} />
        <Route path="products/:id" element={<ProductEditorPage />} />
        <Route path="products/:mpn/kickoff" element={<ProductKickOffPage />} />
        <Route path="products/:mpn/launch-setup" element={<LaunchProductSetup />} />
        <Route path="launch-calendar" element={<LaunchCalendarPage />} />
        <Route path="import" element={<ImportManagerPage />} />
        <Route path="import/batches/:batchId" element={<ImportBatchDetailPage />} />
        <Route path="export" element={<ExportPage />} />
        <Route path="observations" element={<ObservationsPage />} />
        <Route path="observations/capture" element={<ObservationsCapturePage />} />
        <Route path="attributes" element={<Navigate to="/settings/attributes" replace />} />
        {/* Redirect legacy top-level URL to Settings admin console */}
        <Route path="smart-rules" element={<Navigate to="/settings/smart-rules" replace />} />
        
        {/* Settings routes */}
        <Route path="settings" element={<SettingsPage />} />
        <Route path="settings/permissions" element={<PermissionsPage />} />
        <Route path="settings/attributes" element={<AttributesConsole />} />
        <Route path="settings/attributes/table" element={<AttributesTable />} />
        <Route path="settings/users" element={<UsersManager />} />
        <Route path="settings/profile" element={<ProfilePage />} />
        <Route path="settings/ai-templates" element={<SettingsSubPage section="ai-templates" />} />
        <Route path="settings/ai-templates/new" element={<AITemplateBuilder />} />
        <Route path="settings/ai-templates/edit/:templateKey" element={<AITemplateBuilder />} />
        <Route path="settings/search" element={<SettingsSubPage section="search" />} />
        <Route path="settings/import-settings" element={<SettingsSubPage section="import-settings" />} />
        <Route path="settings/export-settings" element={<SettingsSubPage section="export-settings" />} />
        <Route path="settings/bulk-actions" element={<SettingsSubPage section="bulk-actions" />} />
        <Route path="settings/workflows" element={<SettingsSubPage section="workflows" />} />
        <Route path="settings/ai-performance" element={<SettingsSubPage section="ai-performance" />} />
        <Route path="settings/smart-rules" element={<SmartRulesSettingsPage />} />
      </Route>
    </Routes>
  );
}

export default App;
