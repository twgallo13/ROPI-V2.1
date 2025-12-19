/**
 * AttributesConsole Component
 * Master-detail layout for managing product attributes
 * 
 * Lisa PVS-0.2.3, updated PVS-0.2.6
 * 
 * This is a UI shell refactor - no changes to attribute semantics or data.
 * Replaces the old modal-based AttributeManager with a modern master-detail layout.
 */

import { useState, useCallback, useMemo, useEffect } from 'react';
import { useAttributes, type Attribute } from '../../hooks/useAttributes';
import { toastError, toastSuccess } from '../../lib/notifications';
import AttributeListPanel from '../../components/AttributeListPanel';
import AttributeDetailPanel from '../../components/AttributeDetailPanel';
import styles from './AttributesConsole.module.css';

// Default values for new attributes
const DEFAULT_ATTR: Partial<Attribute> = {
  data_type: 'string',
  status: 'active',
  required_for_export: false,
  import_required: false,
  required_for_completion: false,
  external_header: '',
  source: 'json',
};

// Confirmation modal component
function ConfirmationModal({
  title,
  message,
  confirmLabel,
  isDanger,
  requireConfirmText,
  onConfirm,
  onCancel,
}: {
  title: string;
  message: string;
  confirmLabel: string;
  isDanger?: boolean;
  requireConfirmText?: string;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  const [inputValue, setInputValue] = useState('');
  const canConfirm = requireConfirmText ? inputValue === requireConfirmText : true;

  return (
    <div className={styles.modalOverlay} data-testid="confirmation-modal">
      <div className={styles.modal}>
        <div className={styles.modalHeader}>
          <h3 className={styles.modalTitle}>{title}</h3>
        </div>
        <div className={styles.modalBody}>
          <p className={styles.modalText}>{message}</p>
          {isDanger && (
            <div className={styles.modalWarning}>
              ⚠️ This action cannot be undone. Please proceed with caution.
            </div>
          )}
          {requireConfirmText && (
            <div>
              <p className={styles.modalText}>
                To confirm, type <strong>{requireConfirmText}</strong> below:
              </p>
              <input
                type="text"
                className={styles.modalConfirmInput}
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                placeholder={requireConfirmText}
                data-testid="confirm-input"
              />
            </div>
          )}
        </div>
        <div className={styles.modalFooter}>
          <button
            type="button"
            className={styles.btnSecondary}
            onClick={onCancel}
            data-testid="modal-cancel"
          >
            Cancel
          </button>
          <button
            type="button"
            className={isDanger ? styles.btnDanger : styles.btnPrimary}
            onClick={onConfirm}
            disabled={!canConfirm}
            data-testid="modal-confirm"
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

/**
 * Normalize legacy attribute fields (camelCase → snake_case)
 * Safety net in case backend normalization doesn't cover all cases
 */
function normalizeLegacyAttribute(attr: Attribute): Attribute {
  const normalized = { ...attr };

  // Map legacy camelCase to snake_case
  if ('dataType' in attr && !(attr as Attribute).data_type) {
    normalized.data_type = (attr as unknown as { dataType: Attribute['data_type'] }).dataType;
  }
  if ('allowedValues' in attr && !attr.allowed_values) {
    normalized.allowed_values = (attr as unknown as { allowedValues: string[] }).allowedValues;
  }
  if ('requiredForCompletion' in attr && attr.required_for_completion === undefined) {
    normalized.required_for_completion = (attr as unknown as { requiredForCompletion: boolean }).requiredForCompletion;
  }
  if ('requiredForExport' in attr && attr.required_for_export === undefined) {
    normalized.required_for_export = (attr as unknown as { requiredForExport: boolean }).requiredForExport;
  }
  if ('importRequired' in attr && attr.import_required === undefined) {
    normalized.import_required = (attr as unknown as { importRequired: boolean }).importRequired;
  }
  if ('aiUsageNotes' in attr && !attr.ai_usage_notes) {
    normalized.ai_usage_notes = (attr as unknown as { aiUsageNotes: string }).aiUsageNotes;
  }
  if ('externalHeader' in attr && !attr.external_header) {
    normalized.external_header = (attr as unknown as { externalHeader: string }).externalHeader;
  }

  // Apply defaults
  if (!normalized.data_type) normalized.data_type = 'string';
  if (!normalized.status) normalized.status = 'active';

  return normalized;
}

export default function AttributesConsole() {
  const {
    attributes,
    loading,
    error,
    createAttribute,
    updateAttribute,
    deleteAttribute,
    refresh,
  } = useAttributes();

  // Selected attribute
  const [selectedId, setSelectedId] = useState<string | null>(null);
  // Form data for editing
  const [formData, setFormData] = useState<Partial<Attribute>>({ ...DEFAULT_ATTR });
  // Track if form has unsaved changes
  const [isDirty, setIsDirty] = useState(false);
  // Saving state
  const [saving, setSaving] = useState(false);
  // Creating new attribute mode
  const [isCreating, setIsCreating] = useState(false);
  // Modal state
  const [showDeprecateModal, setShowDeprecateModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);

  // Get selected attribute from list
  const selectedAttribute = useMemo(() => {
    if (!selectedId) return null;
    return attributes.find((a) => a.attribute_id === selectedId) || null;
  }, [attributes, selectedId]);

  // Sync form data when selected attribute changes
  useEffect(() => {
    if (selectedAttribute) {
      const normalized = normalizeLegacyAttribute(selectedAttribute);
      setFormData({ ...DEFAULT_ATTR, ...normalized });
      setIsDirty(false);
      setIsCreating(false);
    }
  }, [selectedAttribute]);

  // Handle attribute selection from list
  const handleSelect = useCallback((attr: Attribute) => {
    if (isDirty) {
      const confirmSwitch = window.confirm('You have unsaved changes. Discard and switch?');
      if (!confirmSwitch) return;
    }
    setSelectedId(attr.attribute_id);
  }, [isDirty]);

  // Handle create new attribute
  const handleCreateNew = useCallback(() => {
    if (isDirty) {
      const confirmSwitch = window.confirm('You have unsaved changes. Discard and create new?');
      if (!confirmSwitch) return;
    }
    setSelectedId(null);
    setFormData({ ...DEFAULT_ATTR, attribute_id: '', label: '' });
    setIsCreating(true);
    setIsDirty(false);
  }, [isDirty]);

  // Handle form data change
  const handleFormChange = useCallback((data: Partial<Attribute>) => {
    setFormData(data);
    setIsDirty(true);
  }, []);

  // Handle cancel
  const handleCancel = useCallback(() => {
    if (isCreating) {
      setIsCreating(false);
      setFormData({ ...DEFAULT_ATTR });
      setIsDirty(false);
    } else if (selectedAttribute) {
      const normalized = normalizeLegacyAttribute(selectedAttribute);
      setFormData({ ...DEFAULT_ATTR, ...normalized });
      setIsDirty(false);
    }
  }, [isCreating, selectedAttribute]);

  // Handle sync (refresh from server)
  const handleSync = useCallback(async () => {
    try {
      await refresh();
      toastSuccess('Synced attributes from server.');
    } catch (err) {
      toastError('Failed to sync: ' + (err instanceof Error ? err.message : String(err)));
    }
  }, [refresh]);

  // Handle save
  const handleSave = useCallback(async () => {
    setSaving(true);
    try {
      // Validation
      if (!formData.attribute_id?.trim()) {
        toastError('Attribute ID is required.');
        setSaving(false);
        return;
      }
      if (!formData.label?.trim()) {
        toastError('Label is required.');
        setSaving(false);
        return;
      }

      // Check for enum/multiSelect without values
      if (
        (formData.data_type === 'enum' || formData.data_type === 'multiSelect') &&
        (!formData.allowed_values || formData.allowed_values.length === 0)
      ) {
        toastError('Allowed values are required for enum/multi-select.');
        setSaving(false);
        return;
      }

      if (isCreating) {
        // Create new attribute
        const created = await createAttribute(
          formData as Omit<Attribute, 'createdAt' | 'updatedAt'>
        );
        setSelectedId(created.attribute_id);
        setIsCreating(false);
        toastSuccess(`Created attribute '${created.attribute_id}'`);
      } else if (selectedId) {
        // Update existing attribute
        await updateAttribute(selectedId, formData);
        toastSuccess(`Updated attribute '${selectedId}'`);
      }

      setIsDirty(false);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to save attribute';
      toastError(message);
    } finally {
      setSaving(false);
    }
  }, [formData, isCreating, selectedId, createAttribute, updateAttribute]);

  // Handle deprecate action
  const handleDeprecate = useCallback(async () => {
    if (!selectedId) return;
    setSaving(true);
    try {
      await updateAttribute(selectedId, { 
        status: 'deprecated',
      });
      toastSuccess(`Attribute '${selectedId}' has been deprecated.`);
      setShowDeprecateModal(false);
      setIsDirty(false);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to deprecate attribute';
      toastError(message);
    } finally {
      setSaving(false);
    }
  }, [selectedId, updateAttribute]);

  // Handle delete action (hard delete)
  const handleDelete = useCallback(async () => {
    if (!selectedId || !deleteAttribute) return;
    setSaving(true);
    try {
      await deleteAttribute(selectedId);
      toastSuccess(`Attribute '${selectedId}' has been deleted.`);
      setShowDeleteModal(false);
      setSelectedId(null);
      setFormData({ ...DEFAULT_ATTR });
      setIsDirty(false);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to delete attribute';
      toastError(message);
    } finally {
      setSaving(false);
    }
  }, [selectedId, deleteAttribute]);

  // Show loading state
  if (loading && attributes.length === 0) {
    return (
      <div className={styles.console}>
        <div className={styles.loading}>
          <div className={styles.spinner} />
          Loading attributes...
        </div>
      </div>
    );
  }

  // Show error state
  if (error && attributes.length === 0) {
    return (
      <div className={styles.console}>
        <div className={styles.loading}>
          <p style={{ color: '#dc2626' }}>Error: {error}</p>
          <button onClick={refresh} className={styles.btnSecondary}>
            Retry
          </button>
        </div>
      </div>
    );
  }

  // Determine what to show in detail panel
  const detailAttribute = isCreating
    ? ({ attribute_id: formData.attribute_id || 'new_attribute', ...formData } as Attribute)
    : selectedAttribute;

  return (
    <div className={styles.console} data-testid="attributes-console">
      <AttributeListPanel
        attributes={attributes}
        selectedId={selectedId}
        loading={loading}
        onSelect={handleSelect}
        onCreateNew={handleCreateNew}
      />
      <AttributeDetailPanel
        attribute={detailAttribute}
        formData={formData}
        isDirty={isDirty}
        saving={saving}
        onFormChange={handleFormChange}
        onCancel={handleCancel}
        onSync={handleSync}
        onSave={handleSave}
        onDeprecate={() => setShowDeprecateModal(true)}
        onDelete={() => setShowDeleteModal(true)}
      />
      
      {/* Deprecate confirmation modal */}
      {showDeprecateModal && selectedId && (
        <ConfirmationModal
          title="Deprecate Attribute"
          message={`Are you sure you want to deprecate "${selectedId}"? Deprecated attributes remain in the system but are hidden from most views and cannot be used for new products.`}
          confirmLabel="Deprecate"
          isDanger={false}
          onConfirm={handleDeprecate}
          onCancel={() => setShowDeprecateModal(false)}
        />
      )}
      
      {/* Delete confirmation modal */}
      {showDeleteModal && selectedId && (
        <ConfirmationModal
          title="Delete Attribute"
          message={`Are you sure you want to permanently delete "${selectedId}"? This action cannot be undone and may affect products that use this attribute.`}
          confirmLabel="Delete Permanently"
          isDanger={true}
          requireConfirmText={selectedId}
          onConfirm={handleDelete}
          onCancel={() => setShowDeleteModal(false)}
        />
      )}
    </div>
  );
}
