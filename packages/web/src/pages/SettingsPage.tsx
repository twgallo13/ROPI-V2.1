import { Link } from 'react-router-dom';
import { settingsNavConfig } from '@/config/nav';
import PageLayout from '@/components/common/PageLayout';
import './SettingsPage.css';

/**
 * Settings Hub Page
 * 
 * TODO: Implement full settings UI according to Admin UI Build Spec — Settings CRUD
 * https://www.notion.so/2b845ee1ec5a81e58df8f9633b2e0e2b
 * 
 * This hub provides access to all AOSS configuration and administration areas.
 */
function SettingsPage() {
  return (
    <PageLayout title="Settings Hub">
      <div className="settings-grid">
        {settingsNavConfig.map((setting) => (
          <Link
            key={setting.id}
            to={setting.route}
            className="settings-card"
          >
            <div className="settings-card-icon">{setting.icon}</div>
            <h3 className="settings-card-title">{setting.label}</h3>
            <p className="settings-card-description">
              Configure {setting.label.toLowerCase()} settings
            </p>
          </Link>
        ))}
      </div>
      
      <div style={{ marginTop: '2rem', padding: '1rem', background: 'var(--color-background)', borderRadius: '6px' }}>
        <p style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-text-secondary)', margin: 0 }}>
          📋 Full implementation details in Notion: Admin UI Build Spec — Settings CRUD
        </p>
      </div>
    </PageLayout>
  );
}

export default SettingsPage;
