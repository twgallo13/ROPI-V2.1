/**
 * MappingTab Component
 * Main container for attribute mapping configuration
 * 
 * Features:
 * - Header aliases (AliasTable)
 * - Value synonyms (SynonymsEditor)
 * - Per-source overrides (PerSourceOverrides)
 * - Import preview (ImportPreviewEditor)
 * 
 * Lisa PVS-0.3.2
 */

import { useState, useCallback, useEffect } from 'react';
import type { Attribute } from '../hooks/useAttributes';
import { useMappings, type AliasEntry, type SourceOverride } from '../hooks/useMappings';
import AliasTable from './AliasTable';
import SynonymsEditor from './SynonymsEditor';
import PerSourceOverrides from './PerSourceOverrides';
import ImportPreviewEditor from './ImportPreviewEditor';
import BulkAliasImportModal from './BulkAliasImportModal';
import styles from './MappingTab.module.css';

export interface MappingTabProps {
  attribute: Attribute;
  attributes: Attribute[];
}

type ViewMode = 'attribute' | 'global' | 'merged';

export default function MappingTab({ attribute, attributes }: MappingTabProps) {
  const [viewMode, setViewMode] = useState<ViewMode>('attribute');
  const [bulkImportOpen, setBulkImportOpen] = useState(false);
  const [_editingSourceId, setEditingSourceId] = useState<string | null>(null);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  const {
    globalMapping,
    attributeMapping,
    mergedAliases,
    loading,
    saving,
    error,
    fetchGlobalMapping,
    fetchAttributeMapping,
    updateGlobalMapping,
    updateAttributeMapping,
    upsertSourceOverride,
    deleteSourceOverride,
    previewImport,
    // refresh is available for future use
  } = useMappings({ attributeId: attribute.attribute_id });

  // Fetch mappings on mount and when attribute changes
  useEffect(() => {
    // Always fetch global mapping
    fetchGlobalMapping();

    // Only fetch attribute-level mapping when we have a valid attribute_id.
    // This prevents accidental calls like /attributes/mapping (no id) which return 404
    // and cause the UI to set an error state and interrupt create/save flows.
    if (attribute && attribute.attribute_id) {
      fetchAttributeMapping(attribute.attribute_id);
    }
    // When no attribute_id exists (creating new attribute), fetchAttributeMapping
    // will reset to empty mapping state via the guard in useMappings hook.
  }, [fetchGlobalMapping, fetchAttributeMapping, attribute?.attribute_id]);

  // Show toast notification
  const showToast = useCallback((message: string, type: 'success' | 'error') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  }, []);

  // Get current aliases based on view mode
  const displayAliases: AliasEntry[] = (() => {
    switch (viewMode) {
      case 'global':
        if (!globalMapping?.aliases) return [];
        return Object.entries(globalMapping.aliases).map(([alias, canonicalId]) => ({
          alias,
          canonicalId,
          source: 'global' as const,
          confidence: alias.toLowerCase() === canonicalId.toLowerCase() ? 'high' as const : 'medium' as const,
        }));
      case 'attribute':
        if (!attributeMapping?.aliases) return [];
        return Object.entries(attributeMapping.aliases).map(([alias, canonicalId]) => ({
          alias,
          canonicalId,
          source: 'attribute' as const,
          confidence: alias.toLowerCase() === canonicalId.toLowerCase() ? 'high' as const : 'medium' as const,
        }));
      case 'merged':
      default:
        return mergedAliases;
    }
  })();

  // Get current synonyms based on view mode
  const displaySynonyms: Record<string, string[]> = (() => {
    switch (viewMode) {
      case 'global':
        return globalMapping?.value_synonyms?.[attribute.attribute_id] || {};
      case 'attribute':
      case 'merged':
      default:
        return attributeMapping?.value_synonyms || {};
    }
  })();

  // Handle alias operations
  const handleAddAlias = useCallback(async (alias: string, canonicalId: string) => {
    const current = viewMode === 'global' 
      ? { ...globalMapping?.aliases } 
      : { ...attributeMapping?.aliases };
    current[alias] = canonicalId;

    if (viewMode === 'global') {
      await updateGlobalMapping({ aliases: current }, true);
    } else {
      await updateAttributeMapping(attribute.attribute_id, { aliases: current }, true);
    }
    showToast(`Added alias "${alias}"`, 'success');
  }, [viewMode, globalMapping, attributeMapping, updateGlobalMapping, updateAttributeMapping, attribute.attribute_id, showToast]);

  const handleUpdateAlias = useCallback(async (oldAlias: string, newAlias: string, canonicalId: string) => {
    const current = viewMode === 'global' 
      ? { ...globalMapping?.aliases } 
      : { ...attributeMapping?.aliases };
    
    // Remove old, add new
    delete current[oldAlias];
    current[newAlias] = canonicalId;

    if (viewMode === 'global') {
      await updateGlobalMapping({ aliases: current });
    } else {
      await updateAttributeMapping(attribute.attribute_id, { aliases: current });
    }
    showToast(`Updated alias "${newAlias}"`, 'success');
  }, [viewMode, globalMapping, attributeMapping, updateGlobalMapping, updateAttributeMapping, attribute.attribute_id, showToast]);

  const handleDeleteAlias = useCallback(async (alias: string) => {
    const current = viewMode === 'global' 
      ? { ...globalMapping?.aliases } 
      : { ...attributeMapping?.aliases };
    delete current[alias];

    if (viewMode === 'global') {
      await updateGlobalMapping({ aliases: current });
    } else {
      await updateAttributeMapping(attribute.attribute_id, { aliases: current });
    }
    showToast(`Deleted alias "${alias}"`, 'success');
  }, [viewMode, globalMapping, attributeMapping, updateGlobalMapping, updateAttributeMapping, attribute.attribute_id, showToast]);

  // Handle bulk import
  const handleBulkImport = useCallback(async (aliases: { alias: string; canonicalId: string }[]) => {
    const current = viewMode === 'global' 
      ? { ...globalMapping?.aliases } 
      : { ...attributeMapping?.aliases };
    
    for (const { alias, canonicalId } of aliases) {
      current[alias] = canonicalId;
    }

    if (viewMode === 'global') {
      await updateGlobalMapping({ aliases: current });
    } else {
      await updateAttributeMapping(attribute.attribute_id, { aliases: current });
    }
    showToast(`Imported ${aliases.length} aliases`, 'success');
  }, [viewMode, globalMapping, attributeMapping, updateGlobalMapping, updateAttributeMapping, attribute.attribute_id, showToast]);

  // Handle synonym changes
  const handleSynonymsChange = useCallback(async (synonyms: Record<string, string[]>) => {
    if (viewMode === 'global') {
      const currentGlobal = { ...globalMapping?.value_synonyms };
      currentGlobal[attribute.attribute_id] = synonyms;
      await updateGlobalMapping({ value_synonyms: currentGlobal });
    } else {
      await updateAttributeMapping(attribute.attribute_id, { value_synonyms: synonyms });
    }
    showToast('Synonyms updated', 'success');
  }, [viewMode, globalMapping, updateGlobalMapping, updateAttributeMapping, attribute.attribute_id, showToast]);

  // Handle source override operations
  const handleAddSourceOverride = useCallback(async (sourceId: string, data: SourceOverride) => {
    await upsertSourceOverride(attribute.attribute_id, sourceId, data);
    showToast(`Added source override "${sourceId}"`, 'success');
  }, [upsertSourceOverride, attribute.attribute_id, showToast]);

  const handleDeleteSourceOverride = useCallback(async (sourceId: string) => {
    await deleteSourceOverride(attribute.attribute_id, sourceId);
    showToast(`Deleted source override "${sourceId}"`, 'success');
  }, [deleteSourceOverride, attribute.attribute_id, showToast]);

  const handleCloneFromGlobal = useCallback(async (sourceId: string) => {
    // Clone attribute-level mapping to source
    const data: SourceOverride = {
      aliases: { ...(attributeMapping?.aliases || {}) },
      value_synonyms: { ...(attributeMapping?.value_synonyms || {}) },
    };
    await upsertSourceOverride(attribute.attribute_id, sourceId, data);
    showToast(`Cloned mappings to "${sourceId}"`, 'success');
  }, [upsertSourceOverride, attributeMapping, attribute.attribute_id, showToast]);

  // Handle import preview
  const handlePreviewImport = useCallback(async (csvText: string, sourceId?: string) => {
    return await previewImport({
      csvText,
      sourceId,
      attributeId: attribute.attribute_id,
      maxRows: 50,
    });
  }, [previewImport, attribute.attribute_id]);

  return (
    <div className={styles.mappingTab}>
      {/* View toggle */}
      <div className={styles.viewToggle}>
        <span className={styles.viewLabel}>Viewing:</span>
        <div className={styles.viewOptions} role="tablist">
          <button
            role="tab"
            className={`${styles.viewOption} ${viewMode === 'attribute' ? styles.viewOptionActive : ''}`}
            onClick={() => setViewMode('attribute')}
            aria-selected={viewMode === 'attribute'}
          >
            Attribute
          </button>
          <button
            role="tab"
            className={`${styles.viewOption} ${viewMode === 'global' ? styles.viewOptionActive : ''}`}
            onClick={() => setViewMode('global')}
            aria-selected={viewMode === 'global'}
          >
            Global
          </button>
          <button
            role="tab"
            className={`${styles.viewOption} ${viewMode === 'merged' ? styles.viewOptionActive : ''}`}
            onClick={() => setViewMode('merged')}
            aria-selected={viewMode === 'merged'}
          >
            Merged
          </button>
        </div>
        <span className={styles.precedenceNote}>
          Precedence: Source → Attribute → Global
        </span>
      </div>

      {/* Error display */}
      {error && (
        <div className={styles.error} role="alert">
          ⚠️ {error}
        </div>
      )}

      {/* Two column layout */}
      <div className={styles.columns}>
        {/* Left column: Aliases */}
        <div className={styles.section}>
          <div className={styles.sectionHeader}>
            <h3 className={styles.sectionTitle}>
              <span className={styles.sectionIcon}>🔗</span>
              Header Aliases
              <button 
                className={styles.helpIcon}
                title="Map vendor CSV column headers to canonical attribute IDs"
                aria-label="Help: Header aliases map vendor CSV column headers to canonical attribute IDs"
              >
                ?
              </button>
            </h3>
          </div>
          <div className={styles.sectionContent}>
            <AliasTable
              aliases={displayAliases}
              attributes={attributes}
              onAdd={handleAddAlias}
              onUpdate={handleUpdateAlias}
              onDelete={handleDeleteAlias}
              onBulkImport={() => setBulkImportOpen(true)}
              loading={loading}
              saving={saving}
              readOnly={viewMode === 'merged'}
            />
          </div>
        </div>

        {/* Right column: Synonyms */}
        <div className={styles.section}>
          <div className={styles.sectionHeader}>
            <h3 className={styles.sectionTitle}>
              <span className={styles.sectionIcon}>📝</span>
              Value Synonyms
              <button 
                className={styles.helpIcon}
                title="Map vendor values to canonical values during import"
                aria-label="Help: Value synonyms map vendor values to canonical values during import"
              >
                ?
              </button>
            </h3>
          </div>
          <div className={styles.sectionContent}>
            <SynonymsEditor
              synonyms={displaySynonyms}
              allowedValues={attribute.allowed_values}
              dataType={attribute.data_type}
              onChange={handleSynonymsChange}
              readOnly={viewMode === 'merged'}
              saving={saving}
            />
          </div>
        </div>
      </div>

      {/* Per-source overrides */}
      <div className={styles.section}>
        <div className={styles.sectionHeader}>
          <h3 className={styles.sectionTitle}>
            <span className={styles.sectionIcon}>🏷️</span>
            Per-Source Overrides
            <button 
              className={styles.helpIcon}
              title="Vendor-specific mapping overrides that take precedence"
              aria-label="Help: Per-source overrides allow vendor-specific mappings"
            >
              ?
            </button>
          </h3>
        </div>
        <div className={styles.sectionContent}>
          <PerSourceOverrides
            attributeId={attribute.attribute_id}
            sources={attributeMapping?.sources || {}}
            onAdd={handleAddSourceOverride}
            onEdit={setEditingSourceId}
            onDelete={handleDeleteSourceOverride}
            onCloneFromGlobal={handleCloneFromGlobal}
            loading={loading}
            saving={saving}
          />
        </div>
      </div>

      {/* Import preview */}
      <div className={`${styles.section} ${styles.importPreview}`}>
        <div className={styles.sectionHeader}>
          <h3 className={styles.sectionTitle}>
            <span className={styles.sectionIcon}>🔍</span>
            Import Preview
            <button 
              className={styles.helpIcon}
              title="Test how mappings will be applied to import data"
              aria-label="Help: Test mappings with sample CSV data"
            >
              ?
            </button>
          </h3>
        </div>
        <div className={styles.sectionContent}>
          <ImportPreviewEditor
            onPreview={handlePreviewImport}
            saving={saving}
          />
        </div>
      </div>

      {/* Bulk import modal */}
      <BulkAliasImportModal
        isOpen={bulkImportOpen}
        onClose={() => setBulkImportOpen(false)}
        onImport={handleBulkImport}
        attributes={attributes}
        existingAliases={displayAliases.map(a => a.alias)}
      />

      {/* Toast notification */}
      {toast && (
        <div className={`${styles.toast} ${toast.type === 'success' ? styles.toastSuccess : styles.toastError}`}>
          {toast.type === 'success' ? '✓' : '⚠️'} {toast.message}
        </div>
      )}
    </div>
  );
}
