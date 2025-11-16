import React, { useState, useCallback } from 'react';
import { useAttributesSettings, AttributeKey } from '../../hooks/useAttributesSettings';
import { useAuth } from '../../contexts/AuthContext';
import Toast from '../../components/Toast';
import VocabEditor, { VocabKey } from './components/VocabEditor';

// Core product attributes
const coreVocabs: Partial<Record<VocabKey, string>> = {
  departments: 'Departments',
  classes: 'Classes',
  categories: 'Categories',
  ageGroups: 'Age Groups',
  genders: 'Genders',
  collections: 'Collections',
  materials: 'Materials',
  madeIn: 'Made In',
  primaryColors: 'Primary Colors',
};

// Shoe-specific attributes
const shoeVocabs: Partial<Record<VocabKey, string>> = {
  heelTypes: 'Heel Types',
  heelHeights: 'Heel Heights',
  platformHeights: 'Platform Heights',
  shoeHeightMaps: 'Shoe Height Maps',
  soleMaterials: 'Sole Materials',
  closureTypes: 'Closure Types',
  cutTypes: 'Cut Types',
};

// Other attributes
const otherVocabs: Partial<Record<VocabKey, string>> = {
  fits: 'Fits',
  websites: 'Websites',
  sportsTeams: 'Sports Teams',
  leagues: 'Leagues',
  taxClasses: 'Tax Classes',
};

// Internal/hidden vocabs (not shown in UI but still functional)
const hiddenVocabs: Partial<Record<VocabKey, string>> = {
  descriptiveColors: 'Descriptive Colors',
  statuses: 'Statuses',
};

const VocabDropdownsPage: React.FC = () => {
  const attributes = useAttributesSettings();
  const { user, role } = useAuth();
  const [toast, setToast] = useState<{ show: boolean; message: string; type: 'success' | 'error' }>({ show: false, message: '', type: 'success' });
  const [newItems, setNewItems] = useState<Record<string, string>>({
    departments: '',
    classes: '',
    categories: '',
    ageGroups: '',
    genders: '',
    materials: '',
    websites: '',
    sportsTeams: '',
    leagues: '',
    fits: '',
    taxClasses: '',
    primaryColors: '',
    cutTypes: '',
    closureTypes: '',
    heelTypes: '',
    heelHeights: '',
    platformHeights: '',
    shoeHeightMaps: '',
    soleMaterials: '',
    collections: '',
    madeIn: '',
  });
  const [editingItem, setEditingItem] = useState<{ key: AttributeKey; index: number } | null>(null);
  const [editValue, setEditValue] = useState('');

  const showToast = (message: string, type: 'success' | 'error') => setToast({ show: true, message, type });
  const hideToast = () => setToast(t => ({ ...t, show: false }));

  const handleAddItem = useCallback(async (key: VocabKey) => {
    if (!user) {
      showToast('Please sign in to edit settings', 'error');
      return;
    }
    const newItem = newItems[key].trim();
    if (!newItem) return;
    const result = await attributes.addItem(key as AttributeKey, newItem);
    if (result.success) {
      setNewItems(prev => ({ ...prev, [key]: '' }));
      showToast('Saved', 'success');
    } else {
      showToast(result.error || "Couldn't save — try again", 'error');
    }
  }, [user, newItems, attributes]);

  const startEdit = useCallback((key: AttributeKey, index: number, currentValue: string) => {
    setEditingItem({ key, index });
    setEditValue(currentValue);
  }, []);

  const cancelEdit = useCallback(() => {
    setEditingItem(null);
    setEditValue('');
  }, []);

  const saveEdit = useCallback(async (value: string) => {
    if (!editingItem || !user) {
      cancelEdit();
      return;
    }
    const result = await attributes.editItem(editingItem.key, editingItem.index, value);
    if (result.success) {
      showToast('Saved', 'success');
      cancelEdit();
    } else {
      showToast(result.error || "Couldn't save — try again", 'error');
    }
  }, [editingItem, user, attributes, cancelEdit]);

  const handleDelete = useCallback(async (key: AttributeKey, index: number) => {
    if (!user) {
      showToast('Please sign in to edit settings', 'error');
      return;
    }
    if (!confirm('Are you sure you want to delete this item?')) return;
    const result = await attributes.deleteItem(key, index);
    if (result.success) {
      showToast('Deleted', 'success');
    } else {
      showToast(result.error || "Couldn't delete — try again", 'error');
    }
  }, [user, attributes]);

  const handleBulkImport = useCallback(async (key: AttributeKey, items: string[]) => {
    if (!user) {
      showToast('Please sign in to edit settings', 'error');
      return;
    }
    const currentItems = attributes.data[key] || [];
    const combinedItems = [...currentItems, ...items];
    await attributes.updateAttributeArray(key, combinedItems);
    showToast(`Imported ${items.length} items`, 'success');
  }, [user, attributes]);

  return (
    <div>
      {/* Core Product Attributes */}
      <div className="mb-8">
        <h2 className="text-xl font-bold text-gray-800 mb-4">Core Product Attributes</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {Object.entries(coreVocabs).map(([key, title]) => (
            <VocabEditor
              key={key}
              title={title}
              vocabKey={key as VocabKey}
              items={attributes.data[key as AttributeKey] || []}
              saving={attributes.saving}
              error={attributes.error}
              loading={attributes.loading}
              newValue={newItems[key]}
              onNewChange={(v) => setNewItems(p => ({ ...p, [key]: v }))}
              onAdd={() => handleAddItem(key as VocabKey)}
              onEditStart={(i, val) => startEdit(key as AttributeKey, i, val)}
              onEditSave={saveEdit}
              onEditCancel={cancelEdit}
              onDelete={(i) => handleDelete(key as AttributeKey, i)}
              isEditing={(i) => editingItem?.key === key && editingItem?.index === i}
              editValue={editValue}
              setEditValue={setEditValue}
              onReload={attributes.reload}
              onBulkImport={(items) => handleBulkImport(key as AttributeKey, items)}
            />
          ))}
        </div>
      </div>

      {/* Shoe Attributes */}
      <div className="mb-8">
        <h2 className="text-xl font-bold text-gray-800 mb-4">Shoe Attributes</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {Object.entries(shoeVocabs).map(([key, title]) => (
            <VocabEditor
              key={key}
              title={title}
              vocabKey={key as VocabKey}
              items={attributes.data[key as AttributeKey] || []}
              saving={attributes.saving}
              error={attributes.error}
              loading={attributes.loading}
              newValue={newItems[key]}
              onNewChange={(v) => setNewItems(p => ({ ...p, [key]: v }))}
              onAdd={() => handleAddItem(key as VocabKey)}
              onEditStart={(i, val) => startEdit(key as AttributeKey, i, val)}
              onEditSave={saveEdit}
              onEditCancel={cancelEdit}
              onDelete={(i) => handleDelete(key as AttributeKey, i)}
              isEditing={(i) => editingItem?.key === key && editingItem?.index === i}
              editValue={editValue}
              setEditValue={setEditValue}
              onReload={attributes.reload}
              onBulkImport={(items) => handleBulkImport(key as AttributeKey, items)}
            />
          ))}
        </div>
      </div>

      {/* Other Attributes */}
      <div className="mb-8">
        <h2 className="text-xl font-bold text-gray-800 mb-4">Other Attributes</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {Object.entries(otherVocabs).map(([key, title]) => (
            <VocabEditor
              key={key}
              title={title}
              vocabKey={key as VocabKey}
              items={attributes.data[key as AttributeKey] || []}
              saving={attributes.saving}
              error={attributes.error}
              loading={attributes.loading}
              newValue={newItems[key]}
              onNewChange={(v) => setNewItems(p => ({ ...p, [key]: v }))}
              onAdd={() => handleAddItem(key as VocabKey)}
              onEditStart={(i, val) => startEdit(key as AttributeKey, i, val)}
              onEditSave={saveEdit}
              onEditCancel={cancelEdit}
              onDelete={(i) => handleDelete(key as AttributeKey, i)}
              isEditing={(i) => editingItem?.key === key && editingItem?.index === i}
              editValue={editValue}
              setEditValue={setEditValue}
              onReload={attributes.reload}
              showAdminHint={role === 'admin'}
              onBulkImport={(items) => handleBulkImport(key as AttributeKey, items)}
            />
          ))}
        </div>
      </div>
      {toast.show && <Toast message={toast.message} type={toast.type} onClose={hideToast} />}
    </div>
  );
};

export default VocabDropdownsPage;
