/**
 * ValuesManager Component
 * 
 * Full CUD (Create, Update, Delete) + Reorder + Synonyms management for
 * attribute allowed values. Supports virtualization for 50+ values.
 * 
 * Lisa PVS-0.2.9
 */

import {
  useState,
  useCallback,
  useMemo,
  useRef,
  useEffect,
  type KeyboardEvent,
} from 'react';
import { List } from 'react-window';
import styles from './ValuesManager.module.css';

// Value representation in memory
export type AllowedValue = {
  id: string; // local UUID for UI
  value: string;
  enabled: boolean;
  synonyms: string[];
  isNew?: boolean; // for new items not yet saved
  isDeleted?: boolean; // soft delete until save
  originalValue?: string; // original value before editing
};

// Canonical payload for API
export type ValuesPayload = {
  allowed_values: string[];
  synonyms: Record<string, string[]>;
};

export interface ValuesManagerProps {
  values: AllowedValue[];
  onChange: (values: AllowedValue[]) => void;
  onSave?: (payload: ValuesPayload) => Promise<void>;
  disabled?: boolean;
  readOnly?: boolean;
  maxLength?: number; // max value length constraint
}

// Generate unique ID
const generateId = () => `val_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

// Normalize value (trim, collapse whitespace)
const normalizeValue = (value: string): string => {
  return value.trim().replace(/\s+/g, ' ');
};

// Check for duplicate (case-insensitive)
const isDuplicate = (value: string, values: AllowedValue[], excludeId?: string): boolean => {
  const normalized = value.toLowerCase().trim();
  return values.some(
    (v) => v.id !== excludeId && !v.isDeleted && v.value.toLowerCase().trim() === normalized
  );
};

// Convert internal values to API payload
export const valuesToPayload = (values: AllowedValue[]): ValuesPayload => {
  const activeValues = values.filter((v) => !v.isDeleted && v.enabled);
  const allowed_values = activeValues.map((v) => v.value);
  const synonyms: Record<string, string[]> = {};
  
  activeValues.forEach((v) => {
    if (v.synonyms && v.synonyms.length > 0) {
      synonyms[v.value] = v.synonyms;
    }
  });
  
  return { allowed_values, synonyms };
};

// Convert API payload to internal values
export const payloadToValues = (
  allowed_values: string[] = [],
  synonymsMap: Record<string, string[]> = {}
): AllowedValue[] => {
  return allowed_values.map((value) => ({
    id: generateId(),
    value,
    enabled: true,
    synonyms: synonymsMap[value] || [],
  }));
};

/**
 * ValueRow - Single value row component
 */
interface ValueRowProps {
  value: AllowedValue;
  index: number;
  isSelected: boolean;
  isEditing: boolean;
  editingField: 'value' | 'synonyms' | null;
  onSelect: (id: string) => void;
  onEdit: (id: string, field: 'value' | 'synonyms') => void;
  onValueChange: (id: string, newValue: string) => void;
  onSynonymsChange: (id: string, synonyms: string[]) => void;
  onToggleEnabled: (id: string) => void;
  onDelete: (id: string) => void;
  onUndo: (id: string) => void;
  onEditComplete: () => void;
  onMoveUp: (id: string) => void;
  onMoveDown: (id: string) => void;
  duplicateError: boolean;
  maxLength?: number;
  disabled?: boolean;
  style?: React.CSSProperties;
}

function ValueRow({
  value,
  index,
  isSelected,
  isEditing,
  editingField,
  onSelect,
  onEdit,
  onValueChange,
  onSynonymsChange,
  onToggleEnabled,
  onDelete,
  onUndo,
  onEditComplete,
  onMoveUp,
  onMoveDown,
  duplicateError,
  maxLength,
  disabled,
  style,
}: ValueRowProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const synonymsInputRef = useRef<HTMLInputElement>(null);
  const [localValue, setLocalValue] = useState(value.value);
  const [localSynonyms, setLocalSynonyms] = useState(value.synonyms.join(', '));

  useEffect(() => {
    if (isEditing && editingField === 'value' && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
    if (isEditing && editingField === 'synonyms' && synonymsInputRef.current) {
      synonymsInputRef.current.focus();
    }
  }, [isEditing, editingField]);

  useEffect(() => {
    setLocalValue(value.value);
    setLocalSynonyms(value.synonyms.join(', '));
  }, [value.value, value.synonyms]);

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>, field: 'value' | 'synonyms') => {
    if (e.key === 'Enter') {
      e.preventDefault();
      if (field === 'value') {
        const normalized = normalizeValue(localValue);
        if (normalized && (!maxLength || normalized.length <= maxLength)) {
          onValueChange(value.id, normalized);
        }
      } else {
        const synonyms = localSynonyms
          .split(',')
          .map((s) => s.trim())
          .filter(Boolean);
        onSynonymsChange(value.id, synonyms);
      }
      onEditComplete();
    } else if (e.key === 'Escape') {
      setLocalValue(value.value);
      setLocalSynonyms(value.synonyms.join(', '));
      onEditComplete();
    }
  };

  const handleBlur = (field: 'value' | 'synonyms') => {
    if (field === 'value') {
      const normalized = normalizeValue(localValue);
      if (normalized && normalized !== value.value && (!maxLength || normalized.length <= maxLength)) {
        onValueChange(value.id, normalized);
      } else {
        setLocalValue(value.value);
      }
    } else {
      const synonyms = localSynonyms
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean);
      if (JSON.stringify(synonyms) !== JSON.stringify(value.synonyms)) {
        onSynonymsChange(value.id, synonyms);
      }
    }
    onEditComplete();
  };

  if (value.isDeleted) {
    return (
      <div
        className={`${styles.valueRow} ${styles.valueRowDeleted}`}
        style={style}
        role="listitem"
        aria-label={`Deleted value: ${value.value}`}
      >
        <span className={styles.deletedLabel}>
          <span className={styles.strikethrough}>{value.value}</span>
          <span className={styles.deletedBadge}>Deleted</span>
        </span>
        <button
          type="button"
          className={styles.undoBtn}
          onClick={() => onUndo(value.id)}
          disabled={disabled}
          aria-label="Undo delete"
        >
          ↩ Undo
        </button>
      </div>
    );
  }

  return (
    <div
      className={`${styles.valueRow} ${isSelected ? styles.valueRowSelected : ''} ${
        value.isNew ? styles.valueRowNew : ''
      } ${duplicateError ? styles.valueRowError : ''}`}
      style={style}
      role="listitem"
      aria-selected={isSelected}
      tabIndex={0}
      onClick={() => onSelect(value.id)}
      onKeyDown={(e) => {
        if (e.key === 'ArrowUp' && e.altKey) {
          e.preventDefault();
          onMoveUp(value.id);
        } else if (e.key === 'ArrowDown' && e.altKey) {
          e.preventDefault();
          onMoveDown(value.id);
        }
      }}
      data-testid={`value-row-${index}`}
    >
      {/* Drag handle */}
      <span
        className={styles.dragHandle}
        title="Drag to reorder (or Alt+↑/↓)"
        aria-label="Drag handle"
      >
        ⋮⋮
      </span>

      {/* Value label */}
      <div className={styles.valueLabel}>
        {isEditing && editingField === 'value' ? (
          <input
            ref={inputRef}
            type="text"
            className={`${styles.valueInput} ${duplicateError ? styles.inputError : ''}`}
            value={localValue}
            onChange={(e) => setLocalValue(e.target.value)}
            onKeyDown={(e) => handleKeyDown(e, 'value')}
            onBlur={() => handleBlur('value')}
            maxLength={maxLength}
            disabled={disabled}
            aria-label="Edit value"
            data-testid="value-input"
          />
        ) : (
          <span
            className={styles.valueLabelText}
            onClick={(e) => {
              e.stopPropagation();
              if (!disabled) onEdit(value.id, 'value');
            }}
            title="Click to edit"
          >
            {value.value || <em className={styles.emptyValue}>Empty value</em>}
          </span>
        )}
        {duplicateError && <span className={styles.errorBadge}>Duplicate</span>}
        {value.isNew && <span className={styles.newBadge}>New</span>}
      </div>

      {/* Synonyms summary */}
      <div className={styles.synonymsCol}>
        {isEditing && editingField === 'synonyms' ? (
          <input
            ref={synonymsInputRef}
            type="text"
            className={styles.synonymsInput}
            value={localSynonyms}
            onChange={(e) => setLocalSynonyms(e.target.value)}
            onKeyDown={(e) => handleKeyDown(e, 'synonyms')}
            onBlur={() => handleBlur('synonyms')}
            placeholder="syn1, syn2, ..."
            disabled={disabled}
            aria-label="Edit synonyms"
            data-testid="synonyms-input"
          />
        ) : (
          <button
            type="button"
            className={styles.synonymsBtn}
            onClick={(e) => {
              e.stopPropagation();
              if (!disabled) onEdit(value.id, 'synonyms');
            }}
            disabled={disabled}
            title={value.synonyms.length > 0 ? value.synonyms.join(', ') : 'Add synonyms'}
          >
            {value.synonyms.length > 0 ? (
              <span>synonyms: {value.synonyms.length}</span>
            ) : (
              <span className={styles.addSynonyms}>+ synonyms</span>
            )}
          </button>
        )}
      </div>

      {/* Enabled toggle */}
      <label className={styles.toggleLabel}>
        <input
          type="checkbox"
          className={styles.toggleInput}
          checked={value.enabled}
          onChange={() => onToggleEnabled(value.id)}
          disabled={disabled}
          aria-label={value.enabled ? 'Disable value' : 'Enable value'}
        />
        <span className={styles.toggleSlider} />
      </label>

      {/* Delete button */}
      <button
        type="button"
        className={styles.deleteBtn}
        onClick={(e) => {
          e.stopPropagation();
          onDelete(value.id);
        }}
        disabled={disabled}
        aria-label="Delete value"
        title="Delete value"
      >
        🗑
      </button>
    </div>
  );
}

/**
 * VirtualizedValueRow - Wrapper for react-window v2
 * In v2, rowProps are spread directly onto the component props
 */

// Props that we provide via rowProps (react-window adds index, style, ariaAttributes)
type VirtualizedRowData = {
  values: AllowedValue[];
  filteredIndices: number[];
  selectedId: string | null;
  editingId: string | null;
  editingField: 'value' | 'synonyms' | null;
  duplicates: Set<string>;
  maxLength?: number;
  disabled?: boolean;
  onSelect: (id: string) => void;
  onEdit: (id: string, field: 'value' | 'synonyms') => void;
  onValueChange: (id: string, newValue: string) => void;
  onSynonymsChange: (id: string, synonyms: string[]) => void;
  onToggleEnabled: (id: string) => void;
  onDelete: (id: string) => void;
  onUndo: (id: string) => void;
  onEditComplete: () => void;
  onMoveUp: (id: string) => void;
  onMoveDown: (id: string) => void;
};

// Full props including what react-window provides
type VirtualizedRowProps = VirtualizedRowData & {
  ariaAttributes?: {
    'aria-posinset': number;
    'aria-setsize': number;
    role: 'listitem';
  };
  index: number;
  style: React.CSSProperties;
};

function VirtualizedValueRow({
  index,
  style,
  ariaAttributes,
  values,
  filteredIndices,
  selectedId,
  editingId,
  editingField: editField,
  duplicates,
  maxLength,
  disabled,
  onSelect,
  onEdit,
  onValueChange,
  onSynonymsChange,
  onToggleEnabled,
  onDelete,
  onUndo,
  onEditComplete,
  onMoveUp,
  onMoveDown,
}: VirtualizedRowProps) {
  const actualIndex = filteredIndices[index];
  const value = values[actualIndex];

  return (
    <div style={style} {...ariaAttributes}>
      <ValueRow
        value={value}
        index={actualIndex}
        isSelected={selectedId === value.id}
        isEditing={editingId === value.id}
        editingField={editingId === value.id ? editField : null}
        duplicateError={duplicates.has(value.id)}
        maxLength={maxLength}
        disabled={disabled}
        onSelect={onSelect}
        onEdit={onEdit}
        onValueChange={onValueChange}
        onSynonymsChange={onSynonymsChange}
        onToggleEnabled={onToggleEnabled}
        onDelete={onDelete}
        onUndo={onUndo}
        onEditComplete={onEditComplete}
        onMoveUp={onMoveUp}
        onMoveDown={onMoveDown}
      />
    </div>
  );
}

/**
 * BulkAddModal - Modal for bulk paste/add values
 */
interface BulkAddModalProps {
  onConfirm: (values: Array<{ value: string; synonyms: string[] }>) => void;
  onCancel: () => void;
  existingValues: string[];
}

function BulkAddModal({ onConfirm, onCancel, existingValues }: BulkAddModalProps) {
  const [input, setInput] = useState('');
  const [usePipeFormat, setUsePipeFormat] = useState(false);
  const [previewItems, setPreviewItems] = useState<
    Array<{ value: string; synonyms: string[]; selected: boolean; isDuplicate: boolean }>
  >([]);

  const parseInput = useCallback(() => {
    const lines = input.split(/[\n,]/).map((line) => line.trim()).filter(Boolean);
    const existingLower = new Set(existingValues.map((v) => v.toLowerCase()));
    const seen = new Set<string>();
    const items: Array<{ value: string; synonyms: string[]; selected: boolean; isDuplicate: boolean }> = [];

    for (const line of lines) {
      let value: string;
      let synonyms: string[] = [];

      if (usePipeFormat && line.includes('|')) {
        const [val, ...synParts] = line.split('|');
        value = normalizeValue(val);
        synonyms = synParts.flatMap((s) => s.split(',')).map((s) => s.trim()).filter(Boolean);
      } else {
        value = normalizeValue(line);
      }

      if (!value) continue;

      const valueLower = value.toLowerCase();
      const isDuplicate = existingLower.has(valueLower) || seen.has(valueLower);

      if (!seen.has(valueLower)) {
        seen.add(valueLower);
        items.push({ value, synonyms, selected: !isDuplicate, isDuplicate });
      }
    }

    setPreviewItems(items);
  }, [input, usePipeFormat, existingValues]);

  useEffect(() => {
    if (input.trim()) {
      parseInput();
    } else {
      setPreviewItems([]);
    }
  }, [input, usePipeFormat, parseInput]);

  const toggleItem = (index: number) => {
    setPreviewItems((prev) =>
      prev.map((item, i) => (i === index ? { ...item, selected: !item.selected } : item))
    );
  };

  const toggleAll = (selected: boolean) => {
    setPreviewItems((prev) => prev.map((item) => ({ ...item, selected })));
  };

  const handleConfirm = () => {
    const selected = previewItems
      .filter((item) => item.selected)
      .map(({ value, synonyms }) => ({ value, synonyms }));
    onConfirm(selected);
  };

  const selectedCount = previewItems.filter((item) => item.selected).length;

  return (
    <div className={styles.modalOverlay} data-testid="bulk-add-modal">
      <div className={styles.modal}>
        <div className={styles.modalHeader}>
          <h3 className={styles.modalTitle}>Bulk Add Values</h3>
          <button type="button" className={styles.modalClose} onClick={onCancel}>
            ×
          </button>
        </div>
        <div className={styles.modalBody}>
          <div className={styles.bulkInputSection}>
            <label className={styles.bulkLabel}>
              Paste values (one per line, or comma-separated):
            </label>
            <textarea
              className={styles.bulkTextarea}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Value 1&#10;Value 2&#10;Value 3"
              rows={6}
              data-testid="bulk-input"
            />
            <label className={styles.bulkCheckbox}>
              <input
                type="checkbox"
                checked={usePipeFormat}
                onChange={(e) => setUsePipeFormat(e.target.checked)}
              />
              Parse synonyms from pipe format: <code>value|syn1,syn2</code>
            </label>
          </div>

          {previewItems.length > 0 && (
            <div className={styles.bulkPreview}>
              <div className={styles.bulkPreviewHeader}>
                <span>
                  Preview ({selectedCount} of {previewItems.length} selected)
                </span>
                <div>
                  <button type="button" className={styles.linkBtn} onClick={() => toggleAll(true)}>
                    Select All
                  </button>
                  <button type="button" className={styles.linkBtn} onClick={() => toggleAll(false)}>
                    Deselect All
                  </button>
                </div>
              </div>
              <div className={styles.bulkPreviewList}>
                {previewItems.map((item, index) => (
                  <label
                    key={index}
                    className={`${styles.bulkPreviewItem} ${
                      item.isDuplicate ? styles.bulkPreviewDuplicate : ''
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={item.selected}
                      onChange={() => toggleItem(index)}
                    />
                    <span>{item.value}</span>
                    {item.synonyms.length > 0 && (
                      <span className={styles.bulkPreviewSynonyms}>
                        ({item.synonyms.join(', ')})
                      </span>
                    )}
                    {item.isDuplicate && (
                      <span className={styles.duplicateTag}>Duplicate</span>
                    )}
                  </label>
                ))}
              </div>
            </div>
          )}
        </div>
        <div className={styles.modalFooter}>
          <button type="button" className={styles.btnSecondary} onClick={onCancel}>
            Cancel
          </button>
          <button
            type="button"
            className={styles.btnPrimary}
            onClick={handleConfirm}
            disabled={selectedCount === 0}
            data-testid="bulk-confirm"
          >
            Add {selectedCount} Value{selectedCount !== 1 ? 's' : ''}
          </button>
        </div>
      </div>
    </div>
  );
}

/**
 * ValuesManager - Main component
 */
export default function ValuesManager({
  values,
  onChange,
  onSave,
  disabled = false,
  readOnly = false,
  maxLength,
}: ValuesManagerProps) {
  const isDisabled = disabled || readOnly;
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingField, setEditingField] = useState<'value' | 'synonyms' | null>(null);
  const [quickAddValue, setQuickAddValue] = useState('');
  const [showBulkModal, setShowBulkModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const listRef = useRef<{ element: HTMLDivElement | null; scrollToRow: (opts: { index: number; align?: string }) => void } | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(searchQuery), 250);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Filter values based on search
  const filteredIndices = useMemo(() => {
    if (!debouncedSearch.trim()) {
      return values.map((_, i) => i);
    }
    const query = debouncedSearch.toLowerCase();
    return values
      .map((v, i) => ({ v, i }))
      .filter(
        ({ v }) =>
          v.value.toLowerCase().includes(query) ||
          v.synonyms.some((s) => s.toLowerCase().includes(query))
      )
      .map(({ i }) => i);
  }, [values, debouncedSearch]);

  // Find duplicates
  const duplicates = useMemo(() => {
    const seen = new Map<string, string[]>();
    values.forEach((v) => {
      if (!v.isDeleted) {
        const key = v.value.toLowerCase().trim();
        if (!seen.has(key)) {
          seen.set(key, []);
        }
        seen.get(key)!.push(v.id);
      }
    });
    const duplicateIds = new Set<string>();
    seen.forEach((ids) => {
      if (ids.length > 1) {
        ids.forEach((id) => duplicateIds.add(id));
      }
    });
    return duplicateIds;
  }, [values]);

  // Stats
  const stats = useMemo(() => {
    const total = values.length;
    const active = values.filter((v) => !v.isDeleted && v.enabled).length;
    const deleted = values.filter((v) => v.isDeleted).length;
    const newCount = values.filter((v) => v.isNew && !v.isDeleted).length;
    return { total, active, deleted, new: newCount };
  }, [values]);

  // Check if dirty
  const isDirty = useMemo(() => {
    return values.some((v) => v.isNew || v.isDeleted || v.value !== v.originalValue);
  }, [values]);

  // Handlers
  const handleSelect = useCallback((id: string) => {
    setSelectedId(id);
  }, []);

  const handleEdit = useCallback((id: string, field: 'value' | 'synonyms') => {
    setEditingId(id);
    setEditingField(field);
  }, []);

  const handleEditComplete = useCallback(() => {
    setEditingId(null);
    setEditingField(null);
  }, []);

  const handleValueChange = useCallback(
    (id: string, newValue: string) => {
      onChange(
        values.map((v) =>
          v.id === id
            ? { ...v, value: newValue }
            : v
        )
      );
    },
    [values, onChange]
  );

  const handleSynonymsChange = useCallback(
    (id: string, synonyms: string[]) => {
      onChange(values.map((v) => (v.id === id ? { ...v, synonyms } : v)));
    },
    [values, onChange]
  );

  const handleToggleEnabled = useCallback(
    (id: string) => {
      onChange(values.map((v) => (v.id === id ? { ...v, enabled: !v.enabled } : v)));
    },
    [values, onChange]
  );

  const handleDelete = useCallback(
    (id: string) => {
      onChange(values.map((v) => (v.id === id ? { ...v, isDeleted: true } : v)));
    },
    [values, onChange]
  );

  const handleUndo = useCallback(
    (id: string) => {
      onChange(values.map((v) => (v.id === id ? { ...v, isDeleted: false } : v)));
    },
    [values, onChange]
  );

  const handleMoveUp = useCallback(
    (id: string) => {
      const index = values.findIndex((v) => v.id === id);
      if (index > 0) {
        const newValues = [...values];
        [newValues[index - 1], newValues[index]] = [newValues[index], newValues[index - 1]];
        onChange(newValues);
      }
    },
    [values, onChange]
  );

  const handleMoveDown = useCallback(
    (id: string) => {
      const index = values.findIndex((v) => v.id === id);
      if (index < values.length - 1) {
        const newValues = [...values];
        [newValues[index], newValues[index + 1]] = [newValues[index + 1], newValues[index]];
        onChange(newValues);
      }
    },
    [values, onChange]
  );

  const handleQuickAdd = useCallback(
    (e: KeyboardEvent<HTMLInputElement>) => {
      if (e.key === 'Enter' && quickAddValue.trim()) {
        e.preventDefault();
        const normalized = normalizeValue(quickAddValue);
        if (normalized && !isDuplicate(normalized, values)) {
          const newValue: AllowedValue = {
            id: generateId(),
            value: normalized,
            enabled: true,
            synonyms: [],
            isNew: true,
            originalValue: '',
          };
          onChange([newValue, ...values]);
          setQuickAddValue('');
        }
      }
    },
    [quickAddValue, values, onChange]
  );

  const handleBulkAdd = useCallback(
    (items: Array<{ value: string; synonyms: string[] }>) => {
      const newValues = items.map((item) => ({
        id: generateId(),
        value: item.value,
        enabled: true,
        synonyms: item.synonyms,
        isNew: true,
        originalValue: '',
      }));
      onChange([...newValues, ...values]);
      setShowBulkModal(false);
    },
    [values, onChange]
  );

  const handleSave = useCallback(async () => {
    if (duplicates.size > 0 || !onSave) {
      return; // Don't save with duplicates or if no onSave handler
    }
    setSaving(true);
    try {
      const payload = valuesToPayload(values);
      await onSave(payload);
      // Mark all as saved (remove isNew, isDeleted, update originalValue)
      onChange(
        values
          .filter((v) => !v.isDeleted)
          .map((v) => ({
            ...v,
            isNew: false,
            originalValue: v.value,
          }))
      );
    } finally {
      setSaving(false);
    }
  }, [values, duplicates, onSave, onChange]);

  // Virtualization threshold
  const useVirtualization = filteredIndices.length > 40;
  const rowHeight = 48;
  const listHeight = Math.min(filteredIndices.length * rowHeight, 400);

  // Item data for virtualized list (typed as VirtualizedRowData for rowProps)
  const itemData: VirtualizedRowData = useMemo(
    () => ({
      values,
      filteredIndices,
      selectedId,
      editingId,
      editingField,
      duplicates,
      maxLength,
      disabled: isDisabled,
      onSelect: handleSelect,
      onEdit: handleEdit,
      onValueChange: handleValueChange,
      onSynonymsChange: handleSynonymsChange,
      onToggleEnabled: handleToggleEnabled,
      onDelete: handleDelete,
      onUndo: handleUndo,
      onEditComplete: handleEditComplete,
      onMoveUp: handleMoveUp,
      onMoveDown: handleMoveDown,
    }),
    [
      values,
      filteredIndices,
      selectedId,
      editingId,
      editingField,
      duplicates,
      maxLength,
      isDisabled,
      handleSelect,
      handleEdit,
      handleValueChange,
      handleSynonymsChange,
      handleToggleEnabled,
      handleDelete,
      handleUndo,
      handleEditComplete,
      handleMoveUp,
      handleMoveDown,
    ]
  );

  return (
    <div className={styles.valuesManager} ref={containerRef} data-testid="values-manager">
      {/* Header */}
      <div className={styles.header}>
        <div className={styles.headerLeft}>
          <h3 className={styles.title}>
            Allowed Values
            <span className={styles.count}>
              ({stats.active} active
              {stats.new > 0 && `, ${stats.new} new`}
              {stats.deleted > 0 && `, ${stats.deleted} to delete`})
            </span>
          </h3>
        </div>
        <div className={styles.headerRight}>
          <button
            type="button"
            className={styles.btnSecondary}
            onClick={() => setShowBulkModal(true)}
            disabled={isDisabled}
            data-testid="bulk-add-btn"
          >
            📋 Bulk Add
          </button>
          <button
            type="button"
            className={styles.btnPrimary}
            onClick={handleSave}
            disabled={isDisabled || saving || !isDirty || duplicates.size > 0}
            data-testid="save-values-btn"
          >
            {saving ? (
              <>
                <span className={styles.spinner} /> Saving...
              </>
            ) : (
              'Save Values'
            )}
          </button>
        </div>
      </div>

      {/* Quick add */}
      <div className={styles.quickAdd}>
        <input
          type="text"
          className={styles.quickAddInput}
          value={quickAddValue}
          onChange={(e) => setQuickAddValue(e.target.value)}
          onKeyDown={handleQuickAdd}
          placeholder="Type a value and press Enter to add..."
          disabled={isDisabled}
          maxLength={maxLength}
          data-testid="quick-add-input"
        />
        {quickAddValue.trim() && isDuplicate(quickAddValue, values) && (
          <span className={styles.quickAddError}>Value already exists</span>
        )}
      </div>

      {/* Search */}
      <div className={styles.search}>
        <input
          type="text"
          className={styles.searchInput}
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search values..."
          data-testid="values-search"
        />
        {searchQuery && (
          <span className={styles.searchResults}>
            {filteredIndices.length} of {values.filter((v) => !v.isDeleted).length} values
          </span>
        )}
      </div>

      {/* Duplicates warning */}
      {duplicates.size > 0 && (
        <div className={styles.duplicatesWarning} role="alert">
          ⚠️ {duplicates.size} duplicate value{duplicates.size > 1 ? 's' : ''} found. Please resolve
          before saving.
        </div>
      )}

      {/* Values list */}
      <div className={styles.listContainer} role="listbox" aria-label="Allowed values list">
        {filteredIndices.length === 0 ? (
          <div className={styles.emptyState}>
            {searchQuery ? (
              <>
                <div className={styles.emptyIcon}>🔍</div>
                <p>No values match "{searchQuery}"</p>
              </>
            ) : (
              <>
                <div className={styles.emptyIcon}>📝</div>
                <p>No values defined</p>
                <p className={styles.emptyHint}>
                  Use Quick Add above or Bulk Add to add values
                </p>
              </>
            )}
          </div>
        ) : useVirtualization ? (
          <List<VirtualizedRowData>
            listRef={listRef}
            style={{ height: listHeight, width: '100%' }}
            rowCount={filteredIndices.length}
            rowHeight={rowHeight}
            rowComponent={VirtualizedValueRow}
            rowProps={itemData}
          />
        ) : (
          <div className={styles.valuesList}>
            {filteredIndices.map((actualIndex) => {
              const value = values[actualIndex];
              return (
                <ValueRow
                  key={value.id}
                  value={value}
                  index={actualIndex}
                  isSelected={selectedId === value.id}
                  isEditing={editingId === value.id}
                  editingField={editingId === value.id ? editingField : null}
                  duplicateError={duplicates.has(value.id)}
                  maxLength={maxLength}
                  disabled={isDisabled}
                  onSelect={handleSelect}
                  onEdit={handleEdit}
                  onValueChange={handleValueChange}
                  onSynonymsChange={handleSynonymsChange}
                  onToggleEnabled={handleToggleEnabled}
                  onDelete={handleDelete}
                  onUndo={handleUndo}
                  onEditComplete={handleEditComplete}
                  onMoveUp={handleMoveUp}
                  onMoveDown={handleMoveDown}
                />
              );
            })}
          </div>
        )}
      </div>

      {/* Keyboard hints */}
      <div className={styles.keyboardHints}>
        <span>
          <kbd>Enter</kbd> confirm edit
        </span>
        <span>
          <kbd>Esc</kbd> cancel
        </span>
        <span>
          <kbd>Alt</kbd>+<kbd>↑</kbd>/<kbd>↓</kbd> reorder
        </span>
      </div>

      {/* Bulk add modal */}
      {showBulkModal && (
        <BulkAddModal
          onConfirm={handleBulkAdd}
          onCancel={() => setShowBulkModal(false)}
          existingValues={values.filter((v) => !v.isDeleted).map((v) => v.value)}
        />
      )}
    </div>
  );
}
