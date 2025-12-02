import { useNavigate } from 'react-router-dom';
import PageLayout from '@/components/common/PageLayout';
import { settingsNavConfig } from '@/config/nav';

interface SettingsSubPageProps {
  section: string;
}

/**
 * Generic Settings Sub-Page
 * 
 * TODO: Implement detailed CRUD interfaces for each settings section according to:
 * Admin UI Build Spec — Settings CRUD
 * https://www.notion.so/2b845ee1ec5a81e58df8f9633b2e0e2b
 * 
 * Each section should include:
 * - List view with search and filters
 * - Add/Edit/Delete operations
 * - Validation
 * - Save/Cancel actions
 */
function SettingsSubPage({ section }: SettingsSubPageProps) {
  const navigate = useNavigate();
  const setting = settingsNavConfig.find(s => s.id === section);
  
  if (!setting) {
    return (
      <PageLayout title="Settings">
        <div style={{ padding: '2rem', textAlign: 'center' }}>
          <h3>Unknown settings section</h3>
        </div>
      </PageLayout>
    );
  }

  return (
    <PageLayout title={setting.label}>
      <div style={{ marginBottom: '1rem' }}>
        <button
          onClick={() => navigate('/settings')}
          style={{
            padding: 'var(--spacing-sm) var(--spacing-md)',
            background: 'var(--color-background)',
            border: '1px solid var(--color-border)',
            borderRadius: '4px',
            cursor: 'pointer',
            fontSize: 'var(--font-size-sm)',
          }}
        >
          ← Back to Settings Hub
        </button>
      </div>
      
      <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--color-text-secondary)' }}>
        <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>{setting.icon}</div>
        <h3>{setting.label} Configuration</h3>
        <p>This section will contain the CRUD interface for {setting.label.toLowerCase()}.</p>
        <p style={{ marginTop: '1rem', fontSize: 'var(--font-size-sm)' }}>
          📋 Implementation details in Notion: Admin UI Build Spec — Settings CRUD
        </p>
      </div>
    </PageLayout>
  );
}

export default SettingsSubPage;
