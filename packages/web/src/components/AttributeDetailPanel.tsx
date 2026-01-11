/**
 * AttributeDetailPanel Component
 * Right panel with attribute header, tabs, and tab content
 * 
 * Lisa PVS-0.2.3, updated PVS-0.2.6, PVS-0.2.9, PVS-0.3.2, PVS-0.3.3
 */

import { useState, useCallback, useEffect, useMemo } from 'react';
import type { Attribute } from '../hooks/useAttributes';
import { attributeIdExists } from '../hooks/useAttributes';
import { toSnakeCase } from '../lib/stringUtils';
import AttributeHeader from './AttributeHeader';
import AttributeTabs, { type TabId } from './AttributeTabs';
import MappingTab from './MappingTab';
import ValuesManager, {
  type AllowedValue,
  valuesToPayload,
} from './ValuesManager';
import AuditTab from './AuditTab';
import styles from '../pages/Settings/AttributesConsole.module.css';

export interface AttributeDetailPanelProps {
  attribute: Attribute | null;
  attributes: Attribute[];  // PVS-0.3.2: All attributes for MappingTab typeahead
  formData: Partial<Attribute>;
  isDirty: boolean;
  saving: boolean;
  isCreating?: boolean;  // LP-ATTR-1.3.3: Flag for create mode
  onFormChange: (data: Partial<Attribute>) => void;
  onCancel: () => void;
  onSync: () => void;
  onSave: () => void;
  onDeprecate?: () => void;
  onDelete?: () => void;
}

// Overview tab - renders real form fields
function OverviewTab({
  formData,
  onChange,
  isCreating,
}: {
  formData: Partial<Attribute>;
  onChange: (data: Partial<Attribute>) => void;
  isCreating?: boolean;
}) {
  // LP-ATTR-1.3.3: Determine if we're in create mode
  // Check both isCreating prop and if attribute_id is the dummy value 'new_attribute'
  const isCreateMode = isCreating || formData.attribute_id === 'new_attribute' || !formData.attribute_id;
  const isIdReadOnly = !isCreateMode;

  // LP-ATTR-1.3.3: State for ID validation
  const [idError, setIdError] = useState<string | null>(null);
  const [checkingId, setCheckingId] = useState(false);

  // LP-ATTR-1.3.3: Normalize ID to snake_case
  const normalizeId = (input: string): string => {
    // Remove leading/trailing whitespace
    let normalized = input.trim();
    // Convert to snake_case using existing utility
    normalized = toSnakeCase(normalized);
    // Ensure it doesn't start with a digit (prepend 'attr_' if needed)
    if (normalized && /^\d/.test(normalized)) {
      normalized = `attr_${normalized}`;
    }
    return normalized;
  };

  // LP-ATTR-1.3.3: Check ID uniqueness on blur
  const handleIdBlur = useCallback(async () => {
    const id = formData.attribute_id?.trim();
    if (!id || isIdReadOnly) return;

    setCheckingId(true);
    setIdError(null);

    try {
      const exists = await attributeIdExists(id);
      if (exists) {
        setIdError('This Attribute ID already exists. Please choose a unique ID.');
      }
    } catch (err) {
      console.error('Error checking attribute ID:', err);
      setIdError('Unable to verify ID uniqueness. Please try again.');
    } finally {
      setCheckingId(false);
    }
  }, [formData.attribute_id, isIdReadOnly]);

  // LP-ATTR-1.3.3: Handle ID input changes with normalization
  const handleIdChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const rawValue = e.target.value;
    const normalized = normalizeId(rawValue);
    onChange({ ...formData, attribute_id: normalized });
    setIdError(null); // Clear error on change
  };

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
              Attribute ID {isCreateMode && '*'}
            </label>
            <input
              id="attr-id"
              type="text"
              className={styles.formInput}
              value={formData.attribute_id || ''}
              onChange={handleIdChange}
              onBlur={handleIdBlur}
              disabled={isIdReadOnly}
              placeholder={isCreateMode ? "Leave blank to auto-generate from Label" : ""}
              data-testid="form-id"
            />
            {isIdReadOnly && (
              <p className={styles.formHelp}>Canonical identifier (read-only after creation)</p>
            )}
            {isCreateMode && !idError && (
              <p className={styles.formHelp}>
                Unique identifier in snake_case. Leave blank to auto-generate.
              </p>
            )}
            {checkingId && (
              <p className={styles.formHelp} style={{ color: '#666' }}>
                Checking availability...
              </p>
            )}
            {idError && (
              <p className={styles.formHelp} style={{ color: '#c62828' }}>
                {idError}
              </p>
            )}
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
function ValuesTab({ 
  formData,
  onChange,
}: { 
  formData: Partial<Attribute>;
  onChange: (data: Partial<Attribute>) => void;
}) {
  const isSelectType = formData.data_type === 'enum' || formData.data_type === 'multiSelect';

  // Convert from API format to ValuesManager format
  const initialValues = useMemo<AllowedValue[]>(() => {
    const allowedValues = formData.allowed_values || [];
    // synonyms can be either string[] (legacy) or Record<string, string[]> (new per-value format)
    const synonymsData = formData.synonyms as Record<string, string[]> | string[] | undefined;
    
    // Convert to per-value synonyms map if it's the new format
    const synonymsMap: Record<string, string[]> = 
      synonymsData && !Array.isArray(synonymsData) ? synonymsData : {};
    
    return allowedValues.map((val, idx) => ({
      id: `val-${idx}-${Date.now()}`,
      value: val,
      enabled: true,
      synonyms: synonymsMap[val] || [],
    }));
  }, [formData.allowed_values, formData.synonyms]);

  // Handle changes from ValuesManager
  const handleValuesChange = useCallback((values: AllowedValue[]) => {
    const payload = valuesToPayload(values);
    onChange({
      ...formData,
      allowed_values: payload.allowed_values,
      synonyms: payload.synonyms,
    });
  }, [formData, onChange]);

  if (isSelectType) {
    return (
      <div className={styles.tabPanel} data-testid="tab-panel-values">
        <ValuesManager
          values={initialValues}
          onChange={handleValuesChange}
          readOnly={false}
        />
      </div>
    );
  }

  // Non-enum types: show constraints placeholder
  return (
    <div className={styles.tabPanel} data-testid="tab-panel-values">
      <div className={styles.card}>
        <h3 className={styles.cardTitle}>Value Constraints</h3>
        <div className={styles.placeholder}>
          <div className={styles.placeholderIcon}>🔧</div>
          <p className={styles.placeholderTitle}>String/Number constraints</p>
          <p className={styles.placeholderText}>
            Configure validation rules for {formData.data_type || 'string'} type attributes.
            {formData.data_type === 'string' && ' (e.g., min/max length, pattern)'}
            {formData.data_type === 'number' && ' (e.g., min/max value, precision)'}
          </p>
        </div>
      </div>
    </div>
  );
}

// Toggle component for settings
function Toggle({
  checked,
  onChange,
  disabled = false,
  id,
}: {
  checked: boolean;
  onChange: (checked: boolean) => void;
  disabled?: boolean;
  id: string;
}) {
  return (
    <label className={styles.toggle}>
      <input
        type="checkbox"
        className={styles.toggleInput}
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        disabled={disabled}
        id={id}
        data-testid={id}
      />
      <span className={styles.toggleSlider} />
    </label>
  );
}

// Behavior tab - actual settings controls
function BehaviorTab({
  formData,
  onChange,
}: {
  formData: Partial<Attribute>;
  onChange: (data: Partial<Attribute>) => void;
}) {
  return (
    <div className={styles.tabPanel} data-testid="tab-panel-behavior">
      <div className={styles.card}>
        <h3 className={styles.cardTitle}>Behavior Settings</h3>
        
        {/* Completion Settings */}
        <div className={styles.settingsGroup}>
          <h4 className={styles.settingsGroupTitle}>Completion Requirements</h4>
          
          <div className={styles.settingRow}>
            <div>
              <div className={styles.settingLabel}>Required for Completion</div>
              <div className={styles.settingDescription}>
                Product must have this attribute to be considered complete
              </div>
            </div>
            <Toggle
              id="toggle-required-completion"
              checked={formData.required_for_completion || false}
              onChange={(checked) => onChange({ ...formData, required_for_completion: checked })}
            />
          </div>
        </div>
        
        {/* Export Settings */}
        <div className={styles.settingsGroup}>
          <h4 className={styles.settingsGroupTitle}>Export Settings</h4>
          
          <div className={styles.settingRow}>
            <div>
              <div className={styles.settingLabel}>Required for Export</div>
              <div className={styles.settingDescription}>
                Must be filled before product can be exported to feeds
              </div>
            </div>
            <Toggle
              id="toggle-required-export"
              checked={formData.required_for_export || false}
              onChange={(checked) => onChange({ ...formData, required_for_export: checked })}
            />
          </div>
          
          <div className={styles.formRow} style={{ marginTop: '0.75rem' }}>
            <label className={styles.formLabel} htmlFor="external-header">
              External Header
            </label>
            <input
              id="external-header"
              type="text"
              className={styles.formInput}
              value={formData.external_header || ''}
              onChange={(e) => onChange({ ...formData, external_header: e.target.value })}
              placeholder="CSV column header for export"
              data-testid="input-external-header"
            />
            <p className={styles.formHelp}>Column name used in CSV/feed exports</p>
          </div>
        </div>
        
        {/* Import Settings */}
        <div className={styles.settingsGroup}>
          <h4 className={styles.settingsGroupTitle}>Import Settings</h4>
          
          <div className={styles.settingRow}>
            <div>
              <div className={styles.settingLabel}>Required for Import</div>
              <div className={styles.settingDescription}>
                Import will fail if this attribute is missing from source data
              </div>
            </div>
            <Toggle
              id="toggle-import-required"
              checked={formData.import_required || false}
              onChange={(checked) => onChange({ ...formData, import_required: checked })}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

// AI & SEO tab - actual settings controls
function AiSeoTab({
  formData,
  onChange,
}: {
  formData: Partial<Attribute>;
  onChange: (data: Partial<Attribute>) => void;
}) {
  return (
    <div className={styles.tabPanel} data-testid="tab-panel-ai-seo">
      <div className={styles.card}>
        <h3 className={styles.cardTitle}>AI & SEO Configuration</h3>
        
        {/* AI Usage Notes */}
        <div className={styles.settingsGroup}>
          <h4 className={styles.settingsGroupTitle}>AI Usage Notes</h4>
          <div className={styles.formRow}>
            <textarea
              id="ai-usage-notes"
              className={styles.formTextarea}
              value={formData.ai_usage_notes || ''}
              onChange={(e) => onChange({ ...formData, ai_usage_notes: e.target.value })}
              placeholder="Instructions for AI on how to use this attribute in content generation..."
              rows={4}
              data-testid="textarea-ai-notes"
            />
            <p className={styles.formHelp}>
              Guidance for AI models on how to interpret and use this attribute
            </p>
          </div>
        </div>
        
        {/* AI Use Toggle */}
        <div className={styles.settingsGroup}>
          <h4 className={styles.settingsGroupTitle}>AI Permission</h4>
          <div className={styles.settingRow}>
            <div>
              <div className={styles.settingLabel}>AI Use</div>
              <div className={styles.settingDescription}>
                Allow AI agents and templates to use this attribute when generating content.
              </div>
            </div>
            <Toggle
              id="toggle-ai-use"
              checked={Boolean(formData.ai_use)}
              onChange={(checked) => onChange({ ...formData, ai_use: checked })}
            />
          </div>
        </div>
        
        {/* Category Assignment */}
        <div className={styles.settingsGroup}>
          <h4 className={styles.settingsGroupTitle}>Category</h4>
          <div className={styles.formRow}>
            <input
              id="category"
              type="text"
              className={styles.formInput}
              value={formData.category || ''}
              onChange={(e) => onChange({ ...formData, category: e.target.value })}
              placeholder="e.g., Appearance, Pricing, SEO, Source"
              data-testid="input-category"
            />
            <p className={styles.formHelp}>
              Logical grouping for organizing attributes in the console
            </p>
          </div>
        </div>
        
        {/* Source information (read-only) */}
        <div className={styles.settingsGroup}>
          <h4 className={styles.settingsGroupTitle}>Source Information</h4>
          <div className={styles.settingRow}>
            <div>
              <div className={styles.settingLabel}>Data Source</div>
              <div className={styles.settingDescription}>
                {formData.source || 'Not specified'}
              </div>
            </div>
          </div>
          {formData.createdBy && (
            <div className={styles.settingRow}>
              <div>
                <div className={styles.settingLabel}>Created By</div>
                <div className={styles.settingDescription}>
                  {formData.createdBy} {formData.createdAt ? `on ${new Date(formData.createdAt).toLocaleDateString()}` : ''}
                </div>
              </div>
            </div>
          )}
          {formData.updatedBy && (
            <div className={styles.settingRow}>
              <div>
                <div className={styles.settingLabel}>Last Updated</div>
                <div className={styles.settingDescription}>
                  {formData.updatedBy} {formData.updatedAt ? `on ${new Date(formData.updatedAt).toLocaleDateString()}` : ''}
                </div>
              </div>
            </div>
          )}
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
  attributes,
  formData,
  isDirty,
  saving,
  isCreating,
  onFormChange,
  onCancel,
  onSync,
  onSave,
  onDeprecate,
  onDelete,
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
        return <OverviewTab formData={formData} onChange={onFormChange} isCreating={isCreating} />;
      case 'values':
        return <ValuesTab formData={formData} onChange={onFormChange} />;
      case 'behavior':
        return <BehaviorTab formData={formData} onChange={onFormChange} />;
      case 'ai-seo':
        return <AiSeoTab formData={formData} onChange={onFormChange} />;
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
        // Guard: only render MappingTab when attribute has a valid attribute_id.
        // During attribute creation (no id), show placeholder to avoid mapping 404 errors.
        return attribute && attribute.attribute_id ? (
          <MappingTab attribute={attribute} attributes={attributes} />
        ) : (
          <div className={styles.placeholderTab} data-testid="mapping-placeholder">
            <p>Save the attribute first to configure mappings.</p>
          </div>
        );
      case 'audit':
        return (
          <AuditTab
            attribute={attribute}
            onAttributeUpdated={onSave}
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
        onDeprecate={onDeprecate}
        onDelete={onDelete}
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
