/**
 * AttributeTabs Component
 * Tab navigation for attribute detail panel
 * 
 * Lisa PVS-0.2.3
 */
import styles from '../pages/Settings/AttributesConsole.module.css';

export type TabId = 'overview' | 'values' | 'behavior' | 'ai-seo' | 'customer' | 'mapping' | 'audit';

export interface Tab {
  id: TabId;
  label: string;
}

export const TABS: Tab[] = [
  { id: 'overview', label: 'Overview' },
  { id: 'values', label: 'Values' },
  { id: 'behavior', label: 'Behavior' },
  { id: 'ai-seo', label: 'AI & SEO' },
  { id: 'customer', label: 'Customer (PDP)' },
  { id: 'mapping', label: 'Mapping' },
  { id: 'audit', label: 'Audit' },
];

export interface AttributeTabsProps {
  activeTab: TabId;
  onChange: (tabId: TabId) => void;
}

export default function AttributeTabs({ activeTab, onChange }: AttributeTabsProps) {
  return (
    <div className={styles.tabsContainer} role="tablist" aria-label="Attribute sections">
      <ul className={styles.tabsList}>
        {TABS.map((tab) => (
          <li key={tab.id}>
            <button
              type="button"
              role="tab"
              id={`tab-${tab.id}`}
              aria-selected={activeTab === tab.id}
              aria-controls={`panel-${tab.id}`}
              className={`${styles.tab} ${activeTab === tab.id ? styles.tabActive : ''}`}
              onClick={() => onChange(tab.id)}
              data-testid={`tab-${tab.id}`}
            >
              {tab.label}
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
