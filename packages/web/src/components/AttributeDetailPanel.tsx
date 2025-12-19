/**
 * AttributeDetailPanel Component
 * Right panel with attribute header, tabs, and tab content
 * 
 * Lisa PVS-0.2.3
 */

import { useState, useCallback, useEffect } from 'react';
import type { Attribute } from '../hooks/useAttributes';
import AttributeHeader from './AttributeHeader';
import AttributeTabs, { type TabId } from './AttributeTabs';
import styles from '../pages/Settings/AttributesConsole.module.css';

export interface AttributeDetailPanelProps {
  attribute: Attribute | null;
  formData: Partial<Attribute>;
  isDirty: boolean;
  saving: boolean;
  onFormChange: (data: Partial<Attribute>) => void;
  onCancel: () => void;
  onSync: () => void;
  onSave: () => void;
}

// Overview tab - renders real form fields
function OverviewTab({
  formData,
  onChange,
}: {
  formData: Partial<Attribute>;
  onChange: (data: Partial<Attribute>) => void;
}) {
  return (
    <div className={styles.tabPanel} data-testid="tab-panel-overview">
      <div className={styles.card}>
        <h3 className={styles.cardTitle}>Basic Information</h3>
        <div className={styles.formGrid}>
          <div className={styles.formRow}>
            <label className={styles.formLabel} htmlFor="attr-label">
              Label *
            </label>
            <input
              id="attr-label"
              type="text"
              className={styles.formInput}
              value={formData.label || ''}
              onChange={(e) => onChange({ ...formData, label: e.target.value })}
              placeholder="Display name for this attribute"
              data-testid="form-label"
            />
          </div>

          <div className={styles.formRow}>
            <label className={styles.formLabel} htmlFor="attr-id">
              Attribute ID
            </label>
            <input
              id="attr-id"
              type="text"
              className={styles.formInput}
              value={formData.attribute_id || ''}
              disabled
              data-testid="form-id"
            />
            <p className={styles.formHelp}>Canonical identifier (read-only after creation)</p>
          </div>

          <div className={styles.formRowInline}>
            <div className={styles.formRow}>
              <label className={styles.formLabel} htmlFor="attr-data-type">
                Data Type *
              </label>
              <select
                id="attr-data-type"
                className={styles.formSelect}
                value={formData.data_type || 'string'}
                onChange={(e) =>
                  onChange({ ...formData, data_type: e.target.value as Attribute['data_type'] })
                }
                data-testid="form-data-type"
              >
                <option value="string">String</option>
                <option value="number">Number</option>
                <option value="boolean">Boolean</option>
                <option value="enum">Enum</option>
                <option value="multiSelect">Multi-Select</option>
                <option value="currency">Currency</option>
                <option value="date">Date</option>
                <option value="json">JSON</option>
              </select>
            </div>

            <div className={styles.formRow}>
              <label className={styles.formLabel} htmlFor="attr-status">
                Status
              </label>
              <select
                id="attr-status"
                className={styles.formSelect}
                value={formData.status || 'active'}
                onChange={(e) =>
                  onChange({ ...formData, status: e.target.value as Attribute['status'] })
                }
                data-testid="form-status"
              >
                <option value="active">Active</option>
                <option value="deprecated">Deprecated</option>
                <option value="hidden">Hidden</option>
              </select>
            </div>
          </div>

          <div className={styles.formRow}>
            <label className={styles.formLabel} htmlFor="attr-category">
              Category
            </label>
            <input
              id="attr-category"
              type="text"
              className={styles.formInput}
              value={formData.category || ''}
              onChange={(e) => onChange({ ...formData, category: e.target.value })}
              placeholder="e.g., Product Info, Pricing, SEO"
              data-testid="form-category"
            />
          </div>

          <div className={styles.formRow}>
            <label className={styles.formLabel} htmlFor="attr-description">
              Description
            </label>
            <textarea
              id="attr-description"
              className={styles.formTextarea}
              value={formData.ai_usage_notes || ''}
              onChange={(e) => onChange({ ...formData, ai_usage_notes: e.target.value })}
              placeholder="Describe the purpose and usage of this attribute..."
              rows={3}
              data-testid="form-description"
            />
          </div>
        </div>
      </div>
    </div>
  );
}

// Values tab - shows values manager for enum/multiSelect, constraints for others
function ValuesTab({ formData }: { formData: Partial<Attribute> }) {
  const isSelectType = formData.data_type === 'enum' || formData.data_type === 'multiSelect';
  const allowedValues = formData.allowed_values || [];

  if (isSelectType) {
    return (
      <div className={styles.tabPanel} data-testid="tab-panel-values">
        <div className={styles.card}>
          <h3 className={styles.cardTitle}>Allowed Values</h3>
          <div className={styles.valuesSearch}>
            <input
              type="text"
              className={styles.formInput}
              placeholder="Search values..."
              data-testid="values-search"
            />
          </div>
          {allowedValues.length > 0 ? (
            <div className={styles.valuesList}>
              {allowedValues.map((value, idx) => (
                <div key={idx} className={styles.valuesItem}>
                  <span className={styles.valuesItemLabel}>{value}</span>
                </div>
              ))}
            </div>
          ) : (
            <div className={styles.placeholder}>
              <div className={styles.placeholderIcon}>📝</div>
              <p className={styles.placeholderTitle}>No values defined</p>
              <p className={styles.placeholderText}>Add allowed values for this enum/multi-select attribute</p>
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className={styles.tabPanel} data-testid="tab-panel-values">
      <div className={styles.card}>
        <h3 className={styles.cardTitle}>Constraints</h3>
        <div className={styles.placeholder}>
          <div className={styles.placeholderIcon}>🔧</div>
          <p className={styles.placeholderTitle}>Value constraints</p>
          <p className={styles.placeholderText}>
            Configure validation rules for {formData.data_type || 'string'} type attributes
          </p>
        </div>
      </div>
    </div>
  );
}

// Placeholder tab component
function PlaceholderTab({
  title,
  description,
  icon,
  tabId,
}: {
  title: string;
  description: string;
  icon: string;
  tabId: string;
}) {
  return (
    <div className={styles.tabPanel} data-testid={`tab-panel-${tabId}`}>
      <div className={styles.card}>
        <h3 className={styles.cardTitle}>{title}</h3>
        <div className={styles.placeholder}>
          <div className={styles.placeholderIcon}>{icon}</div>
          <p className={styles.placeholderTitle}>{title}</p>
          <p className={styles.placeholderText}>{description}</p>
        </div>
      </div>
    </div>
  );
}

export default function AttributeDetailPanel({
  attribute,
  formData,
  isDirty,
  saving,
  onFormChange,
  onCancel,
  onSync,
  onSave,
}: AttributeDetailPanelProps) {
  const [activeTab, setActiveTab] = useState<TabId>('overview');

  // Reset to overview tab when attribute changes
  useEffect(() => {
    setActiveTab('overview');
  }, [attribute?.attribute_id]);

  const handleTabChange = useCallback((tabId: TabId) => {
    setActiveTab(tabId);
  }, []);

  // Empty state when no attribute selected
  if (!attribute) {
    return (
      <div className={styles.detailPanel} data-testid="attribute-detail-panel-empty">
        <AttributeHeader attribute={null} />
        <div className={styles.emptyDetail}>
          <div className={styles.emptyDetailIcon}>📋</div>
          <h3 className={styles.emptyDetailTitle}>No attribute selected</h3>
          <p className={styles.emptyDetailText}>
            Select an attribute from the list or create a new one to get started.
          </p>
        </div>
      </div>
    );
  }

  const renderTabContent = () => {
    switch (activeTab) {
      case 'overview':
        return <OverviewTab formData={formData} onChange={onFormChange} />;
      case 'values':
        return <ValuesTab formData={formData} />;
      case 'behavior':
        return (
          <PlaceholderTab
            tabId="behavior"
            title="Behavior Settings"
            description="Configure import/export requirements, completion rules, and validation behavior"
            icon="⚙️"
          />
        );
      case 'ai-seo':
        return (
          <PlaceholderTab
            tabId="ai-seo"
            title="AI & SEO Configuration"
            description="AI usage notes, SEO metadata, and content generation settings"
            icon="🤖"
          />
        );
      case 'customer':
        return (
          <PlaceholderTab
            tabId="customer"
            title="Customer Display (PDP)"
            description="Configure how this attribute appears on product detail pages"
            icon="👁️"
          />
        );
      case 'mapping':
        return (
          <PlaceholderTab
            tabId="mapping"
            title="External Mapping"
            description="Map to external systems, CSV headers, and sync rules"
            icon="🔗"
          />
        );
      case 'audit':
        return (
          <PlaceholderTab
            tabId="audit"
            title="Audit Log"
            description="View change history and audit trail for this attribute"
            icon="📜"
          />
        );
      default:
        return null;
    }
  };

  return (
    <div className={styles.detailPanel} data-testid="attribute-detail-panel">
      <AttributeHeader
        attribute={attribute}
        isDirty={isDirty}
        saving={saving}
        onCancel={onCancel}
        onSync={onSync}
        onSave={onSave}
      />
      <AttributeTabs activeTab={activeTab} onChange={handleTabChange} />
      <div
        className={styles.tabContent}
        role="tabpanel"
        id={`panel-${activeTab}`}
        aria-labelledby={`tab-${activeTab}`}
      >
        {renderTabContent()}
      </div>
    </div>
  );
}
