/**
 * AttributesConsole Component
 * Master-detail layout for managing product attributes
 * 
 * Lisa PVS-0.2.3, updated PVS-0.2.6, PVS-0.2.7
 * 
 * This is a UI shell refactor - no changes to attribute semantics or data.
 * Replaces the old modal-based AttributeManager with a modern master-detail layout.
 * PVS-0.2.7: Added ConversionModal for data_type string → enum/multiSelect conversion.
 */

import { useState, useCallback, useMemo, useEffect } from 'react';
import { usePageTitle } from '@/hooks/usePageTitle';
import { useAttributes, type Attribute, attributeIdExists } from '../../hooks/useAttributes';
import { toastError, toastSuccess } from '../../lib/notifications';
import { toSnakeCase } from '../../lib/stringUtils';
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

// Proposed value item for conversion
type ProposedValue = { value: string; count: number; selected: boolean };

/**
 * ConversionModal - Modal for converting string attribute to enum/multiSelect
 * Allows proposing values from product data or manual entry
 */
function ConversionModal({
  attributeId,
  targetType,
  onConfirm,
  onCancel,
  getTopValues,
}: {
  attributeId: string;
  targetType: 'enum' | 'multiSelect';
  onConfirm: (values: string[]) => void;
  onCancel: () => void;
  getTopValues: (attributeId: string, limit?: number, minCount?: number) => Promise<{
    values: Array<{ value: string; count: number }>;
    total: number;
    sampledProducts: number;
  }>;
}) {
  const [mode, setMode] = useState<'choose' | 'propose' | 'manual'>('choose');
  const [loading, setLoading] = useState(false);
  const [proposedValues, setProposedValues] = useState<ProposedValue[]>([]);
  const [manualInput, setManualInput] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [sampledProducts, setSampledProducts] = useState(0);

  // Load proposed values when entering propose mode
  const handleProposeValues = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await getTopValues(attributeId, 500, 2);
      setProposedValues(result.values.map(v => ({ ...v, selected: true })));
      setSampledProducts(result.sampledProducts);
      setMode('propose');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load proposed values');
    } finally {
      setLoading(false);
    }
  }, [attributeId, getTopValues]);

  // Toggle value selection
  const toggleValue = useCallback((index: number) => {
    setProposedValues(prev => prev.map((v, i) => 
      i === index ? { ...v, selected: !v.selected } : v
    ));
  }, []);

  // Select/deselect all
  const toggleAll = useCallback((selected: boolean) => {
    setProposedValues(prev => prev.map(v => ({ ...v, selected })));
  }, []);

  // Confirm proposed values
  const handleConfirmProposed = useCallback(() => {
    const selectedValues = proposedValues.filter(v => v.selected).map(v => v.value);
    if (selectedValues.length === 0) {
      setError('Please select at least one value');
      return;
    }
    onConfirm(selectedValues);
  }, [proposedValues, onConfirm]);

  // Parse manual input
  const handleConfirmManual = useCallback(() => {
    const values = manualInput
      .split('\n')
      .map(line => line.trim())
      .filter(line => line.length > 0)
      .filter((v, i, arr) => arr.indexOf(v) === i); // dedupe
    
    if (values.length === 0) {
      setError('Please enter at least one value');
      return;
    }
    onConfirm(values);
  }, [manualInput, onConfirm]);

  const selectedCount = proposedValues.filter(v => v.selected).length;
  const typeName = targetType === 'multiSelect' ? 'Multi-Select' : 'Enum';

  return (
    <div className={styles.modalOverlay} data-testid="conversion-modal">
      <div className={`${styles.modal} ${styles.modalLarge}`}>
        <div className={styles.modalHeader}>
          <h3 className={styles.modalTitle}>Convert to {typeName}</h3>
        </div>
        <div className={styles.modalBody}>
          {mode === 'choose' && (
            <>
              <p className={styles.modalText}>
                To convert <strong>{attributeId}</strong> to a {typeName.toLowerCase()}, you must supply allowed values.
                Choose how you'd like to define them:
              </p>
              <div className={styles.conversionOptions}>
                <button
                  type="button"
                  className={styles.conversionOption}
                  onClick={handleProposeValues}
                  disabled={loading}
                  data-testid="propose-values-btn"
                >
                  <span className={styles.conversionOptionIcon}>🔍</span>
                  <span className={styles.conversionOptionTitle}>Propose Values</span>
                  <span className={styles.conversionOptionDesc}>
                    Scan product data and suggest common values
                  </span>
                </button>
                <button
                  type="button"
                  className={styles.conversionOption}
                  onClick={() => setMode('manual')}
                  disabled={loading}
                  data-testid="manual-entry-btn"
                >
                  <span className={styles.conversionOptionIcon}>✏️</span>
                  <span className={styles.conversionOptionTitle}>Enter Manually</span>
                  <span className={styles.conversionOptionDesc}>
                    Type or paste your own list of values
                  </span>
                </button>
              </div>
              {loading && (
                <div className={styles.loadingInline}>
                  <div className={styles.spinner} /> Loading values from products...
                </div>
              )}
            </>
          )}

          {mode === 'propose' && (
            <>
              <div className={styles.proposeHeader}>
                <p className={styles.modalText}>
                  Found <strong>{proposedValues.length}</strong> distinct values from{' '}
                  <strong>{sampledProducts.toLocaleString()}</strong> products.
                  Select the values to include:
                </p>
                <div className={styles.proposeActions}>
                  <button
                    type="button"
                    className={styles.btnLink}
                    onClick={() => toggleAll(true)}
                  >
                    Select All
                  </button>
                  <button
                    type="button"
                    className={styles.btnLink}
                    onClick={() => toggleAll(false)}
                  >
                    Deselect All
                  </button>
                  <span className={styles.proposeCount}>{selectedCount} selected</span>
                </div>
              </div>
              <div className={styles.proposeList} data-testid="proposed-values-list">
                {proposedValues.map((item, idx) => (
                  <label key={idx} className={styles.proposeItem}>
                    <input
                      type="checkbox"
                      checked={item.selected}
                      onChange={() => toggleValue(idx)}
                    />
                    <span className={styles.proposeValue}>{item.value}</span>
                    <span className={styles.proposeItemCount}>({item.count})</span>
                  </label>
                ))}
              </div>
            </>
          )}

          {mode === 'manual' && (
            <>
              <p className={styles.modalText}>
                Enter allowed values, one per line. Duplicates will be removed.
              </p>
              <textarea
                className={styles.manualInput}
                value={manualInput}
                onChange={(e) => setManualInput(e.target.value)}
                placeholder="Red&#10;Blue&#10;Green&#10;Yellow"
                rows={10}
                data-testid="manual-values-input"
              />
              <p className={styles.formHelp}>
                {manualInput.split('\n').filter(l => l.trim()).length} values entered
              </p>
            </>
          )}

          {error && <div className={styles.modalError}>{error}</div>}
        </div>
        <div className={styles.modalFooter}>
          {mode === 'choose' && (
            <button
              type="button"
              className={styles.btnSecondary}
              onClick={onCancel}
              data-testid="conversion-cancel"
            >
              Cancel
            </button>
          )}
          {mode === 'propose' && (
            <>
              <button
                type="button"
                className={styles.btnSecondary}
                onClick={() => setMode('choose')}
              >
                Back
              </button>
              <button
                type="button"
                className={styles.btnPrimary}
                onClick={handleConfirmProposed}
                disabled={selectedCount === 0}
                data-testid="confirm-proposed"
              >
                Convert with {selectedCount} Values
              </button>
            </>
          )}
          {mode === 'manual' && (
            <>
              <button
                type="button"
                className={styles.btnSecondary}
                onClick={() => setMode('choose')}
              >
                Back
              </button>
              <button
                type="button"
                className={styles.btnPrimary}
                onClick={handleConfirmManual}
                data-testid="confirm-manual"
              >
                Convert
              </button>
            </>
          )}
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
  // Ensure page title is set for Attributes console
  usePageTitle('Attributes');
  const {
    attributes,
    loading,
    error,
    createAttribute,
    updateAttribute,
    deleteAttribute,
    refresh,
    getTopValues,
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
  // Conversion modal state (for string → enum/multiSelect)
  const [showConversionModal, setShowConversionModal] = useState(false);
  const [conversionTargetType, setConversionTargetType] = useState<'enum' | 'multiSelect'>('enum');
  // Track original data_type to detect conversions
  const [originalDataType, setOriginalDataType] = useState<Attribute['data_type'] | null>(null);

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
      setOriginalDataType(normalized.data_type);
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
      // LP-ATTR-1.3.3: Auto-generate attribute_id if blank in create mode
      let finalFormData = { ...formData };
      if (isCreating && !finalFormData.attribute_id?.trim()) {
        if (!finalFormData.label?.trim()) {
          toastError('Label is required.');
          setSaving(false);
          return;
        }
        
        // Generate base ID from label
        let baseId = toSnakeCase(finalFormData.label.trim());
        // Ensure it doesn't start with a digit
        if (/^\d/.test(baseId)) {
          baseId = `attr_${baseId}`;
        }
        
        // Check uniqueness and add suffix if needed
        let candidateId = baseId;
        let suffix = 2;
        while (await attributeIdExists(candidateId)) {
          candidateId = `${baseId}_${suffix}`;
          suffix++;
        }
        
        finalFormData.attribute_id = candidateId;
        // Update form state with generated ID
        setFormData(finalFormData);
      }

      // Validation
      if (!finalFormData.attribute_id?.trim()) {
        toastError('Attribute ID is required.');
        setSaving(false);
        return;
      }
      if (!finalFormData.label?.trim()) {
        toastError('Label is required.');
        setSaving(false);
        return;
      }

      // Check for conversion to enum/multiSelect without values
      const isConvertingToSelect = 
        (finalFormData.data_type === 'enum' || finalFormData.data_type === 'multiSelect') &&
        originalDataType !== 'enum' && originalDataType !== 'multiSelect' &&
        (!finalFormData.allowed_values || finalFormData.allowed_values.length === 0);
      
      if (isConvertingToSelect) {
        // Open conversion modal instead of blocking
        setConversionTargetType(finalFormData.data_type as 'enum' | 'multiSelect');
        setShowConversionModal(true);
        setSaving(false);
        return;
      }

      // Check for existing enum/multiSelect without values (not a conversion)
      if (
        (finalFormData.data_type === 'enum' || finalFormData.data_type === 'multiSelect') &&
        (!finalFormData.allowed_values || finalFormData.allowed_values.length === 0)
      ) {
        toastError('Allowed values are required for enum/multi-select.');
        setSaving(false);
        return;
      }

      if (isCreating) {
        // Create new attribute
        const created = await createAttribute(
          finalFormData as Omit<Attribute, 'createdAt' | 'updatedAt'>
        );
        setSelectedId(created.attribute_id);
        setIsCreating(false);
        toastSuccess(`Created attribute '${created.attribute_id}'`);
      } else if (selectedId) {
        // Update existing attribute
        await updateAttribute(selectedId, finalFormData);
        toastSuccess(`Updated attribute '${selectedId}'`);
      }

      setIsDirty(false);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to save attribute';
      toastError(message);
    } finally {
      setSaving(false);
    }
  }, [formData, isCreating, selectedId, createAttribute, updateAttribute, originalDataType]);

  // Handle conversion confirmed (from ConversionModal)
  const handleConversionConfirm = useCallback(async (values: string[]) => {
    if (!selectedId) return;
    setSaving(true);
    setShowConversionModal(false);
    try {
      const convertedData = {
        ...formData,
        data_type: conversionTargetType,
        allowed_values: values,
      };
      
      await updateAttribute(selectedId, convertedData);
      
      // Update form state with new values
      setFormData(convertedData);
      setOriginalDataType(conversionTargetType);
      setIsDirty(false);
      
      const typeName = conversionTargetType === 'multiSelect' ? 'Multi-Select' : 'Enum';
      toastSuccess(
        `Converted '${selectedId}' to ${typeName} with ${values.length} values. Check the Values tab to review.`
      );
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to convert attribute';
      toastError(message);
      // Revert form data_type on failure
      setFormData(prev => ({ ...prev, data_type: originalDataType || 'string' }));
    } finally {
      setSaving(false);
    }
  }, [selectedId, formData, conversionTargetType, updateAttribute, originalDataType]);

  // Handle conversion cancelled
  const handleConversionCancel = useCallback(() => {
    setShowConversionModal(false);
    // Revert data_type to original
    setFormData(prev => ({ ...prev, data_type: originalDataType || 'string' }));
  }, [originalDataType]);

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
  // LP-ATTR-1.3.1: Clear selection on BOTH success AND failure to prevent stale UI state
  const handleDelete = useCallback(async () => {
    if (!selectedId || !deleteAttribute) return;
    setSaving(true);
    const deletingId = selectedId; // Capture before clearing
    try {
      await deleteAttribute(deletingId);
      toastSuccess(`Attribute '${deletingId}' has been deleted.`);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to delete attribute';
      // LP-ATTR-1.3.1: Even on failure (e.g., 404), clear selection to prevent stuck UI
      // The attribute may already be deleted, or there was a transient error.
      // Either way, forcing the user to re-select ensures a clean state.
      console.warn(`[AttributesConsole] Delete failed for '${deletingId}':`, message);
      toastError(message);
    } finally {
      // LP-ATTR-1.3.1: Always clear selection and reset form after delete attempt
      setShowDeleteModal(false);
      setSelectedId(null);
      setFormData({ ...DEFAULT_ATTR });
      setIsDirty(false);
      setSaving(false);
      // Refresh the list to ensure we have current server state
      if (refresh) {
        refresh().catch(err => console.warn('[AttributesConsole] Refresh after delete failed:', err));
      }
    }
  }, [selectedId, deleteAttribute, refresh]);

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
        attributes={attributes}
        formData={formData}
        isDirty={isDirty}
        saving={saving}
        isCreating={isCreating}
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

      {/* Conversion modal (string → enum/multiSelect) */}
      {showConversionModal && selectedId && (
        <ConversionModal
          attributeId={selectedId}
          targetType={conversionTargetType}
          onConfirm={handleConversionConfirm}
          onCancel={handleConversionCancel}
          getTopValues={getTopValues}
        />
      )}
    </div>
  );
}
