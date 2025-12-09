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
import AttributesPage from './pages/AttributesPage';
import SmartRulesPage from './pages/SmartRulesPage';
import SettingsPage from './pages/SettingsPage';
import SettingsSubPage from './pages/settings/SettingsSubPage';
import AttributeManager from './pages/Settings/AttributeManager';
import UsersManager from './pages/Settings/UsersManager';

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
        <Route path="launch-calendar" element={<LaunchCalendarPage />} />
        <Route path="import" element={<ImportManagerPage />} />
        <Route path="import/batches/:batchId" element={<ImportBatchDetailPage />} />
        <Route path="export" element={<ExportPage />} />
        <Route path="observations" element={<ObservationsPage />} />
        <Route path="attributes" element={<AttributesPage />} />
        <Route path="smart-rules" element={<SmartRulesPage />} />
        
        {/* Settings routes */}
        <Route path="settings" element={<SettingsPage />} />
        <Route path="settings/attributes" element={<AttributeManager />} />
        <Route path="settings/users" element={<UsersManager />} />
        <Route path="settings/ai-templates" element={<SettingsSubPage section="ai-templates" />} />
        <Route path="settings/search" element={<SettingsSubPage section="search" />} />
        <Route path="settings/import-settings" element={<SettingsSubPage section="import-settings" />} />
        <Route path="settings/export-settings" element={<SettingsSubPage section="export-settings" />} />
        <Route path="settings/bulk-actions" element={<SettingsSubPage section="bulk-actions" />} />
        <Route path="settings/workflows" element={<SettingsSubPage section="workflows" />} />
        <Route path="settings/ai-performance" element={<SettingsSubPage section="ai-performance" />} />
        <Route path="settings/permissions" element={<SettingsSubPage section="permissions" />} />
      </Route>
    </Routes>
  );
}

export default App;
